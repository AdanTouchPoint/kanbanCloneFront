import { createContext, useState, useContext, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  apiCreate, apiUpdate, apiDelete, loadInitialData, loadActiveBoardDetails,
  makeColTitle, renameColTitle, transformBoard, transformColumn,
} from '../services/api';
import { useAuth } from './AuthContext';
import { useUI } from './UIContext';

const BoardContext = createContext(null);

export const BoardProvider = ({ children }) => {
  const { user } = useAuth();
  const { confirm, setError, setDataLoading } = useUI();

  const [boards, setBoards] = useState([]);
  const [activeBoardId, setActiveBoardId] = useState(() => localStorage.getItem('kb-active-board-id') || null);
  const [columns, setColumns] = useState([]);
  const [users, setUsers] = useState([]);

  // Refs to read latest values inside async callbacks
  const columnsRef = useRef(columns);
  useEffect(() => { columnsRef.current = columns; }, [columns]);
  const boardsRef = useRef(boards);
  useEffect(() => { boardsRef.current = boards; }, [boards]);

  // ─── Derived ───────────────────────────────────────────────────────────────
  const myBoards = useMemo(
    () =>
      user
        ? boards.filter((b) => b.authorId === user.id || b.memberIds?.includes(user.id))
        : [],
    [user, boards]
  );

  // ─── Permission helper ─────────────────────────────────────────────────────
  const canModifyBoard = useCallback((boardId) => {
    if (!user) return false;
    const bId = boardId || activeBoardId;
    if (!bId) return false;
    if (user.role === 'admin' || user.role === 'superadmin') return true;
    const board = boards.find((b) => b.id === bId);
    if (!board) return false;
    if (board.authorId === user.id) return true;
    if (board.memberIds?.includes(user.id)) {
      const u = users.find((usr) => usr.id === user.id);
      return u?.role === 'admin' || u?.role === 'superadmin';
    }
    return false;
  }, [user, boards, users, activeBoardId]);

  // ─── Initial data load ─────────────────────────────────────────────────────
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
  }, [setError, setDataLoading]);

  // ─── Load columns for active board ─────────────────────────────────────────
  useEffect(() => {
    const loadActiveBoard = async () => {
      if (!activeBoardId) {
        setColumns([]);
        return;
      }
      const activeBoard = boardsRef.current.find((b) => b.id === activeBoardId);
      if (!activeBoard) return;

      setDataLoading(true);
      setError(null);
      try {
        const { columnList } = await loadActiveBoardDetails(activeBoard);
        setColumns(columnList);
      } catch (err) {
        console.error('[loadActiveBoard:columns]', err);
        setError(err.message);
      } finally {
        setDataLoading(false);
      }
    };

    loadActiveBoard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBoardId]);

  // ─── Board actions ─────────────────────────────────────────────────────────
  const addBoard = useCallback(async ({ name, description = '', ownerId, membersID = [] }) => {
    const defaultColDefs = [
      { display: 'Backlog', color: 'purple' },
      { display: 'Por Hacer', color: 'blue' },
      { display: 'En Progreso', color: 'warning' },
      { display: 'Completado', color: 'success' },
    ];

    const createdCols = [];
    for (const def of defaultColDefs) {
      const doc = await apiCreate('columns', {
        title: makeColTitle(def.display),
        color: def.color,
      });
      createdCols.push({ doc, display: def.display, color: def.color });
    }

    const boardDoc = await apiCreate('boards', {
      name,
      description,
      autorID: user.id,
      ownerId,
      columnsID: createdCols.map((c) => c.doc.id),
      tasksID: [],
      membersID,
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
  }, [user]);

  const deleteBoard = useCallback(async (boardId) => {
    if (!canModifyBoard(boardId)) return false;
    if (boards.length <= 1) {
      await confirm({
        title: 'No se puede eliminar',
        message: 'No puedes eliminar el único tablero existente.',
        confirmText: 'Entendido',
        cancelText: 'Cerrar',
        variant: 'warning',
      });
      return false;
    }
    const ok = await confirm({
      title: 'Eliminar tablero',
      message: '¿Estás seguro de que deseas eliminar este tablero? Se eliminarán todas sus columnas y tareas asociadas.',
      confirmText: 'Eliminar',
      variant: 'danger',
    });
    if (!ok) return false;

    const boardCols = columns.filter((c) => c.boardId === boardId);
    const boardColIds = new Set(boardCols.map((c) => c.id));

    setBoards((prev) => prev.filter((b) => b.id !== boardId));
    setColumns((prev) => prev.filter((c) => c.boardId !== boardId));

    if (activeBoardId === boardId) {
      const remaining = boards.filter((b) => b.id !== boardId);
      if (remaining.length > 0) setActiveBoardId(remaining[0].id);
    }

    // Background cleanup (parallel) — task cleanup is best-effort and the
    // TaskContext keeps the local state, so we don't await cards here.
    (async () => {
      await Promise.all([
        ...boardCols.map((col) => apiDelete('columns', col.id).catch(() => {})),
        apiDelete('boards', boardId).catch(() => {}),
      ]);
    })();

    // Notify task context (if mounted) about board deletion by setting
    // cards to empty for this board through a custom event
    window.dispatchEvent(new CustomEvent('kanban:boardDeleted', { detail: { boardColIds } }));

    return true;
  }, [canModifyBoard, boards, columns, activeBoardId, confirm]);

  const renameBoard = useCallback(async (boardId, newTitle) => {
    if (!canModifyBoard(boardId)) return false;
    setBoards((prev) => prev.map((b) => (b.id === boardId ? { ...b, title: newTitle } : b)));
    await apiUpdate('boards', boardId, { name: newTitle }).catch((e) => setError(e.message));
    return true;
  }, [canModifyBoard, setError]);

  const updateBoard = useCallback(async (boardId, { name, description = '', ownerId, membersID = [] }) => {
    if (!canModifyBoard(boardId)) return false;
    setBoards((prev) =>
      prev.map((b) =>
        b.id === boardId
          ? { ...b, title: name, description, ownerId, memberIds: membersID }
          : b
      )
    );
    try {
      const updatedDoc = await apiUpdate('boards', boardId, { name, description, ownerId, membersID });
      const transformed = transformBoard(updatedDoc);
      setBoards((prev) => prev.map((b) => (b.id === boardId ? transformed : b)));
      return true;
    } catch (e) {
      console.error('[updateBoard]', e);
      setError(e.message);
      return false;
    }
  }, [canModifyBoard, setError]);

  // ─── Column actions ────────────────────────────────────────────────────────
  const addColumn = useCallback(async (title, color = 'blue') => {
    if (!canModifyBoard()) return false;
    const doc = await apiCreate('columns', { title: makeColTitle(title), color });
    const newCol = { ...transformColumn(doc), boardId: activeBoardId };

    const board = boards.find((b) => b.id === activeBoardId);
    if (board) {
      const newColIds = [...board.columnIds, doc.id];
      apiUpdate('boards', activeBoardId, { columnsID: newColIds }).catch(() => {});
      setBoards((prev) =>
        prev.map((b) => (b.id === activeBoardId ? { ...b, columnIds: newColIds } : b))
      );
    }
    setColumns((prev) => [...prev, newCol]);
    return true;
  }, [canModifyBoard, activeBoardId, boards]);

  const deleteColumn = useCallback(async (columnId) => {
    if (!canModifyBoard()) return false;

    const boardCols = columns.filter((c) => c.boardId === activeBoardId && c.id !== columnId);
    const fallbackColId = boardCols.length > 0 ? boardCols[0].id : null;

    setColumns((prev) => prev.filter((c) => c.id !== columnId));

    const board = boards.find((b) => b.id === activeBoardId);
    if (board) {
      const newColIds = board.columnIds.filter((id) => id !== columnId);
      apiUpdate('boards', activeBoardId, { columnsID: newColIds }).catch(() => {});
      setBoards((prev) =>
        prev.map((b) => (b.id === activeBoardId ? { ...b, columnIds: newColIds } : b))
      );
    }

    // Notify task context to move/remove cards in this column
    window.dispatchEvent(new CustomEvent('kanban:columnDeleted', {
      detail: { columnId, fallbackColId },
    }));

    (async () => {
      await apiDelete('columns', columnId).catch(() => {});
    })();

    return true;
  }, [canModifyBoard, columns, activeBoardId, boards]);

  const renameColumn = useCallback(async (columnId, newTitle) => {
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
  }, [canModifyBoard, columns, setError]);

  const moveColumn = useCallback(async (columnId, targetColumnId) => {
    if (!canModifyBoard()) return false;
    let boardId = null;
    let newColIds = null;

    setBoards((prevBoards) => {
      const board = prevBoards.find((b) => b.id === activeBoardId);
      if (!board) return prevBoards;
      boardId = board.id;
      let ids = board.columnIds.filter((id) => id !== columnId);
      const targetIdx = board.columnIds.indexOf(targetColumnId);
      if (targetIdx !== -1) {
        const insertIdx = ids.indexOf(targetColumnId);
        if (insertIdx !== -1) ids.splice(insertIdx, 0, columnId);
        else ids.push(columnId);
      } else {
        ids.push(columnId);
      }
      newColIds = ids;
      return prevBoards.map((b) => (b.id === boardId ? { ...b, columnIds: newColIds } : b));
    });

    if (boardId && newColIds) {
      await apiUpdate('boards', boardId, { columnsID: newColIds }).catch((e) => setError(e.message));
    }
    return true;
  }, [canModifyBoard, activeBoardId, setError]);

  // ─── Board members ─────────────────────────────────────────────────────────
  const addBoardMember = useCallback(async (boardId, userId) => {
    const board = boards.find((b) => b.id === boardId);
    if (!board) return;
    const newMemberIds = [...new Set([...(board.memberIds || []), userId])];
    await apiUpdate('boards', boardId, { membersID: newMemberIds });
    setBoards((prev) => prev.map((b) => (b.id === boardId ? { ...b, memberIds: newMemberIds } : b)));
  }, [boards]);

  const removeBoardMember = useCallback(async (boardId, userId) => {
    const board = boards.find((b) => b.id === boardId);
    if (!board) return;
    const newMemberIds = (board.memberIds || []).filter((id) => id !== userId);
    await apiUpdate('boards', boardId, { membersID: newMemberIds });
    setBoards((prev) => prev.map((b) => (b.id === boardId ? { ...b, memberIds: newMemberIds } : b)));
  }, [boards]);

  const updateUserRole = useCallback(async (userId, newRole) => {
    await apiUpdate('users', userId, { role: newRole });
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
  }, []);

  // ─── Sync activeBoardId ────────────────────────────────────────────────────
  useEffect(() => {
    if (activeBoardId) localStorage.setItem('kb-active-board-id', activeBoardId);
  }, [activeBoardId]);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (user && myBoards.length > 0) {
      const savedId = localStorage.getItem('kb-active-board-id');
      if (savedId && myBoards.find((b) => b.id === savedId)) {
        if (activeBoardId !== savedId) setActiveBoardId(savedId);
      } else if (activeBoardId !== myBoards[0].id) {
        setActiveBoardId(myBoards[0].id);
      }
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [user, myBoards, activeBoardId]);

  // ─── Listen for cross-context events (TaskContext updates taskIds) ─────────
  useEffect(() => {
    const onBoardUpdated = (e) => {
      const { boardId, taskIds } = e.detail || {};
      if (!boardId || !taskIds) return;
      setBoards((prev) =>
        prev.map((b) => (b.id === boardId ? { ...b, taskIds } : b))
      );
    };
    const onUserAuthenticated = () => {
      fetchAllData();
    };
    const onUserLoggedOut = () => {
      setBoards([]);
      setColumns([]);
      setUsers([]);
      setActiveBoardId(null);
    };
    window.addEventListener('kanban:boardUpdated', onBoardUpdated);
    window.addEventListener('kanban:userAuthenticated', onUserAuthenticated);
    window.addEventListener('kanban:userLoggedOut', onUserLoggedOut);
    return () => {
      window.removeEventListener('kanban:boardUpdated', onBoardUpdated);
      window.removeEventListener('kanban:userAuthenticated', onUserAuthenticated);
      window.removeEventListener('kanban:userLoggedOut', onUserLoggedOut);
    };
  }, [fetchAllData]);

  return (
    <BoardContext.Provider
      value={{
        boards,
        activeBoardId,
        setActiveBoardId,
        columns,
        users,
        myBoards,
        canModifyBoard,
        fetchAllData,
        addBoard,
        deleteBoard,
        renameBoard,
        updateBoard,
        addColumn,
        deleteColumn,
        renameColumn,
        moveColumn,
        addBoardMember,
        removeBoardMember,
        updateUserRole,
        columnsRef,
        boardsRef,
      }}
    >
      {children}
    </BoardContext.Provider>
  );
};

export const useBoards = () => {
  const ctx = useContext(BoardContext);
  if (!ctx) throw new Error('useBoards must be used within a BoardProvider');
  return ctx;
};
