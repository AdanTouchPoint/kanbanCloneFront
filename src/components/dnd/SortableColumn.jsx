import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Column from '../Column';

export const SortableColumn = ({ column, cards }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: column.id,
    data: { type: 'column', column },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`sortable-column-wrapper ${isDragging ? 'dragging-column' : ''}`}
    >
      <Column column={column} cards={cards} dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  );
};
