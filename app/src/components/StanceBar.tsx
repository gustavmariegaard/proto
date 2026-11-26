import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { setStance, stanceCounts } from '@/lib/posts';
import { fmtNumber } from '@/lib/time';
import type { Stance } from '@/lib/types';
import { color, radius, TAP } from '@/theme/tokens';
import { Icon } from './Icon';
import { T } from './T';

/**
 * Enig / uenig i Offentlig debat (som i prototypen).
 * Før man stemmer: to knapper og "Vis stemmer". Fordelingen vises først
 * efter man har stemt eller valgt at se den. "Skjul stemmer" går tilbage.
 */
export function StanceBar({ postId, userId, initial }: { postId: string; userId: string; initial: Stance | null }) {
  const [mine, setMine] = useState<Stance | null>(initial);
  const [peek, setPeek] = useState(false);
  const [counts, setCounts] = useState<{ agree: number; disagree: number } | null>(null);
  const open = !!mine || peek;

  useEffect(() => {
    if (open && !counts) stanceCounts(postId).then(setCounts);
  }, [open, counts, postId]);

  const vote = async (s: Stance) => {
    const next = mine === s ? null : s;
    // Tallene justeres med det samme, så man ikke venter på serveren
    setCounts((c) => {
      if (!c) return c;
      const d = { ...c };
      if (mine === 'enig') d.agree--;
      if (mine === 'uenig') d.disagree--;
      if (next === 'enig') d.agree++;
      if (next === 'uenig') d.disagree++;
      return d;
    });
    setMine(next);
    if (!next) setPeek(false);
    await setStance(postId, userId, next);
    stanceCounts(postId).then(setCounts);
  };

  if (!open) {
    return (
      <View style={s.row} accessibilityLabel="Er du enig?">
        <Choice label="Enig" onPress={() => vote('enig')} />
        <Choice label="Uenig" down onPress={() => vote('uenig')} />
        <Pressable accessibilityRole="button" onPress={() => setPeek(true)} style={s.peek}>
          <T v="captionStrong" c={color.textSecondary} style={s.underline}>
            Vis stemmer
          </T>
        </Pressable>
      </View>
    );
  }

  const total = counts ? counts.agree + counts.disagree : 0;
  const pct = total ? Math.round(((counts?.agree ?? 0) / total) * 100) : 50;
  const side = (st: Stance, label: string, p: number) => {
    const on = mine === st;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: on }}
        accessibilityLabel={`${label}, ${p} procent`}
        onPress={() => vote(st)}
        style={[s.side, on && s.sideOn]}
      >
        {on && <Icon name="check" size={16} color={color.textOnAction} />}
        <T v="label" c={on ? color.textOnAction : color.textPrimary}>
          {label}
        </T>
        <T v="label" c={on ? color.textOnAction : color.textSecondary}>
          {counts ? `${p} %` : '…'}
        </T>
      </Pressable>
    );
  };

  return (
    <View style={{ gap: 6 }}>
      <View style={s.row}>
        {side('enig', 'Enig', pct)}
        {side('uenig', 'Uenig', 100 - pct)}
        {!mine && (
          <Pressable accessibilityRole="button" onPress={() => setPeek(false)} style={s.peek}>
            <T v="captionStrong" c={color.textSecondary} style={s.underline}>
              Skjul stemmer
            </T>
          </Pressable>
        )}
      </View>
      <View style={s.track}>
        <View style={[s.fill, { width: `${pct}%` }]} />
      </View>
      <T v="caption" c={color.textSecondary}>
        {fmtNumber(total)} {total === 1 ? 'stemme' : 'stemmer'} i alt
      </T>
    </View>
  );
}

function Choice({ label, down, onPress }: { label: string; down?: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [s.choice, pressed && { opacity: 0.6 }]}>
      <View style={down ? { transform: [{ scaleY: -1 }] } : undefined}>
        <Icon name="thumb" size={20} />
      </View>
      <T v="label">{label}</T>
    </Pressable>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  choice: {
    height: TAP,
    paddingHorizontal: 18,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.bgSurface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  peek: { marginLeft: 'auto', minHeight: TAP, justifyContent: 'center', paddingHorizontal: 4 },
  underline: { textDecorationLine: 'underline' },
  side: {
    height: TAP,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sideOn: { backgroundColor: color.actionPrimary, borderColor: color.actionPrimary },
  track: { height: 8, borderRadius: radius.pill, backgroundColor: color.gray200, overflow: 'hidden', marginTop: 4 },
  fill: { height: '100%', borderRadius: radius.pill, backgroundColor: color.accent },
});
