import { createContext, useState, useContext, useEffect, useCallback } from 'react';

const UIContext = createContext(null);

export const UIProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => localStorage.getItem('kb-theme') || 'dark');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [colorFilter, setColorFilter] = useState('all');
  const [activeView, setActiveView] = useState('board');
  const [activeCardId, setActiveCardId] = useState(null);
  const [isAddingBoard, setIsAddingBoard] = useState(false);
  const [boardToEdit, setBoardToEdit] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);

  useEffect(() => {
    localStorage.setItem('kb-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));

  const confirm = useCallback(({ title, message, confirmText, cancelText, variant } = {}) => {
    return new Promise((resolve) => {
      setConfirmDialog({
        title,
        message,
        confirmText,
        cancelText,
        variant,
        onConfirm: () => {
          setConfirmDialog(null);
          resolve(true);
        },
        onCancel: () => {
          setConfirmDialog(null);
          resolve(false);
        },
      });
    });
  }, []);

  return (
    <UIContext.Provider
      value={{
        theme,
        toggleTheme,
        error,
        setError,
        loading,
        setLoading,
        dataLoading,
        setDataLoading,
        searchQuery,
        setSearchQuery,
        colorFilter,
        setColorFilter,
        activeView,
        setActiveView,
        activeCardId,
        setActiveCardId,
        isAddingBoard,
        setIsAddingBoard,
        boardToEdit,
        setBoardToEdit,
        confirm,
        confirmDialog,
      }}
    >
      {children}
    </UIContext.Provider>
  );
};

export const useUI = () => {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI must be used within a UIProvider');
  return ctx;
};
