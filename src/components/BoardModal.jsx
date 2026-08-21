import { useRef, useState, useId } from 'react';
import { useBoards } from '../context/BoardContext';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import '../styles/BoardModal.css';

export default function BoardModal({ isOpen, onClose, boardToEdit }) {
  const { users, addBoard, updateBoard } = useBoards();

  if (!isOpen) return null;

  return (
    <BoardModalForm
      key={boardToEdit?.id ?? 'new'}
      boardToEdit={boardToEdit}
      users={users}
      onClose={onClose}
      onCreate={addBoard}
      onUpdate={updateBoard}
    />
  );
}

function BoardModalForm({ boardToEdit, users, onClose, onCreate, onUpdate }) {
  const [title, setTitle] = useState(boardToEdit?.title || '');
  const [description, setDescription] = useState(boardToEdit?.description || '');
  const [ownerId, setOwnerId] = useState(boardToEdit?.ownerId || '');
  const [selectedMembers, setSelectedMembers] = useState(boardToEdit?.memberIds || []);

  const containerRef = useRef(null);
  const titleId = useId();
  const descId = useId();
  const ownerIdId = useId();
  const memberIdId = useId();
  useFocusTrap(true, containerRef, onClose);

  const [titleError, setTitleError] = useState(false);
  const [ownerError, setOwnerError] = useState(false);

  const [ownerSearch, setOwnerSearch] = useState('');
  const [memberSearch, setMemberSearch] = useState('');

  const [isOwnerSearchFocused, setIsOwnerSearchFocused] = useState(false);
  const [isMemberSearchFocused, setIsMemberSearchFocused] = useState(false);

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setOwnerId('');
    setSelectedMembers([]);
    setTitleError(false);
    setOwnerError(false);
    setOwnerSearch('');
    setMemberSearch('');
    setIsOwnerSearchFocused(false);
    setIsMemberSearchFocused(false);
    onClose();
  };

  const handleSave = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setTitleError(true);
      return;
    }
    setTitleError(false);

    if (!ownerId) {
      setOwnerError(true);
      return;
    }
    setOwnerError(false);

    try {
      if (boardToEdit) {
        await onUpdate(boardToEdit.id, {
          name: trimmedTitle,
          description: description,
          ownerId: ownerId,
          membersID: selectedMembers,
        });
      } else {
        await onCreate({
          name: trimmedTitle,
          description: description,
          ownerId: ownerId,
          membersID: selectedMembers,
        });
      }
      handleClose();
    } catch (err) {
      console.error(boardToEdit ? 'Error al actualizar el tablero:' : 'Error al crear el tablero:', err);
    }
  };

  const removeMember = (userId) => {
    setSelectedMembers(prev => prev.filter(id => id !== userId));
  };

  const filteredOwners = users.filter(u => 
    ownerSearch.trim() !== '' && 
    (u.name.toLowerCase().includes(ownerSearch.toLowerCase()) || u.email.toLowerCase().includes(ownerSearch.toLowerCase()))
  );

  const filteredMembers = users.filter(u => 
    !selectedMembers.includes(u.id) && 
    memberSearch.trim() !== '' && 
    (u.name.toLowerCase().includes(memberSearch.toLowerCase()) || u.email.toLowerCase().includes(memberSearch.toLowerCase()))
  );

  const selectedOwnerUser = users.find(u => u.id === ownerId);

  return (
    <div className="board-modal-overlay" onClick={handleClose}>
      <div
        ref={containerRef}
        className="board-modal-content"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <header className="board-modal-header">
          <h2 id={titleId} className="board-modal-title">{boardToEdit ? 'Editar Tablero' : 'Crear Nuevo Tablero'}</h2>
          <button className="board-modal-close" onClick={handleClose} aria-label="Cerrar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        <div className="board-modal-body">
          <div className="board-form-group">
            <label htmlFor={titleId + '-input'} className="board-form-label">Nombre del tablero <span style={{color: 'var(--danger)'}} aria-hidden="true">*</span></label>
            <input
              id={titleId + '-input'}
              type="text"
              className={`board-input ${titleError ? 'error' : ''}`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej. Proyecto Alpha"
              aria-required="true"
              aria-invalid={titleError || undefined}
              autoFocus
            />
            {titleError && <span role="alert" style={{ color: 'var(--danger)', fontSize: '12px' }}>El título es requerido.</span>}
          </div>

          <div className="board-form-group">
            <label htmlFor={descId} className="board-form-label">Descripción</label>
            <textarea
              id={descId}
              className="board-textarea"
              placeholder="Descripción opcional..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="board-form-group">
            <label className="board-form-label">Dueño / Encargado <span style={{color: 'var(--danger)'}} aria-hidden="true">*</span></label>
            {selectedOwnerUser ? (
              <div className="board-chips-container" style={{ marginBottom: 0 }}>
                <div className="board-chip">
                  {selectedOwnerUser.name}
                  <button
                    type="button"
                    className="board-chip-remove"
                    onClick={() => setOwnerId('')}
                    aria-label={`Quitar a ${selectedOwnerUser.name}`}
                  >
                    ×
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <input
                  id={ownerIdId}
                  type="text"
                  className={`board-input ${ownerError ? 'error' : ''}`}
                  placeholder="Buscar y seleccionar dueño..."
                  value={ownerSearch}
                  onChange={(e) => setOwnerSearch(e.target.value)}
                  onFocus={() => setIsOwnerSearchFocused(true)}
                  onBlur={() => setTimeout(() => setIsOwnerSearchFocused(false), 200)}
                  aria-required="true"
                  aria-invalid={ownerError || undefined}
                  role="combobox"
                  aria-expanded={isOwnerSearchFocused && ownerSearch.trim() !== ''}
                  aria-autocomplete="list"
                />
                {isOwnerSearchFocused && ownerSearch.trim() !== '' && (
                  <div className="board-dropdown-list" role="listbox">
                    {filteredOwners.length > 0 ? (
                      filteredOwners.map(u => (
                        <div
                          key={u.id}
                          className="board-dropdown-item"
                          role="option"
                          aria-selected="false"
                          onClick={() => {
                            setOwnerId(u.id);
                            setOwnerSearch('');
                            setIsOwnerSearchFocused(false);
                          }}
                        >
                          <div style={{fontWeight: 500}}>{u.name}</div>
                          <div style={{fontSize: '12px', color: 'var(--text-muted)'}}>{u.email}</div>
                        </div>
                      ))
                    ) : (
                      <div className="board-dropdown-item" style={{ color: 'var(--text-muted)', cursor: 'default' }}>
                        No se encontraron usuarios.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            {ownerError && <span role="alert" style={{ color: 'var(--danger)', fontSize: '12px' }}>El dueño es requerido para enviar correos.</span>}
          </div>

          <div className="board-form-group">
            <label htmlFor={memberIdId} className="board-form-label">Miembros</label>
            {selectedMembers.length > 0 && (
              <div className="board-chips-container">
                {selectedMembers.map(id => {
                  const u = users.find(usr => usr.id === id);
                  if (!u) return null;
                  return (
                    <div key={id} className="board-chip">
                      {u.name}
                      <button
                        type="button"
                        className="board-chip-remove"
                        onClick={() => removeMember(id)}
                        aria-label={`Quitar a ${u.name}`}
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ position: 'relative' }}>
              <input
                id={memberIdId}
                type="text"
                className="board-input"
                placeholder="Buscar para agregar miembros..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                onFocus={() => setIsMemberSearchFocused(true)}
                onBlur={() => setTimeout(() => setIsMemberSearchFocused(false), 200)}
                role="combobox"
                aria-expanded={isMemberSearchFocused && memberSearch.trim() !== ''}
                aria-autocomplete="list"
              />
              {isMemberSearchFocused && memberSearch.trim() !== '' && (
                <div className="board-dropdown-list" role="listbox">
                  {filteredMembers.length > 0 ? (
                    filteredMembers.map(u => (
                      <div
                        key={u.id}
                        className="board-dropdown-item"
                        role="option"
                        aria-selected="false"
                        onClick={() => {
                          setSelectedMembers(prev => [...prev, u.id]);
                          setMemberSearch('');
                          setIsMemberSearchFocused(false);
                        }}
                      >
                        <div style={{fontWeight: 500}}>{u.name}</div>
                        <div style={{fontSize: '12px', color: 'var(--text-muted)'}}>{u.email}</div>
                      </div>
                    ))
                  ) : (
                    <div className="board-dropdown-item" style={{ color: 'var(--text-muted)', cursor: 'default' }}>
                      No se encontraron más usuarios.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <footer className="board-modal-footer">
          <button className="board-btn-cancel" onClick={handleClose}>
            Cancelar
          </button>
          <button
            className="board-btn-save"
            onClick={handleSave}
            disabled={!title.trim() || !ownerId}
          >
            {boardToEdit ? 'Guardar Cambios' : 'Crear Tablero'}
          </button>
        </footer>
      </div>
    </div>
  );
}
