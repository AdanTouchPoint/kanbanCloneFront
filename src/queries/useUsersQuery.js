import { useQuery } from '@tanstack/react-query';
import { apiList, transformUser } from '@/services/api';
import { userKeys } from './keys';

const fetchUsers = async () => {
  const docs = await apiList('users');
  return docs.map(transformUser);
};

export const useUsersQuery = (options = {}) =>
  useQuery({
    queryKey: userKeys.list(),
    queryFn: fetchUsers,
    ...options,
  });
