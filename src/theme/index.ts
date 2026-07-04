/**
 * WakeyStop design tokens.
 *
 * The app is deliberately dark-only: its core moment is a sleepy traveller
 * glancing at their phone on a night bus. Deep "night transit" navy with a
 * single warm amber accent — the colour of waking up.
 */
export const colors = {
  bg: '#0B1220',
  surface: '#141D31',
  surfaceRaised: '#1B2640',
  line: '#26314A',
  lineSoft: '#1C2740',

  text: '#F2F5FC',
  textDim: '#93A1BD',
  textFaint: '#5D6B8A',

  amber: '#FFB547',
  amberPressed: '#E69A2E',
  amberSoft: 'rgba(255, 181, 71, 0.14)',
  amberLine: 'rgba(255, 181, 71, 0.45)',

  teal: '#5BC8DF',
  tealSoft: 'rgba(91, 200, 223, 0.14)',

  danger: '#F2716A',
  dangerSoft: 'rgba(242, 113, 106, 0.14)',

  success: '#63D68B',
  successSoft: 'rgba(99, 214, 139, 0.14)',

  onAmber: '#1A1206',
  overlay: 'rgba(5, 9, 18, 0.72)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const type = {
  display: { fontSize: 32, fontWeight: '800' as const, letterSpacing: -0.5, color: colors.text, lineHeight: 40 },
  title: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.3, color: colors.text, lineHeight: 30 },
  heading: { fontSize: 17, fontWeight: '700' as const, color: colors.text },
  body: { fontSize: 15, fontWeight: '400' as const, color: colors.text, lineHeight: 22 },
  bodyDim: { fontSize: 15, fontWeight: '400' as const, color: colors.textDim, lineHeight: 22 },
  label: { fontSize: 13, fontWeight: '600' as const, color: colors.textDim },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: colors.textFaint,
    letterSpacing: 1.4,
    textTransform: 'uppercase' as const,
  },
  mono: { fontSize: 13, fontWeight: '500' as const, color: colors.textDim, fontVariant: ['tabular-nums'] as const },
} as const;
