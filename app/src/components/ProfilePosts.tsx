import { Image } from 'expo-image';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { imageSource } from '@/lib/media';
import type { PostCard as Post } from '@/lib/types';
import { color, font, radius, TAP } from '@/theme/tokens';
import { HighlightsRow } from './HighlightsRow';
import { Icon, type IconName } from './Icon';
import { PostCard } from './PostCard';
import { PostGrid } from './PostGrid';
import { T } from './T';

type Tab = 'opslag' | 'debat' | 'flicks';

/** Opslag i grupper, begivenheder og på sider hører til der, ikke på profilen (som i prototypen) */
export const profilePosts = (posts: Post[]) => posts.filter((p) => !p.group_id && !p.event_id && !p.page_id);

type Props = {
  /** Profilens ejer (til highlights) */
  userId: string;
  posts: Post[];
  /** Din egen profil: "Ny" highlight og knapper til at lave nyt */
  own?: boolean;
  /** Fornavn til tomme tilstande, fx "Mette" */
  name: string;
  /** Privat profil, du ikke følger: kun Debat er åben */
  locked?: boolean;
  onChanged?: () => void;
};

/**
 * Fælles opbygning af profiler (prototypens ProfileContent):
 * 1. Highlights (runde bobler)
 * 2. Faner: Opslag · Debat · Flicks (huskes i adressen, ?fane=)
 */
export function ProfilePosts({ userId, posts, own = false, name, locked = false, onChanged }: Props) {
  const { fane } = useLocalSearchParams<{ fane?: string }>();
  const tab: Tab = fane === 'debat' || fane === 'flicks' || fane === 'opslag' ? fane : locked ? 'debat' : 'opslag';
  const [openAll, setOpenAll] = useState(false);
  // Opslag som gitter eller liste. Gitter er standard.
  const [view, setView] = useState<'gitter' | 'liste'>('gitter');

  const personal = profilePosts(posts);
  const feed = personal.filter((p) => p.kind === 'feed');
  const debate = personal.filter((p) => p.kind === 'debat');
  const flicks = personal.filter((p) => p.kind === 'flick');
  const tabs: { value: Tab; label: string; icon: IconName; count: number }[] = [
    { value: 'opslag', label: 'Opslag', icon: 'layout-list', count: feed.length },
    { value: 'debat', label: 'Debat', icon: 'compass', count: debate.length },
    { value: 'flicks', label: 'Flicks', icon: 'clip', count: flicks.length },
  ];
  const shownPosts = openAll ? feed : feed.slice(0, 6);
  const card = (p: Post) => <PostCard key={p.id} post={p} onRemoved={onChanged} />;

  return (
    <>
      {!locked && <HighlightsRow userId={userId} own={own} />}

      <View style={s.tabsRow}>
      <View style={s.tabs} accessibilityRole="tablist" accessibilityLabel="Vis på profilen">
        {tabs.map((t) => {
          const on = tab === t.value;
          const lockedTab = locked && t.value !== 'debat';
          return (
            <Pressable
              key={t.value}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              onPress={() => router.setParams({ fane: t.value === (locked ? 'debat' : 'opslag') ? undefined : t.value })}
              style={[s.tab, on && s.tabOn]}
            >
              <Icon name={lockedTab ? 'lock' : t.icon} size={16} color={on ? color.textPrimary : color.textSecondary} />
              <T v="label" c={on ? color.textPrimary : color.textSecondary} numberOfLines={1}>
                {t.label}
              </T>
              {!lockedTab && (
                <View style={s.count}>
                  <T style={s.countTxt} c={on ? color.textPrimary : color.textSecondary}>
                    {t.count}
                  </T>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
        {/* Gitter eller liste – kun på Opslag, i samme række som fanerne */}
        {!locked && tab === 'opslag' && feed.length > 0 && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={view === 'gitter' ? 'Vis som liste' : 'Vis som gitter'}
            onPress={() => setView(view === 'gitter' ? 'liste' : 'gitter')}
            style={s.viewBtn}
          >
            <Icon name={view === 'gitter' ? 'layout-rows' : 'layout-grid'} size={20} color={color.textSecondary} />
          </Pressable>
        )}
      </View>

      <View style={s.panel}>
        {locked && tab !== 'debat' && (
          <View style={s.locked}>
            <View style={s.lockedIcon}>
              <Icon name="lock" size={22} />
            </View>
            <T v="headingS" style={s.center}>
              Profilen er privat
            </T>
            <T v="bodyS" c={color.textSecondary} style={s.center}>
              Følg {name} for at se {tab === 'opslag' ? 'opslag' : 'flicks'} og highlights. Indlæg i Offentlig debat er altid synlige.
            </T>
          </View>
        )}

        {!locked &&
          tab === 'opslag' &&
          (feed.length === 0 ? (
            <Empty text={own ? 'Du har ikke delt noget endnu.' : `${name} har ikke delt noget endnu.`} action={own ? { label: 'Skriv et opslag', to: '/opret' } : undefined} />
          ) : view === 'gitter' ? (
            <PostGrid posts={feed} />
          ) : (
            <>
              {shownPosts.map(card)}
              {feed.length > shownPosts.length && (
                <Pressable accessibilityRole="button" onPress={() => setOpenAll(true)} style={s.more}>
                  <T v="label" style={{ textDecorationLine: 'underline' }}>
                    Vis alle {feed.length} opslag
                  </T>
                </Pressable>
              )}
            </>
          ))}

        {tab === 'debat' &&
          (debate.length === 0 ? (
            <Empty
              text={own ? 'Du har ikke deltaget i debatten endnu.' : `${name} har ikke deltaget i debatten endnu.`}
              action={own ? { label: 'Skriv i Offentlig debat', to: '/opret?sted=debat' } : undefined}
            />
          ) : (
            debate.map(card)
          ))}

        {!locked &&
          tab === 'flicks' &&
          (flicks.length === 0 ? (
            <Empty text={own ? 'Du har ikke lavet nogen flicks endnu.' : `${name} har ingen flicks endnu.`} action={own ? { label: 'Lav en flick', to: '/flicks/ny' } : undefined} />
          ) : (
            <FlickTiles flicks={flicks} />
          ))}
      </View>
    </>
  );
}

/** Flicks: tre kolonner i 9:16 som afrundede fliser med luft imellem */
function FlickTiles({ flicks }: { flicks: Post[] }) {
  const [w, setW] = useState(0);
  const cellW = w ? Math.floor(((w - 12) / 3) * 100) / 100 : 0;
  return (
    <View style={s.flicks} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {flicks.map((f) => (
        <Pressable
          key={f.id}
          accessibilityRole="link"
          accessibilityLabel="Afspil flick"
          onPress={() => router.push(`/flicks?vis=${f.id}`)}
          style={[s.flick, cellW ? { width: cellW } : { width: '32.6%' }]}
        >
          {f.media_type === 'image' && f.image_paths[0] ? <Image source={imageSource(f.image_paths[0])} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
          {/* Antal visninger findes ikke i databasen: kun ikonet */}
          <View style={s.flickViews}>
            <Icon name="clip" size={14} color={color.white} />
          </View>
        </Pressable>
      ))}
    </View>
  );
}

function Empty({ text, action }: { text: string; action?: { label: string; to: Href } }) {
  return (
    <View style={s.empty}>
      <T v="bodyS" c={color.textSecondary} style={s.center}>
        {text}
      </T>
      {action && (
        <Pressable accessibilityRole="link" onPress={() => router.push(action.to)} style={({ pressed }) => [s.emptyAction, pressed && { opacity: 0.85 }]}>
          <T v="label" c={color.textOnAction}>
            {action.label}
          </T>
        </Pressable>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  /* Fanerne som en rolig pille (samme udtryk som Brugere/Interesser på Hjem) */
  tabsRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tabs: { flex: 1, minWidth: 0, flexDirection: 'row', gap: 2, padding: 3, borderRadius: radius.pill, backgroundColor: color.bgSubtle },
  tab: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, minHeight: 40, borderRadius: radius.pill },
  tabOn: { backgroundColor: color.bgSurface, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 1 } },
  count: { paddingHorizontal: 5 },
  countTxt: { fontFamily: font.bodySemi, fontSize: 12, lineHeight: 18 },
  viewBtn: { width: TAP, height: TAP, flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: TAP / 2, backgroundColor: color.bgSubtle },
  panel: { gap: 14 },
  more: { alignSelf: 'center', minHeight: TAP, paddingHorizontal: 12, justifyContent: 'center' },
  flicks: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  flick: { aspectRatio: 9 / 16, overflow: 'hidden', borderRadius: radius.md, backgroundColor: color.ink900 },
  flickViews: { position: 'absolute', left: 6, bottom: 6, flexDirection: 'row', alignItems: 'center', gap: 3 },
  empty: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 28,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: color.borderStrong,
    borderRadius: radius.lg,
  },
  emptyAction: { minHeight: TAP, paddingHorizontal: 18, justifyContent: 'center', borderRadius: radius.pill, backgroundColor: color.actionPrimary },
  locked: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 28,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: color.borderDefault,
    borderRadius: radius.lg,
    backgroundColor: color.bgSurface,
  },
  lockedIcon: { width: 52, height: 52, marginBottom: 4, borderRadius: 26, borderWidth: 1.5, borderColor: color.textPrimary, alignItems: 'center', justifyContent: 'center' },
  center: { textAlign: 'center' },
});
