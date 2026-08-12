import { useState, useRef, useEffect } from 'react';
import { RefreshCw, CheckCircle2, AlertCircle, Cloud } from 'lucide-react';
import { useStore, type SyncStatus } from '../store';

function formatRelativeTime(ts: number | null): string {
  if (!ts) return '';
  const diff = Date.now() - ts;
  if (diff < 60_000) return '刚刚';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`;
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const ANIMATION_EASING = 'cubic-bezier(0.4, 0, 0.2, 1)';

const STATE_CONFIG: Record<SyncStatus, { bg: string; fg: string; hoverBg: string; tooltip: string }> = {
  idle: {
    bg: 'bg-gray-100',
    fg: 'text-gray-400',
    hoverBg: 'hover:bg-gray-200',
    tooltip: '等待同步',
  },
  syncing: {
    bg: 'bg-amber-500/10',
    fg: 'text-amber-500',
    hoverBg: '',
    tooltip: '正在同步数据...',
  },
  synced: {
    bg: 'bg-emerald-500/10',
    fg: 'text-emerald-500',
    hoverBg: 'hover:bg-emerald-500/20',
    tooltip: '已同步到云端',
  },
  error: {
    bg: 'bg-rose-500/10',
    fg: 'text-rose-500',
    hoverBg: 'hover:bg-rose-500/20',
    tooltip: '同步失败，点击重试',
  },
};

export default function SyncStatusButton() {
  const syncStatus = useStore((s) => s.syncStatus);
  const lastSyncTime = useStore((s) => s.lastSyncTime);
  const pendingOps = useStore((s) => s.pendingOps);
  const triggerSync = useStore((s) => s.triggerSync);
  const retryOp = useStore((s) => s.retryOp);

  const [showTooltip, setShowTooltip] = useState(false);
  const [bumpKey, setBumpKey] = useState(0);
  const [shakeKey, setShakeKey] = useState(0);
  const prevStatus = useRef<SyncStatus>('idle');
  const tooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (syncStatus === 'synced' && prevStatus.current !== 'synced') {
      setBumpKey((k) => k + 1);
      if (tooltipRef.current) clearTimeout(tooltipRef.current);
      tooltipRef.current = setTimeout(() => {
        setShowTooltip(false);
      }, 3500);
    }
    if (syncStatus === 'error' && prevStatus.current !== 'error') {
      setShakeKey((k) => k + 1);
      setShowTooltip(true);
      if (tooltipRef.current) clearTimeout(tooltipRef.current);
    }
    prevStatus.current = syncStatus;
  }, [syncStatus]);

  useEffect(() => {
    return () => {
      if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
      if (tooltipRef.current) clearTimeout(tooltipRef.current);
    };
  }, []);

  const config = STATE_CONFIG[syncStatus];
  const pendingCount = pendingOps.length;
  const hasErrors = pendingOps.some((o) => o.status === 'error');

  const handleClick = async () => {
    if (syncStatus === 'syncing') return;
    if (hasErrors) {
      const failedOp = pendingOps.find((o) => o.status === 'error');
      if (failedOp) {
        retryOp(failedOp.id);
        return;
      }
    }
    await triggerSync();
  };

  const handleMouseEnter = () => {
    setShowTooltip(true);
    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
  };

  const handleMouseLeave = () => {
    if (syncStatus === 'error' || hasErrors) return;
    tooltipTimerRef.current = setTimeout(() => {
      setShowTooltip(false);
    }, 200);
  };

  let tooltipText: string;
  if (hasErrors) {
    const failedOp = pendingOps.find((o) => o.status === 'error');
    tooltipText = `同步失败: ${failedOp?.error ?? '未知错误'} · 点击重试`;
  } else if (syncStatus === 'syncing' && pendingCount > 0) {
    tooltipText = `正在上传 ${pendingCount} 项变更...`;
  } else if (syncStatus === 'synced') {
    tooltipText = `已同步到云端 ${lastSyncTime ? `(${formatRelativeTime(lastSyncTime)})` : ''}`;
  } else {
    tooltipText = config.tooltip;
  }

  const isDisabled = syncStatus === 'syncing' && !hasErrors;

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        disabled={isDisabled}
        title={tooltipText}
        aria-label={tooltipText}
        className={`relative flex h-8 w-8 items-center justify-center rounded-full transition-all duration-300 ${config.bg} ${config.fg} ${!isDisabled ? config.hoverBg : ''} ${!isDisabled ? 'cursor-pointer hover:scale-110 active:scale-95' : 'cursor-not-allowed'}`}
        style={{ transitionTimingFunction: ANIMATION_EASING }}
      >
        <span
          key={shakeKey}
          className="inline-flex"
          style={syncStatus === 'error' || hasErrors ? { animation: 'sync-shake 0.4s cubic-bezier(0.4, 0, 0.2, 1)' } : undefined}
        >
          {hasErrors && <AlertCircle size={16} strokeWidth={1.75} />}
          {!hasErrors && syncStatus === 'syncing' && (
            <RefreshCw size={16} strokeWidth={1.75} className="animate-spin" style={{ animationDuration: '1s' }} />
          )}
          {!hasErrors && syncStatus === 'synced' && (
            <span key={bumpKey} className="inline-flex" style={{ animation: 'sync-pop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
              <CheckCircle2 size={16} strokeWidth={1.75} />
            </span>
          )}
          {!hasErrors && syncStatus === 'idle' && <Cloud size={16} strokeWidth={1.75} />}
          {!hasErrors && syncStatus === 'error' && <AlertCircle size={16} strokeWidth={1.75} />}
        </span>

        {pendingCount > 0 && !hasErrors && (
          <span className="absolute -top-1 -right-1 flex min-h-[16px] min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
            {pendingCount > 99 ? '99+' : pendingCount}
          </span>
        )}

        {syncStatus === 'synced' && !hasErrors && pendingCount === 0 && (
          <span
            className="absolute -bottom-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-emerald-500 ring-2 ring-white"
            style={{ animation: 'sync-pop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
          />
        )}
      </button>

      {showTooltip && (
        <div
          className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-neutral-900 px-3 py-1.5 text-[11px] font-medium text-white shadow-lg pointer-events-none"
          style={{ animation: 'tooltip-fade 0.2s cubic-bezier(0.4, 0, 0.2, 1)' }}
        >
          {tooltipText}
          <span className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-neutral-900" />
        </div>
      )}
    </div>
  );
}
