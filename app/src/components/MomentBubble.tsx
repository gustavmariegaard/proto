import { Pressable, StyleSheet, View } from 'react-native';
import { color, radius } from '@/theme/tokens';
import { Avatar, type AvatarTone } from './Avatar';
import { Icon } from './Icon';
import { T } from './T';

type Props = {
  /** Teksten under boblen, fx "Dig" eller brugernavnet */
  name: string;
  /** Fulde navn til initialerne, fx "Mette Lund" → ML */
  fullName?: string;
  /** new = grøn ring, seen = grå ring, add = stiplet ring (tilføj) */
  state?: 'new' | 'seen' | 'add';
  tone?: AvatarTone;
  /** Billede: sti i Storage eller URL */
  path?: string | null;
  uri?: string;
  /** Plus nederst til højre (eget billede). Vises altid ved state="add" med billede. */
  plus?: boolean;
  onPress?: () => void;
  /** Tryk på plusset (standard: onPress) */
  onPlus?: () => void;
};

/**
 * Moment som bobbel (74 px). Grøn ring = nyt, grå ring = set.
 * "Tilføj" viser dit eget profilbillede med et plus nederst til højre.
 */
export function MomentBubble({ name, fullName, state = 'new', tone, path, uri, plus, onPress, onPlus }: Props) {
  const hasPic = !!(path || uri);
  const showPlus = state === 'add' ? hasPic : !!plus;
  const label = state === 'add' ? 'Tilføj moment' : state === 'new' ? `Se moment fra ${name}, nyt` : `Se moment fra ${name}`;
  return (
    <View style={s.moment}>
      <View style={s.wrap}>
        <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [pressed && { transform: [{ scale: 0.96 }] }]}>
          <View style={[s.ring, state === 'seen' && s.seen, state === 'add' && (showPlus ? s.addPic : s.add)]}>
            {state === 'add' && !hasPic ? <Icon name="plus" /> : <Avatar name={fullName ?? name} tone={tone} path={path} uri={uri} size="XL" />}
          </View>
        </Pressable>
        {showPlus && (
          <Pressable accessibilityRole="button" accessibilityLabel="Tilføj moment" onPress={onPlus ?? onPress} hitSlop={6} style={s.plus}>
            <Icon name="plus" size={16} color={color.textOnAction} stroke={2.5} />
          </Pressable>
        )}
      </View>
      <T v="caption" numberOfLines={1} style={s.name} accessible={false}>
        {name}
      </T>
    </View>
  );
}

const s = StyleSheet.create({
  moment: { alignItems: 'center', gap: 6, flexShrink: 0, borderRadius: radius.md },
  wrap: { position: 'relative' },
  ring: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 2,
    borderColor: color.accentHighlight,
    backgroundColor: color.bgSurface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  seen: { borderColor: color.borderStrong },
  add: { borderStyle: 'dashed', borderColor: color.textSecondary },
  /* Eget billede: ingen ring, bare billedet */
  addPic: { borderColor: 'transparent' },
  plus: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: color.actionPrimary,
    borderWidth: 3,
    borderColor: color.bgApp,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { maxWidth: 74, textAlign: 'center' },
});
