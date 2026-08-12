import { useStore } from '../store';

const MODE_LABEL = { focus: '专注', break: '休息', free: '自由' } as const;

function fmt(seconds: number) {
  const m = String(Math.floor(seconds / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}

export default function PlayerBar() {
  const { status, mode, totalSeconds, remainingSeconds, taskId, tasks, pauseTimer, resumeTimer, endTimer } = useStore();
  const task = tasks.find((t) => t.id === taskId);
  const active = status !== 'idle';
  const progress = totalSeconds > 0 ? remainingSeconds / totalSeconds : 1;
  const R = 16;
  const CIRC = 2 * Math.PI * R;
  const label = active
    ? task?.title ?? `${MODE_LABEL[mode]}时间`
    : '未在计时';

  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
      <div className="flex min-w-[380px] items-center gap-5 rounded-full border border-black/5 bg-white/70 px-5 py-3 shadow-xl backdrop-blur-2xl">
        <div className="w-44">
          <p className="truncate text-sm font-semibold text-neutral-900">{label}</p>
          <p className="text-xs text-neutral-400">{MODE_LABEL[mode]}模式</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => (status === 'running' ? pauseTimer() : status === 'paused' ? resumeTimer() : undefined)}
            disabled={!active}
            aria-label="播放或暂停"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-900 text-white transition hover:bg-neutral-700 active:scale-95 disabled:opacity-40"
          >
            {status === 'running' ? '❚❚' : '▶'}
          </button>
          <button
            onClick={() => endTimer(false)}
            disabled={!active}
            aria-label="结束"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white transition hover:bg-primary-hover active:scale-95 disabled:opacity-40"
          >
            ⏹
          </button>
        </div>

        <div className="flex items-center gap-2">
          <svg width="40" height="40" viewBox="0 0 40 40">
            <circle cx="20" cy="20" r={R} fill="none" stroke="#e8e8ed" strokeWidth="4" />
            <circle
              cx="20" cy="20" r={R} fill="none" stroke="#fa2d48" strokeWidth="4" strokeLinecap="round"
              strokeDasharray={`${CIRC} ${CIRC}`} strokeDashoffset={CIRC * (1 - progress)} transform="rotate(-90 20 20)"
            />
          </svg>
          <span className="w-12 text-right font-mono text-sm tabular-nums text-neutral-700">{fmt(remainingSeconds)}</span>
        </div>
      </div>
    </div>
  );
}
