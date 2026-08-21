import { createContext, useContext, useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  apiCreate, apiUpdate, apiDelete,
  makeColTitle, renameColTitle, transformBoard, transformColumn,
} from '@/services/api';
import { useAuth } from './AuthContext';
import { useUI } from './UIContext';
import { useBoardsQuery } from '@/queries/useBoardsQuery';
import { useUsersQuery } from '@/queries/useUsersQuery';
import { useBoardColumnsQuery } from '@/queries/useBoardColumnsQuery';
import { useBoardTasksQuery } from '@/queries/useBoardTasksQuery';
import { boardKeys, userKeys } from '@/queries/keys';

const BoardContext = createContext(null);

const useLocalActiveBoardId = () => {
  const [activeBoardId, setActiveBoardId] = useState(
    () => localStorage.getItem('kb-active-board-id') || null
  );

  useEffect(() => {
    if (activeBoardId) localStorage.setItem('kb-active-board-id', activeBoardId);
  }, [activeBoardId]);

  return [activeBoardId, setActiveBoardId];
};

export const BoardProvider = ({ children }) => {
  const { user } = useAuth();
  const { confirm, setError, setDataLoading } = useUI();
  const queryClient = useQueryClient();

  const [activeBoardId, setActiveBoardId] = useLocalActiveBoardId();

  // ─── Queries (single source of truth for reads) ────────────────────────────
  const boardsQuery = useBoardsQuery({ enabled: Boolean(user) });
  const usersQuery = useUsersQuery({ enabled: Boolean(user) });

  const boards = useMemo(() => boardsQuery.data ?? [], [boardsQuery.data]);
  const users = useMemo(() => usersQuery.data ?? [], [usersQuery.data]);

  const activeBoard = useMemo(
    () => boards.find((b) => b.id === activeBoardId) || boards[0] || null,
    [boards, activeBoardId]
  );

  const columnsQuery = useBoardColumnsQuery(activeBoard);
  const tasksQuery = useBoardTasksQuery(activeBoard);

  const columns = useMemo(() => columnsQuery.data ?? [], [columnsQuery.data]);

  // ─── Derived ────────────────────────────────────────────────────────────────
  const myBoards = useMemo(
    () =>
      user
        ? boards.filter((b) => b.authorId === user.id || b.memberIds?.includes(user.id))
        : [],
    [user, boards]
  );

  // ─── Loading / error propagation ───────────────────────────────────────────
  const isInitialFetching =
    (boardsQuery.isPending && !boardsQuery.isError) ||
    (usersQuery.isPending && !usersQuery.isError) ||
    (Boolean(activeBoard) && columnsQuery.isPending && !columnsQuery.isError);

  useEffect(() => {
    setDataLoading(isInitialFetching);
  }, [isInitialFetching, setDataLoading]);

  useEffect(() => {
    const firstError = boardsQuery.error || usersQuery.error || columnsQuery.error || tasksQuery.error;
    if (firstError) {
      setError(firstError.message || 'Error al cargar datos');
    }
  }, [boardsQuery.error, usersQuery.error, columnsQuery.error, tasksQuery.error, setError]);

  // ─── Refs for async callbacks ─────────────────────────────────────────────
  const boardsRef = useRef(boards);
  useEffect(() => {
    boardsRef.current = boards;
  }, [boards]);

  // ─── Permission helper ────────────────────────────────────────────────────
  const canModifyBoard = useCallback(
    (boardId) => {
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
    },
    [user, boards, users, activeBoardId]
  );

  // ─── Active board selection ────────────────────────────────────────────────
  useEffect(() => {
    if (!user || boards.length === 0) return;
    if (activeBoardId && boards.find((b) => b.id === activeBoardId)) return;
    const first = myBoards[0] || boards[0];
    if (first) setActiveBoardId(first.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, boards, myBoards]);

  // ─── Board actions ─────────────────────────────────────────────────────────
  const addBoard = useCallback(
    async ({ name, description = '', ownerId, membersID = [] }) => {
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

      queryClient.setQueryData(boardKeys.list(), (prev = []) => [...prev, newBoard]);
      queryClient.setQueryData(boardKeys.columns(newBoard.id), newCols);
      setActiveBoardId(newBoard.id);
      return newBoard.id;
    },
    [user, queryClient, setActiveBoardId]
  );

  const deleteBoard = useCallback(
    async (boardId) => {
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
        message:
          '¿Estás seguro de que deseas eliminar este tablero? Se eliminarán todas sus columnas y tareas asociadas.',
        confirmText: 'Eliminar',
        variant: 'danger',
      });
      if (!ok) return false;

      const boardCols = columns.filter((c) => c.boardId === boardId);

      queryClient.setQueryData(boardKeys.list(), (prev = []) => prev.filter((b) => b.id !== boardId));
      queryClient.removeQueries({ queryKey: boardKeys.columns(boardId) });
      queryClient.removeQueries({ queryKey: boardKeys.tasks(boardId) });

      if (activeBoardId === boardId) {
        const remaining = boards.filter((b) => b.id !== boardId);
        if (remaining.length > 0) setActiveBoardId(remaining[0].id);
      }

      (async () => {
        await Promise.all([
          ...boardCols.map((col) => apiDelete('columns', col.id).catch(() => {})),
          apiDelete('boards', boardId).catch(() => {}),
        ]);
      })();

      return true;
    },
    [canModifyBoard, boards, columns, activeBoardId, confirm, queryClient, setActiveBoardId]
  );

  const renameBoard = useCallback(
    async (boardId, newTitle) => {
      if (!canModifyBoard(boardId)) return false;
      queryClient.setQueryData(boardKeys.list(), (prev = []) =>
        prev.map((b) => (b.id === boardId ? { ...b, title: newTitle } : b))
      );
      await apiUpdate('boards', boardId, { name: newTitle }).catch((e) => setError(e.message));
      return true;
    },
    [canModifyBoard, setError, queryClient]
  );

  const updateBoard = useCallback(
    async (boardId, { name, description = '', ownerId, membersID = [] }) => {
      if (!canModifyBoard(boardId)) return false;
      queryClient.setQueryData(boardKeys.list(), (prev = []) =>
        prev.map((b) =>
          b.id === boardId
            ? { ...b, title: name, description, ownerId, memberIds: membersID }
            : b
        )
      );
      try {
        const updatedDoc = await apiUpdate('boards', boardId, {
          name,
          description,
          ownerId,
          membersID,
        });
        const transformed = transformBoard(updatedDoc);
        queryClient.setQueryData(boardKeys.list(), (prev = []) =>
          prev.map((b) => (b.id === boardId ? transformed : b))
        );
        return true;
      } catch (e) {
        console.error('[updateBoard]', e);
        setError(e.message);
        return false;
      }
    },
    [canModifyBoard, setError, queryClient]
  );

  // ─── Column actions ────────────────────────────────────────────────────────
  const addColumn = useCallback(
    async (title, color = 'blue') => {
      if (!canModifyBoard()) return false;
      const doc = await apiCreate('columns', { title: makeColTitle(title), color });
      const newCol = { ...transformColumn(doc), boardId: activeBoardId };

      const board = boards.find((b) => b.id === activeBoardId);
      if (board) {
        const newColIds = [...board.columnIds, doc.id];
        apiUpdate('boards', activeBoardId, { columnsID: newColIds }).catch(() => {});
        queryClient.setQueryData(boardKeys.list(), (prev = []) =>
          prev.map((b) => (b.id === activeBoardId ? { ...b, columnIds: newColIds } : b))
        );
      }
      queryClient.setQueryData(boardKeys.columns(activeBoardId), (prev = []) => [...prev, newCol]);
      return true;
    },
    [canModifyBoard, activeBoardId, boards, queryClient]
  );

  const deleteColumn = useCallback(
    async (columnId) => {
      if (!canModifyBoard()) return false;

      queryClient.setQueryData(boardKeys.columns(activeBoardId), (prev = []) =>
        prev.filter((c) => c.id !== columnId)
      );

      const board = boards.find((b) => b.id === activeBoardId);
      if (board) {
        const newColIds = board.columnIds.filter((id) => id !== columnId);
        apiUpdate('boards', activeBoardId, { columnsID: newColIds }).catch(() => {});
        queryClient.setQueryData(boardKeys.list(), (prev = []) =>
          prev.map((b) => (b.id === activeBoardId ? { ...b, columnIds: newColIds } : b))
        );
      }

      (async () => {
        await apiDelete('columns', columnId).catch(() => {});
      })();

      return true;
    },
    [canModifyBoard, activeBoardId, boards, queryClient]
  );

  const renameColumn = useCallback(
    async (columnId, newTitle) => {
      if (!canModifyBoard()) return false;
      const col = columns.find((c) => c.id === columnId);
      if (!col) return false;
      const newRawTitle = renameColTitle(col._rawTitle || col.title, newTitle);
      queryClient.setQueryData(boardKeys.columns(activeBoardId), (prev = []) =>
        prev.map((c) =>
          c.id === columnId ? { ...c, title: newTitle, _rawTitle: newRawTitle } : c
        )
      );
      await apiUpdate('columns', columnId, { title: newRawTitle }).catch((e) =>
        setError(e.message)
      );
      return true;
    },
    [canModifyBoard, columns, activeBoardId, setError, queryClient]
  );

  const moveColumn = useCallback(
    async (columnId, targetColumnId) => {
      if (!canModifyBoard()) return false;

      const board = boards.find((b) => b.id === activeBoardId);
      if (!board) return true;

      let ids = board.columnIds.filter((id) => id !== columnId);
      const targetIdx = board.columnIds.indexOf(targetColumnId);
      if (targetIdx !== -1) {
        const insertIdx = ids.indexOf(targetColumnId);
        if (insertIdx !== -1) ids.splice(insertIdx, 0, columnId);
        else ids.push(columnId);
      } else {
        ids.push(columnId);
      }
      const newColIds = ids;
      const boardId = board.id;

      queryClient.setQueryData(boardKeys.list(), (prev = []) =>
        prev.map((b) => (b.id === boardId ? { ...b, columnIds: newColIds } : b))
      );
      await apiUpdate('boards', boardId, { columnsID: newColIds }).catch((e) =>
        setError(e.message)
      );
      return true;
    },
    [canModifyBoard, activeBoardId, boards, setError, queryClient]
  );

  // ─── Board members ─────────────────────────────────────────────────────────
  const addBoardMember = useCallback(
    async (boardId, userId) => {
      const board = boards.find((b) => b.id === boardId);
      if (!board) return;
      const newMemberIds = [...new Set([...(board.memberIds || []), userId])];
      queryClient.setQueryData(boardKeys.list(), (prev = []) =>
        prev.map((b) => (b.id === boardId ? { ...b, memberIds: newMemberIds } : b))
      );
      await apiUpdate('boards', boardId, { membersID: newMemberIds });
    },
    [boards, queryClient]
  );

  const removeBoardMember = useCallback(
    async (boardId, userId) => {
      const board = boards.find((b) => b.id === boardId);
      if (!board) return;
      const newMemberIds = (board.memberIds || []).filter((id) => id !== userId);
      queryClient.setQueryData(boardKeys.list(), (prev = []) =>
        prev.map((b) => (b.id === boardId ? { ...b, memberIds: newMemberIds } : b))
      );
      await apiUpdate('boards', boardId, { membersID: newMemberIds });
    },
    [boards, queryClient]
  );

  const updateUserRole = useCallback(
    async (userId, newRole) => {
      await apiUpdate('users', userId, { role: newRole });
      queryClient.setQueryData(userKeys.list(), (prev = []) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
    },
    [queryClient]
  );

  // ─── Refetch helper ────────────────────────────────────────────────────────
  const refetchAll = useCallback(() => {
    boardsQuery.refetch();
    usersQuery.refetch();
    if (activeBoard) {
      queryClient.invalidateQueries({ queryKey: boardKeys.columns(activeBoard.id) });
      queryClient.invalidateQueries({ queryKey: boardKeys.tasks(activeBoard.id) });
    }
  }, [boardsQuery, usersQuery, activeBoard, queryClient]);

  return (
    <BoardContext.Provider
      value={{
        boards,
        activeBoardId,
        setActiveBoardId,
        activeBoard,
        columns,
        users,
        myBoards,
        canModifyBoard,
        refetchAll,
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
