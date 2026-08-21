import { useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { UIProvider } from './UIContext';
import { AuthProvider } from './AuthContext';
import { BoardProvider } from './BoardContext';
import { TaskProvider } from './TaskContext';
import { createQueryClient } from '@/queries/queryClient';

export const AppProviders = ({ children }) => {
  const [queryClient] = useState(() => createQueryClient());
  const isDev = import.meta.env.DEV;

  return (
    <QueryClientProvider client={queryClient}>
      <UIProvider>
        <AuthProvider>
          <BoardProvider>
            <TaskProvider>{children}</TaskProvider>
          </BoardProvider>
        </AuthProvider>
      </UIProvider>
      {isDev && <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />}
    </QueryClientProvider>
  );
};
