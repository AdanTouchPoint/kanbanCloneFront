import { useEffect } from 'react';
import { AppProviders } from './context/AppProviders';
import { useAuth } from './context/AuthContext';
import { useUI } from './context/UIContext';
import Login from './components/Login';
import LoadingScreen from './components/LoadingScreen';
import Sidebar from './components/Sidebar';
import Board from './components/Board';
import Dashboard from './components/Dashboard';
import CardModal from './components/CardModal';
import BoardModal from './components/BoardModal';
import ConfirmDialog from './components/ConfirmDialog';
import './App.css';

function KanbanAppContent() {
  const { user, initAuth } = useAuth();
  const {
    activeView,
    activeCardId,
    isAddingBoard,
    setIsAddingBoard,
    boardToEdit,
    setBoardToEdit,
    loading,
    dataLoading,
    error,
    setError,
    confirmDialog,
  } = useUI();

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        {dataLoading && <div className="data-loading-bar" />}

        {error && (
          <div className="app-error-banner">
            <span>⚠️ {error}</span>
            <button onClick={() => setError(null)} className="error-dismiss-btn">✕</button>
          </div>
        )}

        {activeView === 'board' ? <Board /> : <Dashboard />}
        {activeCardId && <CardModal />}
        <BoardModal
          isOpen={isAddingBoard || !!boardToEdit}
          onClose={() => {
            setIsAddingBoard(false);
            setBoardToEdit(null);
          }}
          boardToEdit={boardToEdit}
        />
        <ConfirmDialog
          isOpen={!!confirmDialog}
          title={confirmDialog?.title}
          message={confirmDialog?.message}
          confirmText={confirmDialog?.confirmText}
          cancelText={confirmDialog?.cancelText}
          variant={confirmDialog?.variant}
          onConfirm={confirmDialog?.onConfirm}
          onCancel={confirmDialog?.onCancel}
        />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AppProviders>
      <KanbanAppContent />
    </AppProviders>
  );
}
