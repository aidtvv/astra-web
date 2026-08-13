import { useMemo } from 'react';
import FocusTimer from '../components/FocusTimer';
import { useStore } from '../store';
import { useLocalKanbanData } from '../lib/useLocalFirstData';
import type { PomodoroSession } from '../types';

const MODE_BADGE: Record<string, string> = {
  focus: 'bg-[color:var(--accent-muted)] text-[color:var(--accent-color)]',
  break: 'bg-[color:var(--tag-green)]/10 text-[color:var(--tag-green)]',
  free: 'bg-[color:var(--tag-yellow)]/10 text-[color:var(--tag-yellow)]',
};

const MODE_LABEL: Record<string, string> = { focus: '专注', break: '休息', free: '自由' };

function todaySessions(sessions: PomodoroSession[]): PomodoroSession[] {
  const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const todayKey = key(new Date());
  return sessions.filter((s) => key(new Date(s.startedAt)) === todayKey);
}

export default function FocusPage() {
  useLocalKanbanData();
  const sessions = useStore((s) => s.sessions);

  const todays = useMemo(() => todaySessions(sessions), [sessions]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-[color:var(--text-primary)]">专注计时</h1>
      <p className="mt-1 text-sm text-[color:var(--text-muted)]">心无旁骛，一次只做一件事</p>

      <div className="mt-8 flex justify-center">
        <FocusTimer />
      </div>

      <section className="mx-auto mt-12 max-w-2xl">
        <h2 className="text-base font-semibold text-[color:var(--text-primary)]">今日会话</h2>
        {todays.length === 0 ? (
          <div className="mt-4 rounded-2xl border-2 border-dashed border-[color:var(--border-color)] py-10 text-center text-sm text-[color:var(--text-muted)]">
            今天还没有专注记录，开始第一个番茄钟吧 🍅
          </div>
        ) : (
          <ul className="mt-4 flex flex-col gap-2">
            {todays.map((s) => (
              <li key={s.id} className="flex items-center justify-between rounded-2xl bg-[color:var(--card-glass-bg)] border border-[color:var(--card-glass-border)] px-4 py-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${MODE_BADGE[s.mode] ?? MODE_BADGE.free}`}>
                    {MODE_LABEL[s.mode] ?? '自由'}
                  </span>
                  <span className="text-sm font-medium text-[color:var(--text-primary)]">{s.taskTitle || '未关联任务'}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold tabular-nums text-[color:var(--text-primary)]">{s.duration} 分钟</p>
                  <p className="text-xs text-[color:var(--text-muted)]">{new Date(s.startedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
