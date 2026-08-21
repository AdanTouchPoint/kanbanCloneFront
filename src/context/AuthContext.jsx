import { createContext, useState, useContext, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getToken, setToken, removeToken, apiLogin, apiLogout, apiGetMe } from '@/services/api';
import { boardKeys, userKeys, checklistKeys } from '@/queries/keys';
import { useUI } from './UIContext';

const AuthContext = createContext(null);

const determineRole = (role) => {
  if (role === 'superadmin' || role === 'admin') return 'admin';
  return 'user';
};

const mapAuthUser = (apiUser, fallbackEmail = '') => {
  const role = determineRole(apiUser.role);
  const displayName = apiUser.name || apiUser.email || fallbackEmail;
  return {
    id: apiUser.id,
    email: apiUser.email,
    name: displayName,
    role,
    avatar: displayName.charAt(0).toUpperCase(),
  };
};

export const AuthProvider = ({ children }) => {
  const { setLoading } = useUI();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);

  const login = useCallback(
    async (email, password) => {
      const data = await apiLogin(email, password);
      setToken(data.token);
      const userData = mapAuthUser(data.user, email);
      setUser(userData);
      return userData;
    },
    []
  );

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
    queryClient.removeQueries({ queryKey: boardKeys.all });
    queryClient.removeQueries({ queryKey: userKeys.all });
    queryClient.removeQueries({ queryKey: checklistKeys.all });
  }, [queryClient]);

  const initAuth = useCallback(async () => {
    setLoading(true);
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const apiUser = await apiGetMe();
      if (apiUser) {
        setUser(mapAuthUser(apiUser));
      } else {
        removeToken();
      }
    } catch {
      removeToken();
    } finally {
      setLoading(false);
    }
  }, [setLoading]);

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        login,
        logout,
        initAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
