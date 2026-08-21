import { useQuery } from '@tanstack/react-query';
import { loadBoardColumns } from '@/services/api';
import { boardKeys } from './keys';

export const useBoardColumnsQuery = (board, options = {}) =>
  useQuery({
    queryKey: board ? boardKeys.columns(board.id) : ['board', 'noop', 'columns'],
    queryFn: () => loadBoardColumns(board),
    enabled: Boolean(board && (board.columnIds || []).length > 0),
    ...options,
  });
