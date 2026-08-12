import { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Monitor, Palette, Check, ChevronDown } from 'lucide-react';
import { useTheme } from '../lib/ThemeProvider';
import { THEME_LIST } from '../lib/theme';

const MODE_CONFIG: { value: 'light' | 'dark' | 'auto'; icon: typeof Sun; tooltip: string }[] = [
  { value: 'light', icon: Sun, tooltip: '浅色模式' },
  { value: 'dark', icon: Moon, tooltip: '深色模式' },
  { value: 'auto', icon: Monitor, tooltip: '跟随系统' },
];

export function ThemeSwitcher() {
  const { theme, pref, setTheme, setPref, supportsMode } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  return (
    <div ref={ref} className="relative">
      <div className="flex flex-col items-center gap-1.5">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1 rounded-full bg-[color:var(--surface-elevated)] px-2.5 py-1.5 text-[11px] font-semibold text-[color:var(--text-secondary)] transition-colors hover:text-[color:var(--text-primary)]"
          title="切换主题"
        >
          <Palette size={12} strokeWidth={1.75} />
          <span className="hidden sm:inline max-w-[60px] truncate">
            {THEME_LIST.find((t) => t.key === theme)?.label}
          </span>
          <ChevronDown size={10} strokeWidth={1.75} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        <div className="flex items-center gap-0.5 rounded-full bg-[color:var(--surface-elevated)] p-0.5">
          {MODE_CONFIG.map(({ value, icon: Icon, tooltip }) => {
            const disabled = value !== 'auto' ? !supportsMode(value) : false;
            const isActive = pref === value;
            const effectiveDisabled = value !== 'auto' ? !supportsMode(value) : false;

            return (
              <div key={value} className="relative group">
                <button
                  onClick={() => {
                    if (!disabled) setPref(value);
                  }}
                  disabled={disabled}
                  title={disabled ? '该主题仅支持深色' : tooltip}
                  className={`relative z-10 flex h-6 w-6 items-center justify-center rounded-full transition-all duration-200 ${
                    isActive
                      ? 'text-white'
                      : effectiveDisabled
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
                {disabled && (
                  <div className="pointer-events-none absolute bottom-full left-1/2 mb-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-[color:var(--surface-elevated)] px-2 py-1 text-[10px] font-medium text-[color:var(--text-secondary)] opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                    该主题仅支持深色
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {open && (
        <div className="absolute right-0 bottom-full mb-2 w-56 max-h-64 overflow-y-auto rounded-xl border border-[color:var(--border-color)] bg-[color:var(--surface-color)] p-1.5 shadow-xl z-50">
          <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--text-muted)]">
            选择主题
          </div>
          {THEME_LIST.map((t) => {
            const modeLabel = t.supportedModes === 'both' ? '深/浅' : t.supportedModes === 'dark' ? '仅深色' : '仅浅色';
            return (
              <button
                key={t.key}
                onClick={() => {
                  setTheme(t.key);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors ${
                  theme === t.key
                    ? 'bg-[color:var(--accent-muted)] text-[color:var(--accent-color)]'
                    : 'text-[color:var(--text-secondary)] hover:bg-[color:var(--hover-bg)]'
                }`}
              >
                <span
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-xs"
                  style={{ backgroundColor: t.accent + '33', color: t.accent }}
                >
                  {t.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate font-medium">{t.label}</span>
                    <span className={`rounded-full px-1.5 py-px text-[9px] font-medium ${
                      t.supportedModes === 'both'
                        ? 'bg-[color:var(--accent-muted)] text-[color:var(--accent-color)]'
                        : 'bg-[color:var(--surface-elevated)] text-[color:var(--text-muted)]'
                    }`}>
                      {modeLabel}
                    </span>
                  </div>
                </div>
                {theme === t.key && <Check size={14} strokeWidth={2} className="shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
