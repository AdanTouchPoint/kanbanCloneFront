import { useEffect, lazy, Suspense } from 'react';
import { AppProviders } from './context/AppProviders';
import { useAuth } from './context/AuthContext';
import { useUI } from './context/UIContext';
import Login from './components/Login';
import LoadingScreen from './components/LoadingScreen';
import Sidebar from './components/Sidebar';
import Board from './components/Board';
import ErrorBoundary from './components/ErrorBoundary';
import './App.css';

const Dashboard = lazy(() => import('./components/Dashboard'));
const CardModal = lazy(() => import('./components/CardModal'));
const BoardModal = lazy(() => import('./components/BoardModal'));
const ConfirmDialog = lazy(() => import('./components/ConfirmDialog'));

const ModalFallback = () => null;

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
      <a href="#main-content" className="skip-link">Saltar al tablero</a>
      <Sidebar />
      <main id="main-content" className="main-content" tabIndex={-1}>
        {dataLoading && <div className="data-loading-bar" />}

        {error && (
          <div className="app-error-banner">
            <span>⚠️ {error}</span>
            <button onClick={() => setError(null)} className="error-dismiss-btn">✕</button>
          </div>
        )}

        <Suspense fallback={<LoadingScreen />}>
          <ErrorBoundary>
            {activeView === 'board' ? <Board /> : <Dashboard />}
          </ErrorBoundary>
          {activeCardId && (
            <Suspense fallback={<ModalFallback />}>
              <CardModal />
            </Suspense>
          )}
          <Suspense fallback={<ModalFallback />}>
            <BoardModal
              isOpen={isAddingBoard || !!boardToEdit}
              onClose={() => {
                setIsAddingBoard(false);
                setBoardToEdit(null);
              }}
              boardToEdit={boardToEdit}
            />
          </Suspense>
          <Suspense fallback={<ModalFallback />}>
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
          </Suspense>
        </Suspense>
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
