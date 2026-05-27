import React, { useState } from 'react';
import { useKanban } from '../context/KanbanContext';
import '../styles/Card.css';

export default function Card({ card }) {
  const { deleteCard, setActiveCardId } = useKanban();
  const [isDragging, setIsDragging] = useState(false);

  // Subtasks progress calculations
  const totalSubtasks = card.subtasks.length;
  const completedSubtasks = card.subtasks.filter(sub => sub.completed).length;
  const progressPercent = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;

  // Overdue check
  const isOverdue = () => {
    if (!card.dueDate || card.columnId === 'done') return false;
    const todayStr = new Date().toISOString().split('T')[0];
    return card.dueDate < todayStr;
  };

  const handleDragStart = (e) => {
    e.dataTransfer.setData('text/plain', card.id);
    // Use timeout to delay style change so the dragged ghost image looks normal
    setTimeout(() => {
      setIsDragging(true);
    }, 0);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleDelete = (e) => {
    e.stopPropagation(); // Prevent opening modal
    const confirmDelete = window.confirm(`¿Estás seguro de que deseas eliminar la tarea "${card.title}"?`);
    if (confirmDelete) {
      deleteCard(card.id);
    }
  };

  const getAssigneeInitials = (name) => {
    if (!name || name === 'Sin Asignar') return '?';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <div
      className={`card-wrapper ${isDragging ? 'dragging' : ''}`}
      draggable="true"
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={() => setActiveCardId(card.id)}
      title="Haz clic para ver detalles de la tarea"
    >
      <div className="card-header-row">
        <span className={`priority-badge ${card.priority}`}>
          {card.priority === 'high' ? 'Alta' : card.priority === 'medium' ? 'Media' : 'Baja'}
        </span>
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
        </div>
      )}

      <div className="card-footer-row">
        <div className={`card-date-badge ${isOverdue() ? 'overdue' : ''}`}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span>{card.dueDate || 'Sin fecha'}</span>
        </div>

        <div className="card-assignee-avatar" title={card.assignee || 'Sin Asignar'}>
          {getAssigneeInitials(card.assignee)}
        </div>
      </div>
    </div>
  );
}
