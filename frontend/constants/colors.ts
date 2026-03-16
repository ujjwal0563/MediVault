// ─── Light Mode (default) ─────────────────────────────────────────────────────
const Light = {
  // Brand — exact values from globals.css :root
  primary:       '#1A4FBA',
  primaryDark:   '#12368A',
  primaryLight:  '#2E6AE6',
  primarySoft:   '#EBF0FB',
  accent:        '#F97316',
  accentSoft:    '#FEF3E2',
  success:       '#16A34A',
  successSoft:   '#DCFCE7',
  danger:        '#DC2626',
  dangerSoft:    '#FEE2E2',
  warning:       '#D97706',
  warningSoft:   '#FEF9C3',
  teal:          '#0D9488',
  tealSoft:      '#CCFBF1',

  // Surface & text
  bgPage:        '#F9FAFB',
  bgCard:        '#FFFFFF',
  bgCardHover:   '#F3F4F6',
  bgNavbar:      '#FFFFFF',
  bgInput:       '#FFFFFF',
  border:        '#E5E7EB',
  borderSoft:    '#F3F4F6',
  textPrimary:   '#111827',
  textSecondary: '#374151',
  textMuted:     '#6B7280',
  textFaint:     '#9CA3AF',

  // Gray scale (legacy aliases — mirrors --gray-N vars)
  white:   '#FFFFFF',
  gray50:  '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',

  // Sidebar (fixed dark regardless of theme)
  sidebarBg:     '#12368A',   // --primary-dark
  sidebarActive: '#2E6AE6',   // --primary-light
};

// ─── Dark Mode ────────────────────────────────────────────────────────────────
export const DarkColors = {
  ...Light,
  primary:       '#4B80F0',
  primaryDark:   '#2E5FC7',
  primaryLight:  '#6B9BFF',
  primarySoft:   '#1A2D5A',
  accentSoft:    '#2D1F0E',
  successSoft:   '#0D2818',
  dangerSoft:    '#2D0E0E',
  warningSoft:   '#2D1F00',
  tealSoft:      '#0A2422',

  bgPage:        '#0F1117',
  bgCard:        '#1A1D27',
  bgCardHover:   '#22263A',
  bgNavbar:      '#13151F',
  bgInput:       '#1E2130',
  border:        '#2A2D3E',
  borderSoft:    '#1E2130',
  textPrimary:   '#F1F5F9',
  textSecondary: '#CBD5E1',
  textMuted:     '#64748B',
  textFaint:     '#475569',

  white:   '#1A1D27',
  gray50:  '#13151F',
  gray100: '#1E2130',
  gray200: '#2A2D3E',
  gray300: '#3A3F54',
  gray400: '#64748B',
  gray500: '#94A3B8',
  gray600: '#CBD5E1',
  gray700: '#E2E8F0',
  gray800: '#F1F5F9',
  gray900: '#F8FAFC',

  sidebarBg:     '#12368A',
  sidebarActive: '#6B9BFF',
};

// ─── Active theme (light default; swap for dark) ──────────────────────────────
const Colors = Light;
export default Colors;
