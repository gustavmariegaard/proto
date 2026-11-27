import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { Icon } from '@/components/Icon';
import { IconButton } from '@/components/IconButton';
import { PageHeader } from '@/components/PageHeader';
import { noOutline, TextField } from '@/components/TextField';
import { NoteSources } from '@/components/NoteSources';
import { T } from '@/components/T';
import { addNote, deleteNote, editNote, notesFor, rateNote, reasons, statusLabel } from '@/lib/notes';
import { getPost } from '@/lib/posts';
import { useMe } from '@/lib/session';
import type { Note, NoteStatus, PostCard, Rating } from '@/lib/types';
import { color, font, radius, TAP } from '@/theme/tokens';

const MAX = 280;
const ratingLabel: Record<Rating, string> = {
  ja: 'Ja',
  lidt: 'Lidt',
  nej: 'Nej',
};
const order: NoteStatus[] = ['vist', 'forslag', 'ikke'];
const vurd = (n: number) => `${n} ${n === 1 ? 'vurdering' : 'vurderinger'}`;

/** Fællesskabsnoter på et debatopslag (inspireret af Community Notes på X) */
export default function Notes() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useMe();
  const [post, setPost] = useState<PostCard | null | undefined>(undefined);
  const [notes, setNotes] = useState<Note[]>([]);
  // null = ingen formular, 'ny' = ny note, ellers id på din note, der rettes
  const [form, setForm] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [sources, setSources] = useState<string[]>(['']);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => setNotes(await notesFor(id)), [id]);
  useEffect(() => {
    getPost(id).then(setPost);
    load();
  }, [id, load]);

  const clean = sources.map((x) => x.trim()).filter((x) => x.length >= 4);
  const canSend = text.trim().length >= 10 && clean.length > 0;

  const open = (n?: Note) => {
    setForm(n ? n.id : 'ny');
    setText(n?.text ?? '');
    setSources(n?.sources.length ? n.sources : ['']);
    setError('');
  };

  const send = async () => {
    if (!canSend) return;
    setBusy(true);
    const { error: e } = form === 'ny' ? await addNote(id, me.id, text.trim(), clean) : await editNote(form!, text.trim(), clean);
    setBusy(false);
    if (e) return setError('Noten kunne ikke gemmes. Prøv igen.');
    if (form === 'ny') {
      // Noten vises med det samme på opslaget (testfase) – gå tilbage og se den
      if (router.canGoBack()) router.back();
      else router.replace(`/opslag/${id}`);
      return;
    }
    setForm(null);
    load();
  };

  const rate = async (n: Note, r: Rating) => {
    const next = n.my_rating === r ? null : r;
    setNotes((l) => l.map((x) => (x.id === n.id ? { ...x, my_rating: next, my_reasons: [] } : x)));
    await rateNote(n.id, me.id, next);
    load();
  };

  const toggleReason = async (n: Note, reason: string) => {
    const has = n.my_reasons.includes(reason);
    const list = has ? n.my_reasons.filter((x) => x !== reason) : [...n.my_reasons, reason];
    setNotes((l) => l.map((x) => (x.id === n.id ? { ...x, my_reasons: list } : x)));
    await rateNote(n.id, me.id, n.my_rating, list);
  };

  if (post === undefined) {
    return (
      <View style={s.root}>
        <PageHeader title="Fællesskabsnoter" fallback={`/opslag/${id}`} />
        <ActivityIndicator style={{ marginTop: 24 }} color={color.textPrimary} />
      </View>
    );
  }
  if (!post) {
    return (
      <View style={s.root}>
        <PageHeader title="Fællesskabsnoter" fallback={`/opslag/${id}`} />
        <View style={s.main}>
          <T v="bodyS" c={color.textSecondary}>
            Opslaget findes ikke længere.
          </T>
        </View>
      </View>
    );
  }

  const ownPost = post.author_id === me.id;

  const noteForm = (
    <View style={[s.note, { gap: 10 }]}>
      <TextInput
        accessibilityLabel="Hvad mangler opslaget?"
        placeholder="Hvad mangler opslaget?"
        placeholderTextColor={color.textSecondary}
        multiline
        maxLength={MAX}
        value={text}
        onChangeText={setText}
        style={[s.area, noOutline]}
        autoFocus
      />
      <T v="caption" c={color.textSecondary} style={{ alignSelf: 'flex-end' }}>
        {text.length}/{MAX}
      </T>
      {sources.map((src, i) => (
        <View key={i} style={s.sourceRow}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <TextField
              label={sources.length > 1 ? `Kilde ${i + 1} (link)` : 'Kilde (link)'}
              showLabel={false}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              value={src}
              onChangeText={(v) => setSources((l) => l.map((x, j) => (j === i ? v : x)))}
            />
          </View>
          {sources.length > 1 && (
            <IconButton icon="close" size={18} tint={color.textSecondary} label={`Fjern kilde ${i + 1}`} onPress={() => setSources((l) => l.filter((_, j) => j !== i))} />
          )}
        </View>
      ))}
      <Pressable accessibilityRole="button" onPress={() => setSources((l) => [...l, ''])} style={s.add}>
        <T v="label">Tilføj kilde</T>
        <Icon name="plus" size={18} />
      </Pressable>
      {!!error && (
        <T v="caption" c={color.danger}>
          {error}
        </T>
      )}
      <View style={s.row}>
        <Button title="Annuller" variant="secondary" onPress={() => setForm(null)} />
        <Button title={form === 'ny' ? 'Send note' : 'Gem'} disabled={!canSend} loading={busy} onPress={send} />
      </View>
    </View>
  );

  const card = (n: Note) => {
    if (form === n.id) return <View key={n.id}>{noteForm}</View>;
    const why = n.my_rating === 'nej' ? reasons.daarlig : reasons.god;
    return (
      <View key={n.id} style={s.note}>
        <View style={[s.status, n.status === 'vist' && s.statusOn]}>
          <T v="captionStrong" c={n.status === 'ikke' ? color.textSecondary : color.textPrimary}>
            {n.mine ? `Din note · ${statusLabel[n.status]}` : statusLabel[n.status]}
          </T>
        </View>
        <T v="bodyS" c={n.status === 'ikke' ? color.textSecondary : color.textPrimary}>
          {n.text}
        </T>
        <NoteSources sources={n.sources} />

        {n.mine ? (
          deleting === n.id ? (
            <View style={s.row}>
              <T v="captionStrong" style={s.ask}>
                Slet noten?
              </T>
              <Button title="Annuller" variant="secondary" onPress={() => setDeleting(null)} />
              <Button
                title="Slet"
                onPress={async () => {
                  setDeleting(null);
                  await deleteNote(n.id);
                  load();
                }}
              />
            </View>
          ) : (
            <View style={s.row}>
              <T v="caption" c={color.textSecondary} style={s.ask}>
                {n.ratings ? `${vurd(n.ratings)} indtil videre` : 'Ingen vurderinger endnu'}
              </T>
              <Pill label="Rediger" icon onPress={() => open(n)} />
              <Pill label="Slet" onPress={() => setDeleting(n.id)} />
            </View>
          )
        ) : (
          <>
            <View style={s.row} accessibilityLabel="Er noten hjælpsom?">
              <T v="captionStrong" style={s.ask}>
                Hjælpsom?
              </T>
              {(['ja', 'lidt', 'nej'] as const).map((v) => (
                <Pill key={v} label={ratingLabel[v]} on={n.my_rating === v} onPress={() => rate(n, v)} />
              ))}
            </View>
            {n.my_rating && (
              <View style={s.why}>
                <T v="captionStrong">Hvorfor?</T>
                <View style={s.wrap}>
                  {why.map((r) => (
                    <Chip key={r} small label={r} selected={n.my_reasons.includes(r)} onPress={() => toggleReason(n, r)} />
                  ))}
                </View>
                <T v="caption" c={color.textSecondary}>
                  {vurd(n.ratings)}
                </T>
              </View>
            )}
          </>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.root}>
        <PageHeader title="Fællesskabsnoter" fallback={`/opslag/${id}`} />
        <ScrollView style={{ flex: 1 }} contentContainerStyle={s.main} keyboardShouldPersistTaps="handled">
          <View style={s.quote}>
            <T v="headingS">{post.author_name}</T>
            <T v="bodyS" numberOfLines={3}>
              {post.text}
            </T>
          </View>

          {ownPost ? (
            <T v="caption" c={color.textSecondary}>
              Du kan ikke skrive en note på dit eget opslag.
            </T>
          ) : form === 'ny' ? (
            noteForm
          ) : (
            <Button title="Skriv en note" variant="secondary" block onPress={() => open()} />
          )}

          {order.map((st) => {
            const list = notes.filter((n) => n.status === st);
            return list.length > 0 ? (
              <View key={st} style={s.list} accessibilityLabel={statusLabel[st]}>
                {list.map(card)}
              </View>
            ) : null;
          })}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

function Pill({ label, on, icon, onPress }: { label: string; on?: boolean; icon?: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: !!on }} onPress={onPress} style={({ pressed }) => [s.pill, on && s.pillOn, pressed && { opacity: 0.7 }]}>
      {icon && <Icon name="edit" size={16} color={on ? color.textOnAction : color.textPrimary} />}
      <T v="label" c={on ? color.textOnAction : color.textPrimary}>
        {label}
      </T>
    </Pressable>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bgApp },
  main: { gap: 12, paddingTop: 8, paddingHorizontal: 20, paddingBottom: 32 },
  list: { gap: 12 },
  quote: {
    gap: 4,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: radius.lg,
    backgroundColor: color.bgSubtle,
  },
  note: {
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.borderDefault,
    backgroundColor: color.bgSurface,
  },
  status: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: color.gray150,
  },
  statusOn: { backgroundColor: color.accentBg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 4,
  },
  ask: { marginRight: 'auto', flexShrink: 1 },
  pill: {
    minWidth: 56,
    height: TAP,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  pillOn: {
    backgroundColor: color.actionPrimary,
    borderColor: color.actionPrimary,
  },
  why: {
    gap: 8,
    paddingTop: 8,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: color.borderDefault,
  },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  /* .edit-profile__field, 4 rækker */
  area: {
    minHeight: 4 * 20 + 28 + 2,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: color.borderDefault,
    backgroundColor: color.bgSurface,
    color: color.textPrimary,
    fontFamily: font.body,
    fontSize: 16,
    lineHeight: 20,
    textAlignVertical: 'top',
  },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  add: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: TAP,
    alignSelf: 'flex-start',
    paddingHorizontal: 4,
  },
});
