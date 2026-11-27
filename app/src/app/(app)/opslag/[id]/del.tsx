import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { Segmented } from '@/components/Segmented';
import { T } from '@/components/T';
import { TextField } from '@/components/TextField';
import { imageSource } from '@/lib/media';
import { getPost } from '@/lib/posts';
import { useMe } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import type { PostCard } from '@/lib/types';
import { color, radius, TAP } from '@/theme/tokens';

type Person = { id: string; name: string; username: string; avatar_path: string | null };

/** Del et opslag: send som besked til én eller flere, eller del som moment */
export default function Share() {
  const me = useMe();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [post, setPost] = useState<PostCard | null | undefined>(undefined);
  const [mode, setMode] = useState<'besked' | 'opslag' | 'moment'>('besked');
  const [message, setMessage] = useState('');
  const [query, setQuery] = useState('');
  const [people, setPeople] = useState<Person[]>([]);
  const [chosen, setChosen] = useState<Person[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getPost(id).then(setPost);
  }, [id]);

  // Uden søgning: dem du følger. Med søgning: alle på navn eller brugernavn.
  useEffect(() => {
    const t = setTimeout(async () => {
      const q = query.trim().replace(/^@/, '');
      if (q) {
        const { data } = await supabase
          .from('profiles')
          .select('id, name, username, avatar_path')
          .or(`name.ilike.%${q}%,username.ilike.%${q}%`)
          .neq('id', me.id)
          .limit(20);
        setPeople((data ?? []) as Person[]);
      } else {
        const { data } = await supabase.from('follows').select('profiles!follows_followee_id_fkey(id, name, username, avatar_path)').eq('follower_id', me.id).eq('status', 'accepted').limit(30);
        setPeople(((data ?? []) as any[]).map((r) => r.profiles).filter(Boolean));
      }
    }, 200);
    return () => clearTimeout(t);
  }, [query, me.id]);

  if (post === undefined) return <Screen title="Del">{null}</Screen>;
  if (post === null) {
    return (
      <Screen title="Del">
        <T v="body">Opslaget findes ikke længere.</T>
      </Screen>
    );
  }

  const mine = post.author_id === me.id;
  const blocked = !post.allow_share && !mine;
  const toggle = (p: Person) => setChosen((c) => (c.some((x) => x.id === p.id) ? c.filter((x) => x.id !== p.id) : [...c, p]));

  const send = async () => {
    setBusy(true);
    setError('');
    try {
      const body = message.trim() || `Delte et opslag fra ${post.author_name}`;
      for (const p of chosen) {
        const { data: conv, error } = await supabase.rpc('start_conversation', { member_ids: [p.id] });
        if (error) throw error;
        const { error: e2 } = await supabase.from('messages').insert({ conversation_id: conv, sender_id: me.id, body, post_id: post.id });
        if (e2) throw e2;
      }
      setDone(true);
    } catch {
      setError('Beskeden kunne ikke sendes. Prøv igen.');
    } finally {
      setBusy(false);
    }
  };

  const preview = (
    <View style={s.preview}>
      <View style={s.previewHead}>
        <Avatar name={post.author_name} path={post.author_avatar_path} size={24} />
        <T v="captionStrong" numberOfLines={1}>
          {post.author_name}
        </T>
        <T v="caption" c={color.textSecondary}>
          @{post.author_username}
        </T>
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {post.image_paths[0] && <Image source={imageSource(post.image_paths[0])} style={s.thumb} contentFit="cover" />}
        {!!post.text && (
          <T v="bodyS" numberOfLines={3} style={{ flex: 1 }}>
            {post.text}
          </T>
        )}
      </View>
    </View>
  );

  if (blocked) {
    return (
      <Screen title="Del">
        {preview}
        <T v="body">{post.author_name.split(' ')[0]} har slået deling fra for dette opslag.</T>
      </Screen>
    );
  }

  if (done) {
    return (
      <Screen title="Del">
        <View style={s.done}>
          <View style={s.doneIcon}>
            <Icon name="check" size={28} />
          </View>
          <T v="headingM">Sendt til {chosen.length === 1 ? chosen[0].name.split(' ')[0] : `${chosen.length} personer`}</T>
          <Button title="Færdig" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      title="Del"
      footer={
        <View style={s.footer}>
          {mode === 'besked' ? (
            <Button title={chosen.length ? `Send (${chosen.length})` : 'Send'} block disabled={!chosen.length} loading={busy} onPress={send} />
          ) : mode === 'opslag' ? (
            <Button title="Del som opslag" block onPress={() => router.replace({ pathname: '/opret', params: { deler: post.id } })} />
          ) : (
            <Button title="Del som moment" block onPress={() => router.replace({ pathname: '/ny-moment', params: { opslag: post.id } })} />
          )}
        </View>
      }
    >
      <Segmented
        label="Del som"
        value={mode}
        onChange={setMode}
        options={[
          { value: 'besked', label: 'Besked' },
          { value: 'opslag', label: 'Opslag' },
          { value: 'moment', label: 'Moment' },
        ]}
      />
      {preview}
      {mode === 'besked' ? (
        <>
          <TextField label="Besked" placeholder="Skriv en besked (valgfrit)" value={message} onChangeText={setMessage} />
          <TextField label="Send til" placeholder="Søg efter navn" value={query} onChangeText={setQuery} autoCapitalize="none" />
          <View style={{ gap: 4 }}>
            {people.map((p) => {
              const on = chosen.some((x) => x.id === p.id);
              return (
                <Pressable key={p.id} accessibilityRole="checkbox" accessibilityState={{ checked: on }} onPress={() => toggle(p)} style={[s.row, on && s.rowOn]}>
                  <Avatar name={p.name} path={p.avatar_path} />
                  <View style={{ flex: 1 }}>
                    <T v="headingS" numberOfLines={1}>
                      {p.name}
                    </T>
                    <T v="caption" c={color.textSecondary}>
                      @{p.username}
                    </T>
                  </View>
                  <View style={[s.box, on && s.boxOn]}>{on && <Icon name="check" size={16} color={color.white} />}</View>
                </Pressable>
              );
            })}
            {people.length === 0 && (
              <T v="caption" c={color.textSecondary}>
                {query.trim() ? `Ingen hedder “${query.trim()}”.` : 'Du følger ingen endnu. Søg efter navn.'}
              </T>
            )}
          </View>
          {!!error && (
            <T v="bodyS" c={color.danger}>
              {error}
            </T>
          )}
        </>
      ) : (
        <T v="caption" c={color.textSecondary}>
          Opslaget vises i dine moments i 24 timer.
        </T>
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  preview: { gap: 8, padding: 12, borderRadius: radius.lg, borderWidth: 1, borderColor: color.borderDefault, backgroundColor: color.bgSurface },
  previewHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  thumb: { width: 56, height: 56, borderRadius: radius.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: TAP + 12, paddingHorizontal: 10, borderRadius: radius.lg },
  rowOn: { backgroundColor: color.bgSubtle },
  box: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: color.borderStrong, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: color.actionPrimary, borderColor: color.actionPrimary },
  footer: { paddingHorizontal: 20, paddingBottom: 16, paddingTop: 8 },
  done: { alignItems: 'center', gap: 14, paddingTop: 60 },
  doneIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: color.accentBg, alignItems: 'center', justifyContent: 'center' },
});
