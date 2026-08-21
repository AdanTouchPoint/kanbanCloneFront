/**
 * API Service — Kanban Board ↔ Payload CMS
 *
 * Column title uniqueness workaround:
 *   Payload requires globally unique column titles. We store them as
 *   "Display Name‖timestamp" and only show the part before "‖" in the UI.
 */

import { buildWhereInParam } from '../utils/apiQuery';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// ─── Token helpers ────────────────────────────────────────────────────────────
export const getToken = () => localStorage.getItem('kb-token');
export const setToken = (token) => localStorage.setItem('kb-token', token);
export const removeToken = () => localStorage.removeItem('kb-token');

const buildHeaders = () => {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `JWT ${token}` } : {}),
  };
};

// ─── Column title helpers ─────────────────────────────────────────────────────
const COL_SEP = '\u2016'; // "‖" double vertical bar — safe separator

export const makeColTitle = (display) => `${display}${COL_SEP}${Date.now()}`;

export const parseColTitle = (raw = '') => raw.split(COL_SEP)[0];

export const renameColTitle = (rawTitle = '', newDisplay) => {
  const parts = rawTitle.split(COL_SEP);
  const suffix = parts.length > 1 ? parts[1] : String(Date.now());
  return `${newDisplay}${COL_SEP}${suffix}`;
};

// ─── Task extras (stored as JSON in task.state) ───────────────────────────────
const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const DEFAULT_TASK_EXTRAS = Object.freeze({
  description: '',
  priority: 'medium',
  color: null,
  colorName: '',
});

const parseTaskExtras = (state) => {
  if (!state) return { ...DEFAULT_TASK_EXTRAS };
  let parsed;
  try {
    parsed = JSON.parse(state);
  } catch {
    return { ...DEFAULT_TASK_EXTRAS };
  }
  if (!isPlainObject(parsed)) return { ...DEFAULT_TASK_EXTRAS };
  return {
    description: typeof parsed.description === 'string' ? parsed.description : '',
    priority: parsed.priority || 'medium',
    color: typeof parsed.color === 'string' ? parsed.color : null,
    colorName: typeof parsed.colorName === 'string' ? parsed.colorName : '',
  };
};

// ─── Transformers: API doc → frontend shape ───────────────────────────────────
export const transformBoard = (doc) => ({
  id: doc.id,
  title: doc.name,
  description: doc.description || '',
  columnIds: (doc.columnsID || []).map((c) => (typeof c === 'string' ? c : c.id)),
  taskIds: (doc.tasksID || []).map((t) => (typeof t === 'string' ? t : t.id)),
  authorId: doc.autorID && (typeof doc.autorID === 'string' ? doc.autorID : doc.autorID.id),
  memberIds: (doc.membersID || []).map((m) => (typeof m === 'string' ? m : m.id)),
  ownerId: doc.ownerId && (typeof doc.ownerId === 'string' ? doc.ownerId : doc.ownerId.id),
});

export const transformColumn = (doc) => ({
  id: doc.id,
  title: parseColTitle(doc.title),
  color: doc.color,
  _rawTitle: doc.title,   // kept for rename operations
});

export const transformTask = (doc) => {
  const extras = parseTaskExtras(doc.state);
  const authorName =
    doc.autorID && typeof doc.autorID === 'object' ? doc.autorID.name || '' : '';
  const authorId =
    doc.autorID && (typeof doc.autorID === 'object' ? doc.autorID.id : doc.autorID);

  const assigneeId =
    doc.membersID && (typeof doc.membersID === 'object' ? doc.membersID.id || doc.membersID._id : doc.membersID);
  const assigneeName =
    doc.membersID && typeof doc.membersID === 'object' ? doc.membersID.name || doc.membersID.email || '' : '';

  return {
    id: doc.id,
    columnId:
      typeof doc.columnsID === 'string' ? doc.columnsID : doc.columnsID?.id || '',
    title: doc.name || '',
    description: extras.description || '',
    priority: extras.priority || 'medium',
    dueDate: doc.due ? doc.due.split('T')[0] : '',
    assignee: assigneeName || authorName || '',
    assigneeId: assigneeId || '',
    autorId: authorId || '',
    subtasks: [],         // populated later from checklists
    checklistIds: (doc.checkListsID || []).map((c) =>
      typeof c === 'string' ? c : c.id
    ),
    color: extras.color || null,
    colorName: extras.colorName || '',
  };
};

export const transformChecklist = (doc) => ({
  id: doc.id,
  title: doc.name || '',
  completed: doc.state === 'completed',
  dueDate: doc.due ? doc.due.split('T')[0] : '',
  assignee: (doc.membersID || [])
    .filter((m) => m && typeof m === 'object')
    .map((m) => m.name)
    .filter(Boolean)
    .join(', '),
  memberIds: (doc.membersID || []).map((m) =>
    typeof m === 'string' ? m : m.id
  ),
});

export const transformUser = (doc) => ({
  id: doc.id,
  email: doc.email || '',
  name: doc.name || doc.email || '',
  role: doc.role || 'user',
});

// ─── Auth endpoints ───────────────────────────────────────────────────────────
export const apiLogin = async (email, password) => {
  const res = await fetch(`${BASE_URL}/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok)
    throw new Error(data?.errors?.[0]?.message || 'Credenciales inválidas');
  return data; // { token, user, exp }
};

export const apiLogout = async () => {
  try {
    await fetch(`${BASE_URL}/users/logout`, {
      method: 'POST',
      headers: buildHeaders(),
    });
  } finally {
    removeToken();
  }
};

export const apiGetMe = async () => {
  const res = await fetch(`${BASE_URL}/users/me`, { headers: buildHeaders() });
  if (!res.ok) return null;
  const data = await res.json();
  return data?.user || null;
};

// ─── Generic CRUD ─────────────────────────────────────────────────────────────
export const apiList = async (slug, params = {}) => {
  // Separate `whereRaw` (a fully-formed `where[...]` query string for Payload)
  // from the rest of the params, so URLSearchParams doesn't double-encode it.
  const { whereRaw, ...rest } = params;
  const qs = new URLSearchParams({ limit: 100, ...rest }).toString();
  const wherePart = whereRaw ? `&${whereRaw}` : '';
  const res = await fetch(`${BASE_URL}/${slug}?${qs}${wherePart}`, {
    headers: buildHeaders(),
  });
  if (!res.ok) throw new Error(`Error al obtener ${slug}`);
  const data = await res.json();
  return data.docs || [];
};

export const apiCreate = async (slug, body) => {
  const res = await fetch(`${BASE_URL}/${slug}`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok)
    throw new Error(data?.errors?.[0]?.message || `Error al crear ${slug}`);
  return data.doc || data;
};

export const apiUpdate = async (slug, id, body) => {
  const res = await fetch(`${BASE_URL}/${slug}/${id}`, {
    method: 'PATCH',
    headers: buildHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok)
    throw new Error(
      data?.errors?.[0]?.message || `Error al actualizar ${slug}/${id}`
    );
  return data.doc || data;
};

export const apiDelete = async (slug, id) => {
  const res = await fetch(`${BASE_URL}/${slug}/${id}`, {
    method: 'DELETE',
    headers: buildHeaders(),
  });
  if (!res.ok) throw new Error(`Error al eliminar ${slug}/${id}`);
  return res.json();
};

export const loadInitialData = async () => {
  const [boardDocs, userDocs] = await Promise.all([
    apiList('boards'),
    apiList('users'),
  ]);
  const boardList = boardDocs.map(transformBoard);
  const userList = userDocs.map(transformUser);
  return { boardList, userList };
};

export const loadBoardColumns = async (board) => {
  if (!board) return [];
  const colIds = board.columnIds || [];
  if (colIds.length === 0) return [];
  const colParams = { whereRaw: buildWhereInParam(colIds) };
  const columnDocs = await apiList('columns', colParams);
  return columnDocs.map((doc) => ({
    ...transformColumn(doc),
    boardId: board.id,
  }));
};

export const loadBoardTasks = async (board) => {
  if (!board) return [];
  const taskIds = board.taskIds || [];
  if (taskIds.length === 0) return [];
  const taskParams = { depth: 1, whereRaw: buildWhereInParam(taskIds) };
  const taskDocs = await apiList('tasks', taskParams);

  const checklistIds = [];
  taskDocs.forEach((task) => {
    const ids = (task.checkListsID || []).map((c) => (typeof c === 'string' ? c : c.id));
    checklistIds.push(...ids);
  });

  const checklistMap = {};
  if (checklistIds.length > 0) {
    const checklistParams = { depth: 1, whereRaw: buildWhereInParam(checklistIds) };
    const checklistDocs = await apiList('checklists', checklistParams);
    checklistDocs.forEach((doc) => {
      checklistMap[doc.id] = transformChecklist(doc);
    });
  }

  return taskDocs.map((doc) => {
    const card = transformTask(doc);
    card.subtasks = card.checklistIds
      .map((cid) => checklistMap[cid])
      .filter(Boolean);
    return card;
  });
};

// Keep the legacy combined loader for any callers that still use it.
export const loadActiveBoardDetails = async (board) => {
  if (!board) return { columnList: [], taskList: [] };
  const [columnList, taskList] = await Promise.all([
    loadBoardColumns(board),
    loadBoardTasks(board),
  ]);
  return { columnList, taskList };
};

// Mantener compatibilidad si algún componente la llama
export const loadBoardData = async () => {
  const { boardList, userList } = await loadInitialData();
  if (boardList.length > 0) {
    const { columnList, taskList } = await loadActiveBoardDetails(boardList[0]);
    return { boardList, columnList, taskList, userList };
  }
  return { boardList, columnList: [], taskList: [], userList };
};
