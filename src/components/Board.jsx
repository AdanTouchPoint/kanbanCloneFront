import React, { useState, useEffect } from 'react';
import { useKanban } from '../context/KanbanContext';
import Column from './Column';
import '../styles/Board.css';

export default function Board() {
  const {
    user,
    myBoards,
    activeBoardId,
    renameBoard,
    columns,
    cards,
    searchQuery,
    setSearchQuery,
    priorityFilter,
    setPriorityFilter,
    addColumn,
    canModifyBoard,
    addBoardMember,
    removeBoardMember,
    updateUserRole,
    users,
  } = useKanban();

  const activeBoard = myBoards.find(b => b.id === activeBoardId) || myBoards[0];

  // Board Title edit state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [boardTitle, setBoardTitle] = useState('');

  useEffect(() => {
    if (activeBoard) {
      setBoardTitle(activeBoard.title);
    }
  }, [activeBoardId, activeBoard?.title]);

  // Column composer state
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [columnTitle, setColumnTitle] = useState('');
  const [columnColor, setColumnColor] = useState('blue');

  const availableColors = ['purple', 'blue', 'warning', 'success'];

  const handleCreateColumn = (e) => {
    e.preventDefault();
    if (!columnTitle.trim()) return;

    addColumn(columnTitle.trim(), columnColor);
    setColumnTitle('');
    setColumnColor('blue');
    setIsAddingColumn(false);
  };

  const handleTitleBlur = () => {
    setIsEditingTitle(false);
    const trimmed = boardTitle.trim();
    if (trimmed && trimmed !== activeBoard.title) {
      renameBoard(activeBoard.id, trimmed);
    } else {
      setBoardTitle(activeBoard.title);
    }
  };

  const handleTitleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleTitleBlur();
    }
    if (e.key === 'Escape') {
      setBoardTitle(activeBoard.title);
      setIsEditingTitle(false);
    }
  };

  const canModify = canModifyBoard(activeBoard?.id);
  const boardColumns = columns.filter(col => col.boardId === activeBoardId).reverse();

  const [showMemberManager, setShowMemberManager] = useState(false);
  const [selectedUserIdToAdd, setSelectedUserIdToAdd] = useState('');

  const boardMembers = users.filter(
    (u) => activeBoard?.memberIds?.includes(u.id) || u.id === activeBoard?.authorId
  );

  const handleAddMemberSubmit = () => {
    if (selectedUserIdToAdd && activeBoard) {
      addBoardMember(activeBoard.id, selectedUserIdToAdd);
      setSelectedUserIdToAdd('');
    }
  };

  return (
    <div className="board-container">
      {/* Board Header / Controls */}
      <header className="board-header">
        <div className="board-title-section">
          {isEditingTitle && canModify ? (
            <input
              type="text"
              value={boardTitle}
              onChange={(e) => setBoardTitle(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={handleTitleKeyDown}
              autoFocus
              style={{
                fontSize: '28px',
                fontWeight: '700',
                color: 'var(--text-primary)',
                borderBottom: '2px solid var(--primary)',
                padding: '0 4px',
                letterSpacing: '-0.5px',
                background: 'transparent',
                outline: 'none',
                width: 'fit-content',
                marginBottom: '4px'
              }}
            />
          ) : (
            <h1
              onClick={() => canModify && setIsEditingTitle(true)}
              style={{ cursor: canModify ? 'pointer' : 'default' }}
              title={canModify ? "Haz clic para renombrar el tablero" : ""}
            >
              {activeBoard?.title}
            </h1>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
            <span className="board-subtitle" style={{ margin: 0 }}>
              {activeBoard?.description || 'Organiza, prioriza y ejecuta tus tareas pendientes'}
            </span>
            <span style={{ color: 'var(--text-secondary)' }}>•</span>

            {/* Render members list */}
            <div className="board-members-list" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {boardMembers.map(m => (
                <div
                  key={m.id}
                  className={`member-avatar ${m.role}`}
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: m.role === 'admin' ? 'var(--primary)' : 'var(--bg-tertiary)',
                    border: '1.5px solid var(--border-color)',
                    color: m.role === 'admin' ? '#fff' : 'var(--text-primary)',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'help'
                  }}
                  title={`${m.name} (${m.role === 'admin' ? 'Admin' : 'Miembro'})`}
                >
                  {(m.name || m.email).charAt(0).toUpperCase()}
                </div>
              ))}

              {/* Add member button */}
              {canModify && (
                <button
                  onClick={() => setShowMemberManager(true)}
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    border: '1.5px dashed var(--text-secondary)',
                    backgroundColor: 'transparent',
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: '14px',
                    padding: 0
                  }}
                  title="Gestionar miembros del tablero"
                >
                  +
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="board-actions">
          {/* Search bar */}
          <div className="search-bar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Buscar tarea..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Priority filter */}
          <select
            className="filter-select"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            title="Filtrar por prioridad"
          >
            <option value="all">Todas las Prioridades</option>
            <option value="high">Prioridad Alta</option>
            <option value="medium">Prioridad Media</option>
            <option value="low">Prioridad Baja</option>
          </select>

          {/* Add Column button (Only enabled for admin) */}
          {canModify && (
            <button
              className="add-column-btn"
              onClick={() => setIsAddingColumn(true)}
              title="Añadir nueva columna"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Nueva Columna</span>
            </button>
          )}
        </div>
      </header>

      {/* Columns Container */}
      <div className="columns-wrapper">
        {boardColumns.map((column) => {
          // Filter cards for this column
          const filteredCards = cards.filter(card => {
            const matchesColumn = card.columnId === column.id;

            const searchLower = searchQuery.toLowerCase();
            const matchesSearch =
              card.title.toLowerCase().includes(searchLower) ||
              card.description.toLowerCase().includes(searchLower);

            const matchesPriority =
              priorityFilter === 'all' ||
              card.priority === priorityFilter;

            return matchesColumn && matchesSearch && matchesPriority;
          });

          return (
            <Column
              key={column.id}
              column={column}
              cards={filteredCards}
            />
          );
        })}

        {/* Column composer block inline */}
        {isAddingColumn && canModify && (
          <form className="new-column-composer glass animate-fade-in" onSubmit={handleCreateColumn}>
            <input
              type="text"
              placeholder="Título de la columna..."
              value={columnTitle}
              onChange={(e) => setColumnTitle(e.target.value)}
              autoFocus
              required
            />

            <div>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Color de Tema</span>
              <div className="color-select-grid">
                {availableColors.map(color => (
                  <button
                    key={color}
                    type="button"
                    className={`color-dot color-${color} ${columnColor === color ? 'selected' : ''}`}
                    onClick={() => setColumnColor(color)}
                    style={{
                      backgroundColor:
                        color === 'purple' ? 'hsl(270, 85%, 60%)' :
                          color === 'blue' ? 'hsl(210, 95%, 55%)' :
                            color === 'warning' ? 'hsl(38, 92%, 50%)' :
                              'hsl(142, 71%, 45%)'
                    }}
                    title={`Tema ${color}`}
                  />
                ))}
              </div>
            </div>

            <div className="composer-actions">
              <button type="button" className="composer-btn-cancel" onClick={() => setIsAddingColumn(false)}>
                Cancelar
              </button>
              <button type="submit" className="composer-btn-add">
                Crear
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Member Manager Modal */}
      {showMemberManager && (
        <div className="modal-overlay" onClick={() => setShowMemberManager(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px' }}>
            <header className="modal-header">
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>Miembros del Tablero</h3>
              <button className="modal-close-btn" onClick={() => setShowMemberManager(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </header>

            <div className="member-manager-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px 24px', overflowY: 'auto' }}>
              {/* Add member form */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Añadir nuevo miembro</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select
                    value={selectedUserIdToAdd}
                    onChange={e => setSelectedUserIdToAdd(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '6px',
                      backgroundColor: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-color)',
                      outline: 'none'
                    }}
                  >
                    <option value="">Seleccionar usuario...</option>
                    {users
                      .filter(u => !activeBoard?.memberIds?.includes(u.id) && u.id !== activeBoard?.authorId)
                      .map(u => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.email})
                        </option>
                      ))}
                  </select>
                  <button
                    onClick={handleAddMemberSubmit}
                    disabled={!selectedUserIdToAdd}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      backgroundColor: 'var(--primary)',
                      color: '#fff',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: 'none',
                      opacity: selectedUserIdToAdd ? 1 : 0.6
                    }}
                  >
                    Añadir
                  </button>
                </div>
              </div>

              {/* Members list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Miembros actuales</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                  {boardMembers.map(m => {
                    const isOwner = m.id === activeBoard?.authorId;
                    return (
                      <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', borderRadius: '6px', backgroundColor: 'rgba(255,255,255,0.03)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            backgroundColor: 'var(--bg-tertiary)',
                            color: 'var(--text-primary)',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            {(m.name || m.email).charAt(0).toUpperCase()}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{m.name}</span>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{m.role === 'admin' ? 'Admin' : 'Miembro'} {isOwner && '• Creador'}</span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {/* Role Toggle Button */}
                          {!isOwner && canModify && (
                            <select
                              value={m.role}
                              onChange={(e) => updateUserRole(m.id, e.target.value)}
                              style={{
                                padding: '4px',
                                borderRadius: '4px',
                                backgroundColor: 'var(--bg-secondary)',
                                color: 'var(--text-primary)',
                                border: '1px solid var(--border-color)',
                                fontSize: '12px',
                                outline: 'none'
                              }}
                            >
                              <option value="user">Miembro</option>
                              <option value="admin">Admin</option>
                            </select>
                          )}

                          {/* Remove member button */}
                          {!isOwner && canModify && (
                            <button
                              onClick={() => removeBoardMember(activeBoard?.id, m.id)}
                              style={{
                                backgroundColor: 'transparent',
                                border: 'none',
                                color: '#ff4d4d',
                                cursor: 'pointer',
                                padding: '4px',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                              title="Eliminar del tablero"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
