import { forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Timer } from 'lucide-react';
import type { Task } from '../types';
import { useStore } from '../store';

const PRIORITY_LABEL: Record<Task['priority'], string> = {
  highest: '最高',
  high: '高',
  medium: '中',
  low: '低',
};

const PRIORITY_DOT: Record<Task['priority'], string> = {
  highest: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-amber-500',
  low: 'bg-green-500',
};

const PRIORITY_BADGE: Record<Task['priority'], string> = {
  highest: 'bg-red-500/10 text-red-500',
  high: 'bg-orange-500/10 text-orange-500',
  medium: 'bg-amber-500/10 text-amber-600',
  low: 'bg-green-500/10 text-green-600',
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
      className="group cursor-grab rounded-2xl bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.04)] transition hover:shadow-[0_2px_6px_rgba(0,0,0,0.06),0_8px_24px_rgba(0,0,0,0.06)] active:cursor-grabbing"
      style={{ borderRadius: 16 }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5 flex-1">
          <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${PRIORITY_DOT[task.priority]}`} />
          <h3 className="truncate text-[17px] font-semibold leading-tight text-black">
            {task.title}
          </h3>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${PRIORITY_BADGE[task.priority]}`}
        >
          {PRIORITY_LABEL[task.priority]}
        </span>
      </div>

      {task.description && (
        <p className="mt-1.5 truncate text-[14px] text-[#8E8E93]">
          {task.description}
        </p>
      )}

      {metaItems.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-4">
          {metaItems.map((item, i) => (
            <span key={i} className="flex items-center gap-1.5 text-xs text-gray-400">
              {item.icon === 'calendar' && <Calendar size={14} strokeWidth={1.75} />}
              {item.icon === 'clock' && <Clock size={14} strokeWidth={1.75} />}
              {item.icon === 'timer' && <Timer size={14} strokeWidth={1.75} />}
              <span>{item.text}</span>
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 flex gap-1.5 opacity-0 transition group-hover:opacity-100">
        <button
          onClick={() => onEdit(task)}
          className="rounded-full px-3 py-1 text-xs text-[#8E8E93] transition hover:bg-black/5 hover:text-black active:scale-95"
        >
          编辑
        </button>
        <button
          onClick={handleFocus}
          className="rounded-full px-3 py-1 text-xs text-[#8E8E93] transition hover:bg-black/5 hover:text-black active:scale-95"
        >
          专注
        </button>
        <button
          onClick={handleDelete}
          className="rounded-full px-3 py-1 text-xs text-[#8E8E93] transition hover:bg-red-50 hover:text-red-500 active:scale-95"
        >
          删除
        </button>
      </div>
    </article>
  );
});

export default TaskCard;
