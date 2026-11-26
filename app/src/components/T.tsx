import { Text, type TextProps } from 'react-native';
import { color, type, type TypeName } from '@/theme/tokens';

type Props = TextProps & { v?: TypeName; c?: string };

/** Tekst med appens skrifttyper. v = stil (fx "headingS"), c = farve. */
export function T({ v = 'body', c = color.textPrimary, style, ...rest }: Props) {
  return <Text {...rest} style={[type[v], { color: c }, style]} />;
}
