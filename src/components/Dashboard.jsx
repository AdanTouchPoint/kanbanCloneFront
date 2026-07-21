import React from 'react';
import { useKanban } from '../context/KanbanContext';
import '../styles/Dashboard.css';

export default function Dashboard() {
  const { cards, columns, activeBoardId, myBoards } = useKanban();

  const activeBoard = myBoards.find(b => b.id === activeBoardId) || myBoards[0];
  const colIds = activeBoard?.columnIds || [];

  // Filter columns and cards to only include those belonging to the active board, sorted by column order
  const boardColumns = [...columns.filter(col => col.boardId === activeBoardId)].sort((a, b) => {
    const indexA = colIds.indexOf(a.id);
    const indexB = colIds.indexOf(b.id);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });
  const boardColumnIds = boardColumns.map(col => col.id);
  const boardCards = cards.filter(card => boardColumnIds.includes(card.columnId));

  const totalTasks = boardCards.length;

  // Find the completed column for this board (usually ends with -done or is 'done')
  const doneColumn = boardColumns.find(col => col.id === 'done' || col.id.endsWith('-done'));
  const completedTasks = doneColumn ? boardCards.filter(card => card.columnId === doneColumn.id).length : 0;
  
  // Overdue calculation
  const todayStr = new Date().toISOString().split('T')[0];
  const overdueTasks = boardCards.filter(card => {
    if (!card.dueDate || (doneColumn && card.columnId === doneColumn.id)) return false;
    return card.dueDate < todayStr;
  }).length;

  // Subtask statistics
  let totalSubtasks = 0;
  let completedSubtasks = 0;
  boardCards.forEach(card => {
    totalSubtasks += card.subtasks.length;
    completedSubtasks += card.subtasks.filter(sub => sub.completed).length;
  });
  const subtaskRate = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  const getPercent = (value) => {
    if (totalTasks === 0) return 0;
    return Math.round((value / totalTasks) * 100);
  };

  return (
    <div className="dashboard-container">
      {/* Dashboard Header */}
      <header className="dashboard-header">
        <h1>Métricas & Análisis</h1>
        <span className="dashboard-subtitle">Información visual sobre el estado del proyecto y rendimiento del equipo</span>
      </header>

      {/* Stats Cards Grid */}
      <section className="stats-grid">
        {/* Total Tasks */}
        <div className="stat-card">
          <div className="stat-icon blue">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="9" y1="3" x2="9" y2="21" />
            </svg>
          </div>
          <div className="stat-info">
            <span className="stat-value">{totalTasks}</span>
            <span className="stat-label">Tareas Totales</span>
          </div>
        </div>

        {/* Completed Tasks */}
        <div className="stat-card">
          <div className="stat-icon green">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div className="stat-info">
            <span className="stat-value">{completedTasks}</span>
            <span className="stat-label">Tareas Completadas</span>
          </div>
        </div>

        {/* Overdue Tasks */}
        <div className="stat-card">
          <div className="stat-icon red">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div className="stat-info">
            <span className="stat-value">{overdueTasks}</span>
            <span className="stat-label">Tareas Vencidas</span>
          </div>
        </div>

        {/* Subtasks Completion Rate */}
        <div className="stat-card">
          <div className="stat-icon orange">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <div className="stat-info">
            <span className="stat-value">{subtaskRate}%</span>
            <span className="stat-label">Tasa de Subtareas</span>
          </div>
        </div>
      </section>

      {/* Details Grid (Charts) */}
      <section className="charts-grid">
        {/* Column Distribution */}
        <div className="chart-card" style={{ gridColumn: 'span 2' }}>
          <h2 className="chart-card-title">Distribución por Estado (Columnas)</h2>
          <div className="distribution-list">
            {boardColumns.map(col => {
              const colCount = boardCards.filter(c => c.columnId === col.id).length;
              const colPercent = getPercent(colCount);
              return (
                <div key={col.id} className="dist-item">
                  <div className="dist-meta">
                    <div className="dist-label-row">
                      <div className={`dist-dot ${col.color}`}></div>
                      <span>{col.title}</span>
                    </div>
                    <span className="dist-count">{colCount} ({colPercent}%)</span>
                  </div>
                  <div className="dist-bar-track">
                    <div 
                      className={`dist-bar-fill ${col.color}`} 
                      style={{ width: `${colPercent}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
