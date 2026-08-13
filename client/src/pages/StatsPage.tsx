import { useMemo, useState } from 'react';
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
  PieChart as PieChartIcon,
  Activity,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarRectangleItem,
} from 'recharts';
import { useStore } from '../store';
import { useLocalFocusStatsData } from '../lib/useLocalFirstData';
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

function formatShortLabel(label: string, view: StatsViewRange): string {
  if (view === 'day') return '今天';
  if (view === 'year') {
    const parts = label.split('-');
    return `${parseInt(parts[1], 10)}月`;
  }
  if (view === 'all') return label;
  const parts = label.split('-');
  if (view === 'month') return `${parseInt(parts[2], 10)}`;
  return `${parseInt(parts[1], 10)}/${parseInt(parts[2], 10)}`;
}

function getChartTitle(view: StatsViewRange): string {
  switch (view) {
    case 'day':
      return '今日专注趋势';
    case 'week':
      return '本周专注趋势';
    case 'month':
      return '本月专注趋势';
    case 'year':
      return '年度专注趋势';
    case 'all':
      return '历年专注趋势';
    default:
      return '专注趋势';
  }
}

/* ─────────── Recharts BarChart ─────────── */

interface BarChartDatum {
  label: string;
  displayLabel: string;
  value: number;
}

function FocusBarChart({
  data,
  loading,
}: {
  data: BarChartDatum[];
  view?: StatsViewRange;
  loading?: boolean;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (loading) {
    return (
      <div className="flex h-56 items-center justify-center">
        <div className="flex items-end gap-1">
          {Array.from({ length: 12 }).map((_, idx) => (
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

  const hasData = data.some((d) => d.value > 0);
  if (!hasData) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-[color:var(--text-muted)]">
        暂无专注数据
      </div>
    );
  }

  const showEveryLabel = data.length <= 14;
  const interval = showEveryLabel ? 0 : Math.ceil(data.length / 14);

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 4, left: -16, bottom: 0 }}
          barCategoryGap="15%"
        >
          <defs>
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--tag-red)" stopOpacity={1} />
              <stop offset="60%" stopColor="var(--tag-red)" stopOpacity={0.7} />
              <stop offset="100%" stopColor="var(--tag-red)" stopOpacity={0.15} />
            </linearGradient>
            <linearGradient id="barGradientHover" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--tag-red)" stopOpacity={1} />
              <stop offset="100%" stopColor="var(--tag-red)" stopOpacity={0.4} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="var(--border-color)"
            strokeOpacity={0.4}
          />
          <XAxis
            dataKey="displayLabel"
            tickLine={false}
            axisLine={false}
            interval={interval}
            tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
            dy={6}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
            tickFormatter={(v: number) => formatDurationShort(v)}
            width={48}
          />
          <Tooltip
            cursor={{ fill: 'var(--hover-bg)', radius: 4 }}
            content={({ active, payload }) => {
              if (!active || !payload || payload.length === 0) return null;
              const item = payload[0].payload as BarChartDatum;
              return (
                <div
                  className="rounded-xl border border-[color:var(--border-color)] px-3 py-2 text-xs shadow-lg"
                  style={{
                    background: 'var(--glass-bg)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                  }}
                >
                  <div className="mb-0.5 font-medium text-[color:var(--text-primary)]">
                    {item.displayLabel}
                  </div>
                  <div className="flex items-center gap-1.5 text-[color:var(--text-secondary)]">
                    <span className="inline-block h-2 w-2 rounded-sm bg-[color:var(--tag-red)]" />
                    {formatDuration(item.value)}
                  </div>
                </div>
              );
            }}
          />
          <Bar
            dataKey="value"
            onMouseEnter={(_, idx) => setHoveredIdx(idx)}
            onMouseLeave={() => setHoveredIdx(null)}
            shape={(
              props: {
                x: number; y: number; width: number; height: number; index: number;
              } & BarRectangleItem,
            ) => {
              const { x, y, width, height, index } = props;
              if (height <= 0) return null;
              const isHovered = hoveredIdx === index;
              return (
                <rect
                  x={x}
                  y={y}
                  width={width}
                  height={height}
                  rx={6}
                  ry={6}
                  fill={`url(#${isHovered ? 'barGradientHover' : 'barGradient'})`}
                  style={{ transition: 'all 0.2s ease' }}
                />
              );
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─────────── Recharts DonutChart ─────────── */

function DonutChart({ segments, size = 140 }: { segments: DonutSegment[]; size?: number }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);

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

  const outerRadius = size / 2 - 2;
  const innerRadius = outerRadius - 18;

  return (
    <div style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={segments}
            dataKey="value"
            nameKey="label"
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            startAngle={90}
            endAngle={-270}
            stroke="none"
            isAnimationActive
            animationDuration={600}
          >
            {segments.map((seg, idx) => (
              <Cell key={idx} fill={seg.color} />
            ))}
          </Pie>
          {/* Center label rendered as foreignObject for crisp text */}
          <foreignObject x={0} y={0} width={size} height={size}>
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  lineHeight: 1.2,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {formatDurationShort(total)}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: 'var(--text-muted)',
                  marginTop: 4,
                }}
              >
                总时长
              </div>
            </div>
          </foreignObject>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─────────── Main StatsPage ─────────── */

export default function StatsPage() {
  const statsViewRange = useStore((s) => s.statsViewRange);
  const setStatsViewRange = useStore((s) => s.setStatsViewRange);

  const { records: focusTimeRecords, focusStats, loading: focusStatsLoading, refresh } = useLocalFocusStatsData(statsViewRange);

  const handleViewChange = (view: StatsViewRange) => {
    setStatsViewRange(view);
  };

  const handleRefresh = () => {
    refresh();
  };

  const dailyLabels = useMemo(
    () => generateDailyLabels(statsViewRange),
    [statsViewRange, focusTimeRecords]
  );

  const dailyData = useMemo(() => {
    if (focusTimeRecords.length === 0) {
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

    const aggregated: Record<string, number> = {};
    for (const record of focusTimeRecords) {
      if (record.startTime < rangeStart || record.startTime >= rangeEnd) continue;
      const duration = Math.max(0, Math.round((record.endTime - record.startTime - (record.pauseTotalTime || 0)) / 60000));
      if (duration <= 0) continue;

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

    return dailyLabels.map((label) => aggregated[label] || 0);
  }, [dailyLabels, focusTimeRecords, statsViewRange]);

  const chartData: BarChartDatum[] = useMemo(() => {
    return dailyLabels.map((label, idx) => ({
      label,
      displayLabel: formatShortLabel(label, statsViewRange),
      value: dailyData[idx],
    }));
  }, [dailyLabels, dailyData, statsViewRange]);

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

      {/* View Range Selector - Apple Segmented Control */}
      <div className="inline-flex items-center gap-0.5 rounded-lg bg-[color:var(--surface-elevated)] p-0.5 shadow-sm">
        {VIEW_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => handleViewChange(opt.value)}
            className={`relative rounded-md px-3 py-1.5 text-[13px] font-medium transition-all duration-200 ${
              statsViewRange === opt.value
                ? 'bg-[color:var(--surface-color)] text-[color:var(--text-primary)] shadow-[0_1px_3px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.08)]'
                : 'text-[color:var(--text-muted)] hover:text-[color:var(--text-secondary)]'
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
        {/* Left Column: 8 cols */}
        <div className="col-span-12 space-y-4 lg:col-span-8">
          {/* Focus Trend */}
          <div className="rounded-2xl bg-[color:var(--card-glass-bg)] border border-[color:var(--card-glass-border)] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-[color:var(--text-primary)]">
                <Activity size={15} strokeWidth={1.75} className="text-[color:var(--text-muted)]" />
                {getChartTitle(statsViewRange)}
              </h2>
              <span className="text-xs text-[color:var(--text-muted)]">单位：分钟</span>
            </div>
            <div className="mt-4">
              <FocusBarChart data={chartData} view={statsViewRange} loading={focusStatsLoading} />
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

        {/* Right Column: 4 cols */}
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
                  <PieChartIcon size={18} strokeWidth={1.75} className="text-emerald-500" />
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
