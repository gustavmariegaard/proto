import { Text } from 'react-native';
import { color, font } from '@/theme/tokens';

/**
 * Appens navn: ciircle. Kun sorte bogstaver.
 * Bruges altid alene, uden ekstra tekst ved siden af.
 */
export function Wordmark({ size = 26 }: { size?: number }) {
  return (
    <Text
      accessibilityRole="image"
      accessibilityLabel="ciircle"
      style={{ fontFamily: font.title, fontSize: size, lineHeight: Math.round(size * 1.2), letterSpacing: -0.02 * size, color: color.textPrimary }}
    >
      ciircle
    </Text>
  );
}
