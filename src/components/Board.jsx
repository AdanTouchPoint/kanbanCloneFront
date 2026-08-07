import { useState, useEffect } from 'react';
import { useBoards } from '../context/BoardContext';
import { useTasks } from '../context/TaskContext';
import { useUI } from '../context/UIContext';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import Column from './Column';
import '../styles/Board.css';

export default function Board() {
  const { myBoards, activeBoardId, renameBoard, columns, addColumn, canModifyBoard } = useBoards();
  const { cards } = useTasks();
  const { searchQuery, setSearchQuery, colorFilter, setColorFilter, setBoardToEdit } = useUI();
  const debouncedSearch = useDebouncedValue(searchQuery, 200);

  const activeBoard = myBoards.find(b => b.id === activeBoardId) || myBoards[0];

  // Board Title edit state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [boardTitle, setBoardTitle] = useState('');

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (activeBoard) {
      setBoardTitle(activeBoard.title);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
  const colIds = activeBoard?.columnIds || [];
  const boardColumns = [...columns.filter(col => col.boardId === activeBoardId)].sort((a, b) => {
    const indexA = colIds.indexOf(a.id);
    const indexB = colIds.indexOf(b.id);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  const activeBoardColIds = new Set(columns.filter(col => col.boardId === activeBoardId).map(c => c.id));
  const activeBoardCards = cards.filter(card => activeBoardColIds.has(card.columnId));

  const uniqueColorsMap = {};
  activeBoardCards.forEach((card) => {
    if (card.color) {
      if (!uniqueColorsMap[card.color] || card.colorName) {
        uniqueColorsMap[card.color] = card.colorName || '';
      }
    }
  });
  const uniqueColors = Object.entries(uniqueColorsMap).map(([color, name]) => ({
    color,
    name,
  }));

  return (
    <div className="board-container">
      {/* Board Header / Controls */}
      <header className="board-header">
        <div className="board-title-section">
          {isEditingTitle && canModify ? (
            <input
              type="text"
              className="board-title-input"
              value={boardTitle}
              onChange={(e) => setBoardTitle(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={handleTitleKeyDown}
              autoFocus
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

          <div className="board-subtitle-row">
            <span className="board-subtitle">
              {activeBoard?.description || 'Organiza, prioriza y ejecuta tus tareas pendientes'}
            </span>
            {canModify && (
              <>
                <span className="board-subtitle-divider">•</span>
                <button
                  className="edit-board-btn"
                  onClick={() => setBoardToEdit(activeBoard)}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="edit-board-icon">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z" />
                  </svg>
                  <span>Editar Tablero</span>
                </button>
              </>
            )}
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

            const searchLower = debouncedSearch.toLowerCase();
            const matchesSearch =
              card.title.toLowerCase().includes(searchLower) ||
              card.description.toLowerCase().includes(searchLower);

            const matchesColor =
              colorFilter === 'all' ||
              card.color === colorFilter;

            return matchesColumn && matchesSearch && matchesColor;
          });

          // Sort cards based on active board task order
          const sortedCards = [...filteredCards].sort((a, b) => {
            const taskIds = activeBoard?.taskIds || [];
            const indexA = taskIds.indexOf(a.id);
            const indexB = taskIds.indexOf(b.id);
            return indexA - indexB;
          });

          return (
            <Column
              key={column.id}
              column={column}
              cards={sortedCards}
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
              <span className="color-picker-label">Color de Tema</span>
              <div className="color-select-grid">
                {availableColors.map(color => (
                  <button
                    key={color}
                    type="button"
                    className={`color-dot color-${color} color-dot-${color} ${columnColor === color ? 'selected' : ''}`}
                    onClick={() => setColumnColor(color)}
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


      {/* Bottom Color Filter Tabs */}
      {uniqueColors.length > 1 && (
        <div className="bottom-color-filter-bar glass animate-fade-in">
          <span className="filter-bar-label">Filtrar por color:</span>
          <div className="filter-tabs">
            <button
              className={`filter-tab ${colorFilter === 'all' ? 'active' : ''}`}
              onClick={() => setColorFilter('all')}
            >
              Todos
            </button>
            {uniqueColors.map(({ color, name }) => (
              <button
                key={color}
                className={`filter-tab ${colorFilter === color ? 'active' : ''}`}
                onClick={() => setColorFilter(color)}
                style={{ '--tab-color': color }}
              >
                <span className="tab-color-dot" style={{ backgroundColor: color }} />
                <span>{name || 'Sin nombre'}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
