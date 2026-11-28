import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Share as NativeShare, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Choice, CloseHeader, closeTo, ModalScreen, parts, RadioDot } from '@/components/CreateParts';
import { SegmentedControl } from '@/components/SegmentedControl';
import { T } from '@/components/T';
import { noOutline, TextField } from '@/components/TextField';
import { myConversations } from '@/lib/conversations';
import { imageSource } from '@/lib/media';
import { getPost } from '@/lib/posts';
import { useMe } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import type { PostCard } from '@/lib/types';
import { color, font, radius } from '@/theme/tokens';

type Mode = 'besked' | 'opslag';
type Target = { key: string; kind: 'cirkel' | 'person'; id: string; name: string; avatar_path: string | null; hint: string };

const modes = [
  { value: 'besked', label: 'Besked' },
  { value: 'opslag', label: 'Opslag' },
  { value: 'moment', label: 'Moment' },
] as const;

/**
 * Del et opslag på tre måder (prototypens Share):
 * - Besked: send det til folk, du følger, eller dine cirkler (én samlet liste)
 * - Opslag: videredel det som eget opslag på din profil (ikke flicks)
 * - Moment: videredel det som et moment i 24 timer (fuld skærm)
 * "Del" og "Kopiér link" står altid fast nederst.
 */
export default function Share() {
  const me = useMe();
  const insets = useSafeAreaInsets();
  const { id, som } = useLocalSearchParams<{ id: string; som?: string }>();
  const close = closeTo(`/opslag/${id}`);
  const [post, setPost] = useState<PostCard | null | undefined>(undefined);
  const [mode, setMode] = useState<Mode>(som === 'eget' || som === 'opslag' ? 'opslag' : 'besked');
  const [message, setMessage] = useState('');
  const [note, setNote] = useState('');
  const [query, setQuery] = useState('');
  const [circles, setCircles] = useState<Target[]>([]);
  const [people, setPeople] = useState<Target[]>([]);
  const [selected, setSelected] = useState<Target[]>([]);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getPost(id).then(setPost);
  }, [id]);

  // Dine cirkler (gruppesamtaler)
  useEffect(() => {
    myConversations()
      .then((cs) =>
        setCircles(
          cs.filter((c) => c.is_group && !c.is_request).map((c) => ({ key: `c:${c.id}`, kind: 'cirkel', id: c.id, name: c.name || c.members.map((m) => m.name.split(' ')[0]).join(', '), avatar_path: null, hint: 'Cirkel' })),
        ),
      )
      .catch(() => {});
  }, []);

  // Uden søgning: dem du følger. Med søgning: alle på navn eller brugernavn.
  useEffect(() => {
    const t = setTimeout(async () => {
      const q = query.trim().replace(/^@/, '');
      let rows: { id: string; name: string; username: string; avatar_path: string | null }[] = [];
      if (q) {
        const { data } = await supabase.from('profiles').select('id, name, username, avatar_path').or(`name.ilike.%${q}%,username.ilike.%${q}%`).neq('id', me.id).limit(20);
        rows = (data ?? []) as typeof rows;
      } else {
        const { data } = await supabase.from('follows').select('profiles!follows_followee_id_fkey(id, name, username, avatar_path)').eq('follower_id', me.id).eq('status', 'accepted').limit(30);
        rows = ((data ?? []) as any[]).map((r) => r.profiles).filter(Boolean);
      }
      setPeople(rows.map((p) => ({ key: `p:${p.id}`, kind: 'person', id: p.id, name: p.name, avatar_path: p.avatar_path, hint: `@${p.username}` })));
    }, 200);
    return () => clearTimeout(t);
  }, [query, me.id]);

  if (post === undefined) return <ModalScreen header={<CloseHeader title="Del" onClose={close} />}>{null}</ModalScreen>;
  if (post === null) {
    return (
      <ModalScreen header={<CloseHeader title="Del" onClose={close} />}>
        <T v="bodyS" c={color.textSecondary}>
          Opslaget findes ikke længere.
        </T>
      </ModalScreen>
    );
  }

  // Flicks deles kun som besked eller moment (aldrig som opslag i dit gitter)
  const options = post.kind === 'flick' ? modes.filter((m) => m.value !== 'opslag') : modes;
  if (post.kind === 'flick' && mode === 'opslag') setMode('besked');

  const q = query.trim().toLowerCase();
  const targets = [...circles.filter((c) => !q || c.name.toLowerCase().includes(q)), ...people];
  const toggle = (t: Target) => setSelected((l) => (l.some((x) => x.key === t.key) ? l.filter((x) => x.key !== t.key) : [...l, t]));

  const copyLink = async () => {
    const url = Platform.OS === 'web' && typeof window !== 'undefined' ? `${window.location.origin}/opslag/${post.id}` : Linking.createURL(`/opslag/${post.id}`);
    try {
      if (Platform.OS === 'web') await navigator.clipboard.writeText(url);
      else await NativeShare.share({ message: url });
    } catch {
      /* Ingen adgang til udklipsholderen: vi viser stadig bekræftelsen */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const send = async () => {
    setBusy(true);
    setError('');
    try {
      const body = message.trim() || `Delte et opslag fra ${post.author_name}`;
      for (const t of selected) {
        let conv = t.id;
        if (t.kind === 'person') {
          const { data, error } = await supabase.rpc('start_conversation', { member_ids: [t.id] });
          if (error) throw error;
          conv = data as string;
        }
        const { error } = await supabase.from('messages').insert({ conversation_id: conv, sender_id: me.id, body, post_id: post.id });
        if (error) throw error;
      }
      close();
    } catch {
      setError('Beskeden kunne ikke sendes. Prøv igen.');
      setBusy(false);
    }
  };

  const shareAsPost = async () => {
    setBusy(true);
    setError('');
    const { error } = await supabase.from('posts').insert({ author_id: me.id, kind: 'feed', text: note.trim(), shared_post_id: post.id });
    if (error) {
      setError('Opslaget kunne ikke deles. Prøv igen.');
      setBusy(false);
      return;
    }
    router.replace('/');
  };

  const shareLabel = mode === 'besked' ? (selected.length > 1 ? `Send til ${selected.length}` : 'Send') : 'Del som opslag';

  const quote = (
    <View style={s.quote}>
      <View style={s.quoteHead}>
        <Avatar name={post.author_name} path={post.author_avatar_path} size="S" />
        <View style={{ minWidth: 0, flex: 1 }}>
          <T v="headingS" numberOfLines={1}>
            {post.author_name}
          </T>
          <T v="caption" c={color.textSecondary} numberOfLines={1}>
            @{post.author_username}
          </T>
        </View>
      </View>
      {!!post.text && <T v="bodyS">{post.text}</T>}
      {!!post.image_paths[0] && post.media_type !== 'video' && <Image source={imageSource(post.image_paths[0])} style={s.quoteImg} contentFit="cover" />}
    </View>
  );

  return (
    <ModalScreen
      header={<CloseHeader title="Del" onClose={close} />}
      contentStyle={{ paddingBottom: 16 }}
      footer={
        <View style={[s.footer, { paddingBottom: 12 + insets.bottom }]}>
          <Button block disabled={mode === 'besked' && selected.length === 0} loading={busy} onPress={mode === 'besked' ? send : shareAsPost}>
            {shareLabel}
          </Button>
          <Button variant="secondary" block onPress={copyLink} accessibilityLiveRegion="polite">
            {copied ? 'Link kopieret' : 'Kopiér link'}
          </Button>
        </View>
      }
    >
      <>
          <View style={parts.full}>
            <SegmentedControl
              label="Del som"
              options={options}
              value={mode}
              // Moment åbner i fuld skærm, ligesom at dele til en story
              onChange={(m) => (m === 'moment' ? router.push({ pathname: '/ny-moment', params: { opslag: post.id } }) : setMode(m))}
            />
          </View>

          {mode === 'besked' && (
            <>
              <View style={s.preview}>
                <View style={s.previewBody}>
                  <View style={s.previewHead}>
                    <Avatar name={post.author_name} path={post.author_avatar_path} size="S" />
                    <T v="captionStrong" numberOfLines={1} style={{ flexShrink: 1 }}>
                      {post.author_name}
                    </T>
                  </View>
                  {!!post.text && (
                    <T v="caption" numberOfLines={2}>
                      {post.text}
                    </T>
                  )}
                </View>
                {!!post.image_paths[0] && post.media_type !== 'video' && (
                  <Image source={imageSource(post.image_paths[0])} style={s.previewImg} contentFit="cover" accessibilityLabel="Billedet i opslaget" />
                )}
              </View>
              <TextField label="Skriv en besked" showLabel={false} value={message} onChangeText={setMessage} />
              <TextField label="Søg efter navn" showLabel={false} value={query} onChangeText={setQuery} autoCapitalize="none" />

              <View style={parts.choiceList} accessibilityLabel="Send til">
                {targets.map((t) => {
                  const on = selected.some((x) => x.key === t.key);
                  return (
                    <Choice key={t.key} on={on} onPress={() => toggle(t)} label={t.name}>
                      <Avatar name={t.name} path={t.avatar_path} />
                      <View style={parts.choiceText}>
                        <T v="label" numberOfLines={1}>
                          {t.name}
                        </T>
                        <T v="caption" c={color.textSecondary} numberOfLines={1}>
                          {t.hint}
                        </T>
                      </View>
                      <RadioDot on={on} />
                    </Choice>
                  );
                })}
                {targets.length === 0 && (
                  <T v="caption" c={color.textSecondary}>
                    {q ? `Ingen hedder “${query.trim()}”.` : 'Du følger ingen endnu.'}
                  </T>
                )}
              </View>
              {!!error && (
                <T v="bodyS" c={color.danger}>
                  {error}
                </T>
              )}
            </>
          )}

          {mode === 'opslag' && (
            <>
              <View style={s.compose}>
                <View style={s.composeRow}>
                  <Avatar name={me.name} path={me.avatar_path} />
                  <TextInput
                    style={[s.note, noOutline]}
                    accessibilityLabel="Hvad vil du sige om det?"
                    placeholder="Hvad vil du sige om det?"
                    placeholderTextColor={color.textSecondary}
                    multiline
                    maxLength={2200}
                    value={note}
                    onChangeText={setNote}
                  />
                </View>
                {quote}
              </View>
              {!!error && (
                <T v="bodyS" c={color.danger}>
                  {error}
                </T>
              )}
            </>
          )}
      </>
    </ModalScreen>
  );
}

const s = StyleSheet.create({
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    alignSelf: 'stretch',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: color.borderDefault,
    borderRadius: radius.lg,
    backgroundColor: color.bgSurface,
  },
  previewBody: { flex: 1, minWidth: 0, gap: 6 },
  previewHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  previewImg: { width: 84, height: 84, borderRadius: radius.md },
  compose: { alignSelf: 'stretch', gap: 12, padding: 14, borderWidth: 1, borderColor: color.borderDefault, borderRadius: radius.xl, backgroundColor: color.bgSurface },
  composeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  note: { flex: 1, minWidth: 0, minHeight: 44, paddingTop: 11, color: color.textPrimary, fontFamily: font.body, fontSize: 16, lineHeight: 22, textAlignVertical: 'top' },
  quote: { gap: 6, padding: 12, borderWidth: 1, borderColor: color.borderDefault, borderRadius: radius.lg, backgroundColor: color.bgSunken },
  quoteHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  quoteImg: { width: '100%', height: 180, borderRadius: radius.md },
  footer: { gap: 8, paddingTop: 12, paddingHorizontal: 20, borderTopWidth: 1, borderTopColor: color.borderDefault, backgroundColor: color.bgApp },
});
