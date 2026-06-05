import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import {
  getToken, setToken, removeToken,
  apiLogin, apiLogout, apiGetMe,
  apiList, apiCreate, apiUpdate, apiDelete,
  loadInitialData, loadActiveBoardDetails,
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
  const [colorFilter, setColorFilter] = useState('all');
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
  const determineRole = (role) => {
    if (role === 'superadmin' || role === 'admin') return 'admin';
    return 'user';
  };

  // Filter boards to show only those where user is creator or member
  const myBoards = boards.filter(b => {
    if (!user) return false;
    return b.authorId === user.id || b.memberIds?.includes(user.id);
  });

  const canModifyBoard = (boardId) => {
    if (!user) return false;
    const bId = boardId || activeBoardId;
    if (!bId) return false;
    if (user.role === 'admin' || user.role === 'superadmin') return true;
    const board = boards.find(b => b.id === bId);
    if (!board) return false;
    if (board.authorId === user.id) return true;
    if (board.memberIds?.includes(user.id)) {
      const u = users.find(usr => usr.id === user.id);
      return u?.role === 'admin' || u?.role === 'superadmin';
    }
    return false;
  };

  const addBoardMember = async (boardId, userId) => {
    const board = boards.find(b => b.id === boardId);
    if (!board) return;
    const newMemberIds = [...new Set([...(board.memberIds || []), userId])];
    await apiUpdate('boards', boardId, { membersID: newMemberIds });
    setBoards(prev => prev.map(b => b.id === boardId ? { ...b, memberIds: newMemberIds } : b));
  };

  const removeBoardMember = async (boardId, userId) => {
    const board = boards.find(b => b.id === boardId);
    if (!board) return;
    const newMemberIds = (board.memberIds || []).filter(id => id !== userId);
    await apiUpdate('boards', boardId, { membersID: newMemberIds });
    setBoards(prev => prev.map(b => b.id === boardId ? { ...b, memberIds: newMemberIds } : b));
  };

  const updateUserRole = async (userId, newRole) => {
    await apiUpdate('users', userId, { role: newRole });
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    if (user && user.id === userId) {
      setUser(prev => ({ ...prev, role: determineRole(newRole) }));
    }
  };

  // ═════════════════════════════════════════════════════════════════════════════
  // Data loading
  // ═════════════════════════════════════════════════════════════════════════════
  const fetchAllData = useCallback(async () => {
    setDataLoading(true);
    setError(null);
    try {
      const { boardList, userList } = await loadInitialData();
      setBoards(boardList);
      setUsers(userList);
    } catch (err) {
      console.error('[fetchAllData]', err);
      setError(err.message);
    } finally {
      setDataLoading(false);
    }
  }, []);

  // Fetch active board's columns and cards when activeBoardId changes
  useEffect(() => {
    const loadActiveBoard = async () => {
      if (!activeBoardId) {
        setColumns([]);
        setCards([]);
        return;
      }
      setColorFilter('all');
      const activeBoard = boards.find((b) => b.id === activeBoardId);
      if (!activeBoard) return;

      setDataLoading(true);
      setError(null);
      try {
        const { columnList, taskList } = await loadActiveBoardDetails(activeBoard);
        setColumns(columnList);
        setCards(taskList);
      } catch (err) {
        console.error('[loadActiveBoard]', err);
        setError(err.message);
      } finally {
        setDataLoading(false);
      }
    };

    loadActiveBoard();
  }, [activeBoardId, boards]);

  // Sync / pick active board from user's visible boards
  useEffect(() => {
    if (!dataLoading && user && myBoards.length > 0) {
      const savedId = localStorage.getItem('kb-active-board-id');
      if (savedId && myBoards.find((b) => b.id === savedId)) {
        if (activeBoardId !== savedId) setActiveBoardId(savedId);
      } else {
        if (activeBoardId !== myBoards[0].id) setActiveBoardId(myBoards[0].id);
      }
    }
  }, [user, boards, dataLoading, activeBoardId]);

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
    const role = determineRole(data.user.role);
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
    if (!canModifyBoard(boardId)) return false;
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
    if (!canModifyBoard(boardId)) return false;
    setBoards((prev) => prev.map((b) => (b.id === boardId ? { ...b, title: newTitle } : b)));
    await apiUpdate('boards', boardId, { name: newTitle }).catch((e) => setError(e.message));
    return true;
  };

  // ═════════════════════════════════════════════════════════════════════════════
  // Column actions
  // ═════════════════════════════════════════════════════════════════════════════
  const addColumn = async (title, color = 'blue') => {
    if (!canModifyBoard()) return false;

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
    if (!canModifyBoard()) return false;

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
    if (!canModifyBoard()) return false;
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
      color: cardData.color || null,
      colorName: cardData.colorName || '',
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
          let extra = {};
          if ('assigneeId' in updatedData) {
            const matchedUser = users.find((u) => u.id === updatedData.assigneeId);
            extra = {
              assignee: matchedUser ? matchedUser.name : '',
            };
          }
          mergedCard = { ...card, ...updatedData, ...extra };
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
          color: mergedCard.color || null,
          colorName: mergedCard.colorName || '',
        }),
        due: mergedCard.dueDate || null,
        columnsID: mergedCard.columnId,
        autorID: mergedCard.assigneeId || user.id,
      });
    } catch (err) {
      console.error('[updateCard]', err);
      setError(err.message);
    }
  };

  const updateColorNameOnBoard = async (color, newName) => {
    // 1. Optimistic UI update
    setCards((prev) =>
      prev.map((c) => (c.color === color ? { ...c, colorName: newName } : c))
    );

    // 2. Persist to API in background
    const activeBoard = boards.find((b) => b.id === activeBoardId);
    if (!activeBoard) return;

    const cardsToUpdate = cards.filter(
      (c) => c.color === color && activeBoard.taskIds.includes(c.id)
    );

    for (const card of cardsToUpdate) {
      await apiUpdate('tasks', card.id, {
        state: JSON.stringify({
          description: card.description,
          priority: card.priority,
          comments: card.comments || [],
          color: card.color,
          colorName: newName,
        }),
      }).catch((err) => console.error('[updateColorNameOnBoard]', err));
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

  const moveCard = async (cardId, targetColumnId, beforeCardId = null) => {
    // 1. Update card's column locally
    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, columnId: targetColumnId } : c))
    );

    // 2. Find board and reorder tasksID array
    const col = columns.find((c) => c.id === targetColumnId);
    const board = col ? boards.find((b) => b.id === col.boardId) : null;

    if (board) {
      // Remove cardId from existing position
      let newTaskIds = board.taskIds.filter((id) => id !== cardId);

      if (beforeCardId) {
        // Insert cardId before beforeCardId
        const targetIdx = newTaskIds.indexOf(beforeCardId);
        if (targetIdx !== -1) {
          newTaskIds.splice(targetIdx, 0, cardId);
        } else {
          newTaskIds.push(cardId);
        }
      } else {
        // Append cardId at the end
        newTaskIds.push(cardId);
      }

      // Update local board state
      setBoards((prev) =>
        prev.map((b) => (b.id === board.id ? { ...b, taskIds: newTaskIds } : b))
      );

      // Persist column change in task
      await apiUpdate('tasks', cardId, { columnsID: targetColumnId }).catch((e) =>
        setError(e.message)
      );

      // Persist reordered taskIds in board
      await apiUpdate('boards', board.id, { tasksID: newTaskIds }).catch((e) =>
        setError(e.message)
      );
    }
  };

  // ═════════════════════════════════════════════════════════════════════════════
  // Subtask (checklist) actions
  // ═════════════════════════════════════════════════════════════════════════════
  const addSubtask = async (cardId, title, assigneeId = '', dueDate = '') => {
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
    let resolvedData = { ...updatedData };
    if (updatedData.assigneeId !== undefined) {
      const assigneeUser = users.find((u) => u.id === updatedData.assigneeId);
      resolvedData.assignee = assigneeUser ? assigneeUser.name : '';
      resolvedData.memberIds = updatedData.assigneeId ? [updatedData.assigneeId] : [];
    }

    setCards((prev) =>
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
        colorFilter,
        setColorFilter,
        updateColorNameOnBoard,
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
        // Board Member & Role actions
        myBoards,
        canModifyBoard,
        addBoardMember,
        removeBoardMember,
        updateUserRole,
      }}
    >
      {children}
    </KanbanContext.Provider>
  );
};

export const useKanban = () => useContext(KanbanContext);
