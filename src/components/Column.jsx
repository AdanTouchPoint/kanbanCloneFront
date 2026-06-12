import React, { useState, useRef, memo } from 'react';
import { useKanban } from '../context/KanbanContext';
import Card from './Card';
import '../styles/Column.css';

function Column({ column, cards }) {
  const { user, renameColumn, deleteColumn, addCard, moveCard } = useKanban();
  const [title, setTitle] = useState(column.title);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Quick card composer state
  const [isComposing, setIsComposing] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');

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

  const handleComposeSubmit = (e) => {
    e.preventDefault();
    if (!newCardTitle.trim()) return;

    addCard(column.id, {
      title: newCardTitle.trim()
    });

    setNewCardTitle('');
    setIsComposing(false);
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
        {isComposing ? (
          <form className="quick-card-form" onSubmit={handleComposeSubmit}>
            <div className="quick-card-input-row">
              <input
                type="text"
                placeholder="Nombre de la tarea..."
                value={newCardTitle}
                onChange={(e) => setNewCardTitle(e.target.value)}
                autoFocus
                required
              />
            </div>
            <div className="quick-card-options" style={{ justifyContent: 'flex-end' }}>
              <div className="quick-card-buttons">
                <button type="button" className="quick-btn-cancel" onClick={() => setIsComposing(false)}>
                  Cancelar
                </button>
                <button type="submit" className="quick-btn-add">
                  Añadir
                </button>
              </div>
            </div>
          </form>
        ) : (
          <button className="composer-toggle-btn" onClick={() => setIsComposing(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>AñadirTarea</span>
          </button>
        )}
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
