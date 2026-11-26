/*
 * Designtokens – de samme værdier som prototypen (src/styles/tokens.css).
 * Skift en værdi her, så slår den igennem i hele appen.
 */
export const color = {
  white: '#ffffff',
  bgApp: '#fafaf9',
  bgSurface: '#ffffff',
  bgSubtle: '#f2f2f2',
  bgSunken: '#f7f7f7',
  gray150: '#ededed',
  gray200: '#e6e6e6',
  borderDefault: '#e6e6e6',
  borderStrong: '#c8c8c8',
  textPrimary: '#171717',
  textSecondary: '#666666',
  textOnAction: '#ffffff',
  actionPrimary: '#171717',
  actionOff: '#b3b3b3',
  accent: '#21f1a8',
  accentBg: '#a8f9db',
  noteBg: '#e8fef6',
  noteText: '#05392a',
  green200: '#cffcea',
  green700: '#0b7a57',
  danger: '#c0392b',
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

/** Mindste trykflade (Apple/Google anbefaler 44 pt) */
export const TAP = 44;

/** Plads i bunden af faneskærme, så indhold ikke gemmes bag bundmenuen */
export const TAB_SPACE = 110;
