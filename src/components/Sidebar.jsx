import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useBoards } from '../context/BoardContext';
import { useUI } from '../context/UIContext';
import '../styles/Sidebar.css';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { myBoards, activeBoardId, setActiveBoardId, deleteBoard, renameBoard, canModifyBoard } = useBoards();
  const { theme, toggleTheme, activeView, setActiveView, setIsAddingBoard } = useUI();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [editingBoardId, setEditingBoardId] = useState(null);
  const [editingBoardTitle, setEditingBoardTitle] = useState('');

  if (!user) return null;

  // Start rename logic here

  const startRenameBoard = (id, currentTitle) => {
    setEditingBoardId(id);
    setEditingBoardTitle(currentTitle);
  };

  const handleRenameBoardSubmit = (id) => {
    const trimmed = editingBoardTitle.trim();
    if (trimmed) {
      renameBoard(id, trimmed);
    }
    setEditingBoardId(null);
  };

  const handleRenameKeyDown = (e, id) => {
    if (e.key === 'Enter') {
      handleRenameBoardSubmit(id);
    }
    if (e.key === 'Escape') {
      setEditingBoardId(null);
    }
  };
  return (
    <aside className={`sidebar glass ${isCollapsed ? 'collapsed' : ''}`} aria-label="Menú principal">
      <div className="sidebar-top">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <img src="/tpmlogo.png" alt="TPM Board" className="sidebar-logo-img" />
          </div>
          <button
            className="collapse-btn"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? 'Expandir menú' : 'Colapsar menú'}
            aria-label={isCollapsed ? 'Expandir menú' : 'Colapsar menú'}
            aria-expanded={!isCollapsed}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        </div>

        {/* Boards Switcher & Composer Section */}
        <div className="boards-section">
          <div className="boards-section-header">
            <span>Tableros</span>
            <button
              className="btn-new-board"
              onClick={() => setIsAddingBoard(true)}
              title="Crear nuevo tablero"
              aria-label="Crear nuevo tablero"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>

          <div className="boards-list" role="list">
            {myBoards.length === 0 && (
              <div className="boards-empty">Sin tableros. Crea uno con el botón +.</div>
            )}
            {myBoards.map(b => {
              const isActive = b.id === activeBoardId;
              const isEditing = b.id === editingBoardId;

              return (
                <div
                  key={b.id}
                  role="listitem"
                  className={`board-item ${isActive ? 'active' : ''}`}
                  onClick={() => !isEditing && setActiveBoardId(b.id)}
                  title={b.description || b.title}
                  aria-current={isActive ? 'true' : undefined}
                >
                  <div className="board-item-title-row">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <line x1="9" y1="3" x2="9" y2="21" />
                    </svg>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editingBoardTitle}
                        onChange={(e) => setEditingBoardTitle(e.target.value)}
                        onBlur={() => handleRenameBoardSubmit(b.id)}
                        onKeyDown={(e) => handleRenameKeyDown(e, b.id)}
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                        className="board-rename-input"
                      />
                    ) : (
                      <span>{b.title}</span>
                    )}
                  </div>

                  {canModifyBoard(b.id) && !isEditing && (
                    <div className="board-item-actions" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="board-action-btn"
                        onClick={() => startRenameBoard(b.id, b.title)}
                        title="Renombrar tablero"
                        aria-label={`Renombrar tablero ${b.title}`}
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                        </svg>
                      </button>
                      {myBoards.length > 1 && (
                        <button
                          className="board-action-btn delete"
                          onClick={() => deleteBoard(b.id)}
                          title="Eliminar tablero"
                          aria-label={`Eliminar tablero ${b.title}`}
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Vistas">
          <button
            className={`nav-item ${activeView === 'board' ? 'active' : ''}`}
            onClick={() => setActiveView('board')}
            title="Tablero de Tareas"
            aria-current={activeView === 'board' ? 'page' : undefined}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="3" width="7" height="9" />
              <rect x="14" y="3" width="7" height="5" />
              <rect x="14" y="12" width="7" height="9" />
              <rect x="3" y="16" width="7" height="5" />
            </svg>
            <span>Tablero</span>
          </button>

          <button
            className={`nav-item ${activeView === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveView('dashboard')}
            title="Estadísticas e Informes"
            aria-current={activeView === 'dashboard' ? 'page' : undefined}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
            <span>Estadísticas</span>
          </button>
        </nav>
      </div>

      <div className="sidebar-bottom">
        <div className="theme-toggle-container">
          <span className="theme-toggle-label">Modo Oscuro</span>
          <button
            className={`theme-toggle-switch ${theme === 'dark' ? 'dark' : ''}`}
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            aria-pressed={theme === 'dark'}
          >
            <div className="theme-toggle-handle">
              {theme === 'dark' ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="18.36" x2="5.64" y2="16.93" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              )}
            </div>
          </button>
        </div>

        <div className="user-card">
          <div className="user-avatar" title={user.name}>
            {user.avatar}
          </div>
          <div className="user-info">
            <span className="user-name">{user.name}</span>
            <span className={`user-role-badge ${user.role}`}>
              {user.role === 'admin' ? 'Administrador' : 'Usuario'}
            </span>
          </div>
        </div>

        <button className="logout-btn" onClick={logout} title="Cerrar Sesión">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span>Salir</span>
        </button>
      </div>
    </aside>
  );
}
