import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { type AppThemeKey, type ThemeMode, type ThemePref, getThemeCSSVars, THEME_DEFINITIONS, supportsMode as _supportsMode, getEffectiveMode } from './theme';

const STORAGE_KEY = 'astra-theme';

interface ThemeContextValue {
  theme: AppThemeKey;
  mode: ThemeMode;
  pref: ThemePref;
  setTheme: (theme: AppThemeKey) => void;
  setPref: (pref: ThemePref) => void;
  toggleMode: () => void;
  resolvedMode: ThemeMode;
  supportsMode: (mode: ThemeMode) => boolean;
  unsupportedMode: ThemeMode | null;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getSystemMode(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyThemeVars(theme: AppThemeKey, mode: ThemeMode) {
  const vars = getThemeCSSVars(theme, mode);
  const root = document.documentElement;
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
  root.setAttribute('data-theme', theme);
  root.setAttribute('data-mode', mode);
  root.classList.toggle('dark', mode === 'dark');
  root.classList.toggle('light', mode === 'light');
}

interface SavedThemeState {
  theme: AppThemeKey;
  pref: ThemePref;
}

function loadSaved(): SavedThemeState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SavedThemeState;
      if (parsed && parsed.theme && parsed.pref) return parsed;
    }
  } catch { /* ignore */ }
  return { theme: 'notion', pref: 'auto' };
}

function saveState(state: SavedThemeState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const saved = loadSaved();
  const [theme, setThemeState] = useState<AppThemeKey>(saved.theme);
  const [pref, setPrefState] = useState<ThemePref>(saved.pref);
  const [systemMode, setSystemMode] = useState<ThemeMode>(getSystemMode);

  const rawMode: ThemeMode = pref === 'auto' ? systemMode : pref;
  const effectiveMode = getEffectiveMode(theme, rawMode);

  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = (e: MediaQueryListEvent) => setSystemMode(e.matches ? 'dark' : 'light');
    mql.addEventListener('change', listener);
    return () => mql.removeEventListener('change', listener);
  }, []);

  useEffect(() => {
    applyThemeVars(theme, effectiveMode);
  }, [theme, effectiveMode]);

  useEffect(() => {
    saveState({ theme, pref });
  }, [theme, pref]);

  const setTheme = useCallback((t: AppThemeKey) => {
    setThemeState(t);
  }, []);

  const setPref = useCallback((p: ThemePref) => {
    setPrefState(p);
  }, []);

  const toggleMode = useCallback(() => {
    if (pref === 'auto') {
      setPrefState(effectiveMode === 'dark' ? 'light' : 'dark');
    } else {
      setPrefState(pref === 'dark' ? 'light' : 'dark');
    }
  }, [pref, effectiveMode]);

  const supportsModeFn = useCallback((mode: ThemeMode) => _supportsMode(theme, mode), [theme]);

  const unsupportedMode: ThemeMode | null = !supportsModeFn('light')
    ? 'light'
    : !supportsModeFn('dark')
      ? 'dark'
      : null;

  const value: ThemeContextValue = {
    theme,
    mode: effectiveMode,
    pref,
    setTheme,
    setPref,
    toggleMode,
    resolvedMode: effectiveMode,
    supportsMode: supportsModeFn,
    unsupportedMode,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

export function getThemeLabel(key: AppThemeKey): string {
  return THEME_DEFINITIONS[key]?.label ?? key;
}

export function getThemeEmoji(key: AppThemeKey): string {
  return THEME_DEFINITIONS[key]?.emoji ?? '🎨';
}
