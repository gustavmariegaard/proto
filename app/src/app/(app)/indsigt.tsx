import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Line, Path } from 'react-native-svg';
import { MintTile } from '@/components/CreateFlow';
import { Icon, type IconName } from '@/components/Icon';
import { PageHeader } from '@/components/PageHeader';
import { SegmentedControl } from '@/components/SegmentedControl';
import { T } from '@/components/T';
import { myInsights, type Insights } from '@/lib/insights';
import { imageSource } from '@/lib/media';
import { fmtNumber } from '@/lib/time';
import { color, font, radius } from '@/theme/tokens';

type Period = '7' | '30' | '90';
const periods: { value: Period; label: string }[] = [
  { value: '7', label: '7 dage' },
  { value: '30', label: '30 dage' },
  { value: '90', label: '90 dage' },
];

/** Søjlernes farve: mørk grøn (kontrast ≥ 3:1 mod hvid) */
const BAR = color.green700;

/**
 * Indsigt på din egen profil: hvor mange du når, visninger, profilbesøg,
 * interaktioner, følgere og dine bedste opslag. Kun du kan se tallene.
 */
export default function InsightsScreen() {
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState<Period>('30');
  const [data, setData] = useState<Insights | null | undefined>(undefined);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (p: Period) => setData(await myInsights(Number(p))), []);
  useFocusEffect(
    useCallback(() => {
      load(period);
    }, [load, period]),
  );

  const d = data;
  const interactions = d ? d.likes + d.comments + d.saves + d.shares : 0;
  const followerShare = d && d.reach ? Math.round((d.reach_followers / d.reach) * 100) : 0;

  return (
    <View style={s.root}>
      <PageHeader title="Indsigt" fallback="/indstillinger" />
      <ScrollView
        contentContainerStyle={[s.content, { paddingBottom: 32 + insets.bottom }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load(period);
              setRefreshing(false);
            }}
          />
        }
      >
        <SegmentedControl
          label="Periode"
          options={periods}
          value={period}
          onChange={(p) => {
            setData(undefined);
            setPeriod(p);
          }}
        />

        {d === undefined ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={color.textSecondary} />
        ) : d === null ? (
          <T v="bodyS" c={color.textSecondary}>
            Tallene kunne ikke hentes. Træk ned for at prøve igen.
          </T>
        ) : (
          <>
            {/* Hovedtal: hvor mange forskellige personer så dine opslag */}
            <View style={s.card}>
              <View style={s.heroHead}>
                <MintTile icon="eye" />
                <T v="label" c={color.textSecondary}>
                  Personer, du har nået
                </T>
              </View>
              <T style={s.hero} accessibilityLabel={`${fmtNumber(d.reach)} personer nået`}>
                {fmtNumber(d.reach)}
              </T>
              <Change now={d.reach} before={d.reach_prev} days={d.days} />
            </View>

            <View style={s.grid}>
              <Kpi icon="layout-grid" label="Visninger" n={d.views} prev={d.views_prev} days={d.days} />
              <Kpi icon="user" label="Profilbesøg" n={d.visits} prev={d.visits_prev} days={d.days} />
              <Kpi icon="heart" label="Interaktioner" n={interactions} prev={d.interactions_prev} days={d.days} />
              <Kpi icon="user-plus" label="Nye følgere" n={d.new_followers} prev={d.new_followers_prev} days={d.days} />
            </View>

            <View style={s.card}>
              <T v="headingS" accessibilityRole="header">
                Visninger pr. dag
              </T>
              <Bars series={d.series} />
            </View>

            <View style={s.card}>
              <T v="headingS" accessibilityRole="header">
                Interaktioner
              </T>
              {(
                [
                  { icon: 'heart', label: 'Synes godt om', n: d.likes },
                  { icon: 'chat', label: 'Kommentarer', n: d.comments },
                  { icon: 'bookmark', label: 'Gemt', n: d.saves },
                  { icon: 'send', label: 'Delinger', n: d.shares },
                ] as { icon: IconName; label: string; n: number }[]
              ).map((r) => (
                <Meter key={r.label} icon={r.icon} label={r.label} n={r.n} total={Math.max(1, interactions)} />
              ))}
            </View>

            <View style={s.card}>
              <T v="headingS" accessibilityRole="header">
                Følgere
              </T>
              <View style={s.split}>
                <View style={{ flex: 1 }}>
                  <T style={s.mid}>{fmtNumber(d.followers)}</T>
                  <T v="caption" c={color.textSecondary}>
                    følger dig i alt
                  </T>
                </View>
                <View style={{ flex: 1 }}>
                  <T style={s.mid}>+{fmtNumber(d.new_followers)}</T>
                  <T v="caption" c={color.textSecondary}>
                    nye de seneste {d.days} dage
                  </T>
                </View>
              </View>
              {d.reach > 0 && (
                <View style={{ gap: 6 }}>
                  <View style={s.track} accessibilityLabel={`${followerShare} procent af dem, du nåede, følger dig`}>
                    <View style={[s.fill, { width: `${Math.max(2, followerShare)}%` }]} />
                  </View>
                  <T v="caption" c={color.textSecondary}>
                    {followerShare} % af dem, du nåede, følger dig. {100 - followerShare} % gør ikke.
                  </T>
                </View>
              )}
            </View>

            <View style={s.card}>
              <T v="headingS" accessibilityRole="header">
                Dine bedste opslag
              </T>
              {d.top.length === 0 ? (
                <T v="bodyS" c={color.textSecondary}>
                  Når andre ser og reagerer på dine opslag, kan du se de bedste her.
                </T>
              ) : (
                d.top.map((p, i) => (
                  <Pressable
                    key={p.id}
                    accessibilityRole="link"
                    onPress={() => router.push(p.kind === 'flick' ? `/flicks?vis=${p.id}` : `/opslag/${p.id}`)}
                    style={({ pressed }) => [s.top, i > 0 && s.topLine, pressed && { opacity: 0.7 }]}
                  >
                    <View style={s.thumb}>
                      {p.image_paths[0] && p.media_type !== 'video' ? (
                        <Image source={imageSource(p.image_paths[0])} style={StyleSheet.absoluteFill} contentFit="cover" />
                      ) : (
                        <Icon name={p.kind === 'flick' || p.media_type === 'video' ? 'clip' : 'layout-list'} size={20} color={color.textSecondary} />
                      )}
                    </View>
                    <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                      <T v="label" numberOfLines={1}>
                        {p.text?.trim() || (p.kind === 'flick' ? 'Flick' : 'Billede')}
                      </T>
                      <T v="caption" c={color.textSecondary} numberOfLines={1}>
                        {fmtNumber(p.views)} visninger · {fmtNumber(p.likes)} synes godt om · {fmtNumber(p.comments)} kommentarer
                      </T>
                    </View>
                    <Icon name="chevron-right" size={18} color={color.textSecondary} />
                  </Pressable>
                ))
              )}
            </View>

            <View style={s.note}>
              <Icon name="lock" size={14} color={color.textSecondary} />
              <T v="caption" c={color.textSecondary} style={{ flex: 1 }}>
                Kun du kan se dine tal. En person tæller højst én gang om dagen pr. opslag, og dine egne visninger tæller ikke med.
              </T>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

/** Ændring i forhold til perioden før: pil + procent (aldrig kun farve) */
function Change({ now, before, days }: { now: number; before: number; days: number }) {
  if (!before && !now) return <T v="caption" c={color.textSecondary}>Ingen aktivitet endnu</T>;
  if (!before) return <T v="caption" c={color.green700}>▲ Nyt i forhold til de {days} dage før</T>;
  const pct = Math.round(((now - before) / before) * 100);
  const up = pct >= 0;
  return (
    <T v="caption" c={up ? color.green700 : color.textSecondary}>
      {up ? '▲' : '▼'} {Math.abs(pct)} % i forhold til de {days} dage før
    </T>
  );
}

function Kpi({ icon, label, n, prev, days }: { icon: IconName; label: string; n: number; prev: number; days: number }) {
  const pct = prev ? Math.round(((n - prev) / prev) * 100) : null;
  return (
    <View style={s.kpi} accessible accessibilityLabel={`${label}: ${fmtNumber(n)}`}>
      <View style={s.kpiHead}>
        <Icon name={icon} size={16} color={color.textSecondary} />
        <T v="caption" c={color.textSecondary} numberOfLines={1}>
          {label}
        </T>
      </View>
      <T style={s.mid}>{fmtNumber(n)}</T>
      <T v="caption" c={pct !== null && pct < 0 ? color.textSecondary : color.green700} numberOfLines={1}>
        {pct === null ? (n ? `▲ Nyt · ${days} dage` : `Seneste ${days} dage`) : `${pct >= 0 ? '▲' : '▼'} ${Math.abs(pct)} %`}
      </T>
    </View>
  );
}

function Meter({ icon, label, n, total }: { icon: IconName; label: string; n: number; total: number }) {
  return (
    <View style={s.meter} accessible accessibilityLabel={`${label}: ${n}`}>
      <Icon name={icon} size={18} color={color.textSecondary} />
      <View style={{ flex: 1, gap: 6 }}>
        <View style={s.meterHead}>
          <T v="bodyS">{label}</T>
          <T v="label">{fmtNumber(n)}</T>
        </View>
        <View style={s.track}>
          <View style={[s.fill, { width: `${n ? Math.max(2, (n / total) * 100) : 0}%` }]} />
        </View>
      </View>
    </View>
  );
}

const dayLabel = (iso: string) => new Date(iso + 'T12:00:00').toLocaleDateString('da-DK', { day: 'numeric', month: 'short' });

/** Søjler for visninger pr. dag. Tryk på en dag for at se tallet. */
function Bars({ series }: { series: Insights['series'] }) {
  const [w, setW] = useState(0);
  const [sel, setSel] = useState<number | null>(null);
  const H = 140;
  const max = Math.max(1, ...series.map((x) => x.views));
  // Pæne tal på aksen: 1, 2, 5, 10, 20, 50 …
  const step = [1, 2, 5].flatMap((m) => [1, 10, 100, 1000].map((e) => m * e)).sort((a, b) => a - b).find((x) => x * 2 >= max) ?? max;
  const top = step * 2;
  const slot = w ? w / series.length : 0;
  const bw = Math.max(2, Math.min(24, slot * 0.6));
  const total = series.reduce((a, x) => a + x.views, 0);
  const shown = sel !== null ? series[sel] : null;

  return (
    <View style={{ gap: 8 }}>
      <T v="caption" c={color.textSecondary} accessibilityLiveRegion="polite">
        {shown ? `${dayLabel(shown.day)}: ${fmtNumber(shown.views)} visninger` : `${fmtNumber(total)} visninger i alt. Tryk på en dag for at se tallet.`}
      </T>
      <View style={s.chartRow}>
        <View style={[s.chart, { height: H }]} onLayout={(e) => setW(e.nativeEvent.layout.width)} accessibilityLabel={`Visninger pr. dag, i alt ${total}`}>
          {w > 0 && (
            <Svg width={w} height={H}>
              {/* Hjælpelinjer: midt og top, tynde og rolige */}
              <Line x1={0} x2={w} y1={H / 2} y2={H / 2} stroke={color.borderDefault} strokeWidth={1} />
              <Line x1={0} x2={w} y1={0.5} y2={0.5} stroke={color.borderDefault} strokeWidth={1} />
              {series.map((x, i) => {
                const h = x.views ? Math.max(3, (x.views / top) * (H - 2)) : 0;
                if (!h) return null;
                const cx = i * slot + slot / 2;
                const r = Math.min(4, bw / 2, h);
                const x0 = cx - bw / 2;
                const y0 = H - h;
                // 4 px runde hjørner i toppen, lige i bunden
                const d = `M${x0},${H} L${x0},${y0 + r} Q${x0},${y0} ${x0 + r},${y0} L${x0 + bw - r},${y0} Q${x0 + bw},${y0} ${x0 + bw},${y0 + r} L${x0 + bw},${H} Z`;
                return <Path key={x.day} d={d} fill={BAR} opacity={sel === null || sel === i ? 1 : 0.35} />;
              })}
              <Line x1={0} x2={w} y1={H - 0.5} y2={H - 0.5} stroke={color.borderStrong} strokeWidth={1} />
            </Svg>
          )}
          {/* Store trykflader: hele dagens kolonne */}
          <View style={[StyleSheet.absoluteFill, { flexDirection: 'row' }]}>
            {series.map((x, i) => (
              <Pressable
                key={x.day}
                accessibilityRole="button"
                accessibilityLabel={`${dayLabel(x.day)}: ${x.views} visninger`}
                onPress={() => setSel(sel === i ? null : i)}
                style={{ flex: 1 }}
              />
            ))}
          </View>
        </View>
        <View style={[s.axis, { height: H }]}>
          <T style={s.tick}>{fmtNumber(top)}</T>
          <T style={s.tick}>{fmtNumber(step)}</T>
          <T style={s.tick}>0</T>
        </View>
      </View>
      <View style={s.xAxis}>
        <T style={s.tick}>{series[0] ? dayLabel(series[0].day) : ''}</T>
        <T style={s.tick}>I dag</T>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bgApp },
  content: { gap: 14, paddingTop: 4, paddingHorizontal: 20 },
  card: { gap: 12, padding: 16, borderRadius: radius.lg, borderWidth: 1, borderColor: color.borderDefault, backgroundColor: color.bgSurface },
  heroHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  hero: { fontFamily: font.title, fontSize: 44, lineHeight: 50, letterSpacing: -1, color: color.textPrimary },
  mid: { fontFamily: font.title, fontSize: 26, lineHeight: 32, letterSpacing: -0.4, color: color.textPrimary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpi: { flexBasis: '45%', flexGrow: 1, gap: 4, padding: 14, borderRadius: radius.lg, borderWidth: 1, borderColor: color.borderDefault, backgroundColor: color.bgSurface },
  kpiHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  meter: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  meterHead: { flexDirection: 'row', justifyContent: 'space-between' },
  track: { height: 6, borderRadius: 3, backgroundColor: color.bgSubtle, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3, backgroundColor: BAR },
  split: { flexDirection: 'row', gap: 12 },
  chartRow: { flexDirection: 'row', gap: 8 },
  chart: { flex: 1 },
  axis: { justifyContent: 'space-between', alignItems: 'flex-end', marginTop: -7, marginBottom: -7 },
  xAxis: { flexDirection: 'row', justifyContent: 'space-between', paddingRight: 30 },
  tick: { fontFamily: font.body, fontSize: 11, lineHeight: 14, color: color.textSecondary },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56 },
  topLine: { borderTopWidth: 1, borderTopColor: color.borderDefault, paddingTop: 10 },
  thumb: { width: 44, height: 44, borderRadius: 10, overflow: 'hidden', backgroundColor: color.bgSubtle, alignItems: 'center', justifyContent: 'center' },
  note: { flexDirection: 'row', gap: 8, paddingHorizontal: 4 },
});
