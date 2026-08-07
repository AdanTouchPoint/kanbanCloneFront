import { createContext, useState, useContext, useCallback } from 'react';
import { getToken, setToken, removeToken, apiLogin, apiLogout, apiGetMe } from '../services/api';
import { useUI } from './UIContext';

const AuthContext = createContext(null);

const determineRole = (role) => {
  if (role === 'superadmin' || role === 'admin') return 'admin';
  return 'user';
};

export const AuthProvider = ({ children }) => {
  const { setLoading } = useUI();
  const [user, setUser] = useState(null);

  const login = useCallback(async (email, password) => {
    const data = await apiLogin(email, password);
    setToken(data.token);
    const role = determineRole(data.user.role);
    const userData = {
      id: data.user.id,
      email: data.user.email,
      name: data.user.name || email.split('@')[0],
      role,
      avatar: (data.user.name || email).charAt(0).toUpperCase(),
    };
    setUser(userData);
    window.dispatchEvent(new CustomEvent('kanban:userAuthenticated'));
    return userData;
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
    window.dispatchEvent(new CustomEvent('kanban:userLoggedOut'));
  }, []);

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
        const role = determineRole(apiUser.role);
        setUser({
          id: apiUser.id,
          email: apiUser.email,
          name: apiUser.name || apiUser.email,
          role,
          avatar: (apiUser.name || apiUser.email).charAt(0).toUpperCase(),
        });
        window.dispatchEvent(new CustomEvent('kanban:userAuthenticated'));
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
