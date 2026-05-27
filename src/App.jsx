import React from 'react';
import { KanbanProvider, useKanban } from './context/KanbanContext';
import Login from './components/Login';
import LoadingScreen from './components/LoadingScreen';
import Sidebar from './components/Sidebar';
import Board from './components/Board';
import Dashboard from './components/Dashboard';
import CardModal from './components/CardModal';
import './App.css';

function KanbanAppContent() {
  const { user, activeView, activeCardId, loading, dataLoading, error, setError } = useKanban();

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
      </main>
    </div>
  );
}

export default function App() {
  return (
    <KanbanProvider>
      <KanbanAppContent />
    </KanbanProvider>
  );
}
