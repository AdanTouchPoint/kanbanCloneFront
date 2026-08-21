import { memo, useMemo, useState } from 'react';
import { useBoards } from '../context/BoardContext';
import { useTasks } from '../context/TaskContext';
import { useUI } from '../context/UIContext';
import { isCompletedColumn } from '../utils/columnHelpers';
import '../styles/Card.css';

export function Card({ card, isDragging = false }) {
  const { columns } = useBoards();
  const { deleteCard, duplicateCard } = useTasks();
  const { setActiveCardId } = useUI();
  const [isDuplicating, setIsDuplicating] = useState(false);

  const totalSubtasks = card.subtasks.length;
  const completedSubtasks = card.subtasks.filter((sub) => sub.completed).length;
  const progressPercent = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const isInCompletedColumn = isCompletedColumn(card.columnId, columns);

  const overdueSubtasksCount = isInCompletedColumn
    ? 0
    : card.subtasks.filter(
        (sub) => !sub.completed && sub.dueDate && sub.dueDate < todayStr
      ).length;

  const handleDelete = (e) => {
    e.stopPropagation();
    deleteCard(card.id);
  };

  const handleDuplicate = async (e) => {
    e.stopPropagation();
    if (isDuplicating) return;
    setIsDuplicating(true);
    try {
      await duplicateCard(card.id);
    } finally {
      setIsDuplicating(false);
    }
  };

  return (
    <div
      className={`card-wrapper ${isDragging ? 'dragging' : ''}`}
      onClick={() => setActiveCardId(card.id)}
      style={card.color ? { backgroundColor: `${card.color}0f`, borderColor: `${card.color}33` } : {}}
      title="Haz clic para ver detalles de la tarea"
    >
      {card.color && (
        <div
          className="card-color-stripe"
          style={{ backgroundColor: card.color }}
          title={card.colorName || ''}
        />
      )}
      <div className="card-header-row">
        <div className="card-actions-row" style={{ marginLeft: 'auto' }}>
          <button
            className="card-action-btn"
            onClick={handleDuplicate}
            title="Duplicar tarea"
            disabled={isDuplicating}
          >
            {isDuplicating ? (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="spin-icon">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            )}
          </button>
          <button
            className="card-delete-btn"
            onClick={handleDelete}
            title="Eliminar tarea"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
      </div>

      <h3 className="card-title">{card.title}</h3>

      {card.description && (
        <p className="card-desc">{card.description}</p>
      )}

      {totalSubtasks > 0 && (
        <div className="card-subtasks-container">
          <div className="card-subtasks-header">
            <span>Subtareas</span>
            <span>{completedSubtasks}/{totalSubtasks}</span>
          </div>
          <div className="card-subtasks-progress-bar">
            <div
              className="card-subtasks-progress-fill"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
          {overdueSubtasksCount > 0 && (
            <div className="card-subtasks-overdue-warning" title={`${overdueSubtasksCount} subtareas vencidas`}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{overdueSubtasksCount} subtarea{overdueSubtasksCount > 1 ? 's' : ''} vencida{overdueSubtasksCount > 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default memo(Card, (prevProps, nextProps) => {
  return prevProps.card === nextProps.card && prevProps.isDragging === nextProps.isDragging;
});
