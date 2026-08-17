/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  THEME — Single Source of Truth for All Design Tokens       ║
 * ║                                                              ║
 * ║  To change the look of the ENTIRE app, edit ONLY this file. ║
 * ║  No hardcoded colors, fonts, or spacing anywhere else.      ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

export const theme = {
  // ─── Colors ──────────────────────────────────────────────
  colors: {
    // Primary palette
    primary: '#6C63FF',
    primaryDark: '#4B44CC',
    primaryLight: '#A5A0FF',
    primaryGlow: 'rgba(108, 99, 255, 0.3)',

    // Call action colors
    answerGreen: '#34D399',
    answerGreenDark: '#059669',
    answerGreenGlow: 'rgba(52, 211, 153, 0.35)',
    declineRed: '#EF4444',
    declineRedDark: '#DC2626',
    declineRedGlow: 'rgba(239, 68, 68, 0.35)',
    hangupRed: '#DC2626',

    // Backgrounds
    bgDark: '#0F0F1A',
    bgCard: '#1A1A2E',
    bgCardHover: '#222240',
    bgSurface: '#16213E',
    bgOverlay: 'rgba(15, 15, 26, 0.85)',
    bgGradientStart: '#0F0F1A',
    bgGradientMid: '#16213E',
    bgGradientEnd: '#1A1A2E',

    // Text
    textPrimary: '#F1F5F9',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    textInverse: '#0F0F1A',

    // Status indicators
    online: '#22C55E',
    onlineGlow: 'rgba(34, 197, 94, 0.4)',
    offline: '#6B7280',
    ringing: '#F59E0B',
    ringingGlow: 'rgba(245, 158, 11, 0.4)',
    inCall: '#3B82F6',
    inCallGlow: 'rgba(59, 130, 246, 0.4)',

    // Borders & dividers
    border: 'rgba(148, 163, 184, 0.15)',
    borderLight: 'rgba(148, 163, 184, 0.08)',
    divider: 'rgba(148, 163, 184, 0.1)',

    // Misc
    white: '#FFFFFF',
    black: '#000000',
    transparent: 'transparent',
    warning: '#F59E0B',
    error: '#EF4444',
    success: '#22C55E',
    info: '#3B82F6',
  },

  // ─── Typography ──────────────────────────────────────────
  fonts: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semiBold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
  },

  fontSize: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 18,
    xl: 22,
    xxl: 28,
    hero: 42,
    display: 56,
  },

  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },

  // ─── Spacing ─────────────────────────────────────────────
  spacing: {
    xxs: 2,
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
    xxxl: 64,
  },

  // ─── Border Radius ───────────────────────────────────────
  borderRadius: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
    full: 9999,
  },

  // ─── Shadows ─────────────────────────────────────────────
  shadows: {
    card: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 12,
      elevation: 8,
    },
    cardHover: {
      shadowColor: '#6C63FF',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
      elevation: 12,
    },
    button: {
      shadowColor: '#6C63FF',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 6,
    },
    buttonGreen: {
      shadowColor: '#34D399',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 6,
    },
    buttonRed: {
      shadowColor: '#EF4444',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 6,
    },
    glow: {
      shadowColor: '#6C63FF',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.6,
      shadowRadius: 20,
      elevation: 16,
    },
  },

  // ─── Animation Durations (ms) ────────────────────────────
  animation: {
    fast: 150,
    normal: 300,
    slow: 500,
    pulse: 1500,
    ring: 2000,
  },

  // ─── Layout ──────────────────────────────────────────────
  layout: {
    screenPaddingH: 20,
    screenPaddingV: 16,
    cardPadding: 16,
    avatarSizeSmall: 40,
    avatarSizeMedium: 56,
    avatarSizeLarge: 96,
    avatarSizeHero: 128,
    actionButtonSize: 64,
    actionButtonSizeLarge: 72,
    headerHeight: 56,
    tabBarHeight: 64,
  },

  // ─── Call Config ─────────────────────────────────────────
  call: {
    incomingCallTimeout: 45,    // seconds
    outgoingCallTimeout: 60,    // seconds
    fulfillAnswerTimeout: 30,   // seconds
    reconnectTimeout: 10,       // seconds
  },
} as const;

// ─── Type Export ──────────────────────────────────────────
export type Theme = typeof theme;
export type ThemeColors = typeof theme.colors;
export type ThemeFonts = typeof theme.fonts;
