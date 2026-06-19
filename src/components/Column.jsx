import React, { useState, useRef, memo } from 'react';
import { useKanban } from '../context/KanbanContext';
import Card from './Card';
import '../styles/Column.css';

function Column({ column, cards }) {
  const { user, renameColumn, deleteColumn, addCard, moveCard, setActiveCardId } = useKanban();
  const [title, setTitle] = useState(column.title);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

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
  const handleDragOver = (e) => {
    e.preventDefault(); // Required to allow drop
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const cardId = e.dataTransfer.getData('text/plain');
    if (cardId) {
      moveCard(cardId, column.id);
    }
  };

  const isAdmin = user?.role === 'admin';

  return (
    <div
      className={`column-container color-${column.color} ${isDragOver ? 'drag-over' : ''}`}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="column-header">
        <div className="column-title-area">
          <input
            ref={titleInputRef}
            type="text"
            className="column-title-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleSubmit}
            onKeyDown={handleKeyDown}
            disabled={!isAdmin || isEditingTitle}
            onClick={() => isAdmin && setIsEditingTitle(true)}
            title={isAdmin ? "Haz clic para renombrar la columna" : ""}
          />
          <span className="column-count-badge">{cards.length}</span>
        </div>

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
