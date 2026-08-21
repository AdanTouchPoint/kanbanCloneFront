import { useQuery } from '@tanstack/react-query';
import { loadBoardTasks } from '@/services/api';
import { boardKeys } from './keys';

export const useBoardTasksQuery = (board, options = {}) =>
  useQuery({
    queryKey: board ? boardKeys.tasks(board.id) : ['board', 'noop', 'tasks'],
    queryFn: () => loadBoardTasks(board),
    enabled: Boolean(board && (board.taskIds || []).length > 0),
    ...options,
  });
