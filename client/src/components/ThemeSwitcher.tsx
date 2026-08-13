import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Sun, Moon, Monitor, Palette, Check } from 'lucide-react';
import { useTheme } from '../lib/ThemeProvider';
import { THEME_LIST } from '../lib/theme';

const MODE_CONFIG: { value: 'light' | 'dark' | 'auto'; icon: typeof Sun; tooltip: string }[] = [
  { value: 'light', icon: Sun, tooltip: '浅色模式' },
  { value: 'dark', icon: Moon, tooltip: '深色模式' },
  { value: 'auto', icon: Monitor, tooltip: '跟随系统' },
];

interface PopoverPos {
  left: number;
  top: number;
  placement: 'right' | 'left';
}

const MARGIN = 20;

function usePopoverPosition(
  triggerRef: React.RefObject<HTMLElement | null>,
  panelSize: { w: number; h: number },
  open: boolean,
): PopoverPos {
  const [pos, setPos] = useState<PopoverPos>({ left: 0, top: 0, placement: 'right' });

  const compute = () => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let left = rect.right + 8;
    let top = rect.top;
    let placement: 'right' | 'left' = 'right';

    if (left + panelSize.w + MARGIN > vw) {
      left = rect.left - panelSize.w - 8;
      placement = 'left';
    }
    if (left < MARGIN) {
      left = MARGIN;
    }

    if (top + panelSize.h + MARGIN > vh) {
      top = Math.max(MARGIN, vh - panelSize.h - MARGIN);
    }
    if (top < MARGIN) {
      top = MARGIN;
    }

    setPos({ left, top, placement });
  };

  useLayoutEffect(() => {
    if (open) compute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, panelSize.w, panelSize.h]);

  useEffect(() => {
    if (!open) return;
    const handler = () => compute();
    window.addEventListener('scroll', handler, true);
    window.addEventListener('resize', handler);
    return () => {
      window.removeEventListener('scroll', handler, true);
      window.removeEventListener('resize', handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return pos;
}

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelSizeRef = useRef({ w: 300, h: 200 });

  const pos = usePopoverPosition(triggerRef, panelSizeRef.current, open);

  useEffect(() => {
    if (!open || !panelRef.current) return;
    const r = panelRef.current.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) {
      panelSizeRef.current = { w: r.width, h: r.height };
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        panelRef.current && !panelRef.current.contains(t) &&
        triggerRef.current && !triggerRef.current.contains(t)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setOpen((v) => !v)}
        className={`flex h-7 w-7 items-center justify-center rounded-full transition-all duration-200 ${
          open
            ? 'bg-[color:var(--accent-muted)] text-[color:var(--accent-color)]'
            : 'bg-[color:var(--surface-elevated)] text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] hover:bg-[color:var(--hover-bg)]'
        }`}
        title="选择主题"
      >
        <Palette size={13} strokeWidth={1.75} />
      </button>

      {open && createPortal(
        <div
          ref={panelRef}
          className="fixed z-[9999]"
          style={{ left: pos.left, top: pos.top }}
        >
          {/* Arrow */}
          <div
            className="absolute top-4 flex h-3 w-3 items-center justify-center"
            style={pos.placement === 'right'
              ? { left: -6, transform: 'rotate(45deg)', background: 'var(--surface-color)', borderLeft: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }
              : { right: -6, transform: 'rotate(45deg)', background: 'var(--surface-color)', borderRight: '1px solid var(--border-color)', borderTop: '1px solid var(--border-color)' }
            }
          />
          <div
            className="relative w-[296px] rounded-2xl border border-[color:var(--border-color)] p-3 shadow-2xl animate-popover"
            style={{
              background: 'var(--glass-bg)',
              backdropFilter: 'blur(24px) saturate(180%)',
              WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            }}
          >
            {/* Header */}
            <div className="mb-2.5 flex items-center justify-between px-1">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[color:var(--text-muted)]">
                主题
              </h3>
              <span className="rounded-full bg-[color:var(--surface-elevated)] px-1.5 py-px text-[9px] font-medium text-[color:var(--text-muted)]">
                {THEME_LIST.length} 个
              </span>
            </div>

            {/* Grid: 3 columns */}
            <div className="grid grid-cols-3 gap-2">
              {THEME_LIST.map((t) => {
                const isActive = theme === t.key;
                const modeBadge = t.supportedModes === 'both'
                  ? { label: '双', cls: 'bg-[color:var(--accent-muted)] text-[color:var(--accent-color)]' }
                  : t.supportedModes === 'dark'
                    ? { label: '🌙', cls: 'bg-[color:var(--surface-elevated)] text-[color:var(--text-muted)]' }
                    : { label: '☀', cls: 'bg-[color:var(--surface-elevated)] text-[color:var(--text-muted)]' };

                return (
                  <button
                    key={t.key}
                    onClick={() => {
                      setTheme(t.key);
                      setOpen(false);
                    }}
                    className={`group relative flex flex-col items-center gap-1.5 rounded-xl p-2 transition-all duration-200 ${
                      isActive
                        ? 'bg-[color:var(--surface-elevated)] ring-2 ring-[color:var(--accent-color)]'
                        : 'hover:bg-[color:var(--hover-bg)]'
                    }`}
                  >
                    {/* Color swatch */}
                    <div
                      className={`relative flex h-12 w-full items-center justify-center rounded-lg overflow-hidden transition-transform duration-200 ${isActive ? 'scale-[1.02]' : 'group-hover:scale-[1.02]'}`}
                      style={{
                        background: `linear-gradient(135deg, ${t.surface}, ${t.accent}33)`,
                      }}
                    >
                      {/* Accent dot */}
                      <div
                        className="h-4 w-4 rounded-full shadow-sm"
                        style={{ backgroundColor: t.accent, boxShadow: `0 0 12px ${t.accent}40` }}
                      />
                      {/* Emoji watermark */}
                      <span className="absolute bottom-0.5 right-1 text-[9px] opacity-50">
                        {t.emoji}
                      </span>
                      {/* Check mark */}
                      {isActive && (
                        <div className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[color:var(--accent-color)] text-white shadow-sm">
                          <Check size={9} strokeWidth={3} />
                        </div>
                      )}
                    </div>

                    {/* Mode badge */}
                    <span className={`rounded-full px-1.5 py-px text-[8px] font-medium leading-none ${modeBadge.cls}`}>
                      {modeBadge.label}
                    </span>

                    {/* Label */}
                    <span className={`w-full truncate text-center text-[10px] font-medium leading-tight ${
                      isActive ? 'text-[color:var(--text-primary)]' : 'text-[color:var(--text-secondary)]'
                    }`}>
                      {t.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

export function ModeSwitcher() {
  const { pref, setPref, supportsMode } = useTheme();

  return (
    <div className="flex items-center gap-0.5 rounded-full bg-[color:var(--surface-elevated)] p-0.5">
      {MODE_CONFIG.map(({ value, icon: Icon, tooltip }) => {
        const disabled = value !== 'auto' ? !supportsMode(value) : false;
        const isActive = pref === value;

        return (
          <div key={value} className="relative group">
            <button
              onClick={() => {
                if (!disabled) setPref(value);
              }}
              disabled={disabled}
              title={disabled ? '该主题仅支持此模式' : tooltip}
              className={`relative z-10 flex h-6 w-6 items-center justify-center rounded-full transition-all duration-200 ${
                isActive
                  ? 'text-white'
                  : disabled
                    ? 'text-[color:var(--text-muted)] opacity-40 cursor-not-allowed'
                    : 'text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]'
              }`}
            >
              <Icon size={12} strokeWidth={2} />
            </button>
            {isActive && (
              <div
                className="absolute inset-0 rounded-full bg-[color:var(--accent-color)] shadow-sm transition-all duration-200"
                style={{ zIndex: 0 }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function AppearanceControls() {
  return (
    <div className="flex items-center gap-1.5">
      <ModeSwitcher />
      <div className="h-4 w-px bg-[color:var(--border-color)]" />
      <ThemeSwitcher />
    </div>
  );
}
