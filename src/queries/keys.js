// Centralized query key factories.
// Use these for cache reads, writes, and invalidations.
// Pattern: keys returned as arrays — never mutate them.

export const boardKeys = {
  all: ['boards'],
  list: () => [...boardKeys.all, 'list'],
  detail: (boardId) => [...boardKeys.all, 'detail', boardId],
  columns: (boardId) => [...boardKeys.detail(boardId), 'columns'],
  tasks: (boardId) => [...boardKeys.detail(boardId), 'tasks'],
};

export const userKeys = {
  all: ['users'],
  list: () => [...userKeys.all, 'list'],
};

export const checklistKeys = {
  all: ['checklists'],
  byTaskIds: (taskIds) => [...checklistKeys.all, 'byTaskIds', [...taskIds].sort().join(',')],
};
