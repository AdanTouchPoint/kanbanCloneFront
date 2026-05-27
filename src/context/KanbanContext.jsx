import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import {
  getToken, setToken, removeToken,
  apiLogin, apiLogout, apiGetMe,
  apiList, apiCreate, apiUpdate, apiDelete,
  loadBoardData,
  makeColTitle, renameColTitle,
  transformBoard, transformColumn, transformTask, transformChecklist, transformUser,
} from '../services/api';

const KanbanContext = createContext();

export const KanbanProvider = ({ children }) => {
  // ─── UI preferences (local only) ──────────────────────────────────────────
  const [theme, setTheme] = useState(() => localStorage.getItem('kb-theme') || 'dark');

  // ─── Auth state ────────────────────────────────────────────────────────────
  const [user, setUser] = useState(null);

  // ─── Data state (all from backend) ─────────────────────────────────────────
  const [boards, setBoards] = useState([]);
  const [activeBoardId, setActiveBoardId] = useState(null);
  const [columns, setColumns] = useState([]);
  const [cards, setCards] = useState([]);
  const [users, setUsers] = useState([]); // all users for assignee dropdowns

  // ─── Loading / error ──────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);       // initial session check
  const [dataLoading, setDataLoading] = useState(false); // data fetching
  const [error, setError] = useState(null);

  // ─── Filters & navigation ─────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [activeView, setActiveView] = useState('board');
  const [activeCardId, setActiveCardId] = useState(null);

  // ═════════════════════════════════════════════════════════════════════════════
  // Theme
  // ═════════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    localStorage.setItem('kb-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (activeBoardId) localStorage.setItem('kb-active-board-id', activeBoardId);
  }, [activeBoardId]);

  const toggleTheme = () => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));

  // ═════════════════════════════════════════════════════════════════════════════
  // Role helper — backend Users collection has no role field, so we derive it.
  // ═════════════════════════════════════════════════════════════════════════════
  const determineRole = (role) => {
    // Customize this list as needed
    const adminRoles = ['admin'];
    return adminRoles.includes(role) ? 'admin' : 'user';
  };

  // ═════════════════════════════════════════════════════════════════════════════
  // Data loading
  // ═════════════════════════════════════════════════════════════════════════════
  const fetchAllData = useCallback(async () => {
    setDataLoading(true);
    setError(null);
    try {
      const { boardList, columnList, taskList, userList } = await loadBoardData();
      setBoards(boardList);
      setColumns(columnList);
      setCards(taskList);
      setUsers(userList);

      // Restore or pick the active board
      if (boardList.length > 0) {
        const savedId = localStorage.getItem('kb-active-board-id');
        if (savedId && boardList.find((b) => b.id === savedId)) {
          setActiveBoardId(savedId);
        } else {
          setActiveBoardId(boardList[0].id);
        }
      }
    } catch (err) {
      console.error('[fetchAllData]', err);
      setError(err.message);
    } finally {
      setDataLoading(false);
    }
  }, []);

  // ═════════════════════════════════════════════════════════════════════════════
  // Bootstrap — validate existing token on mount
  // ═════════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const initAuth = async () => {
      setLoading(true);
      const token = getToken();
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const apiUser = await apiGetMe();
        if (apiUser) {
          const role = determineRole(apiUser.role);
          setUser({
            id: apiUser.id,
            email: apiUser.email,
            name: apiUser.name || apiUser.email,
            role,
            avatar: (apiUser.name || apiUser.email).charAt(0).toUpperCase(),
          });
          await fetchAllData();
        } else {
          removeToken();
        }
      } catch {
        removeToken();
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, [fetchAllData]);

  // ═════════════════════════════════════════════════════════════════════════════
  // Auth
  // ═════════════════════════════════════════════════════════════════════════════
  const login = async (email, password) => {
    const data = await apiLogin(email, password);
    setToken(data.token);
    const role = determineRole(role);
    const userData = {
      id: data.user.id,
      email: data.user.email,
      name: data.user.name || email.split('@')[0],
      role,
      avatar: (data.user.name || email).charAt(0).toUpperCase(),
    };
    setUser(userData);
    await fetchAllData();
    return userData;
  };

  const logout = async () => {
    await apiLogout();
    setUser(null);
    setBoards([]);
    setColumns([]);
    setCards([]);
    setUsers([]);
    setActiveBoardId(null);
    setActiveCardId(null);
    setActiveView('board');
  };

  // ═════════════════════════════════════════════════════════════════════════════
  // Board actions
  // ═════════════════════════════════════════════════════════════════════════════
  const addBoard = async (title, description = '') => {
    const defaultColDefs = [
      { display: 'Backlog', color: 'purple' },
      { display: 'Por Hacer', color: 'blue' },
      { display: 'En Progreso', color: 'warning' },
      { display: 'Completado', color: 'success' },
    ];

    // 1. Create columns first (each with a unique title)
    const createdCols = [];
    for (const def of defaultColDefs) {
      const doc = await apiCreate('columns', {
        title: makeColTitle(def.display),
        color: def.color,
      });
      createdCols.push({ doc, display: def.display, color: def.color });
    }

    // 2. Create the board referencing those column IDs
    const boardDoc = await apiCreate('boards', {
      name: title,
      autorID: user.id,
      columnsID: createdCols.map((c) => c.doc.id),
      tasksID: [],
      membersID: [],
    });

    const newBoard = transformBoard(boardDoc);
    const newCols = createdCols.map((c) => ({
      ...transformColumn(c.doc),
      boardId: newBoard.id,
    }));

    setBoards((prev) => [...prev, newBoard]);
    setColumns((prev) => [...prev, ...newCols]);
    setActiveBoardId(newBoard.id);
    return newBoard.id;
  };

  const deleteBoard = async (boardId) => {
    if (user?.role !== 'admin') return false;
    if (boards.length <= 1) {
      alert('No puedes eliminar el único tablero existente.');
      return false;
    }
    if (!window.confirm('¿Estás seguro de que deseas eliminar este tablero? Se eliminarán todas sus columnas y tareas asociadas.'))
      return false;

    const boardCols = columns.filter((c) => c.boardId === boardId);
    const boardColIds = new Set(boardCols.map((c) => c.id));
    const boardTasks = cards.filter((card) => boardColIds.has(card.columnId));

    // Optimistic local removal
    setBoards((prev) => prev.filter((b) => b.id !== boardId));
    setColumns((prev) => prev.filter((c) => c.boardId !== boardId));
    setCards((prev) => prev.filter((card) => !boardColIds.has(card.columnId)));

    if (activeBoardId === boardId) {
      const remaining = boards.filter((b) => b.id !== boardId);
      if (remaining.length > 0) setActiveBoardId(remaining[0].id);
    }

    // Background API cleanup (fire-and-forget, errors silenced)
    (async () => {
      for (const task of boardTasks) {
        for (const cid of task.checklistIds || []) {
          await apiDelete('checklists', cid).catch(() => { });
        }
        await apiDelete('tasks', task.id).catch(() => { });
      }
      for (const col of boardCols) {
        await apiDelete('columns', col.id).catch(() => { });
      }
      await apiDelete('boards', boardId).catch(() => { });
    })();

    return true;
  };

  const renameBoard = async (boardId, newTitle) => {
    if (user?.role !== 'admin') return false;
    setBoards((prev) => prev.map((b) => (b.id === boardId ? { ...b, title: newTitle } : b)));
    await apiUpdate('boards', boardId, { name: newTitle }).catch((e) => setError(e.message));
    return true;
  };

  // ═════════════════════════════════════════════════════════════════════════════
  // Column actions
  // ═════════════════════════════════════════════════════════════════════════════
  const addColumn = async (title, color = 'blue') => {
    if (user?.role !== 'admin') return false;

    const doc = await apiCreate('columns', {
      title: makeColTitle(title),
      color,
    });

    const newCol = { ...transformColumn(doc), boardId: activeBoardId };

    // Update the board's columnsID array
    const board = boards.find((b) => b.id === activeBoardId);
    if (board) {
      const newColIds = [...board.columnIds, doc.id];
      await apiUpdate('boards', activeBoardId, { columnsID: newColIds }).catch(() => { });
      setBoards((prev) =>
        prev.map((b) => (b.id === activeBoardId ? { ...b, columnIds: newColIds } : b))
      );
    }

    setColumns((prev) => [...prev, newCol]);
    return true;
  };

  const deleteColumn = async (columnId) => {
    if (user?.role !== 'admin') return false;

    const colTasks = cards.filter((c) => c.columnId === columnId);
    const boardCols = columns.filter((c) => c.boardId === activeBoardId && c.id !== columnId);
    const fallbackColId = boardCols.length > 0 ? boardCols[0].id : null;

    // Optimistic local update
    setColumns((prev) => prev.filter((c) => c.id !== columnId));
    if (fallbackColId) {
      setCards((prev) =>
        prev.map((card) => (card.columnId === columnId ? { ...card, columnId: fallbackColId } : card))
      );
    } else {
      setCards((prev) => prev.filter((card) => card.columnId !== columnId));
    }

    // Update board's columnsID
    const board = boards.find((b) => b.id === activeBoardId);
    if (board) {
      const newColIds = board.columnIds.filter((id) => id !== columnId);
      await apiUpdate('boards', activeBoardId, { columnsID: newColIds }).catch(() => { });
      setBoards((prev) =>
        prev.map((b) => (b.id === activeBoardId ? { ...b, columnIds: newColIds } : b))
      );
    }

    // Background cleanup
    (async () => {
      if (fallbackColId) {
        for (const task of colTasks) {
          await apiUpdate('tasks', task.id, { columnsID: fallbackColId }).catch(() => { });
        }
      } else {
        for (const task of colTasks) {
          for (const cid of task.checklistIds || []) {
            await apiDelete('checklists', cid).catch(() => { });
          }
          await apiDelete('tasks', task.id).catch(() => { });
        }
      }
      await apiDelete('columns', columnId).catch(() => { });
    })();

    return true;
  };

  const renameColumn = async (columnId, newTitle) => {
    if (user?.role !== 'admin') return false;
    const col = columns.find((c) => c.id === columnId);
    if (!col) return false;

    const newRawTitle = renameColTitle(col._rawTitle || col.title, newTitle);
    setColumns((prev) =>
      prev.map((c) =>
        c.id === columnId ? { ...c, title: newTitle, _rawTitle: newRawTitle } : c
      )
    );
    await apiUpdate('columns', columnId, { title: newRawTitle }).catch((e) => setError(e.message));
    return true;
  };

  // ═════════════════════════════════════════════════════════════════════════════
  // Card (task) actions
  // ═════════════════════════════════════════════════════════════════════════════
  const addCard = async (columnId, cardData) => {
    const stateBlob = JSON.stringify({
      description: cardData.description || '',
      priority: cardData.priority || 'medium',
      comments: [],
    });

    const doc = await apiCreate('tasks', {
      name: cardData.title || 'Nueva Tarea',
      autorID: user.id,
      state: stateBlob,
      due: cardData.dueDate || null,
      columnsID: columnId,
      checkListsID: [],
    });

    const newCard = transformTask(doc);
    newCard.assignee = user.name || '';

    // Update board's tasksID
    const col = columns.find((c) => c.id === columnId);
    const board = col ? boards.find((b) => b.id === col.boardId) : null;
    if (board) {
      const newTaskIds = [...board.taskIds, doc.id];
      await apiUpdate('boards', board.id, { tasksID: newTaskIds }).catch(() => { });
      setBoards((prev) =>
        prev.map((b) => (b.id === board.id ? { ...b, taskIds: newTaskIds } : b))
      );
    }

    setCards((prev) => [...prev, newCard]);
    return newCard;
  };

  const updateCard = async (cardId, updatedData) => {
    let mergedCard = null;
    setCards((prev) =>
      prev.map((card) => {
        if (card.id === cardId) {
          mergedCard = { ...card, ...updatedData };
          return mergedCard;
        }
        return card;
      })
    );

    if (!mergedCard) return;

    try {
      await apiUpdate('tasks', cardId, {
        name: mergedCard.title,
        state: JSON.stringify({
          description: mergedCard.description,
          priority: mergedCard.priority,
          comments: mergedCard.comments || [],
        }),
        due: mergedCard.dueDate || null,
        columnsID: mergedCard.columnId,
      });
    } catch (err) {
      console.error('[updateCard]', err);
      setError(err.message);
    }
  };

  const deleteCard = async (cardId) => {
    const card = cards.find((c) => c.id === cardId);
    setCards((prev) => prev.filter((c) => c.id !== cardId));
    if (activeCardId === cardId) setActiveCardId(null);

    if (card) {
      // Update board's tasksID
      const col = columns.find((c) => c.id === card.columnId);
      const board = col ? boards.find((b) => b.id === col.boardId) : null;
      if (board) {
        const newTaskIds = board.taskIds.filter((id) => id !== cardId);
        await apiUpdate('boards', board.id, { tasksID: newTaskIds }).catch(() => { });
        setBoards((prev) =>
          prev.map((b) => (b.id === board.id ? { ...b, taskIds: newTaskIds } : b))
        );
      }

      // Background deletion
      (async () => {
        for (const cid of card.checklistIds || []) {
          await apiDelete('checklists', cid).catch(() => { });
        }
        await apiDelete('tasks', cardId).catch(() => { });
      })();
    }
  };

  const moveCard = async (cardId, targetColumnId) => {
    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, columnId: targetColumnId } : c))
    );
    await apiUpdate('tasks', cardId, { columnsID: targetColumnId }).catch((e) =>
      setError(e.message)
    );
  };

  // ═════════════════════════════════════════════════════════════════════════════
  // Subtask (checklist) actions
  // ═════════════════════════════════════════════════════════════════════════════
  const addSubtask = async (cardId, title, assignee = '', dueDate = '') => {
    // Try to match the assignee text to a known backend user
    const assigneeUser = users.find(
      (u) => u.name === assignee || u.email === assignee
    );

    const doc = await apiCreate('checklists', {
      name: title,
      state: 'pending',
      due: dueDate || null,
      membersID: assigneeUser ? [assigneeUser.id] : [],
    });

    const newSub = {
      id: doc.id,
      title,
      completed: false,
      assignee,
      dueDate,
      memberIds: assigneeUser ? [assigneeUser.id] : [],
    };

    let newChecklistIds = [];
    setCards((prev) =>
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
      await apiUpdate('tasks', cardId, { checkListsID: newChecklistIds }).catch(() => { });
    }
  };

  const toggleSubtask = async (cardId, subtaskId) => {
    let newCompleted = false;
    setCards((prev) =>
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
  };

  const updateSubtask = async (cardId, subtaskId, updatedData) => {
    setCards((prev) =>
      prev.map((card) => {
        if (card.id === cardId) {
          return {
            ...card,
            subtasks: card.subtasks.map((sub) =>
              sub.id === subtaskId ? { ...sub, ...updatedData } : sub
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

    if (Object.keys(apiBody).length > 0) {
      await apiUpdate('checklists', subtaskId, apiBody).catch((e) => setError(e.message));
    }
  };

  const deleteSubtask = async (cardId, subtaskId) => {
    let newChecklistIds = [];
    setCards((prev) =>
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

    await apiDelete('checklists', subtaskId).catch(() => { });
    await apiUpdate('tasks', cardId, { checkListsID: newChecklistIds }).catch(() => { });
  };

  // ═════════════════════════════════════════════════════════════════════════════
  // Comment actions (stored in task.state JSON blob)
  // ═════════════════════════════════════════════════════════════════════════════
  const addComment = async (cardId, text) => {
    if (!text.trim()) return;
    const newComm = {
      id: `comm-${Date.now()}`,
      user: user?.name || 'Invitado',
      role: user?.role || 'user',
      text,
      createdAt: new Date().toISOString(),
    };

    let mergedCard = null;
    setCards((prev) =>
      prev.map((card) => {
        if (card.id === cardId) {
          mergedCard = { ...card, comments: [newComm, ...card.comments] };
          return mergedCard;
        }
        return card;
      })
    );

    if (mergedCard) {
      await apiUpdate('tasks', cardId, {
        state: JSON.stringify({
          description: mergedCard.description,
          priority: mergedCard.priority,
          comments: mergedCard.comments,
        }),
      }).catch((e) => setError(e.message));
    }
  };

  // ═════════════════════════════════════════════════════════════════════════════
  // Provider
  // ═════════════════════════════════════════════════════════════════════════════
  return (
    <KanbanContext.Provider
      value={{
        // Theme
        theme,
        toggleTheme,
        // Auth
        user,
        login,
        logout,
        // Boards
        boards,
        activeBoardId,
        setActiveBoardId,
        addBoard,
        deleteBoard,
        renameBoard,
        // Columns
        columns,
        addColumn,
        deleteColumn,
        renameColumn,
        // Cards
        cards,
        addCard,
        updateCard,
        deleteCard,
        moveCard,
        // Filters & nav
        searchQuery,
        setSearchQuery,
        priorityFilter,
        setPriorityFilter,
        activeView,
        setActiveView,
        activeCardId,
        setActiveCardId,
        // Subtasks
        addSubtask,
        updateSubtask,
        toggleSubtask,
        deleteSubtask,
        // Comments
        addComment,
        // Status
        loading,
        dataLoading,
        error,
        setError,
        // Users list (for assignee pickers)
        users,
        fetchAllData,
      }}
    >
      {children}
    </KanbanContext.Provider>
  );
};

export const useKanban = () => useContext(KanbanContext);
