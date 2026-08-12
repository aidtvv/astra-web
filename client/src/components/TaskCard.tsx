import { forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Pencil, Play, Timer, Trash2 } from 'lucide-react';
import type { Task } from '../types';
import { useStore } from '../store';

const PRIORITY_LABEL: Record<Task['priority'], string> = {
  highest: '最高',
  high: '高',
  medium: '中',
  low: '低',
};

const PRIORITY_DOT: Record<Task['priority'], string> = {
  highest: 'bg-[color:var(--tag-red)]',
  high: 'bg-[color:var(--tag-orange)]',
  medium: 'bg-[color:var(--tag-yellow)]',
  low: 'bg-[color:var(--tag-green)]',
};

const PRIORITY_BADGE: Record<Task['priority'], string> = {
  highest: 'bg-[color:var(--tag-red)]/10 text-[color:var(--tag-red)]',
  high: 'bg-[color:var(--tag-orange)]/10 text-[color:var(--tag-orange)]',
  medium: 'bg-[color:var(--tag-yellow)]/10 text-[color:var(--tag-yellow)]',
  low: 'bg-[color:var(--tag-green)]/10 text-[color:var(--tag-green)]',
};

function formatTime(ts: number | null): string {
  if (!ts) return '';
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatDateOnly(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

function buildMetaRow(task: Task): { text: string; icon: 'calendar' | 'clock' | 'timer' }[] {
  const items: { text: string; icon: 'calendar' | 'clock' | 'timer' }[] = [];

  if (task.scheduledTime != null) {
    const timeStr = formatTime(task.scheduledTime);
    const dateStr = formatDateOnly(task.scheduledTime);
    items.push({ text: `${dateStr} ${timeStr}`, icon: 'clock' });
  }

  if (task.startTime != null && task.endTime != null) {
    if (task.scheduledTime != null) {
      items.pop();
    }
    const s = new Date(task.startTime);
    const e = new Date(task.endTime);
    items.push({ text: `${s.getMonth() + 1}月${s.getDate()}日 – ${e.getMonth() + 1}月${e.getDate()}日`, icon: 'calendar' });
  } else if (task.startTime != null) {
    if (task.scheduledTime != null) items.pop();
    items.push({ text: formatDateOnly(task.startTime), icon: 'calendar' });
  }

  if (task.pomodoroMinutes > 0) {
    items.push({ text: `${task.pomodoroMinutes} 分钟`, icon: 'timer' });
  }

  return items;
}

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

  const metaItems = buildMetaRow(task);

  return (
    <article
      ref={ref}
      {...rest}
      className="group cursor-grab rounded-2xl bg-[color:var(--card-glass-bg)] border border-[color:var(--card-glass-border)] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.04)] backdrop-blur-sm transition hover:shadow-[0_2px_6px_rgba(0,0,0,0.06),0_8px_24px_rgba(0,0,0,0.06)] active:cursor-grabbing"
      style={{ borderRadius: 16 }}
    >
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-2.5">
          <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${PRIORITY_DOT[task.priority]}`} />
          <h3 className="w-0 flex-1 truncate text-[17px] font-semibold leading-tight text-[color:var(--text-primary)]">
            {task.title}
          </h3>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${PRIORITY_BADGE[task.priority]}`}
          >
            {PRIORITY_LABEL[task.priority]}
          </span>
        </div>
        <div className="absolute right-0 top-0 flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={() => onEdit(task)}
            className="rounded-md p-1.5 text-[color:var(--text-muted)] transition-colors hover:bg-[color:var(--hover-bg)] hover:text-[color:var(--text-primary)]"
            title="编辑"
          >
            <Pencil size={14} strokeWidth={1.75} />
          </button>
          <button
            onClick={handleFocus}
            className="rounded-md p-1.5 text-[color:var(--text-muted)] transition-colors hover:bg-[color:var(--hover-bg)] hover:text-[color:var(--accent-color)]"
            title="专注"
          >
            <Play size={14} strokeWidth={1.75} />
          </button>
          <button
            onClick={handleDelete}
            className="rounded-md p-1.5 text-[color:var(--text-muted)] transition-colors hover:bg-[color:var(--tag-red)]/10 hover:text-[color:var(--tag-red)]"
            title="删除"
          >
            <Trash2 size={14} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {task.description && (
        <p className="mt-1.5 truncate text-[14px] text-[color:var(--text-secondary)]">
          {task.description}
        </p>
      )}

      {metaItems.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-4">
          {metaItems.map((item, i) => (
            <span key={i} className="flex items-center gap-1.5 text-xs text-[color:var(--text-muted)]">
              {item.icon === 'calendar' && <Calendar size={14} strokeWidth={1.75} />}
              {item.icon === 'clock' && <Clock size={14} strokeWidth={1.75} />}
              {item.icon === 'timer' && <Timer size={14} strokeWidth={1.75} />}
              <span>{item.text}</span>
            </span>
          ))}
        </div>
      )}

    </article>
  );
});

export default TaskCard;
