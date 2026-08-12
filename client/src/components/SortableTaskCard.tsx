import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Task } from '../types';
import TaskCard from './TaskCard';

interface Props {
  task: Task;
  onEdit: (task: Task) => void;
}

export default function SortableTaskCard({ task, onEdit }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  return (
    <TaskCard
      ref={setNodeRef}
      task={task}
      onEdit={onEdit}
      style={style}
      {...attributes}
      {...listeners}
    />
  );
}
