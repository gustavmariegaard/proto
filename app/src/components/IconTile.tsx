import { View } from 'react-native';
import { color, radius } from '@/theme/tokens';
import { Icon, type IconName } from './Icon';

/** Mint felt med et ikon. 40, 44 eller 48 px. */
export function IconTile({ icon, size = 44 }: { icon: IconName; size?: 40 | 44 | 48 }) {
  return (
    <View
      accessible={false}
      style={{ width: size, height: size, flexShrink: 0, borderRadius: radius.md, backgroundColor: color.accentVerifiedBg, alignItems: 'center', justifyContent: 'center' }}
    >
      <Icon name={icon} />
    </View>
  );
}
