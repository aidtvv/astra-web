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
      <div className="flex gap-2 rounded-full bg-[color:var(--surface-color)] p-1.5 shadow-sm">
        {MODES.map((m) => (
          <button
            key={m.key}
            onClick={() => setMode(m.key)}
            disabled={status !== 'idle'}
            className={`rounded-full px-5 py-2 text-sm font-medium transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${
              mode === m.key ? 'bg-[color:var(--accent-color)] text-white' : 'text-[color:var(--text-secondary)] hover:bg-[color:var(--hover-bg)]'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="relative mt-8 flex h-72 w-72 items-center justify-center">
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 288 288">
          <circle cx="144" cy="144" r={R} fill="none" stroke="var(--border-color)" strokeWidth="12" />
          <circle
            cx="144" cy="144" r={R} fill="none" stroke="var(--pomodoro-primary)" strokeWidth="12" strokeLinecap="round"
            strokeDasharray={`${CIRC} ${CIRC}`} strokeDashoffset={CIRC * (1 - progress)}
          />
        </svg>
        <div className="text-center">
          <div className="font-mono text-6xl font-bold tabular-nums text-[color:var(--text-primary)]">{fmt(remainingSeconds)}</div>
          <div className="mt-2 text-sm font-medium text-[color:var(--text-muted)]">{MODE_MINUTES[mode]} 分钟 · {MODES.find((m) => m.key === mode)!.label}</div>
        </div>
      </div>

      <div className="mt-8 flex items-center gap-3">
        {status === 'idle' ? (
          <button onClick={handleStart}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-[color:var(--accent-color)] text-white shadow-lg transition hover:bg-[color:var(--accent-hover)] active:scale-95">
            <Play size={24} strokeWidth={2} />
          </button>
        ) : status === 'paused' ? (
          <button onClick={resumeTimer}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-[color:var(--accent-color)] text-white shadow-lg transition hover:bg-[color:var(--accent-hover)] active:scale-95">
            <Play size={24} strokeWidth={2} />
          </button>
        ) : (
          <button onClick={pauseTimer}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-[color:var(--text-primary)] text-[color:var(--bg-primary)] shadow-lg transition active:scale-95">
            <Pause size={24} strokeWidth={2} />
          </button>
        )}
        {status !== 'idle' && (
          <button onClick={() => endTimer(false)}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-[color:var(--surface-color)] text-[color:var(--text-muted)] transition hover:bg-[color:var(--tag-red)]/10 hover:text-[color:var(--tag-red)] active:scale-95"
            aria-label="结束">
            <Square size={18} strokeWidth={2} fill="currentColor" />
          </button>
        )}
      </div>

      <div className="mt-6 w-64">
        <label className="block text-sm font-medium text-[color:var(--text-secondary)]">关联任务</label>
        <select
          value={taskId ?? selectedTaskId}
          onChange={(e) => setSelectedTaskId(e.target.value)}
          disabled={status !== 'idle'}
          className="mt-1.5 w-full rounded-xl border border-[color:var(--border-color)] bg-[color:var(--surface-color)] px-3 py-2.5 text-sm text-[color:var(--text-primary)] outline-none focus:border-[color:var(--accent-color)] disabled:opacity-60"
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
