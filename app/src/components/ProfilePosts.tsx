import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { PostCard as Post } from '@/lib/types';
import { color, TAP } from '@/theme/tokens';
import { Icon, type IconName } from './Icon';
import { IconButton } from './IconButton';
import { PostCard } from './PostCard';
import { PostGrid } from './PostGrid';
import { T } from './T';

type Tab = 'opslag' | 'debat';

/**
 * Faner under profilen: Opslag og Debat.
 * På Opslag kan man skifte mellem gitter og liste med knappen i samme række.
 * locked = privat profil, man ikke følger: kun Debat kan ses.
 */
export function ProfilePosts({ posts, locked = false, onChanged }: { posts: Post[]; locked?: boolean; onChanged?: () => void }) {
  const [tab, setTab] = useState<Tab>(locked ? 'debat' : 'opslag');
  const [view, setView] = useState<'gitter' | 'liste'>('gitter');
  const feed = posts.filter((p) => p.kind === 'feed');
  const debate = posts.filter((p) => p.kind === 'debat');
  const tabs: { id: Tab; label: string; icon: IconName; count: number }[] = [
    { id: 'opslag', label: 'Opslag', icon: 'layout-list', count: feed.length },
    { id: 'debat', label: 'Debat', icon: 'compass', count: debate.length },
  ];
  const shown = tab === 'opslag' ? feed : debate;

  return (
    <View style={{ gap: 12, alignSelf: 'stretch' }}>
      <View style={s.tabs} accessibilityRole="tablist">
        {tabs.map((t) => {
          const on = tab === t.id;
          const lockedTab = locked && t.id === 'opslag';
          return (
            <Pressable
              key={t.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              onPress={() => setTab(t.id)}
              style={[s.tab, on && s.tabOn]}
            >
              <Icon name={lockedTab ? 'lock' : t.icon} size={18} color={on ? color.textPrimary : color.textSecondary} />
              <T v="label" c={on ? color.textPrimary : color.textSecondary}>
                {t.label}
              </T>
              {!lockedTab && (
                <T v="captionStrong" c={color.textSecondary}>
                  {t.count}
                </T>
              )}
            </Pressable>
          );
        })}
        {tab === 'opslag' && !locked && feed.length > 0 && (
          <IconButton
            icon={view === 'gitter' ? 'layout-rows' : 'layout-grid'}
            label={view === 'gitter' ? 'Vis som liste' : 'Vis som gitter'}
            size={20}
            onPress={() => setView(view === 'gitter' ? 'liste' : 'gitter')}
            style={{ marginLeft: 'auto' }}
          />
        )}
      </View>

      {tab === 'opslag' && locked ? (
        <View style={s.locked}>
          <Icon name="lock" size={22} />
          <T v="headingS">Profilen er privat</T>
        </View>
      ) : shown.length === 0 ? (
        <T v="bodyS" c={color.textSecondary} style={{ textAlign: 'center', paddingVertical: 24 }}>
          {tab === 'opslag' ? 'Ingen opslag endnu' : 'Ingen debatopslag endnu'}
        </T>
      ) : tab === 'opslag' && view === 'gitter' ? (
        <PostGrid posts={shown} />
      ) : (
        <View style={{ gap: 12 }}>
          {shown.map((p) => (
            <PostCard key={p.id} post={p} onRemoved={onChanged} />
          ))}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  tabs: { flexDirection: 'row', alignItems: 'center', gap: 4, borderBottomWidth: 1, borderBottomColor: color.borderDefault },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: TAP, paddingHorizontal: 10, borderBottomWidth: 2, borderBottomColor: 'transparent', marginBottom: -1 },
  tabOn: { borderBottomColor: color.textPrimary },
  locked: { alignItems: 'center', gap: 8, paddingVertical: 32 },
});
