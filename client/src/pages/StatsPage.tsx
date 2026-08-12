import { useEffect } from 'react';
import { useStore } from '../store';

function heatColor(minutes: number): string {
  if (minutes <= 0) return '#e8e8ed';
  if (minutes < 25) return '#ffd3da';
  if (minutes < 50) return '#ff9aa8';
  return '#fa2d48';
}

function formatTotal(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function StatsPage() {
  const daily = useStore((s) => s.daily);
  const summary = useStore((s) => s.summary);
  const loadStats = useStore((s) => s.loadStats);

  useEffect(() => { loadStats(); }, [loadStats]);

  const kpis = [
    { label: '总专注时长', value: formatTotal(summary.totalMinutes), hint: '累计专注分钟数' },
    { label: '总会话数', value: String(summary.totalSessions), hint: '完成的番茄钟' },
    { label: '连续打卡', value: `${summary.streakDays} 天`, hint: '连续专注天数' },
    { label: '今日专注', value: `${summary.todayMinutes} 分钟`, hint: '今天已投入' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900">统计</h1>
      <p className="mt-1 text-sm text-neutral-500">回顾你的专注轨迹</p>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-neutral-500">{k.label}</p>
            <p className="mt-2 text-2xl font-bold tabular-nums text-neutral-900">{k.value}</p>
            <p className="mt-1 text-xs text-neutral-400">{k.hint}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-neutral-800">近 30 天专注热力图</h2>
        <div className="mt-5 grid grid-cols-10 gap-2">
          {daily.map((d) => (
            <div
              key={d.date}
              data-testid="heat-cell"
              title={`${d.date} · ${d.minutes} 分钟`}
              className="aspect-square w-full rounded-[6px] transition hover:scale-110"
              style={{ backgroundColor: heatColor(d.minutes) }}
            />
          ))}
        </div>
        <div className="mt-4 flex items-center gap-2 text-xs text-neutral-400">
          <span>少</span>
          {['#e8e8ed', '#ffd3da', '#ff9aa8', '#fa2d48'].map((c) => (
            <span key={c} className="h-3 w-3 rounded-[3px]" style={{ backgroundColor: c }} />
          ))}
          <span>多</span>
        </div>
      </div>
    </div>
  );
}
