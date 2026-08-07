import { useState, useEffect } from 'react';
import { useBoards } from '../context/BoardContext';
import '../styles/BoardModal.css';

export default function BoardModal({ isOpen, onClose, boardToEdit }) {
  const { users, addBoard, updateBoard } = useBoards();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  
  const [titleError, setTitleError] = useState(false);
  const [ownerError, setOwnerError] = useState(false);

  // Search states
  const [ownerSearch, setOwnerSearch] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  
  // Focus tracking for dropdowns
  const [isOwnerSearchFocused, setIsOwnerSearchFocused] = useState(false);
  const [isMemberSearchFocused, setIsMemberSearchFocused] = useState(false);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (boardToEdit) {
      setTitle(boardToEdit.title || '');
      setDescription(boardToEdit.description || '');
      setOwnerId(boardToEdit.ownerId || '');
      setSelectedMembers(boardToEdit.memberIds || []);
    } else {
      setTitle('');
      setDescription('');
      setOwnerId('');
      setSelectedMembers([]);
    }
    setTitleError(false);
    setOwnerError(false);
    setOwnerSearch('');
    setMemberSearch('');
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [boardToEdit, isOpen]);

  if (!isOpen) return null;

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
        await updateBoard(boardToEdit.id, {
          name: trimmedTitle,
          description: description,
          ownerId: ownerId,
          membersID: selectedMembers
        });
      } else {
        await addBoard({
          name: trimmedTitle,
          description: description,
          ownerId: ownerId,
          membersID: selectedMembers
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
      <div className="board-modal-content" onClick={(e) => e.stopPropagation()}>
        <header className="board-modal-header">
          <h2 className="board-modal-title">{boardToEdit ? 'Editar Tablero' : 'Crear Nuevo Tablero'}</h2>
          <button className="board-modal-close" onClick={handleClose} title="Cerrar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        <div className="board-modal-body">
          <div className="board-form-group">
            <label className="board-form-label">Nombre del tablero <span style={{color: 'var(--danger)'}}>*</span></label>
            <input
              type="text"
              className={`board-input ${titleError ? 'error' : ''}`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej. Proyecto Alpha"
              autoFocus
            />
            {titleError && <span style={{ color: 'var(--danger)', fontSize: '12px' }}>El título es requerido.</span>}
          </div>

          <div className="board-form-group">
            <label className="board-form-label">Descripción</label>
            <textarea
              className="board-textarea"
              placeholder="Descripción opcional..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="board-form-group">
            <label className="board-form-label">Dueño / Encargado <span style={{color: 'var(--danger)'}}>*</span></label>
            {selectedOwnerUser ? (
              <div className="board-chips-container" style={{ marginBottom: 0 }}>
                <div className="board-chip">
                  {selectedOwnerUser.name}
                  <span className="board-chip-remove" onClick={() => setOwnerId('')}>×</span>
                </div>
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <input 
                  type="text" 
                  className={`board-input ${ownerError ? 'error' : ''}`}
                  placeholder="Buscar y seleccionar dueño..." 
                  value={ownerSearch}
                  onChange={(e) => setOwnerSearch(e.target.value)}
                  onFocus={() => setIsOwnerSearchFocused(true)}
                  onBlur={() => setTimeout(() => setIsOwnerSearchFocused(false), 200)}
                />
                {isOwnerSearchFocused && ownerSearch.trim() !== '' && (
                  <div className="board-dropdown-list">
                    {filteredOwners.length > 0 ? (
                      filteredOwners.map(u => (
                        <div 
                          key={u.id} 
                          className="board-dropdown-item"
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
            {ownerError && <span style={{ color: 'var(--danger)', fontSize: '12px' }}>El dueño es requerido para enviar correos.</span>}
          </div>

          <div className="board-form-group">
            <label className="board-form-label">Miembros</label>
            {selectedMembers.length > 0 && (
              <div className="board-chips-container">
                {selectedMembers.map(id => {
                  const u = users.find(usr => usr.id === id);
                  if (!u) return null;
                  return (
                    <div key={id} className="board-chip">
                      {u.name}
                      <span className="board-chip-remove" onClick={() => removeMember(id)}>×</span>
                    </div>
                  );
                })}
              </div>
            )}
            
            <div style={{ position: 'relative' }}>
              <input 
                type="text" 
                className="board-input"
                placeholder="Buscar para agregar miembros..." 
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                onFocus={() => setIsMemberSearchFocused(true)}
                onBlur={() => setTimeout(() => setIsMemberSearchFocused(false), 200)}
              />
              {isMemberSearchFocused && memberSearch.trim() !== '' && (
                <div className="board-dropdown-list">
                  {filteredMembers.length > 0 ? (
                    filteredMembers.map(u => (
                      <div 
                        key={u.id} 
                        className="board-dropdown-item"
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
