import React, { useState, useEffect } from 'react';
import { useKanban } from '../context/KanbanContext';
import Column from './Column';
import '../styles/Board.css';

export default function Board() {
  const {
    user,
    boards,
    activeBoardId,
    renameBoard,
    columns,
    cards,
    searchQuery,
    setSearchQuery,
    priorityFilter,
    setPriorityFilter,
    addColumn
  } = useKanban();

  const activeBoard = boards.find(b => b.id === activeBoardId) || boards[0];

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

  const isAdmin = user?.role === 'admin';
  const boardColumns = columns.filter(col => col.boardId === activeBoardId);

  return (
    <div className="board-container">
      {/* Board Header / Controls */}
      <header className="board-header">
        <div className="board-title-section">
          {isEditingTitle && isAdmin ? (
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
              onClick={() => isAdmin && setIsEditingTitle(true)}
              style={{ cursor: isAdmin ? 'pointer' : 'default' }}
              title={isAdmin ? "Haz clic para renombrar el tablero" : ""}
            >
              {activeBoard?.title}
            </h1>
          )}
          <span className="board-subtitle">
            {activeBoard?.description || 'Organiza, prioriza y ejecuta tus tareas pendientes'}
          </span>
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
          {isAdmin && (
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
        {isAddingColumn && isAdmin && (
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
    </div>
  );
}
