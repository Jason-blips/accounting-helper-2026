/**
 * VS Code 风格主题：多套完整配色，命名与风格参考 VS Code 内置主题，保持简约轻量。
 * 每个主题是一套完整变量，切换后全局一致。
 */

export interface ThemePalette {
  /** 页面背景 */
  bg: string;
  /** 卡片/表面 */
  surface: string;
  /** 表面 hover */
  surfaceHover: string;
  /** 主文字 */
  text: string;
  /** 次要文字 */
  textMuted: string;
  /** 主色（按钮、链接、焦点） */
  primary: string;
  /** 主色 hover/深一点 */
  primaryHover: string;
  /** 主色浅底（导航选中背景等） */
  primarySoft: string;
  /** 边框 */
  border: string;
  /** 输入框背景 */
  inputBg: string;
  /** 焦点环 */
  focusRing: string;
  /** 导航栏背景（可与 surface 同） */
  navBg?: string;
}

export interface ThemeDef {
  id: string;
  name: string;
  palette: ThemePalette;
}

/** 内置主题列表（仿 VS Code 命名） */
export const BUILTIN_THEMES: ThemeDef[] = [
  {
    id: 'light-plus',
    name: 'Light+',
    palette: {
      bg: '#f3f3f3',
      surface: '#ffffff',
      surfaceHover: '#f0f0f0',
      text: '#333333',
      textMuted: '#6e6e6e',
      primary: '#0066cc',
      primaryHover: '#0052a3',
      primarySoft: '#e8f4fd',
      border: '#e0e0e0',
      inputBg: '#ffffff',
      focusRing: '#0066cc',
      navBg: '#ffffff',
    },
  },
  {
    id: 'dark-plus',
    name: 'Dark+',
    palette: {
      bg: '#1e1e1e',
      surface: '#252526',
      surfaceHover: '#2a2d2e',
      text: '#d4d4d4',
      textMuted: '#858585',
      primary: '#569cd6',
      primaryHover: '#4ec9b0',
      primarySoft: 'rgba(86, 156, 214, 0.15)',
      border: '#3c3c3c',
      inputBg: '#3c3c3c',
      focusRing: '#569cd6',
      navBg: '#252526',
    },
  },
  {
    id: 'quiet-light',
    name: 'Quiet Light',
    palette: {
      bg: '#f5f5f5',
      surface: '#ffffff',
      surfaceHover: '#efefef',
      text: '#333333',
      textMuted: '#6a737d',
      primary: '#0366d6',
      primaryHover: '#0256c2',
      primarySoft: '#e6f0fa',
      border: '#e8e8e8',
      inputBg: '#ffffff',
      focusRing: '#0366d6',
      navBg: '#fafafa',
    },
  },
  {
    id: 'solarized-light',
    name: 'Solarized Light',
    palette: {
      bg: '#fdf6e3',
      surface: '#eee8d5',
      surfaceHover: '#e5ddc8',
      text: '#586e75',
      textMuted: '#839496',
      primary: '#268bd2',
      primaryHover: '#1a6ea0',
      primarySoft: '#e8f0f4',
      border: '#ddd6c4',
      inputBg: '#eee8d5',
      focusRing: '#268bd2',
      navBg: '#fdf6e3',
    },
  },
  {
    id: 'solarized-dark',
    name: 'Solarized Dark',
    palette: {
      bg: '#002b36',
      surface: '#073642',
      surfaceHover: '#0d4a58',
      text: '#839496',
      textMuted: '#657b83',
      primary: '#2aa198',
      primaryHover: '#34d1c8',
      primarySoft: 'rgba(42, 161, 152, 0.2)',
      border: '#094d5c',
      inputBg: '#073642',
      focusRing: '#2aa198',
      navBg: '#002b36',
    },
  },
  {
    id: 'monokai',
    name: 'Monokai',
    palette: {
      bg: '#272822',
      surface: '#3e3d32',
      surfaceHover: '#49483e',
      text: '#f8f8f2',
      textMuted: '#75715e',
      primary: '#fd971f',
      primaryHover: '#f4bf75',
      primarySoft: 'rgba(253, 151, 31, 0.15)',
      border: '#49483e',
      inputBg: '#3e3d32',
      focusRing: '#fd971f',
      navBg: '#272822',
    },
  },
  {
    id: 'minimal-light',
    name: 'Minimal Light',
    palette: {
      bg: '#fafafa',
      surface: '#ffffff',
      surfaceHover: '#f0f0f0',
      text: '#374151',
      textMuted: '#6b7280',
      primary: '#0ea5e9',
      primaryHover: '#0284c7',
      primarySoft: '#e0f2fe',
      border: '#e5e7eb',
      inputBg: '#ffffff',
      focusRing: '#0ea5e9',
      navBg: '#ffffff',
    },
  },
  {
    id: 'minimal-dark',
    name: 'Minimal Dark',
    palette: {
      bg: '#18181b',
      surface: '#27272a',
      surfaceHover: '#3f3f46',
      text: '#fafafa',
      textMuted: '#a1a1aa',
      primary: '#38bdf8',
      primaryHover: '#7dd3fc',
      primarySoft: 'rgba(56, 189, 248, 0.12)',
      border: '#3f3f46',
      inputBg: '#27272a',
      focusRing: '#38bdf8',
      navBg: '#18181b',
    },
  },
  {
    id: 'github-light',
    name: 'GitHub Light',
    palette: {
      bg: '#ffffff',
      surface: '#f6f8fa',
      surfaceHover: '#eaeef2',
      text: '#24292f',
      textMuted: '#57606a',
      primary: '#0969da',
      primaryHover: '#0550ae',
      primarySoft: '#ddf4ff',
      border: '#d0d7de',
      inputBg: '#ffffff',
      focusRing: '#0969da',
      navBg: '#f6f8fa',
    },
  },
  {
    id: 'github-dark',
    name: 'GitHub Dark',
    palette: {
      bg: '#0d1117',
      surface: '#161b22',
      surfaceHover: '#21262d',
      text: '#e6edf3',
      textMuted: '#8b949e',
      primary: '#58a6ff',
      primaryHover: '#79b8ff',
      primarySoft: 'rgba(56, 139, 253, 0.15)',
      border: '#30363d',
      inputBg: '#21262d',
      focusRing: '#58a6ff',
      navBg: '#161b22',
    },
  },
];

export const DEFAULT_THEME_ID = 'light-plus';

export function getThemeById(id: string): ThemeDef | undefined {
  return BUILTIN_THEMES.find((t) => t.id === id);
}
