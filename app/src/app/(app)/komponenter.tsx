import { router } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { IconButton } from '@/components/IconButton';
import { MomentBubble } from '@/components/MomentBubble';
import { MoreSheet } from '@/components/MoreSheet';
import { PostCard } from '@/components/PostCard';
import { SegmentedControl } from '@/components/SegmentedControl';
import { T } from '@/components/T';
import { TabBar } from '@/components/TabBar';
import { TopBar } from '@/components/TopBar';
import { Wordmark } from '@/components/Wordmark';
import { normalize } from '@/lib/posts';
import { supabase } from '@/lib/supabase';
import type { PostCard as Post } from '@/lib/types';
import { color, TAB_SPACE } from '@/theme/tokens';

/*
 * Midlertidig: oversigt over de fælles komponenter (prototypens /komponenter, Showcase),
 * så de kan sammenlignes med prototypen. Opslagene er rigtige data.
 */
export default function Komponenter() {
  const [chips, setChips] = useState<number[]>([1]);
  const [segment, setSegment] = useState<'1' | '2' | '3'>('1');
  const [posts, setPosts] = useState<Post[]>([]);
  const [more, setMore] = useState(false);
  const toggleChip = (c: number) => setChips((list) => (list.includes(c) ? list.filter((x) => x !== c) : [...list, c]));

  useEffect(() => {
    supabase.rpc('feed_home', { before: new Date().toISOString(), max_rows: 2 }).then(({ data }) => setPosts(((data ?? []) as Post[]).map(normalize)));
  }, []);

  return (
    <View style={s.shell}>
      <TopBar />
      <ScrollView contentContainerStyle={s.showcase}>
        <Section title="Wordmark">
          <View style={{ flexDirection: 'row' }}>
            <Wordmark />
          </View>
        </Section>

        <Section title="Knap">
          <View style={s.row}>
            <Button>Del igen</Button>
            <Button variant="secondary">Del igen</Button>
            <Button variant="highlight">Del igen</Button>
            <Button variant="ghost">Del igen</Button>
          </View>
        </Section>

        <Section title="Chip">
          <View style={s.row}>
            {[0, 1].map((c) => (
              <Chip key={c} selected={chips.includes(c)} onPress={() => toggleChip(c)}>
                Møbler
              </Chip>
            ))}
          </View>
        </Section>

        <Section title="Avatar">
          <View style={[s.row, s.center]}>
            <Avatar name="Mette Lund" tone="sand" size="S" />
            <Avatar name="Mette Lund" tone="sand" size="M" />
            <Avatar name="Mette Lund" tone="sand" size="L" />
            <Avatar name="Mette Lund" tone="blue" size="L" />
            <Avatar name="Mette Lund" tone="sage" size="L" />
            <Avatar name="Mette Lund" tone="rose" size="L" />
          </View>
        </Section>

        <Section title="Ikon-knap">
          <View style={s.row}>
            <IconButton icon="search" label="Søg" variant="outline" />
            <IconButton icon="search" label="Søg" variant="filled" />
            <IconButton icon="search" label="Søg" variant="ghost" />
          </View>
        </Section>

        <Section title="Segmenteret valg">
          <SegmentedControl
            label="Eksempel"
            value={segment}
            onChange={setSegment}
            options={[
              { value: '1', label: 'Valg 1' },
              { value: '2', label: 'Valg 2' },
              { value: '3', label: 'Valg 3' },
            ]}
          />
        </Section>

        <Section title="Moments">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.scrollRow} contentContainerStyle={s.scrollRowContent}>
            <MomentBubble name="Dig" state="add" />
            <MomentBubble name="Mette" state="new" tone="blue" />
            <MomentBubble name="Anna" state="seen" tone="sand" />
          </ScrollView>
        </Section>

        <Section title="Opslag">
          <View style={s.stack}>
            {posts.map((p) => (
              <PostCard key={p.id} post={p} onRemoved={() => setPosts((l) => l.filter((x) => x.id !== p.id))} />
            ))}
          </View>
        </Section>
      </ScrollView>
      <TabBar
        onPress={(name) => (name === 'ny' ? router.push('/opret') : name === 'mere' ? setMore(true) : router.navigate(name === 'index' ? '/' : `/${name}`))}
      />
      <MoreSheet open={more} onClose={() => setMore(false)} />
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={s.section}>
      <T v="headingS" accessibilityRole="header">
        {title}
      </T>
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  shell: { flex: 1, backgroundColor: color.bgApp },
  showcase: { gap: 24, paddingTop: 4, paddingHorizontal: 20, paddingBottom: TAB_SPACE },
  section: { gap: 12 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  center: { alignItems: 'center' },
  scrollRow: { marginHorizontal: -20 },
  scrollRowContent: { gap: 12, paddingHorizontal: 20 },
  stack: { gap: 16 },
});
