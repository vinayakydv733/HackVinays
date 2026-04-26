export const COLORS = {
  bg: '#0a0a1a',
  bgCard: '#12122a',
  bgCardAlt: '#1a1a35',
  primary: '#00e5ff',
  primaryDim: '#00b8cc',
  purple: '#7c3aed',
  purpleLight: '#a78bfa',
  green: '#00ff94',
  red: '#ff4444',
  orange: '#f59e0b',
  yellow: '#fbbf24',
  white: '#ffffff',
  textPrimary: '#ffffff',
  textSecondary: '#8888aa',
  textDim: '#444466',
  border: '#1e1e3f',
  borderLight: '#2a2a4a',
} as const;

export const FONTS = {
  regular: 'System',
  mono: 'monospace',
  size: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 18,
    xl: 22,
    xxl: 28,
    xxxl: 36,
  },
} as const;

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const MaxContentWidth = 960;

export type ThemeColor = keyof typeof COLORS;