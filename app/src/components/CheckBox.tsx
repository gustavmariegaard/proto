import { StyleSheet, View } from 'react-native';
import { color } from '@/theme/tokens';
import { Icon } from './Icon';

/** Firkantet flueben (Vis opslag om, Rediger interesser) */
export function CheckBox({ on }: { on: boolean }) {
  return <View style={[s.box, on && s.on]}>{on && <Icon name="check" size={14} color={color.white} stroke={3} />}</View>;
}

const s = StyleSheet.create({
  box: { width: 24, height: 24, borderRadius: 8, borderWidth: 1.5, borderColor: color.borderStrong, alignItems: 'center', justifyContent: 'center' },
  on: { backgroundColor: color.textPrimary, borderColor: color.textPrimary },
});
