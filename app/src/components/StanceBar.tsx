import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { setStance, stanceCounts } from '@/lib/posts';
import { fmtNumber } from '@/lib/time';
import type { Stance } from '@/lib/types';
import { color } from '@/theme/tokens';
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

  const total = counts ? counts.agree + counts.disagree : 0;
  const pct = total ? Math.round(((counts?.agree ?? 0) / total) * 100) : 0;

  return (
    <View style={s.wrap}>
      <View style={s.row} accessibilityLabel="Er du enig?">
        <Side label="Enig" on={mine === 'enig'} pct={open ? (counts ? pct : null) : undefined} onPress={() => vote('enig')} />
        <Side label="Uenig" down on={mine === 'uenig'} pct={open ? (counts ? (total ? 100 - pct : 0) : null) : undefined} onPress={() => vote('uenig')} />
      </View>
      <View style={s.foot}>
        <T v="caption" c={color.textSecondary}>
          {open ? `${fmtNumber(total)} ${total === 1 ? 'stemme' : 'stemmer'} i alt` : 'Hvad mener du?'}
        </T>
        {!mine && (
          <Pressable accessibilityRole="button" onPress={() => setPeek(!peek)} hitSlop={8}>
            <T v="captionStrong" c={color.textSecondary} style={s.underline}>
              {peek ? 'Skjul stemmer' : 'Vis stemmer'}
            </T>
          </Pressable>
        )}
      </View>
    </View>
  );
}

/**
 * Enig eller Uenig som et kort (samme udtryk som oprettelsen): mint ikonfelt og titel.
 * Når stemmerne vises, fyldes kortet svagt op efter andelen, og procenten står til højre.
 */
function Side({ label, down, on, pct, onPress }: { label: string; down?: boolean; on: boolean; pct?: number | null; onPress: () => void }) {
  const shown = pct !== undefined;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      accessibilityLabel={shown && pct !== null ? `${label}, ${pct} procent` : label}
      onPress={onPress}
      style={({ pressed }) => [s.side, on && s.sideOn, pressed && { transform: [{ scale: 0.98 }] }]}
    >
      {shown && pct !== null && <View style={[s.fill, { width: `${pct}%` }]} />}
      <View style={[s.tile, on && s.tileOn]}>
        {on ? (
          <Icon name="check" size={16} color={color.ink900} stroke={2.5} />
        ) : (
          <View style={down ? { transform: [{ scaleY: -1 }] } : undefined}>
            <Icon name="thumb" size={16} color={color.green700} />
          </View>
        )}
      </View>
      <T v="headingS" style={{ flex: 1 }} numberOfLines={1}>
        {label}
      </T>
      {shown && (
        <T v="label" c={on ? color.textPrimary : color.textSecondary} style={{ fontVariant: ['tabular-nums'] }}>
          {pct === null ? '…' : `${pct} %`}
        </T>
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  wrap: { gap: 8 },
  row: { flexDirection: 'row', gap: 10 },
  side: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 52,
    paddingHorizontal: 10,
    overflow: 'hidden',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: color.borderDefault,
    backgroundColor: color.bgSurface,
  },
  sideOn: { borderColor: color.accent, borderWidth: 1.5, paddingHorizontal: 9.5 },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: color.noteBg },
  tile: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: color.noteBg, borderWidth: 1, borderColor: color.accentBg },
  tileOn: { backgroundColor: color.accent, borderColor: color.accent },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
  underline: { textDecorationLine: 'underline' },
});
