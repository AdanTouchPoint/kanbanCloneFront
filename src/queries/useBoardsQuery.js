import { useQuery } from '@tanstack/react-query';
import { apiList } from '@/services/api';
import { transformBoard } from '@/services/api';
import { boardKeys } from './keys';

const fetchBoards = async () => {
  const docs = await apiList('boards');
  return docs.map(transformBoard);
};

export const useBoardsQuery = (options = {}) =>
  useQuery({
    queryKey: boardKeys.list(),
    queryFn: fetchBoards,
    ...options,
  });
