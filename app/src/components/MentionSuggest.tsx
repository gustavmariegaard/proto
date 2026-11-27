import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { activeMention, searchMentions, type MentionHit } from '@/lib/mentions';
import { useMe } from '@/lib/session';
import { color, radius } from '@/theme/tokens';
import { Avatar } from './Avatar';
import { T } from './T';

type Props = {
  text: string;
  /** Markørens position i teksten */
  cursor: number;
  /** Ny tekst, når et forslag vælges */
  onPick: (text: string) => void;
};

/**
 * Forslag under et tekstfelt, når man skriver @: personer og sider.
 * Et tryk sætter @navnet ind i teksten.
 */
export function MentionSuggest({ text, cursor, onPick }: Props) {
  const me = useMe();
  const active = activeMention(text, cursor);
  const [hits, setHits] = useState<MentionHit[]>([]);
  const q = active?.query ?? null;

  useEffect(() => {
    if (q === null) {
      setHits([]);
      return;
    }
    let alive = true;
    const t = setTimeout(() => searchMentions(q, me.id).then((h) => alive && setHits(h)), 120);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q, me.id]);

  if (!active || hits.length === 0) return null;

  const pick = (h: MentionHit) => {
    const after = text.slice(cursor).replace(/^[A-Za-z0-9._æøåÆØÅ]*/, '');
    onPick(`${text.slice(0, active.start)}@${h.handle} ${after.replace(/^ /, '')}`);
  };

  return (
    <View style={s.box} accessibilityLabel="Forslag til tags">
      {hits.map((h, i) => (
        <Pressable
          key={`${h.kind}-${h.handle}`}
          accessibilityRole="button"
          accessibilityLabel={`Tag ${h.name}`}
          onPress={() => pick(h)}
          style={({ pressed }) => [s.row, i > 0 && s.line, pressed && { backgroundColor: color.bgSubtle }]}
        >
          <Avatar name={h.name} path={h.avatar_path} size="S" />
          <View style={{ flex: 1, minWidth: 0 }}>
            <T v="label" numberOfLines={1}>
              {h.name}
            </T>
            <T v="caption" c={color.textSecondary} numberOfLines={1}>
              @{h.handle}
            </T>
          </View>
          {h.kind === 'side' && (
            <View style={s.badge}>
              <T v="micro" c={color.textSecondary}>
                Side
              </T>
            </View>
          )}
        </Pressable>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  box: { alignSelf: 'stretch', overflow: 'hidden', borderRadius: 20, borderWidth: 1, borderColor: color.borderDefault, backgroundColor: color.bgSurface },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, paddingHorizontal: 12, paddingVertical: 6 },
  line: { borderTopWidth: 1, borderTopColor: color.borderDefault },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill, backgroundColor: color.bgSubtle },
});
