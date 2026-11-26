import { StyleSheet, View } from 'react-native';
import type { Member } from '@/lib/conversations';
import { color } from '@/theme/tokens';
import { Avatar } from './Avatar';

/** Én avatar for direkte samtaler, to overlappende for cirkler */
export function ConversationAvatar({ members, size = 'M' }: { members: Member[]; size?: 'M' | 'L' }) {
  if (members.length <= 1) {
    const m = members[0];
    return <Avatar name={m?.name ?? '?'} path={m?.avatar_path} size={size} />;
  }
  const d = size === 'L' ? 56 : 40;
  const [a, b] = members;
  return (
    <View style={{ width: d, height: d }} accessible={false}>
      <View style={s.back}>
        <Avatar name={a!.name} path={a!.avatar_path} size="S" />
      </View>
      <View style={[s.front, { borderColor: color.bgApp }]}>
        <Avatar name={b!.name} path={b!.avatar_path} size={size === 'L' ? 'M' : 'S'} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  back: { position: 'absolute', top: 0, left: 0, transform: [{ scale: 1.15 }] },
  front: { position: 'absolute', right: 0, bottom: 0, borderWidth: 2, borderRadius: 999 },
});
