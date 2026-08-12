import { useState } from 'react';
import { Play, Pause, Square } from 'lucide-react';
import { useStore, MODE_MINUTES, type FocusMode } from '../store';

const MODES: { key: FocusMode; label: string }[] = [
  { key: 'focus', label: '专注' },
  { key: 'break', label: '休息' },
  { key: 'free', label: '自由' },
];

function fmt(seconds: number) {
  const m = String(Math.floor(seconds / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}

export default function FocusTimer() {
  const { status, mode, totalSeconds, remainingSeconds, taskId, tasks, setMode, startTimer, pauseTimer, resumeTimer, endTimer } = useStore();
  const [selectedTaskId, setSelectedTaskId] = useState<string | ''>('');

  const progress = totalSeconds > 0 ? remainingSeconds / totalSeconds : 1;
  const R = 128;
  const CIRC = 2 * Math.PI * R;

  function handleStart() {
    const tid = selectedTaskId === '' ? null : selectedTaskId;
    startTimer(mode, tid);
  }

  return (
    <div className="flex flex-col items-center">
      <div className="flex gap-2 rounded-full bg-white p-1.5 shadow-sm">
        {MODES.map((m) => (
          <button
            key={m.key}
            onClick={() => setMode(m.key)}
            disabled={status !== 'idle'}
            className={`rounded-full px-5 py-2 text-sm font-medium transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${
              mode === m.key ? 'bg-primary text-white' : 'text-neutral-600 hover:bg-appbg'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="relative mt-8 flex h-72 w-72 items-center justify-center">
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 288 288">
          <circle cx="144" cy="144" r={R} fill="none" stroke="#e8e8ed" strokeWidth="12" />
          <circle
            cx="144" cy="144" r={R} fill="none" stroke="#fa2d48" strokeWidth="12" strokeLinecap="round"
            strokeDasharray={`${CIRC} ${CIRC}`} strokeDashoffset={CIRC * (1 - progress)}
          />
        </svg>
        <div className="text-center">
          <div className="font-mono text-6xl font-bold tabular-nums text-neutral-900">{fmt(remainingSeconds)}</div>
          <div className="mt-2 text-sm font-medium text-neutral-500">{MODE_MINUTES[mode]} 分钟 · {MODES.find((m) => m.key === mode)!.label}</div>
        </div>
      </div>

      <div className="mt-8 flex items-center gap-3">
        {status === 'idle' ? (
          <button onClick={handleStart}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-white shadow-lg transition hover:bg-primary-hover active:scale-95">
            <Play size={24} strokeWidth={2} />
          </button>
        ) : status === 'paused' ? (
          <button onClick={resumeTimer}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-white shadow-lg transition hover:bg-primary-hover active:scale-95">
            <Play size={24} strokeWidth={2} />
          </button>
        ) : (
          <button onClick={pauseTimer}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-900 text-white shadow-lg transition active:scale-95">
            <Pause size={24} strokeWidth={2} />
          </button>
        )}
        {status !== 'idle' && (
          <button onClick={() => endTimer(false)}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-appbg text-neutral-500 transition hover:bg-red-100 hover:text-red-600 active:scale-95"
            aria-label="结束">
            <Square size={18} strokeWidth={2} fill="currentColor" />
          </button>
        )}
      </div>

      <div className="mt-6 w-64">
        <label className="block text-sm font-medium text-neutral-600">关联任务</label>
        <select
          value={taskId ?? selectedTaskId}
          onChange={(e) => setSelectedTaskId(e.target.value)}
          disabled={status !== 'idle'}
          className="mt-1.5 w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary disabled:opacity-60"
        >
          <option value="">不关联任务（自由模式）</option>
          {tasks.map((t) => (
            <option key={t.id} value={t.id}>{t.title}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
