import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { supabase } from '@/lib/supabase';
import type { PostCard as Post } from '@/lib/types';
import { color, font, radius, TAP } from '@/theme/tokens';
import { FlickGrid } from './FlickGrid';
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
  /** En side: kun Opslag og Flicks (sider deltager ikke i debatten), ingen highlights. `userId` er sidens id. */
  page?: boolean;
};

/**
 * Fælles opbygning af profiler (prototypens ProfileContent):
 * 1. Highlights (runde bobler)
 * 2. Faner: Opslag · Debat · Flicks (huskes i adressen, ?fane=)
 */
export function ProfilePosts({ userId, posts, own = false, name, locked = false, onChanged, page = false }: Props) {
  const { fane } = useLocalSearchParams<{ fane?: string }>();
  const tab: Tab = fane === 'debat' || fane === 'flicks' || fane === 'opslag' ? fane : locked ? 'debat' : 'opslag';

  // En sides opslag har page_id; på en personlig profil hører de til siden og vises ikke
  const personal = page ? posts.filter((p) => !p.group_id && !p.event_id) : profilePosts(posts);
  // Gitteret er kun almindelige opslag: delte debatindlæg og flicks hører ikke til her
  const sharedIds = personal.filter((p) => p.kind === 'feed' && p.shared_post_id).map((p) => p.shared_post_id as string);
  const hidden = useHiddenShares(sharedIds);
  const feed = personal.filter((p) => p.kind === 'feed' && !(p.shared_post_id && hidden.has(p.shared_post_id)));
  const debate = personal.filter((p) => p.kind === 'debat');
  const flicks = personal.filter((p) => p.kind === 'flick');
  const tabs: { value: Tab; label: string; icon: IconName }[] = [
    { value: 'opslag', label: 'Opslag', icon: 'layout-grid' },
    ...(page ? [] : [{ value: 'debat' as Tab, label: 'Debat', icon: 'compass' as IconName }]),
    { value: 'flicks', label: 'Flicks', icon: 'clip' },
  ];
  const card = (p: Post) => <PostCard key={p.id} post={p} onRemoved={onChanged} />;

  return (
    <>
      {!locked && !page && <HighlightsRow userId={userId} own={own} />}

      <View style={s.tabsRow}>
      <View style={s.tabs} accessibilityRole="tablist" accessibilityLabel="Vis på profilen">
        {tabs.map((t) => {
          const on = tab === t.value;
          const lockedTab = locked && t.value !== 'debat';
          return (
            <Pressable
              key={t.value}
              accessibilityRole="tab"
              accessibilityLabel={t.label}
              accessibilityState={{ selected: on }}
              onPress={() => router.setParams({ fane: t.value === (locked ? 'debat' : 'opslag') ? undefined : t.value })}
              style={[s.tab, on && s.tabOn]}
            >
              <Icon name={lockedTab ? 'lock' : t.icon} size={20} color={on ? color.textPrimary : color.textSecondary} />
            </Pressable>
          );
        })}
      </View>
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
            <Empty
              text={page ? (own ? 'Siden har ikke delt noget endnu. Opslag fra siden vises under Interesser hos dem, der følger den.' : `${name} har ikke delt noget endnu.`) : own ? 'Du har ikke delt noget endnu.' : `${name} har ikke delt noget endnu.`}
              action={own ? { label: 'Skriv et opslag', to: page ? `/opret?side=${userId}` : '/opret' } : undefined}
            />
          ) : (
            <PostGrid posts={feed} />
          ))}

        {tab === 'debat' && !page &&
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
            <Empty text={own ? 'Du har ikke lavet nogen flicks endnu.' : `${name} har ingen flicks endnu.`} action={own && !page ? { label: 'Lav en flick', to: '/flicks/ny' } : undefined} />
          ) : (
            <FlickGrid flicks={flicks} />
          ))}
      </View>
    </>
  );
}

/** De delte opslag, der er debatindlæg eller flicks (de vises ikke i gitteret) */
function useHiddenShares(ids: string[]) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const key = [...new Set(ids)].sort().join(',');
  useEffect(() => {
    if (!key) return setHidden(new Set());
    let live = true;
    supabase
      .from('posts')
      .select('id, kind')
      .in('id', key.split(','))
      .then(({ data }) => {
        if (live) setHidden(new Set(((data ?? []) as { id: string; kind: string }[]).filter((r) => r.kind !== 'feed').map((r) => r.id)));
      });
    return () => {
      live = false;
    };
  }, [key]);
  return hidden;
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
  panel: { gap: 14 },
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
