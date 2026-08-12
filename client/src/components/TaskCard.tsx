import { forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Task } from '../types';
import { useStore } from '../store';

const PRIORITY_COLOR: Record<Task['priority'], string> = {
  high: 'bg-primary',
  medium: 'bg-amber-500',
  low: 'bg-green-500',
};

const PRIORITY_LABEL: Record<Task['priority'], string> = { high: '高', medium: '中', low: '低' };

interface TaskCardProps extends React.HTMLAttributes<HTMLElement> {
  task: Task;
  onEdit: (task: Task) => void;
}

const TaskCard = forwardRef<HTMLElement, TaskCardProps>(function TaskCard({ task, onEdit, ...rest }, ref) {
  const startTimer = useStore((s) => s.startTimer);
  const deleteTask = useStore((s) => s.deleteTask);
  const navigate = useNavigate();

  async function handleFocus() {
    await startTimer('focus', task.id);
    navigate('/focus');
  }

  async function handleDelete() {
    if (window.confirm(`确定删除任务「${task.title}」吗？`)) {
      await deleteTask(task.id);
    }
  }

  return (
    <article ref={ref} {...rest} className="group cursor-grab rounded-2xl border border-black/5 bg-white p-4 shadow-sm transition hover:scale-1.02 hover:shadow-md active:cursor-grabbing">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${PRIORITY_COLOR[task.priority]}`} title={`优先级：${PRIORITY_LABEL[task.priority]}`} />
          <h3 className="truncate text-sm font-semibold text-neutral-900">{task.title}</h3>
        </div>
        <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          {PRIORITY_LABEL[task.priority]}
        </span>
      </div>

      {task.description && <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-neutral-500">{task.description}</p>}

      <div className="mt-3 flex items-center gap-3">
        <span className="flex items-center gap-1 rounded-full bg-appbg px-2 py-1 text-xs text-neutral-600">
          ⏱ {task.pomodoroMinutes} 分钟
        </span>
        {task.dueDate && (
          <span className="flex items-center gap-1 text-xs text-neutral-400">📅 {task.dueDate}</span>
        )}
      </div>

      <div className="mt-3 flex gap-1 opacity-0 transition group-hover:opacity-100">
        <button onClick={() => onEdit(task)} aria-label="编辑"
          className="flex h-7 w-7 items-center justify-center rounded-full bg-appbg text-neutral-500 transition hover:bg-primary/10 hover:text-primary active:scale-95">
          ✏️
        </button>
        <button onClick={handleFocus} aria-label="专注"
          className="flex h-7 w-7 items-center justify-center rounded-full bg-appbg text-neutral-500 transition hover:bg-primary/10 hover:text-primary active:scale-95">
          ▶
        </button>
        <button onClick={handleDelete} aria-label="删除"
          className="flex h-7 w-7 items-center justify-center rounded-full bg-appbg text-neutral-500 transition hover:bg-red-100 hover:text-red-600 active:scale-95">
          ✕
        </button>
      </div>
    </article>
  );
});

export default TaskCard;
