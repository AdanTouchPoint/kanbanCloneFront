import { useState, useCallback } from 'react';
import { useBoards } from '../context/BoardContext';
import { useTasks } from '../context/TaskContext';
import { useUI } from '../context/UIContext';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { DndContextProvider } from './dnd/DndContextProvider';
import { SortableColumn } from './dnd/SortableColumn';
import { Card as CardPreview } from './Card';
import '../styles/Board.css';

function BoardTitleEditor({ board, canModify, onRename }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(board.title);

  const handleBlur = () => {
    setIsEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== board.title) {
      onRename(board.id, trimmed);
    } else {
      setDraft(board.title);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') e.target.blur();
    if (e.key === 'Escape') {
      setDraft(board.title);
      setIsEditing(false);
    }
  };

  if (isEditing && canModify) {
    return (
      <input
        type="text"
        className="board-title-input"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        autoFocus
      />
    );
  }

  return (
    <h1
      onClick={() => canModify && setIsEditing(true)}
      style={{ cursor: canModify ? 'pointer' : 'default' }}
      title={canModify ? 'Haz clic para renombrar el tablero' : ''}
    >
      {board.title}
    </h1>
  );
}

export default function Board() {
  const { activeBoard, renameBoard, columns, addColumn, canModifyBoard, moveColumn } = useBoards();
  const { cards, moveCard } = useTasks();
  const { searchQuery, setSearchQuery, colorFilter, setColorFilter, setBoardToEdit } = useUI();
  const debouncedSearch = useDebouncedValue(searchQuery, 200);

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

  const canModify = canModifyBoard(activeBoard?.id);
  const colIds = activeBoard?.columnIds || [];
  const boardColumns = [...columns.filter((col) => col.boardId === activeBoard?.id)].sort((a, b) => {
    const indexA = colIds.indexOf(a.id);
    const indexB = colIds.indexOf(b.id);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  const activeBoardColIds = new Set(columns.filter((col) => col.boardId === activeBoard?.id).map((c) => c.id));
  const activeBoardCards = cards.filter((card) => activeBoardColIds.has(card.columnId));

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

  const handleDragEnd = useCallback(
    (event) => {
      const { active, over } = event;
      if (!active || !over) return;
      const activeType = active.data.current?.type;
      const overType = over.data.current?.type;

      if (activeType === 'card') {
        const cardId = active.data.current.card.id;
        let targetColumnId = over.data.current?.columnId;
        let beforeCardId = null;

        if (overType === 'card') {
          const overCard = over.data.current.card;
          targetColumnId = overCard.columnId;
          beforeCardId = overCard.id;
        }
        if (targetColumnId) {
          moveCard(cardId, targetColumnId, beforeCardId);
        }
      } else if (activeType === 'column' && canModify) {
        const columnId = active.data.current.column.id;
        const targetColumnId = over.data.current?.column?.id;
        if (targetColumnId && targetColumnId !== columnId) {
          moveColumn(columnId, targetColumnId);
        }
      }
    },
    [moveCard, moveColumn, canModify]
  );

  const renderOverlay = useCallback(
    (activeItem) => {
      if (activeItem.type === 'card') {
        return <CardPreview card={activeItem.card} isDragging />;
      }
      if (activeItem.type === 'column') {
        const colCards = cards.filter((c) => c.columnId === activeItem.column.id);
        return (
          <div className={`column-container color-${activeItem.column.color} drag-overlay`}>
            <div className="column-header">
              <div className="column-title-area">
                <h3 className="column-title-text">{activeItem.column.title}</h3>
              </div>
            </div>
            <div className="cards-list">
              {colCards.slice(0, 3).map((c) => (
                <CardPreview key={c.id} card={c} />
              ))}
            </div>
          </div>
        );
      }
      return null;
    },
    [cards]
  );

  return (
    <div className="board-container">
      <DndContextProvider onDragEnd={handleDragEnd} renderOverlay={renderOverlay}>
        <header className="board-header">
          <div className="board-title-section">
            {activeBoard && (
              <BoardTitleEditor
                key={activeBoard.id}
                board={activeBoard}
                canModify={canModify}
                onRename={renameBoard}
              />
            )}

            <div className="board-subtitle-row">
              <span className="board-subtitle">
                {activeBoard?.description || 'Organiza, prioriza y ejecuta tus tareas pendientes'}
              </span>
              {canModify && activeBoard && (
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

        <div className="columns-wrapper">
          <SortableContext items={boardColumns.map((c) => c.id)} strategy={horizontalListSortingStrategy}>
            {boardColumns.map((column) => {
              const filteredCards = cards.filter((card) => {
                const matchesColumn = card.columnId === column.id;

                const searchLower = debouncedSearch.toLowerCase();
                const matchesSearch =
                  card.title.toLowerCase().includes(searchLower) ||
                  card.description.toLowerCase().includes(searchLower);

                const matchesColor =
                  colorFilter === 'all' || card.color === colorFilter;

                return matchesColumn && matchesSearch && matchesColor;
              });

              const sortedCards = [...filteredCards].sort((a, b) => {
                const taskIds = activeBoard?.taskIds || [];
                const indexA = taskIds.indexOf(a.id);
                const indexB = taskIds.indexOf(b.id);
                return indexA - indexB;
              });

              return (
                <SortableColumn
                  key={column.id}
                  column={column}
                  cards={sortedCards}
                />
              );
            })}
          </SortableContext>

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
                  {availableColors.map((color) => (
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
      </DndContextProvider>

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
