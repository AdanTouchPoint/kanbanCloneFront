import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCorners,
  DragOverlay,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useCallback, useState } from 'react';

export const DndContextProvider = ({ children, onDragEnd, onDragOver, renderOverlay }) => {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const [activeItem, setActiveItem] = useState(null);

  const handleDragStart = useCallback((event) => {
    setActiveItem(event.active.data.current ?? null);
  }, []);

  const handleDragEnd = useCallback(
    (event) => {
      setActiveItem(null);
      onDragEnd?.(event);
    },
    [onDragEnd]
  );

  const handleDragOver = useCallback(
    (event) => {
      onDragOver?.(event);
    },
    [onDragOver]
  );

  const handleDragCancel = useCallback(() => {
    setActiveItem(null);
  }, []);

  const announcements = {
    onDragStart: ({ active }) => `Agarrando ${active.data.current?.type || 'elemento'}.`,
    onDragOver: ({ active, over }) =>
      over
        ? `El elemento ${active.data.current?.type || ''} está sobre ${over.data.current?.type || 'una zona'}.`
        : `El elemento ${active.data.current?.type || ''} ya no está sobre una zona.`,
    onDragEnd: ({ active, over }) =>
      over
        ? `El elemento ${active.data.current?.type || ''} se soltó sobre ${over.data.current?.type || 'una zona'}.`
        : `Se canceló el arrastre.`,
    onDragCancel: () => 'Se canceló el arrastre.',
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      accessibility={{ announcements }}
    >
      {children}
      <DragOverlay>{activeItem && renderOverlay ? renderOverlay(activeItem) : null}</DragOverlay>
    </DndContext>
  );
};
