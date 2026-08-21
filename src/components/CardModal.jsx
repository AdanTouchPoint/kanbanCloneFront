import { useRef, useState, useId } from 'react';
import { useBoards } from '../context/BoardContext';
import { useTasks } from '../context/TaskContext';
import { useUI } from '../context/UIContext';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import '../styles/CardModal.css';

const COLOR_PRESETS = [
  { value: '#DF1449', label: 'Rojo' },
  { value: '#F97316', label: 'Naranja' },
  { value: '#EAB308', label: 'Amarillo' },
  { value: '#10B981', label: 'Verde' },
  { value: '#14B8A6', label: 'Teal' },
  { value: '#0EA5E9', label: 'Cyan' },
];

export default function CardModal() {
  const { columns, activeBoardId, users, myBoards } = useBoards();
  const { cards, updateCard, deleteCard, duplicateCard, addSubtask, updateSubtask, deleteSubtask, updateColorNameOnBoard } = useTasks();
  const { activeCardId, setActiveCardId } = useUI();

  const card = cards.find((c) => c.id === activeCardId);
  const activeBoard = myBoards.find((b) => b.id === activeBoardId);
  const boardMembers = users.filter(
    (u) => activeBoard?.memberIds?.includes(u.id) || u.id === activeBoard?.authorId
  );

  if (!card) return null;

  return (
    <CardModalForm
      key={card.id}
      card={card}
      boardMembers={boardMembers}
      availableColumns={columns.filter((col) => col.boardId === activeBoardId)}
      allUsers={users}
      cards={cards}
      onClose={() => {
        if (card.isDraft) deleteCard(card.id);
        setActiveCardId(null);
      }}
      onDeleteCard={() => deleteCard(card.id)}
      onDuplicate={async () => {
        await duplicateCard(card.id);
      }}
      onSave={async (draftState) => {
        const trimmed = draftState.title.trim();
        if (!trimmed) return false;

        await Promise.all(
          draftState.subtasksToDelete.map((subId) => deleteSubtask(card.id, subId))
        );
        for (const sub of draftState.subtasks) {
          if (sub.isNew) {
            await addSubtask(card.id, sub.title, sub.memberIds?.[0] || '', sub.dueDate);
          } else {
            const original = card.subtasks.find((s) => s.id === sub.id);
            if (original) {
              const hasChanged =
                original.title !== sub.title ||
                original.completed !== sub.completed ||
                original.dueDate !== sub.dueDate ||
                JSON.stringify(original.memberIds) !== JSON.stringify(sub.memberIds);
              if (hasChanged) {
                await updateSubtask(card.id, sub.id, {
                  title: sub.title,
                  completed: sub.completed,
                  dueDate: sub.dueDate,
                  assigneeId: sub.memberIds?.[0] || '',
                });
              }
            }
          }
        }

        await updateCard(card.id, {
          title: trimmed,
          description: draftState.description,
          columnId: draftState.columnId,
          dueDate: draftState.dueDate,
          assigneeId: draftState.assigneeId,
          color: draftState.color,
          colorName: draftState.colorName,
          isDraft: false,
        });

        if (draftState.color && draftState.colorName !== card.colorName) {
          await updateColorNameOnBoard(draftState.color, draftState.colorName.trim());
        }

        return true;
      }}
    />
  );
}

function CardModalForm({
  card,
  boardMembers,
  availableColumns,
  allUsers,
  cards,
  onClose,
  onDeleteCard,
  onDuplicate,
  onSave,
}) {
  const [localTitle, setLocalTitle] = useState(card.title || '');
  const [localDesc, setLocalDesc] = useState(card.description || '');
  const [localColorName, setLocalColorName] = useState(card.colorName || '');
  const [localColumnId, setLocalColumnId] = useState(card.columnId || '');
  const [localDueDate, setLocalDueDate] = useState(card.dueDate || '');
  const [localAssigneeId, setLocalAssigneeId] = useState(card.assigneeId || '');
  const [localColor, setLocalColor] = useState(card.color || null);
  const [localSubtasks, setLocalSubtasks] = useState(() =>
    card.subtasks ? [...card.subtasks] : []
  );
  const [subtasksToDelete, setSubtasksToDelete] = useState([]);

  const [newSubtask, setNewSubtask] = useState('');
  const [newSubtaskAssignee, setNewSubtaskAssignee] = useState('');
  const [newSubtaskDate, setNewSubtaskDate] = useState('');
  const [titleError, setTitleError] = useState(false);
  const [duplicateState, setDuplicateState] = useState('idle'); // idle | pending | success

  const containerRef = useRef(null);
  const titleId = useId();
  const descId = useId();
  const columnId = useId();
  const dueId = useId();
  const assigneeId = useId();
  const colorId = useId();
  useFocusTrap(true, containerRef, onClose);

  const handleClose = onClose;

  const handleCancel = onClose;

  const handleSave = async () => {
    const trimmed = localTitle.trim();
    if (!trimmed) {
      setTitleError(true);
      return;
    }
    try {
      const ok = await onSave({
        title: localTitle,
        description: localDesc,
        colorName: localColorName,
        columnId: localColumnId,
        dueDate: localDueDate,
        assigneeId: localAssigneeId,
        color: localColor,
        subtasks: localSubtasks,
        subtasksToDelete,
      });
      if (ok) onClose();
    } catch (err) {
      console.error('Error al guardar cambios de la tarea:', err);
    }
  };

  const handleToggleSubtaskLocal = (_cardId, subtaskId) => {
    setLocalSubtasks((prev) =>
      prev.map((s) => (s.id === subtaskId ? { ...s, completed: !s.completed } : s))
    );
  };

  const handleUpdateSubtaskLocal = (_cardId, subtaskId, updatedData) => {
    setLocalSubtasks((prev) =>
      prev.map((s) => {
        if (s.id !== subtaskId) return s;
        const extra = {};
        if (updatedData.assigneeId !== undefined) {
          const matched = allUsers.find((u) => u.id === updatedData.assigneeId);
          extra.assignee = matched ? matched.name : '';
          extra.memberIds = updatedData.assigneeId ? [updatedData.assigneeId] : [];
        }
        return { ...s, ...updatedData, ...extra };
      })
    );
  };

  const handleDeleteSubtaskLocal = (_cardId, subtaskId) => {
    if (typeof subtaskId === 'string' && !subtaskId.startsWith('temp-')) {
      setSubtasksToDelete((prev) => [...prev, subtaskId]);
    }
    setLocalSubtasks((prev) => prev.filter((s) => s.id !== subtaskId));
  };

  const handleAddSubtaskLocal = (title, assigneeId, dueDate) => {
    const matched = allUsers.find((u) => u.id === assigneeId);
    const newSub = {
      id: `temp-${Date.now()}`,
      title,
      completed: false,
      assignee: matched ? matched.name : '',
      dueDate,
      memberIds: assigneeId ? [assigneeId] : [],
      isNew: true,
    };
    setLocalSubtasks((prev) => [...prev, newSub]);
  };

  const handleAddSubtaskSubmit = (e) => {
    e.preventDefault();
    if (!newSubtask.trim()) return;
    handleAddSubtaskLocal(newSubtask.trim(), newSubtaskAssignee.trim(), newSubtaskDate);
    setNewSubtask('');
    setNewSubtaskAssignee('');
    setNewSubtaskDate('');
  };

  const handleDuplicateCard = async () => {
    if (duplicateState !== 'idle') return;
    setDuplicateState('pending');
    try {
      await onDuplicate();
      setDuplicateState('success');
      setTimeout(() => setDuplicateState('idle'), 2000);
    } catch {
      setDuplicateState('idle');
    }
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        ref={containerRef}
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <header className="modal-header">
          <div className="modal-header-title-row">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }} aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="9" y1="3" x2="9" y2="21" />
            </svg>
            <input
              id={titleId}
              type="text"
              className={`modal-title-input ${titleError ? 'error' : ''}`}
              value={localTitle}
              onChange={(e) => setLocalTitle(e.target.value)}
              aria-label="Título de la tarea"
              aria-invalid={titleError || undefined}
              aria-describedby={titleError ? 'card-title-error' : undefined}
              placeholder="El título no puede estar vacío"
            />
          </div>
          <button className="modal-close-btn" onClick={handleClose} aria-label="Cerrar modal">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        <div className="modal-body">
          <div className="modal-main-col">
            <div className="modal-field-group">
              <label htmlFor={descId} className="modal-field-label">Descripción</label>
              <textarea
                id={descId}
                className="modal-desc-textarea"
                placeholder="Añade una descripción más detallada..."
                value={localDesc}
                onChange={(e) => setLocalDesc(e.target.value)}
              />
            </div>

            <div className="modal-field-group">
              <span className="modal-field-label">Subtareas</span>
              <div className="subtasks-list">
                {localSubtasks.map((sub) => (
                  <SubtaskRow
                    key={sub.id}
                    sub={sub}
                    cardId={card.id}
                    boardMembers={boardMembers}
                    toggleSubtask={handleToggleSubtaskLocal}
                    deleteSubtask={handleDeleteSubtaskLocal}
                    updateSubtask={handleUpdateSubtaskLocal}
                  />
                ))}
              </div>
              <form className="add-subtask-form" onSubmit={handleAddSubtaskSubmit}>
                <div className="add-subtask-inputs">
                  <label htmlFor="new-subtask-title" className="sr-only">Título de la subtarea</label>
                  <input
                    id="new-subtask-title"
                    type="text"
                    className="add-subtask-title-input"
                    placeholder="Nueva subtarea..."
                    value={newSubtask}
                    onChange={(e) => setNewSubtask(e.target.value)}
                    required
                  />
                  <div className="add-subtask-sub-row">
                    <label htmlFor="new-subtask-assignee" className="sr-only">Asignar subtarea a</label>
                    <select
                      id="new-subtask-assignee"
                      className="add-subtask-assignee-select"
                      value={newSubtaskAssignee}
                      onChange={(e) => setNewSubtaskAssignee(e.target.value)}
                    >
                      <option value="">Asignar a...</option>
                      {boardMembers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                    <label htmlFor="new-subtask-date" className="sr-only">Fecha de la subtarea</label>
                    <input
                      id="new-subtask-date"
                      type="date"
                      className="add-subtask-date-input"
                      value={newSubtaskDate}
                      onChange={(e) => setNewSubtaskDate(e.target.value)}
                    />
                  </div>
                </div>
                <button type="submit" className="add-subtask-btn">
                  Añadir
                </button>
              </form>
            </div>
          </div>

          <div className="modal-sidebar-col">
            <div className="modal-field-group">
              <label htmlFor={columnId} className="modal-field-label">Estado (Columna)</label>
              <select
                id={columnId}
                className="modal-select"
                value={localColumnId}
                onChange={(e) => setLocalColumnId(e.target.value)}
              >
                {availableColumns.map((col) => (
                  <option key={col.id} value={col.id}>{col.title}</option>
                ))}
              </select>
            </div>

            <div className="modal-field-group">
              <label htmlFor={dueId} className="modal-field-label">Fecha de Vencimiento</label>
              <input
                id={dueId}
                type="date"
                className="modal-input"
                value={localDueDate || ''}
                onChange={(e) => setLocalDueDate(e.target.value)}
              />
            </div>

            <div className="modal-field-group">
              <label htmlFor={assigneeId} className="modal-field-label">Asignado a</label>
              <select
                id={assigneeId}
                className="modal-select"
                value={localAssigneeId || ''}
                onChange={(e) => setLocalAssigneeId(e.target.value)}
              >
                <option value="">Sin asignar</option>
                {boardMembers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="modal-field-group">
              <span id={colorId} className="modal-field-label">Color de Tarjeta</span>
              <div className="card-color-picker" role="radiogroup" aria-labelledby={colorId}>
                {COLOR_PRESETS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    role="radio"
                    aria-checked={localColor === p.value}
                    aria-label={p.label}
                    className={`color-picker-dot ${localColor === p.value ? 'active' : ''}`}
                    style={{ backgroundColor: p.value }}
                    onClick={() => {
                      const newColor = localColor === p.value ? null : p.value;
                      const existingCardWithColor = cards.find(
                        (c) => c.color === newColor && c.colorName
                      );
                      const defaultName = existingCardWithColor
                        ? existingCardWithColor.colorName
                        : '';
                      setLocalColor(newColor);
                      setLocalColorName(defaultName);
                    }}
                  />
                ))}
                {localColor && (
                  <button
                    type="button"
                    className="color-picker-clear-btn"
                    onClick={() => { setLocalColor(null); setLocalColorName(''); }}
                    aria-label="Quitar color"
                  >
                    ×
                  </button>
                )}
              </div>
              {localColor && (
                <div style={{ marginTop: '8px' }}>
                  <label htmlFor="card-color-name" className="sr-only">Nombre del color</label>
                  <input
                    id="card-color-name"
                    type="text"
                    className="modal-input"
                    placeholder="Nombrar este color..."
                    value={localColorName}
                    onChange={(e) => setLocalColorName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.target.blur();
                    }}
                    title="Ponle un nombre a este color para todo el tablero"
                  />
                </div>
              )}
            </div>

            <button
              className={`modal-sidebar-duplicate-btn ${duplicateState === 'success' ? 'success' : ''}`}
              onClick={handleDuplicateCard}
              disabled={duplicateState === 'pending'}
              title="Duplicar esta tarea en la misma columna"
            >
              {duplicateState === 'pending' ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="spin-icon">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
              ) : duplicateState === 'success' ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              )}
              <span>
                {duplicateState === 'pending'
                  ? 'Duplicando...'
                  : duplicateState === 'success'
                    ? '¡Duplicada!'
                    : 'Duplicar Tarea'}
              </span>
            </button>

            <button
              className="modal-sidebar-delete-btn"
              onClick={onDeleteCard}
              title="Eliminar esta tarea definitivamente"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              <span>Eliminar Tarea</span>
            </button>
          </div>
        </div>

        <footer className="modal-footer">
          {titleError && (
            <span
              id="card-title-error"
              role="alert"
              className="modal-error-message"
              style={{ color: 'var(--danger)', marginRight: 'auto', fontSize: '13px', display: 'flex', alignItems: 'center' }}
            >
              ⚠️ El título es requerido
            </span>
          )}
          <button className="modal-cancel-btn" onClick={handleCancel}>
            Cancelar
          </button>
          <button
            className="modal-save-btn"
            onClick={handleSave}
            disabled={!localTitle.trim()}
            style={!localTitle.trim() ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
          >
            Guardar Cambios
          </button>
        </footer>
      </div>
    </div>
  );
}

function SubtaskRow({ sub, cardId, boardMembers, toggleSubtask, deleteSubtask, updateSubtask }) {
  const [isEditing, setIsEditing] = useState(false);
  const [localTitle, setLocalTitle] = useState(sub.title);

  const handleBlur = () => {
    setIsEditing(false);
    const trimmed = localTitle.trim();
    if (trimmed && trimmed !== sub.title) {
      updateSubtask(cardId, sub.id, { title: trimmed });
    } else {
      setLocalTitle(sub.title);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.target.blur();
    } else if (e.key === 'Escape') {
      setLocalTitle(sub.title);
      setIsEditing(false);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const isOverdue = !sub.completed && sub.dueDate && sub.dueDate < todayStr;

  return (
    <div className={`subtask-item-wrapper ${isOverdue ? 'overdue' : ''}`}>
      <div className="subtask-item">
        <input
          type="checkbox"
          id={`subtask-${sub.id}`}
          className="subtask-checkbox"
          checked={sub.completed}
          onChange={() => toggleSubtask(cardId, sub.id)}
          aria-label={`Marcar subtarea ${sub.title}`}
        />
        {isEditing ? (
          <input
            type="text"
            className="subtask-title-edit-input"
            value={localTitle}
            onChange={(e) => setLocalTitle(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            aria-label="Editar título de la subtarea"
            autoFocus
          />
        ) : (
          <label
            htmlFor={`subtask-${sub.id}`}
            className={`subtask-title ${sub.completed ? 'completed' : ''}`}
            onClick={() => setIsEditing(true)}
            title="Haz clic para editar la subtarea"
            style={{ cursor: 'pointer' }}
          >
            {sub.title}
          </label>
        )}
        <button
          className="subtask-delete-btn"
          onClick={() => deleteSubtask(cardId, sub.id)}
          aria-label={`Eliminar subtarea ${sub.title}`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
          </svg>
        </button>
      </div>

      <div className="subtask-details-row">
        <div className="subtask-detail-field">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <select
            className="subtask-inline-select"
            value={sub.memberIds?.[0] || ''}
            onChange={(e) => updateSubtask(cardId, sub.id, { assigneeId: e.target.value })}
            title="Responsable de la subtarea"
            style={{
              border: 'none',
              background: 'transparent',
              color: 'var(--text-secondary)',
              fontSize: '11px',
              cursor: 'pointer',
              outline: 'none',
              padding: 0,
            }}
          >
            <option value="" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>Sin asignar</option>
            {boardMembers.map((u) => (
              <option key={u.id} value={u.id} style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
        <div className={`subtask-detail-field ${isOverdue ? 'overdue' : ''}`}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <input
            type="date"
            className={`subtask-inline-date ${isOverdue ? 'overdue' : ''}`}
            value={sub.dueDate || ''}
            onChange={(e) => updateSubtask(cardId, sub.id, { dueDate: e.target.value })}
            title={isOverdue ? '¡Subtarea vencida!' : 'Fecha límite de la subtarea'}
          />
        </div>
      </div>
    </div>
  );
}
