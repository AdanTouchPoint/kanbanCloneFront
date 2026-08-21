import { useState, useRef, memo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useBoards } from '../context/BoardContext';
import { useTasks } from '../context/TaskContext';
import { useUI } from '../context/UIContext';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableCard } from './dnd/SortableCard';
import '../styles/Column.css';

function Column({ column, cards, dragHandleProps }) {
  const { user } = useAuth();
  const { renameColumn, deleteColumn } = useBoards();
  const { addCard } = useTasks();
  const { setActiveCardId } = useUI();
  const [title, setTitle] = useState(column.title);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const titleInputRef = useRef(null);

  const { setNodeRef, isOver } = useDroppable({
    id: `column-drop-${column.id}`,
    data: { type: 'column', columnId: column.id },
  });

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

  const isAdmin = user?.role === 'admin';

  return (
    <div
      ref={setNodeRef}
      className={`column-container color-${column.color} ${isOver ? 'drag-over' : ''}`}
    >
      <div className="column-header" {...(isAdmin ? dragHandleProps : {})}>
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
              title={isAdmin ? 'Haz clic para renombrar la columna' : ''}
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
              onClick={() => deleteColumn(column.id)}
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
        <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <SortableCard key={card.id} card={card} />
          ))}
        </SortableContext>
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
