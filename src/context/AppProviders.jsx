import { UIProvider } from './UIContext';
import { AuthProvider } from './AuthContext';
import { BoardProvider } from './BoardContext';
import { TaskProvider } from './TaskContext';

export const AppProviders = ({ children }) => (
  <UIProvider>
    <AuthProvider>
      <BoardProvider>
        <TaskProvider>{children}</TaskProvider>
      </BoardProvider>
    </AuthProvider>
  </UIProvider>
);
