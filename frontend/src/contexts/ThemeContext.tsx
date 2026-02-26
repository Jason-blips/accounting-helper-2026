import { createContext, useContext, useState, useCallback, useLayoutEffect } from 'react';
import { BUILTIN_THEMES, DEFAULT_THEME_ID, getThemeById } from '../themes';
import type { ThemeDef } from '../themes';

const STORAGE_KEY = 'counting-helper-theme-id';

interface ThemeContextValue {
  /** 当前主题 id */
  themeId: string;
  /** 当前主题定义（用于预览等） */
  theme: ThemeDef;
  /** 所有可选主题 */
  themes: ThemeDef[];
  /** 切换主题 */
  setThemeId: (id: string) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(palette: ThemeDef['palette']) {
  const root = document.documentElement;
  root.style.setProperty('--theme-bg', palette.bg);
  root.style.setProperty('--theme-surface', palette.surface);
  root.style.setProperty('--theme-surface-hover', palette.surfaceHover);
  root.style.setProperty('--theme-text', palette.text);
  root.style.setProperty('--theme-text-muted', palette.textMuted);
  root.style.setProperty('--theme-primary', palette.primary);
  root.style.setProperty('--theme-primary-hover', palette.primaryHover);
  root.style.setProperty('--theme-primary-soft', palette.primarySoft);
  root.style.setProperty('--theme-border', palette.border);
  root.style.setProperty('--theme-input-bg', palette.inputBg);
  root.style.setProperty('--theme-focus-ring', palette.focusRing);
  root.style.setProperty('--theme-nav-bg', palette.navBg ?? palette.surface);
  // 兼容现有使用 --primary-* 的样式
  root.style.setProperty('--primary-50', palette.primarySoft);
  root.style.setProperty('--primary-500', palette.primary);
  root.style.setProperty('--primary-600', palette.primary);
  root.style.setProperty('--primary-700', palette.primaryHover);
  root.style.setProperty('--primary-800', palette.primaryHover);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeIdState] = useState<string>(() => {
    if (typeof window === 'undefined') return DEFAULT_THEME_ID;
    const stored = localStorage.getItem(STORAGE_KEY);
    return getThemeById(stored ?? '') ? stored! : DEFAULT_THEME_ID;
  });

  const theme = getThemeById(themeId) ?? getThemeById(DEFAULT_THEME_ID)!;

  useLayoutEffect(() => {
    applyTheme(theme.palette);
  }, [theme]);

  const setThemeId = useCallback((id: string) => {
    if (!getThemeById(id)) return;
    setThemeIdState(id);
    localStorage.setItem(STORAGE_KEY, id);
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        themeId,
        theme,
        themes: BUILTIN_THEMES,
        setThemeId,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
