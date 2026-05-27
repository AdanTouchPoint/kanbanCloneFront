/**
 * API Service — Kanban Board ↔ Payload CMS (localhost:3000)
 *
 * Column title uniqueness workaround:
 *   Payload requires globally unique column titles. We store them as
 *   "Display Name‖timestamp" and only show the part before "‖" in the UI.
 */

const BASE_URL = 'https://kanban-clone-back.vercel.app/api';

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
const parseTaskExtras = (state) => {
  try {
    const parsed = JSON.parse(state || '{}');
    if (parsed && typeof parsed === 'object') return parsed;
  } catch {
    /* fall through */
  }
  return { description: String(state || ''), priority: 'medium', comments: [] };
};

// ─── Transformers: API doc → frontend shape ───────────────────────────────────
export const transformBoard = (doc) => ({
  id: doc.id,
  title: doc.name,
  description: doc.description || '',
  columnIds: (doc.columnsID || []).map((c) => (typeof c === 'string' ? c : c.id)),
  taskIds: (doc.tasksID || []).map((t) => (typeof t === 'string' ? t : t.id)),
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
  return {
    id: doc.id,
    columnId:
      typeof doc.columnsID === 'string' ? doc.columnsID : doc.columnsID?.id || '',
    title: doc.name || '',
    description: extras.description || '',
    priority: extras.priority || 'medium',
    dueDate: doc.due ? doc.due.split('T')[0] : '',
    assignee: authorName,
    subtasks: [],         // populated later from checklists
    comments: extras.comments || [],
    checklistIds: (doc.checkListsID || []).map((c) =>
      typeof c === 'string' ? c : c.id
    ),
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
  const qs = new URLSearchParams({ limit: 100, ...params }).toString();
  const res = await fetch(`${BASE_URL}/${slug}?${qs}`, {
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

// ─── High-level loader ────────────────────────────────────────────────────────
/**
 * Loads all boards, columns, tasks, and checklists in a single parallel
 * request batch and joins them into the frontend shape.
 */
export const loadBoardData = async () => {
  const [boardDocs, columnDocs, taskDocs, checklistDocs, userDocs] =
    await Promise.all([
      apiList('boards'),
      apiList('columns'),
      apiList('tasks', { depth: 1 }),
      apiList('checklists', { depth: 1 }),
      apiList('users'),
    ]);

  const boardList = boardDocs.map(transformBoard);
  const columnRaw = columnDocs.map(transformColumn);
  const userList = userDocs.map(transformUser);

  // Build checklist lookup
  const checklistMap = {};
  checklistDocs.forEach((doc) => {
    checklistMap[doc.id] = transformChecklist(doc);
  });

  // Invert board→columns to get boardId per column
  const colBoardMap = {};
  boardList.forEach((b) =>
    b.columnIds.forEach((cid) => (colBoardMap[cid] = b.id))
  );

  const columnList = columnRaw.map((col) => ({
    ...col,
    boardId: colBoardMap[col.id] || null,
  }));

  const taskList = taskDocs.map((doc) => {
    const card = transformTask(doc);
    card.subtasks = card.checklistIds
      .map((cid) => checklistMap[cid])
      .filter(Boolean);
    return card;
  });

  return { boardList, columnList, taskList, userList };
};
