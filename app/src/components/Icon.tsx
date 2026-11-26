import { SvgXml } from 'react-native-svg';
import { iconPaths, type IconName } from '@/theme/iconPaths';
import { color as tokens } from '@/theme/tokens';

export type { IconName };

/** Ikon fra prototypens sæt. Er pynt: knappen omkring skal have accessibilityLabel. */
export function Icon({ name, size = 24, color = tokens.textPrimary, filled = false }: { name: IconName; size?: number; color?: string; filled?: boolean }) {
  const inner = iconPaths[name];
  const xml = `<svg viewBox="0 0 24 24" fill="none">${filled ? inner.replace(/<path /g, '<path fill="currentColor" ') : inner}</svg>`;
  return <SvgXml xml={xml} width={size} height={size} color={color} />;
}
