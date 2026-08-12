import { useEffect, useState } from 'react';
import type { Task, Column } from '../types';
import { useStore } from '../store';

interface TaskModalProps {
  open: boolean;
  onClose: () => void;
  task?: Task | null;
  columns: Column[];
}

const PRIORITIES: { value: Task['priority']; label: string }[] = [
  { value: 'high', label: '高' },
  { value: 'medium', label: '中' },
  { value: 'low', label: '低' },
];

export default function TaskModal({ open, onClose, task, columns }: TaskModalProps) {
  const createTask = useStore((s) => s.createTask);
  const updateTask = useStore((s) => s.updateTask);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Task['priority']>('medium');
  const [columnId, setColumnId] = useState<number | ''>('');
  const [dueDate, setDueDate] = useState('');

  useEffect(() => {
    if (open) {
      // modalDefaultColumn is a one-shot hint set by KanbanPage's per-column "＋" button
      const defaultColumnId = useStore.getState().modalDefaultColumn ?? columns[0]?.id ?? '';
      setTitle(task?.title ?? '');
      setDescription(task?.description ?? '');
      setPriority(task?.priority ?? 'medium');
      setColumnId(task?.columnId ?? defaultColumnId);
      setDueDate(task?.dueDate ?? '');
      useStore.setState({ modalDefaultColumn: null });
    }
  }, [open, task, columns]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    if (task) {
      await updateTask(task.id, {
        title: title.trim(),
        description,
        priority,
        columnId: columnId as number,
        dueDate: dueDate || null,
      });
    } else {
      await createTask({ title: title.trim(), description, priority, columnId: columnId as number, dueDate: dueDate || null });
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-[18px] bg-white p-6 shadow-2xl"
      >
        <h2 className="text-lg font-bold text-neutral-900">{task ? '编辑任务' : '新建任务'}</h2>

        <label className="mt-5 block text-sm font-medium text-neutral-600">标题</label>
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="要做点什么？"
          className="mt-1.5 w-full rounded-xl border border-black/10 px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />

        <label className="mt-4 block text-sm font-medium text-neutral-600">描述</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="补充细节…"
          className="mt-1.5 w-full resize-none rounded-xl border border-black/10 px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />

        <label className="mt-4 block text-sm font-medium text-neutral-600">优先级</label>
        <div className="mt-1.5 flex gap-2">
          {PRIORITIES.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPriority(p.value)}
              className={`flex-1 rounded-full px-3 py-1.5 text-sm font-medium transition active:scale-95 ${
                priority === p.value ? 'bg-primary text-white' : 'bg-appbg text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-neutral-600">所属列</label>
            <select
              value={columnId}
              onChange={(e) => setColumnId(Number(e.target.value))}
              className="mt-1.5 w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-primary"
            >
              {columns.map((c) => (
                <option key={c.id} value={c.id}>{c.emoji} {c.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-600">截止日期</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose}
            className="rounded-full px-5 py-2 text-sm font-medium text-neutral-500 transition hover:bg-appbg active:scale-95">
            取消
          </button>
          <button type="submit" disabled={!title.trim()}
            className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover active:scale-95 disabled:opacity-50">
            保存
          </button>
        </div>
      </form>
    </div>
  );
}
