import { createContext, useContext, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiCreate, apiUpdate, apiDelete, transformTask } from '@/services/api';
import { useAuth } from './AuthContext';
import { useUI } from './UIContext';
import { useBoards } from './BoardContext';
import { boardKeys } from '@/queries/keys';

const TaskContext = createContext(null);

const buildTaskState = (cardData) =>
  JSON.stringify({
    description: cardData.description || '',
    priority: cardData.priority || 'medium',
    color: cardData.color || null,
    colorName: cardData.colorName || '',
  });

export const TaskProvider = ({ children }) => {
  const { user } = useAuth();
  const { confirm, setError, activeCardId, setActiveCardId } = useUI();
  const { columns, activeBoard, boards, users } = useBoards();
  const queryClient = useQueryClient();

  const tasksQueryKey = activeBoard ? boardKeys.tasks(activeBoard.id) : null;
  const cards = tasksQueryKey ? (queryClient.getQueryData(tasksQueryKey) ?? []) : [];

  // ─── Card CRUD ─────────────────────────────────────────────────────────────
  const addCard = useCallback(
    async (columnId, cardData) => {
      const doc = await apiCreate('tasks', {
        name: cardData.title || 'Nueva Tarea',
        autorID: user.id,
        state: buildTaskState(cardData),
        due: cardData.dueDate || null,
        columnsID: columnId,
        checkListsID: [],
      });

      const newCard = {
        ...transformTask(doc),
        columnId,
        assignee: user.name || '',
        subtasks: [],
        isDraft: cardData.isDraft || false,
      };

      if (tasksQueryKey) {
        queryClient.setQueryData(tasksQueryKey, (prev = []) => [...prev, newCard]);
      }

      const targetCol = columns.find((c) => c.id === columnId);
      if (targetCol) {
        const board = boards.find((b) => b.id === targetCol.boardId);
        if (board) {
          const newTaskIds = [...board.taskIds, doc.id];
          apiUpdate('boards', board.id, { tasksID: newTaskIds }).catch(() => {});
          queryClient.setQueryData(boardKeys.list(), (prev = []) =>
            prev.map((b) => (b.id === board.id ? { ...b, taskIds: newTaskIds } : b))
          );
        }
      }

      return newCard;
    },
    [user, columns, boards, queryClient, tasksQueryKey]
  );

  const updateCard = useCallback(
    async (cardId, updatedData) => {
      if (!tasksQueryKey) return;
      const current = queryClient.getQueryData(tasksQueryKey) || [];
      const card = current.find((c) => c.id === cardId);
      if (!card) return;

      let mergedCard = { ...card, ...updatedData };
      if ('assigneeId' in updatedData) {
        const matchedUser = users.find((u) => u.id === updatedData.assigneeId);
        mergedCard.assignee = matchedUser ? matchedUser.name : '';
      }

      queryClient.setQueryData(tasksQueryKey, (prev = []) =>
        prev.map((c) => (c.id === cardId ? mergedCard : c))
      );

      try {
        await apiUpdate('tasks', cardId, {
          name: mergedCard.title,
          state: JSON.stringify({
            description: mergedCard.description,
            priority: mergedCard.priority,
            color: mergedCard.color || null,
            colorName: mergedCard.colorName || '',
          }),
          due: mergedCard.dueDate || null,
          columnsID: mergedCard.columnId,
          autorID: mergedCard.autorId || user.id,
          membersID: mergedCard.assigneeId || null,
        });
      } catch (err) {
        console.error('[updateCard]', err);
        setError(err.message);
      }
    },
    [user, users, setError, queryClient, tasksQueryKey]
  );

  const deleteCard = useCallback(
    async (cardId) => {
      if (!tasksQueryKey) return;
      const current = queryClient.getQueryData(tasksQueryKey) || [];
      const card = current.find((c) => c.id === cardId);
      if (card) {
        const ok = await confirm({
          title: 'Eliminar tarea',
          message: `¿Estás seguro de que deseas eliminar la tarea "${card.title}"?`,
          confirmText: 'Eliminar',
          variant: 'danger',
        });
        if (!ok) return;
      }
      queryClient.setQueryData(tasksQueryKey, (prev = []) => prev.filter((c) => c.id !== cardId));
      if (activeCardId === cardId) setActiveCardId(null);

      if (card) {
        const col = columns.find((c) => c.id === card.columnId);
        const board = col ? boards.find((b) => b.id === col.boardId) : null;
        if (board) {
          const newTaskIds = board.taskIds.filter((id) => id !== cardId);
          apiUpdate('boards', board.id, { tasksID: newTaskIds }).catch(() => {});
          queryClient.setQueryData(boardKeys.list(), (prev = []) =>
            prev.map((b) => (b.id === board.id ? { ...b, taskIds: newTaskIds } : b))
          );
        }
        (async () => {
          const cleanup = (card.checklistIds || []).map((cid) =>
            apiDelete('checklists', cid).catch(() => {})
          );
          cleanup.push(apiDelete('tasks', cardId).catch(() => {}));
          await Promise.all(cleanup);
        })();
      }
    },
    [activeCardId, columns, boards, confirm, setActiveCardId, queryClient, tasksQueryKey]
  );

  const duplicateCard = useCallback(
    async (cardId) => {
      if (!tasksQueryKey) return null;
      const current = queryClient.getQueryData(tasksQueryKey) || [];
      const original = current.find((c) => c.id === cardId);
      if (!original) return null;

      const doc = await apiCreate('tasks', {
        name: `Copia de ${original.title}`,
        autorID: user.id,
        state: buildTaskState(original),
        due: original.dueDate || null,
        columnsID: original.columnId,
        checkListsID: [],
      });

      const copiedChecklistIds = [];
      const copiedSubtasks = [];
      for (const sub of original.subtasks || []) {
        const subDoc = await apiCreate('checklists', {
          name: sub.title,
          state: sub.completed ? 'completed' : 'pending',
          due: sub.dueDate || null,
          membersID: sub.memberIds || [],
        });
        copiedChecklistIds.push(subDoc.id);
        copiedSubtasks.push({
          id: subDoc.id,
          title: sub.title,
          completed: sub.completed,
          assignee: sub.assignee || '',
          dueDate: sub.dueDate || '',
          memberIds: sub.memberIds || [],
        });
      }

      if (copiedChecklistIds.length > 0) {
        apiUpdate('tasks', doc.id, { checkListsID: copiedChecklistIds }).catch(() => {});
      }

      const newCard = {
        ...transformTask(doc),
        columnId: original.columnId,
        assignee: user.name || '',
        subtasks: copiedSubtasks,
        checklistIds: copiedChecklistIds,
      };

      queryClient.setQueryData(tasksQueryKey, (prev = []) => [...prev, newCard]);

      const targetCol = columns.find((c) => c.id === original.columnId);
      if (targetCol) {
        const board = boards.find((b) => b.id === targetCol.boardId);
        if (board) {
          const newTaskIds = [...board.taskIds, doc.id];
          apiUpdate('boards', board.id, { tasksID: newTaskIds }).catch(() => {});
          queryClient.setQueryData(boardKeys.list(), (prev = []) =>
            prev.map((b) => (b.id === board.id ? { ...b, taskIds: newTaskIds } : b))
          );
        }
      }

      return newCard;
    },
    [user, columns, boards, queryClient, tasksQueryKey]
  );

  const moveCard = useCallback(
    async (cardId, targetColumnId, beforeCardId = null) => {
      if (!tasksQueryKey) return;
      const targetCol = columns.find((c) => c.id === targetColumnId);
      if (!targetCol) return;
      const board = boards.find((b) => b.id === targetCol.boardId);
      if (!board) return;

      const boardId = board.id;
      const ids = board.taskIds.filter((id) => id !== cardId);
      if (beforeCardId) {
        const targetIdx = ids.indexOf(beforeCardId);
        if (targetIdx !== -1) ids.splice(targetIdx, 0, cardId);
        else ids.push(cardId);
      } else {
        ids.push(cardId);
      }
      const newTaskIds = ids;

      queryClient.setQueryData(tasksQueryKey, (prev = []) =>
        prev.map((c) => (c.id === cardId ? { ...c, columnId: targetColumnId } : c))
      );

      queryClient.setQueryData(boardKeys.list(), (prev = []) =>
        prev.map((b) => (b.id === boardId ? { ...b, taskIds: newTaskIds } : b))
      );

      await Promise.all([
        apiUpdate('tasks', cardId, { columnsID: targetColumnId }).catch((e) => setError(e.message)),
        apiUpdate('boards', boardId, { tasksID: newTaskIds }).catch((e) => setError(e.message)),
      ]);
    },
    [columns, boards, setError, queryClient, tasksQueryKey]
  );

  // ─── Subtask actions ───────────────────────────────────────────────────────
  const addSubtask = useCallback(
    async (cardId, title, assigneeId = '', dueDate = '') => {
      if (!tasksQueryKey) return;
      const assigneeUser = users.find((u) => u.id === assigneeId);
      const assigneeName = assigneeUser ? assigneeUser.name : '';

      const doc = await apiCreate('checklists', {
        name: title,
        state: 'pending',
        due: dueDate || null,
        membersID: assigneeId ? [assigneeId] : [],
      });

      const newSub = {
        id: doc.id,
        title,
        completed: false,
        assignee: assigneeName,
        dueDate,
        memberIds: assigneeId ? [assigneeId] : [],
      };

      let newChecklistIds = [];
      queryClient.setQueryData(tasksQueryKey, (prev = []) =>
        prev.map((card) => {
          if (card.id === cardId) {
            newChecklistIds = [...(card.checklistIds || []), doc.id];
            return {
              ...card,
              subtasks: [...card.subtasks, newSub],
              checklistIds: newChecklistIds,
            };
          }
          return card;
        })
      );

      if (newChecklistIds.length > 0) {
        await apiUpdate('tasks', cardId, { checkListsID: newChecklistIds }).catch(() => {});
      }
    },
    [users, queryClient, tasksQueryKey]
  );

  const toggleSubtask = useCallback(
    async (cardId, subtaskId) => {
      if (!tasksQueryKey) return;
      let newCompleted = false;
      queryClient.setQueryData(tasksQueryKey, (prev = []) =>
        prev.map((card) => {
          if (card.id === cardId) {
            return {
              ...card,
              subtasks: card.subtasks.map((sub) => {
                if (sub.id === subtaskId) {
                  newCompleted = !sub.completed;
                  return { ...sub, completed: newCompleted };
                }
                return sub;
              }),
            };
          }
          return card;
        })
      );
      await apiUpdate('checklists', subtaskId, {
        state: newCompleted ? 'completed' : 'pending',
      }).catch((e) => setError(e.message));
    },
    [setError, queryClient, tasksQueryKey]
  );

  const updateSubtask = useCallback(
    async (cardId, subtaskId, updatedData) => {
      if (!tasksQueryKey) return;
      const resolvedData = { ...updatedData };
      if (updatedData.assigneeId !== undefined) {
        const assigneeUser = users.find((u) => u.id === updatedData.assigneeId);
        resolvedData.assignee = assigneeUser ? assigneeUser.name : '';
        resolvedData.memberIds = updatedData.assigneeId ? [updatedData.assigneeId] : [];
      }

      queryClient.setQueryData(tasksQueryKey, (prev = []) =>
        prev.map((card) => {
          if (card.id === cardId) {
            return {
              ...card,
              subtasks: card.subtasks.map((sub) =>
                sub.id === subtaskId ? { ...sub, ...resolvedData } : sub
              ),
            };
          }
          return card;
        })
      );

      const apiBody = {};
      if (updatedData.title !== undefined) apiBody.name = updatedData.title;
      if (updatedData.completed !== undefined)
        apiBody.state = updatedData.completed ? 'completed' : 'pending';
      if (updatedData.dueDate !== undefined)
        apiBody.due = updatedData.dueDate || null;
      if (updatedData.assigneeId !== undefined) {
        apiBody.membersID = updatedData.assigneeId ? [updatedData.assigneeId] : [];
      }
      if (Object.keys(apiBody).length > 0) {
        await apiUpdate('checklists', subtaskId, apiBody).catch((e) => setError(e.message));
      }
    },
    [users, setError, queryClient, tasksQueryKey]
  );

  const deleteSubtask = useCallback(
    async (cardId, subtaskId) => {
      if (!tasksQueryKey) return;
      let newChecklistIds = [];
      queryClient.setQueryData(tasksQueryKey, (prev = []) =>
        prev.map((card) => {
          if (card.id === cardId) {
            newChecklistIds = (card.checklistIds || []).filter((id) => id !== subtaskId);
            return {
              ...card,
              subtasks: card.subtasks.filter((sub) => sub.id !== subtaskId),
              checklistIds: newChecklistIds,
            };
          }
          return card;
        })
      );
      await Promise.all([
        apiDelete('checklists', subtaskId).catch(() => {}),
        apiUpdate('tasks', cardId, { checkListsID: newChecklistIds }).catch(() => {}),
      ]);
    },
    [queryClient, tasksQueryKey]
  );

  const updateColorNameOnBoard = useCallback(
    async (color, newName) => {
      if (!tasksQueryKey || !activeBoard) return;
      const current = queryClient.getQueryData(tasksQueryKey) || [];
      queryClient.setQueryData(tasksQueryKey, (prev = []) =>
        prev.map((c) => (c.color === color ? { ...c, colorName: newName } : c))
      );
      const cardsToUpdate = current.filter(
        (c) => c.color === color && activeBoard.taskIds.includes(c.id)
      );
      await Promise.all(
        cardsToUpdate.map((card) =>
          apiUpdate('tasks', card.id, {
            state: JSON.stringify({
              description: card.description,
              priority: card.priority,
              color: card.color,
              colorName: newName,
            }),
          }).catch((err) => console.error('[updateColorNameOnBoard]', err))
        )
      );
    },
    [activeBoard, queryClient, tasksQueryKey]
  );

  return (
    <TaskContext.Provider
      value={{
        cards,
        addCard,
        updateCard,
        deleteCard,
        duplicateCard,
        moveCard,
        addSubtask,
        updateSubtask,
        toggleSubtask,
        deleteSubtask,
        updateColorNameOnBoard,
      }}
    >
      {children}
    </TaskContext.Provider>
  );
};

export const useTasks = () => {
  const ctx = useContext(TaskContext);
  if (!ctx) throw new Error('useTasks must be used within a TaskProvider');
  return ctx;
};
