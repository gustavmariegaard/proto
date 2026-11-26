import { Pressable, StyleSheet, View } from 'react-native';
import { color } from '@/theme/tokens';
import { Avatar } from './Avatar';
import { Icon } from './Icon';
import { T } from './T';

type Props = {
  name: string;
  /** Tekst under boblen (fx "Dig" eller brugernavn) */
  label: string;
  avatarPath?: string | null;
  avatarUri?: string;
  /** Grøn ring = usete moments, grå = sete, ingen = ingen moments */
  state: 'unseen' | 'seen' | 'none';
  /** Lille + nederst til højre (Dig: lav et moment) */
  plus?: boolean;
  onPress: () => void;
  onPlus?: () => void;
};

/** Rund boble med ring i moment-rækken på Hjem (som prototypens MomentBubble) */
export function MomentRing({ name, label, avatarPath, avatarUri, state, plus, onPress, onPlus }: Props) {
  return (
    <View style={s.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={state === 'none' ? `${label}: lav et moment` : `Se moments fra ${name}${state === 'unseen' ? ', nye' : ''}`}
        onPress={onPress}
        style={({ pressed }) => [s.ring, state === 'unseen' && s.unseen, state === 'seen' && s.seen, pressed && { opacity: 0.75 }]}
      >
        <Avatar name={name} path={avatarPath} uri={avatarUri} size="L" />
      </Pressable>
      {plus && (
        <Pressable accessibilityRole="button" accessibilityLabel="Lav et moment" onPress={onPlus ?? onPress} hitSlop={8} style={s.plus}>
          <Icon name="plus" size={14} color={color.white} />
        </Pressable>
      )}
      <T v="caption" numberOfLines={1} style={s.label}>
        {label}
      </T>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { width: 72, alignItems: 'center', gap: 4 },
  ring: { width: 66, height: 66, borderRadius: 33, alignItems: 'center', justifyContent: 'center', borderWidth: 2.5, borderColor: 'transparent' },
  unseen: { borderColor: color.accent },
  seen: { borderColor: color.borderStrong },
  plus: {
    position: 'absolute',
    top: 44,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: color.actionPrimary,
    borderWidth: 2,
    borderColor: color.bgApp,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { maxWidth: 72, textAlign: 'center' },
});
