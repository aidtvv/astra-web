import { useEffect, useMemo, useState } from 'react';
import {
  Clock,
  Calendar,
  TrendingUp,
  Target,
  Flame,
  Sparkles,
  Brain,
  RefreshCw,
  ChevronRight,
  Trophy,
  Zap,
  PieChart,
  Activity,
} from 'lucide-react';
import { useStore } from '../store';
import type { StatsViewRange } from '../types';

const VIEW_OPTIONS: { value: StatsViewRange; label: string }[] = [
  { value: 'day', label: '日' },
  { value: 'week', label: '周' },
  { value: 'month', label: '月' },
  { value: 'year', label: '年' },
  { value: 'all', label: '所有' },
];

const TASK_COLORS = [
  '#fa2d48',
  '#ff9500',
  '#34c759',
  '#007aff',
  '#5856d6',
  '#ff2d55',
  '#ff9900',
  '#4cd964',
  '#5ac8fa',
  '#af52de',
];

function formatDuration(minutes: number): string {
  if (minutes === 0) return '0 分钟';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} 分钟`;
  if (m === 0) return `${h} 小时`;
  return `${h} 小时 ${m} 分钟`;
}

function formatDurationShort(minutes: number): string {
  if (minutes === 0) return '0m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function getDateRangeLabel(view: StatsViewRange): string {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (view) {
    case 'day':
      return todayStart.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
    case 'week': {
      const dayOfWeek = now.getDay();
      const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const start = new Date(todayStart);
      start.setDate(todayStart.getDate() - mondayOffset);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return `${start.getMonth() + 1}月${start.getDate()}日 - ${end.getMonth() + 1}月${end.getDate()}日`;
    }
    case 'month':
      return `${now.getFullYear()}年${now.getMonth() + 1}月`;
    case 'year':
      return `${now.getFullYear()}年`;
    case 'all':
      return '全部时间';
  }
}

function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function generateDailyLabels(view: StatsViewRange): string[] {
  const labels: string[] = [];
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (view) {
    case 'day':
      labels.push(localDateKey(today));
      break;
    case 'week': {
      const dayOfWeek = now.getDay();
      const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - (mondayOffset - i));
        labels.push(localDateKey(d));
      }
      break;
    }
    case 'month': {
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      for (let i = daysInMonth - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        labels.push(localDateKey(d));
      }
      break;
    }
    case 'year': {
      for (let m = 0; m < 12; m++) {
        labels.push(`${now.getFullYear()}-${String(m + 1).padStart(2, '0')}`);
      }
      break;
    }
    case 'all': {
      const firstRecord = useStore.getState().focusTimeRecords[0];
      if (firstRecord) {
        const startYear = new Date(firstRecord.startTime).getFullYear();
        for (let y = startYear; y <= now.getFullYear(); y++) {
          labels.push(String(y));
        }
      } else {
        labels.push(String(now.getFullYear()));
      }
      break;
    }
  }

  return labels;
}

function computeHighlights(
  taskBreakdown: Record<string, { name: string; minutes: number; sessions: number }>,
  dailyMinutes: Record<string, number>,
  longestSession: { duration: number; name: string; date: string } | null,
  focusTimeRecords: import('../types').FocusTimeRecord[],
) {
  const entries = Object.entries(taskBreakdown);
  const topCategory = entries.length > 0
    ? entries.reduce((a, b) => (a[1].minutes > b[1].minutes ? a : b))
    : null;

  const hourMap = new Map<number, number>();
  for (const record of focusTimeRecords) {
    const duration = Math.max(0, Math.round((record.endTime - record.startTime - (record.pauseTotalTime || 0)) / 60000));
    if (duration <= 0) continue;
    const hour = new Date(record.startTime).getHours();
    hourMap.set(hour, (hourMap.get(hour) || 0) + duration);
  }
  let bestHour = 0;
  let bestHourMinutes = 0;
  hourMap.forEach((mins, h) => {
    if (mins > bestHourMinutes) {
      bestHourMinutes = mins;
      bestHour = h;
    }
  });

  const bestHourLabel = bestHourMinutes > 0
    ? `${String(bestHour).padStart(2, '0')}:00 - ${String((bestHour + 1) % 24).padStart(2, '0')}:00`
    : '--';

  return {
    longest: longestSession,
    bestHour: bestHourLabel,
    bestHourMinutes,
    topCategory: topCategory ? { ...topCategory[1], name: topCategory[0] } : null,
    totalDays: Object.values(dailyMinutes).filter((m) => m > 0).length,
  };
}

interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

function DonutChart({ segments, size = 140 }: { segments: DonutSegment[]; size?: number }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const radius = size / 2 - 6;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius;
  let accumulated = 0;

  if (total === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-full bg-[color:var(--surface-elevated)]"
        style={{ width: size, height: size }}
      >
        <span className="text-xs text-[color:var(--text-muted)]">暂无数据</span>
      </div>
    );
  }

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--border-color)"
        strokeWidth={strokeWidth}
      />
      {segments.map((seg, idx) => {
        const fraction = seg.value / total;
        const dashLength = fraction * circumference;
        const dashOffset = circumference - (accumulated / total) * circumference;
        accumulated += seg.value;
        return (
          <circle
            key={idx}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={seg.color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${dashLength} ${circumference - dashLength}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="butt"
            className="transition-all duration-500"
          />
        );
      })}
      <g className="rotate-90" style={{ transformOrigin: `${size / 2}px ${size / 2}px` }}>
        <text
          x={size / 2}
          y={size / 2 - 4}
          textAnchor="middle"
          fill="currentColor"
          className="text-lg font-bold"
          style={{ transform: 'rotate(90deg)', transformOrigin: 'center', color: 'var(--text-primary)' }}
        >
          {formatDurationShort(total)}
        </text>
        <text
          x={size / 2}
          y={size / 2 + 16}
          textAnchor="middle"
          fill="currentColor"
          className="text-xs"
          style={{ transform: 'rotate(90deg)', transformOrigin: 'center', color: 'var(--text-muted)' }}
        >
          总时长
        </text>
      </g>
    </svg>
  );
}

function VerticalBarChart({
  data,
  labels,
  view,
  loading,
}: {
  data: number[];
  labels: string[];
  view: StatsViewRange;
  loading?: boolean;
}) {
  const max = Math.max(...data, 1);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (loading) {
    return (
      <div className="flex h-56 items-center justify-center">
        <div className="flex items-end gap-1">
          {Array.from({ length: Math.min(data.length, 12) }).map((_, idx) => (
            <div
              key={idx}
              className="w-6 animate-pulse rounded-t-md bg-[color:var(--surface-elevated)]"
              style={{ height: `${20 + Math.random() * 60}%` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0 || data.every((d) => d === 0)) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-[color:var(--text-muted)]">
        暂无专注数据
      </div>
    );
  }

  const isYear = view === 'year';
  const isAll = view === 'all';
  const barWidth = view === 'month' ? 12 : view === 'week' ? 28 : view === 'day' ? 80 : 32;
  const showLabels = data.length <= 31;

  return (
    <div className="relative">
      <div className="flex items-stretch gap-1" style={{ height: 200 }}>
        {data.map((minutes, idx) => {
          if (minutes <= 0) {
            return <div key={idx} style={{ width: barWidth }} className="shrink-0 self-end" />;
          }
          const heightPct = (minutes / max) * 100;
          const intensity = minutes / max;
          const bgColor = intensity > 0.75
            ? 'bg-[color:var(--tag-red)]'
            : intensity > 0.5
              ? 'bg-[color:var(--tag-red)]/75'
              : intensity > 0.25
                ? 'bg-[color:var(--tag-red)]/50'
                : 'bg-[color:var(--tag-red)]/25';

          return (
            <div
              key={idx}
              className="group relative flex flex-1 flex-col items-center self-end"
              style={{ minWidth: 0, maxWidth: `${barWidth}px`, height: '100%' }}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {hoveredIdx === idx && (
                <div className="absolute -top-9 z-10 whitespace-nowrap rounded-lg bg-[color:var(--surface-elevated)] border border-[color:var(--border-color)] px-2 py-1 text-xs text-[color:var(--text-primary)] shadow-lg">
                  {labels[idx] ? formatShortLabel(labels[idx], view) : ''} · {formatDurationShort(minutes)}
                </div>
              )}
              <div className="flex h-full w-full items-end justify-center">
                <div
                  className={`w-full rounded-t-md transition-all duration-300 ${bgColor} group-hover:brightness-110`}
                  style={{ height: `${heightPct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {showLabels && (
        <div className="mt-2 flex gap-1">
          {data.map((_, idx) => (
            <div
              key={idx}
              className="flex flex-1 items-center justify-center text-[10px] tabular-nums text-[color:var(--text-muted)]"
              style={{ minWidth: 0 }}
            >
              {isYear || isAll ? '' : formatShortLabel(labels[idx], view)}
            </div>
          ))}
        </div>
      )}

      <div className="mt-1 flex items-center justify-end gap-3 text-[10px] text-[color:var(--text-muted)]">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-[color:var(--tag-red)]/25" /> 低</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-[color:var(--tag-red)]/50" /> 中低</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-[color:var(--tag-red)]/75" /> 中高</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-[color:var(--tag-red)]" /> 高</span>
      </div>
    </div>
  );
}

function formatShortLabel(label: string, view: StatsViewRange): string {
  if (view === 'day') return '今天';
  if (view === 'year' || view === 'all') return label;
  const parts = label.split('-');
  if (view === 'month') return `${parseInt(parts[2], 10)}`;
  return `${parseInt(parts[1], 10)}/${parseInt(parts[2], 10)}`;
}

export default function StatsPage() {
  const focusStats = useStore((s) => s.focusStats);
  const focusTimeRecords = useStore((s) => s.focusTimeRecords);
  const statsViewRange = useStore((s) => s.statsViewRange);
  const focusStatsLoading = useStore((s) => s.focusStatsLoading);
  const loadFocusStats = useStore((s) => s.loadFocusStats);
  const setStatsViewRange = useStore((s) => s.setStatsViewRange);

  useEffect(() => {
    if (focusTimeRecords.length === 0) {
      loadFocusStats();
    }
  }, [loadFocusStats, focusTimeRecords.length]);

  const handleViewChange = (view: StatsViewRange) => {
    setStatsViewRange(view);
  };

  const handleRefresh = () => {
    loadFocusStats();
  };

  const dailyLabels = useMemo(
    () => generateDailyLabels(statsViewRange),
    [statsViewRange, focusTimeRecords]
  );

  const dailyData = useMemo(() => {
    if (focusTimeRecords.length === 0) {
      console.log('[StatsPage] dailyData: focusTimeRecords is empty, returning zeros');
      return dailyLabels.map(() => 0);
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    let rangeStart = 0;
    let rangeEnd = Number.MAX_SAFE_INTEGER;

    switch (statsViewRange) {
      case 'day':
        rangeStart = todayStart;
        rangeEnd = todayStart + 24 * 60 * 60 * 1000;
        break;
      case 'week': {
        const dayOfWeek = now.getDay();
        const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        rangeStart = todayStart - mondayOffset * 24 * 60 * 60 * 1000;
        rangeEnd = rangeStart + 7 * 24 * 60 * 60 * 1000;
        break;
      }
      case 'month':
        rangeStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        rangeEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();
        break;
      case 'year':
        rangeStart = new Date(now.getFullYear(), 0, 1).getTime();
        rangeEnd = new Date(now.getFullYear() + 1, 0, 1).getTime();
        break;
      case 'all':
      default:
        break;
    }

    console.log('[StatsPage] dailyData computing:', {
      view: statsViewRange,
      rangeStart: new Date(rangeStart).toISOString(),
      rangeEnd: rangeEnd === Number.MAX_SAFE_INTEGER ? 'MAX' : new Date(rangeEnd).toISOString(),
      totalRecords: focusTimeRecords.length,
      labels: dailyLabels,
    });

    const aggregated: Record<string, number> = {};
    let matchedRecords = 0;
    for (const record of focusTimeRecords) {
      if (record.startTime < rangeStart || record.startTime >= rangeEnd) continue;
      const duration = Math.max(0, Math.round((record.endTime - record.startTime - (record.pauseTotalTime || 0)) / 60000));
      if (duration <= 0) continue;
      matchedRecords++;

      if (statsViewRange === 'year') {
        const d = new Date(record.startTime);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        aggregated[key] = (aggregated[key] || 0) + duration;
      } else if (statsViewRange === 'all') {
        const d = new Date(record.startTime);
        const key = String(d.getFullYear());
        aggregated[key] = (aggregated[key] || 0) + duration;
      } else {
        const d = new Date(record.startTime);
        const key = localDateKey(d);
        aggregated[key] = (aggregated[key] || 0) + duration;
      }
    }

    const result = dailyLabels.map((label) => aggregated[label] || 0);
    console.log('[StatsPage] dailyData result:', { matchedRecords, aggregated, result });
    return result;
  }, [dailyLabels, focusTimeRecords, statsViewRange]);

  const kpis = useMemo(() => [
    {
      label: '总专注时长',
      value: formatDuration(focusStats.totalMinutes),
      icon: Clock,
      color: 'text-[color:var(--tag-red)]',
      bgColor: 'bg-[color:var(--tag-red)]/10',
    },
    {
      label: '完成会话',
      value: String(focusStats.completedSessions),
      icon: Target,
      color: 'text-[color:var(--tag-blue)]',
      bgColor: 'bg-[color:var(--tag-blue)]/10',
    },
    {
      label: '连续打卡',
      value: `${focusStats.streakDays} 天`,
      icon: Flame,
      color: 'text-[color:var(--tag-orange)]',
      bgColor: 'bg-[color:var(--tag-orange)]/10',
    },
    {
      label: '日均专注',
      value: formatDuration(focusStats.avgDailyMinutes),
      icon: TrendingUp,
      color: 'text-[color:var(--tag-green)]',
      bgColor: 'bg-[color:var(--tag-green)]/10',
    },
  ], [focusStats]);

  const sortedTasks = useMemo(() => {
    return Object.entries(focusStats.taskBreakdown)
      .sort((a, b) => b[1].minutes - a[1].minutes)
      .slice(0, 10);
  }, [focusStats.taskBreakdown]);

  const totalTaskMinutes = sortedTasks.reduce((sum, [, v]) => sum + v.minutes, 0) || 1;

  const donutSegments = useMemo<DonutSegment[]>(() => {
    return sortedTasks.map(([name, data], idx) => ({
      label: name,
      value: data.minutes,
      color: TASK_COLORS[idx % TASK_COLORS.length],
    }));
  }, [sortedTasks]);

  const highlights = useMemo(() => computeHighlights(
    focusStats.taskBreakdown,
    focusStats.dailyMinutes,
    focusStats.longestSession,
    focusTimeRecords,
  ), [focusStats, focusTimeRecords]);

  const recentSessions = useMemo(() => {
    return focusTimeRecords
      .filter((r) => {
        const duration = Math.max(0, Math.round((r.endTime - r.startTime - (r.pauseTotalTime || 0)) / 60000));
        return duration > 0;
      })
      .slice(0, 6);
  }, [focusTimeRecords]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[color:var(--text-primary)]">统计</h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-[color:var(--text-muted)]">
            <Calendar size={14} strokeWidth={1.75} />
            {getDateRangeLabel(statsViewRange)}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={focusStatsLoading}
          className="flex h-9 w-9 items-center justify-center rounded-full text-[color:var(--text-muted)] transition-colors hover:bg-[color:var(--hover-bg)] hover:text-[color:var(--text-primary)] active:scale-95 disabled:opacity-50"
          title="刷新数据"
        >
          <RefreshCw size={16} strokeWidth={1.75} className={focusStatsLoading ? 'animate-spin' : ''} style={{ animationDuration: '1s' }} />
        </button>
      </div>

      {/* View Range Selector */}
      <div className="flex items-center gap-1 rounded-xl bg-[color:var(--surface-color)] p-1 shadow-sm">
        {VIEW_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => handleViewChange(opt.value)}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              statsViewRange === opt.value
                ? 'bg-[color:var(--accent-color)] text-white shadow-sm'
                : 'text-[color:var(--text-secondary)] hover:bg-[color:var(--hover-bg)] hover:text-[color:var(--text-primary)]'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-4 gap-3">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-2xl bg-[color:var(--card-glass-bg)] border border-[color:var(--card-glass-border)] p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
            <div className="flex items-center justify-between">
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${k.bgColor}`}>
                <k.icon size={16} strokeWidth={1.75} className={k.color} />
              </div>
            </div>
            <p className="mt-3 text-xl font-bold tabular-nums text-[color:var(--text-primary)]">{k.value}</p>
            <p className="mt-0.5 text-xs text-[color:var(--text-muted)]">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-12 gap-4">
        {/* Left Column: 8 cols (66%) */}
        <div className="col-span-12 space-y-4 lg:col-span-8">
          {/* Daily Focus Trend - Vertical Bar Chart */}
          <div className="rounded-2xl bg-[color:var(--card-glass-bg)] border border-[color:var(--card-glass-border)] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-[color:var(--text-primary)]">
                <Activity size={15} strokeWidth={1.75} className="text-[color:var(--text-muted)]" />
                每日专注趋势
              </h2>
              <span className="text-xs text-[color:var(--text-muted)]">单位：分钟</span>
            </div>
            <div className="mt-4">
              <VerticalBarChart data={dailyData} labels={dailyLabels} view={statsViewRange} loading={focusStatsLoading} />
            </div>
          </div>

          {/* Recent Sessions */}
          <div className="rounded-2xl bg-[color:var(--card-glass-bg)] border border-[color:var(--card-glass-border)] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-[color:var(--text-primary)]">
                <Clock size={15} strokeWidth={1.75} className="text-[color:var(--text-muted)]" />
                最近专注
              </h2>
              <span className="text-xs text-[color:var(--text-muted)]">共 {focusTimeRecords.length} 条</span>
            </div>
            <div className="mt-3">
              {recentSessions.length === 0 ? (
                <div className="flex h-24 items-center justify-center text-sm text-[color:var(--text-muted)]">
                  暂无专注记录
                </div>
              ) : (
                <div className="divide-y divide-[color:var(--border-color)]">
                  {recentSessions.map((record) => {
                    const duration = Math.max(0, Math.round((record.endTime - record.startTime - (record.pauseTotalTime || 0)) / 60000));
                    const startDate = new Date(record.startTime);
                    const dateStr = `${startDate.getMonth() + 1}月${startDate.getDate()}日`;
                    const timeStr = `${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}`;

                    return (
                      <div key={record.uuid} className="flex items-center gap-3" style={{ height: '44px' }}>
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[color:var(--surface-elevated)]">
                          <Calendar size={14} strokeWidth={1.75} className="text-[color:var(--text-muted)]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-[color:var(--text-primary)]">
                            {record.name || '未命名任务'}
                          </p>
                          <p className="text-xs text-[color:var(--text-muted)]">
                            {dateStr} {timeStr}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full bg-[color:var(--accent-color)] px-2.5 py-0.5 text-xs font-semibold tabular-nums text-white">
                          {formatDurationShort(duration)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: 4 cols (33%) */}
        <div className="col-span-12 space-y-4 lg:col-span-4">
          {/* Highlights Widget */}
          <div className="relative overflow-hidden rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-[color:var(--card-glass-border)]"
               style={{
                 background: 'linear-gradient(135deg, var(--bg-primary) 0%, var(--accent-muted) 100%)',
               }}>
            <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-[color:var(--glass-bg)] blur-2xl" />
            <h2 className="flex items-center gap-2 text-sm font-semibold text-[color:var(--text-primary)]">
              <Sparkles size={15} strokeWidth={1.75} className="text-amber-500" />
              专注亮点
            </h2>

            <div className="mt-4 space-y-3">
              {/* Longest Session */}
              <div className="flex items-center gap-3 rounded-xl bg-[color:var(--glass-bg)] border border-[color:var(--glass-border)] p-3 backdrop-blur-sm">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
                  <Trophy size={18} strokeWidth={1.75} className="text-amber-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-bold tabular-nums text-[color:var(--text-primary)]">
                    {highlights.longest
                      ? formatDuration(Math.round(highlights.longest.duration / 60000))
                      : '--'}
                  </p>
                  <p className="truncate text-xs text-[color:var(--text-muted)]">
                    {highlights.longest ? `${highlights.longest.name} · ${highlights.longest.date}` : '暂无记录'}
                  </p>
                </div>
              </div>

              {/* Best Hour */}
              <div className="flex items-center gap-3 rounded-xl bg-[color:var(--glass-bg)] border border-[color:var(--glass-border)] p-3 backdrop-blur-sm">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                  <Zap size={18} strokeWidth={1.75} className="text-blue-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold tabular-nums text-[color:var(--text-primary)]">
                    {highlights.bestHour}
                  </p>
                  <p className="truncate text-xs text-[color:var(--text-muted)]">
                    最佳时段 · {formatDurationShort(highlights.bestHourMinutes)}
                  </p>
                </div>
              </div>

              {/* Top Category */}
              <div className="flex items-center gap-3 rounded-xl bg-[color:var(--glass-bg)] border border-[color:var(--glass-border)] p-3 backdrop-blur-sm">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                  <PieChart size={18} strokeWidth={1.75} className="text-emerald-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[color:var(--text-primary)]">
                    {highlights.topCategory?.name ?? '--'}
                  </p>
                  <p className="truncate text-xs text-[color:var(--text-muted)]">
                    {highlights.topCategory
                      ? `${formatDurationShort(highlights.topCategory.minutes)} · ${highlights.topCategory.sessions}次`
                      : '暂无数据'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Task Breakdown Donut */}
          <div className="rounded-2xl bg-[color:var(--card-glass-bg)] border border-[color:var(--card-glass-border)] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-[color:var(--text-primary)]">
              <Brain size={15} strokeWidth={1.75} className="text-[color:var(--text-muted)]" />
              任务分类占比
            </h2>
            <div className="mt-4 flex items-center gap-4">
              <DonutChart segments={donutSegments} size={130} />
              <div className="min-w-0 flex-1 space-y-2">
                {sortedTasks.slice(0, 5).map(([name, data], idx) => {
                  const pct = (data.minutes / totalTaskMinutes) * 100;
                  const color = TASK_COLORS[idx % TASK_COLORS.length];
                  return (
                    <div key={name} className="space-y-0.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 truncate text-[color:var(--text-secondary)]">
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                          <span className="truncate">{name}</span>
                        </span>
                        <span className="shrink-0 font-medium tabular-nums text-[color:var(--text-muted)]">
                          {pct.toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-1 rounded-full bg-[color:var(--surface-elevated)]">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: color }}
                        />
                      </div>
                    </div>
                  );
                })}
                {sortedTasks.length === 0 && (
                  <p className="text-xs text-[color:var(--text-muted)]">暂无数据</p>
                )}
              </div>
            </div>

            {sortedTasks.length > 5 && (
              <div className="mt-3 border-t border-[color:var(--border-color)] pt-3">
                <button className="flex w-full items-center justify-center gap-1 text-xs text-[color:var(--text-muted)] transition-colors hover:text-[color:var(--text-primary)]">
                  查看更多 <ChevronRight size={12} />
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
