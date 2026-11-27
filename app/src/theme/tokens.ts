/*
 * Designtokens – de samme værdier som prototypen (src/styles/tokens.css).
 * Skift en værdi her, så slår den igennem i hele appen.
 */

/** Primitiver (--white, --gray-*, --ink-*, --green-*) */
export const palette = {
  white: '#ffffff',
  gray50: '#f7f7f7',
  gray100: '#f2f2f2',
  gray150: '#ededed',
  gray200: '#e6e6e6',
  gray300: '#c8c8c8',
  ink400: '#b3b3b3',
  ink600: '#666666',
  ink700: '#333333',
  ink900: '#171717',
  green100: '#e8fef6',
  green200: '#cffcea',
  green300: '#a8f9db',
  green500: '#21f1a8',
  green700: '#0b7a57',
  green900: '#05392a',
} as const;

export const color = {
  ...palette,
  // Baggrund
  bgApp: '#fafaf9',
  bgSurface: palette.white,
  bgSubtle: palette.gray100,
  bgSunken: palette.gray50,
  // Streger
  borderDefault: palette.gray200,
  borderStrong: palette.gray300,
  // Tekst
  textPrimary: palette.ink900,
  textSecondary: palette.ink600,
  textOnAction: palette.white,
  textOnHighlight: palette.ink900,
  // Handling
  actionPrimary: palette.ink900,
  actionOff: palette.ink400,
  // Accent
  accentHighlight: palette.green500,
  accentVerifiedBg: palette.green300,
  accentVerifiedText: palette.ink900,
  accentNoteBg: palette.green100,
  accentNoteText: palette.green900,
  // Avatarer
  avatarSandBg: palette.green200,
  avatarSandFg: palette.green700,
  avatarBlueBg: palette.gray150,
  avatarBlueFg: palette.ink900,
  avatarSageBg: palette.gray100,
  avatarSageFg: palette.ink700,
  avatarRoseBg: palette.gray200,
  avatarRoseFg: palette.ink700,
  // Ældre navne (bruges rundt i appen)
  accent: palette.green500,
  accentBg: palette.green300,
  noteBg: palette.green100,
  noteText: palette.green900,
  /** Rapportér / slet (prototypen: #c62828) */
  danger: '#c62828',
  black: '#000000',
} as const;

export const space = { 4: 4, 8: 8, 12: 12, 16: 16, 20: 20, 24: 24, 32: 32 } as const;

export const radius = { sm: 10, md: 14, lg: 18, xl: 22, sheet: 28, pill: 999 } as const;

/** Fontnavne, som de indlæses i src/app/_layout.tsx */
export const font = {
  title: 'BricolageGrotesque_700Bold',
  body: 'Figtree_400Regular',
  bodyMedium: 'Figtree_500Medium',
  bodySemi: 'Figtree_600SemiBold',
  bodyBold: 'Figtree_700Bold',
} as const;

/** Tekststile (som .t-*-klasserne i prototypen) */
export const type = {
  titleXl: { fontFamily: font.title, fontSize: 26, lineHeight: 32, letterSpacing: -0.3 },
  titleL: { fontFamily: font.title, fontSize: 22, lineHeight: 28, letterSpacing: -0.3 },
  headingM: { fontFamily: font.bodyBold, fontSize: 17, lineHeight: 22 },
  headingS: { fontFamily: font.bodyBold, fontSize: 15, lineHeight: 20 },
  body: { fontFamily: font.body, fontSize: 15, lineHeight: 22 },
  bodyS: { fontFamily: font.body, fontSize: 14, lineHeight: 20 },
  label: { fontFamily: font.bodySemi, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: font.body, fontSize: 12, lineHeight: 16 },
  captionStrong: { fontFamily: font.bodySemi, fontSize: 12, lineHeight: 16 },
  micro: { fontFamily: font.bodySemi, fontSize: 11, lineHeight: 14 },
} as const;

export type TypeName = keyof typeof type;

/** --shadow-tabbar: 0 6px 18px rgba(0,0,0,0.14) */
export const shadow = {
  tabbar: { shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 18, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  /** Ark: 0 -4px 18px rgba(0,0,0,0.16) */
  sheet: { shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 18, shadowOffset: { width: 0, height: -4 }, elevation: 16 },
  /** SaveBar: 0 -6px 18px rgb(0 0 0 / 0.08) */
  savebar: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: -6 }, elevation: 6 },
} as const;

/** Layout (--top-gap, --appbar-height, --tabbar-*) */
export const layout = {
  /** Luft mellem telefonens top (safe area) og første element */
  topGap: 4,
  appbarHeight: 58,
  tabbarHeight: 88,
  /** Bundmenuens højde (pillen) */
  tabbarPill: 52,
  /** Mindste afstand fra bunden: max(10, safeBottom - 14) */
  tabbarBottomMin: 10,
} as const;

/** --tabbar-bottom: max(10px, safe-bottom - 14px) */
export const tabbarBottom = (safeBottom: number) => Math.max(layout.tabbarBottomMin, safeBottom - 14);
/** --tabbar-bar: toppen af bundmenuen målt fra skærmens bund */
export const tabbarBar = (safeBottom: number) => tabbarBottom(safeBottom) + layout.tabbarPill;

/** Mindste trykflade (Apple/Google anbefaler 44 pt) */
export const TAP = 44;

/** Plads i bunden af faneskærme (--tabbar-bar + 24 px), så indhold ikke gemmes bag bundmenuen */
export const TAB_SPACE = 10 + 52 + 24;
