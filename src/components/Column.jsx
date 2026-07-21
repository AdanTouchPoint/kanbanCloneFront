import React, { useState, useRef, memo } from 'react';
import { useKanban } from '../context/KanbanContext';
import Card from './Card';
import '../styles/Column.css';

function Column({ column, cards }) {
  const { user, renameColumn, deleteColumn, addCard, moveCard, setActiveCardId, moveColumn } = useKanban();
  const [title, setTitle] = useState(column.title);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isDragOverColumn, setIsDragOverColumn] = useState(false);
  const [isDraggingColumn, setIsDraggingColumn] = useState(false);

  const titleInputRef = useRef(null);

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    const trimmedTitle = title.trim();
    if (trimmedTitle && trimmedTitle !== column.title) {
      renameColumn(column.id, trimmedTitle);
    } else {
      setTitle(column.title);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleTitleSubmit();
      titleInputRef.current?.blur();
    }
    if (e.key === 'Escape') {
      setTitle(column.title);
      setIsEditingTitle(false);
      titleInputRef.current?.blur();
    }
  };

  const handleAddNewCard = async () => {
    try {
      const newCard = await addCard(column.id, { title: 'Nueva Tarea', isDraft: true });
      if (newCard && newCard.id) {
        setActiveCardId(newCard.id);
      }
    } catch (err) {
      console.error('Error al agregar nueva tarea:', err);
    }
  };

  // Drag and Drop handlers
  const handleDragStart = (e) => {
    if (isEditingTitle) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('text/column', column.id);
    setTimeout(() => {
      setIsDraggingColumn(true);
    }, 0);
  };

  const handleDragEnd = () => {
    setIsDraggingColumn(false);
    setIsDragOver(false);
    setIsDragOverColumn(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes('text/column')) {
      setIsDragOverColumn(true);
    } else {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
    setIsDragOverColumn(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    setIsDragOverColumn(false);
    
    const draggedCardId = e.dataTransfer.getData('text/plain');
    const dragColId = e.dataTransfer.getData('text/column');
    
    if (dragColId) {
      if (dragColId !== column.id) {
        moveColumn(dragColId, column.id);
      }
    } else if (draggedCardId) {
      moveCard(draggedCardId, column.id);
    }
  };

  const isAdmin = user?.role === 'admin';

  return (
    <div
      className={`column-container color-${column.color} ${isDragOver ? 'drag-over' : ''} ${isDragOverColumn ? 'drag-over-column' : ''} ${isDraggingColumn ? 'dragging-column' : ''}`}
      draggable={isAdmin ? "true" : "false"}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="column-header">
        <div className="column-title-area">
          {isEditingTitle && isAdmin ? (
            <input
              ref={titleInputRef}
              type="text"
              className="column-title-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          ) : (
            <h3
              className="column-title-text"
              onClick={() => isAdmin && setIsEditingTitle(true)}
              style={{ cursor: isAdmin ? 'pointer' : 'default' }}
              title={isAdmin ? "Haz clic para renombrar la columna" : ""}
            >
              {column.title}
            </h3>
          )}
          <span className="column-count-badge">{cards.length}</span>
        </div>
        {isAdmin && (
          <div className="column-actions-menu">
            <button
              className="column-action-btn"
              onClick={() => {
                const confirmDelete = window.confirm(`¿Estás seguro de que deseas eliminar la columna "${column.title}"?`);
                if (confirmDelete) {
                  deleteColumn(column.id);
                }
              }}
              title="Eliminar columna"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          </div>
        )}
      </div>

      <div className="cards-list">
        {cards.map((card) => (
          <Card key={card.id} card={card} />
        ))}
      </div>

      <div className="quick-card-composer">
        <button className="composer-toggle-btn" onClick={handleAddNewCard}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>Añadir Tarea</span>
        </button>
      </div>
    </div>
  );
}

export default memo(Column, (prevProps, nextProps) => {
  if (
    prevProps.column.id !== nextProps.column.id ||
    prevProps.column.title !== nextProps.column.title ||
    prevProps.column.color !== nextProps.column.color
  ) {
    return false;
  }
  if (prevProps.cards.length !== nextProps.cards.length) {
    return false;
  }
  for (let i = 0; i < prevProps.cards.length; i++) {
    if (prevProps.cards[i] !== nextProps.cards[i]) {
      return false;
    }
  }
  return true;
});
