import { View } from 'react-native';
import { color } from '@/theme/tokens';
import { Icon } from './Icon';

export type BadgeKind = 'person' | 'side' | 'gruppe' | 'begivenhed';

/** Ét ikon pr. slags fællesskab: offentlig person, side, gruppe og begivenhed */
export const badgeIcon = { person: 'globe', side: 'building', gruppe: 'circles', begivenhed: 'calendar' } as const;
const labels = { person: 'Offentlig person', side: 'Side', gruppe: 'Gruppe', begivenhed: 'Begivenhed' } as const;

/** Lille mærke ved navnet (20 px): mint = offentlig person, grå = side/gruppe/begivenhed */
export function PublicBadge({ kind }: { kind: BadgeKind }) {
  const person = kind === 'person';
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={labels[kind]}
      style={{
        width: 20,
        height: 20,
        borderRadius: 10,
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: person ? color.accentNoteBg : color.bgSubtle,
      }}
    >
      <Icon name={badgeIcon[kind]} size={13} color={person ? color.accentNoteText : color.textPrimary} />
    </View>
  );
}
