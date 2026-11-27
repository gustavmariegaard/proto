import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { Choice, CloseHeader, closeTo, ModalScreen, parts, RadioDot } from '@/components/CreateParts';
import { T } from '@/components/T';
import { noOutline } from '@/components/TextField';
import { getPost } from '@/lib/posts';
import { useMe } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import type { PostCard } from '@/lib/types';
import { color, font, radius } from '@/theme/tokens';

/** Samme grunde som prototypen (src/data/create.ts) */
const reportReasons = [
  { id: 'had', title: 'Hadefuldt eller truende', hint: 'Trusler, chikane eller hadtale.' },
  { id: 'ulovligt', title: 'Ulovligt indhold', hint: 'Noget, der er ulovligt, hvor du bor.' },
  { id: 'svindel', title: 'Svindel eller falsk profil', hint: 'Forsøg på at snyde eller udgive sig for andre.' },
  { id: 'misinformation', title: 'Misinformation', hint: 'Påstande, der kan skade andre.' },
  { id: 'boern', title: 'Børns sikkerhed', hint: 'Noget, der kan skade et barn.' },
  { id: 'andet', title: 'Andet', hint: 'Noget, der ikke passer til listen.' },
];

/** Rapportér et opslag (prototypens Report): vælg en grund og send. */
export default function Report() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useMe();
  const close = closeTo(`/opslag/${id}`);
  const [post, setPost] = useState<PostCard | null | undefined>(undefined);
  // Ingen kategori fra start: man skal selv vælge, før man kan sende
  const [reason, setReason] = useState<string | null>(null);
  const [wrongTags, setWrongTags] = useState<string[]>([]);
  const [other, setOther] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getPost(id).then(setPost);
  }, [id]);

  const header = <CloseHeader title="Rapportér" onClose={close} />;
  if (post === undefined) return <ModalScreen header={header}>{null}</ModalScreen>;
  if (!post) {
    return (
      <ModalScreen header={header}>
        <T v="bodyS" c={color.textSecondary}>
          Opslaget findes ikke længere.
        </T>
      </ModalScreen>
    );
  }

  const first = post.author_name.split(' ')[0];
  const tags = post.tags;
  const reasons = tags.length
    ? [{ id: 'kategori', title: 'Forkert kategoriseret', hint: tags.length > 1 ? 'Et eller flere tags passer ikke' : `Passer ikke til #${tags[0]}` }, ...reportReasons]
    : reportReasons;
  const needsText = reason === 'andet';
  const pickTags = reason === 'kategori' && tags.length > 1;
  const canSend = reason !== null && (!needsText || other.trim().length > 2) && (!pickTags || wrongTags.length > 0);

  const send = async () => {
    if (!canSend) return;
    setBusy(true);
    setError('');
    const { error: e } = await supabase.from('reports').insert({
      reporter_id: me.id,
      post_id: post.id,
      reason,
      wrong_tags: reason === 'kategori' ? (tags.length > 1 ? wrongTags : tags) : [],
      details: other.trim(),
    });
    setBusy(false);
    if (e) setError('Rapporten kunne ikke sendes. Prøv igen.');
    else setSent(true);
  };

  if (sent) {
    return (
      <ModalScreen header={header}>
        <T v="headingM" accessibilityRole="header">
          Tak for din rapport
        </T>
        <T v="bodyS">Vi kigger på opslaget hurtigst muligt. Din rapport er anonym for {first}.</T>
        <Button block onPress={close} style={{ alignSelf: 'stretch' }}>
          Færdig
        </Button>
      </ModalScreen>
    );
  }

  const status =
    reason === null ? 'Vælg en kategori for at sende rapporten.' : pickTags && wrongTags.length === 0 ? 'Vælg mindst ét tag.' : needsText && !canSend ? 'Skriv et par ord om problemet.' : '';

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ModalScreen header={header}>
        <T v="headingM" accessibilityRole="header">
          Hvad er der galt?
        </T>
        <T v="caption" c={color.textSecondary}>
          Opslag fra {post.author_name}. Din rapport er anonym for {first}.
        </T>
        <View style={parts.choiceList} accessibilityRole="radiogroup">
          {reasons.map((r) => {
            const on = reason === r.id;
            return (
              <View key={r.id}>
                <Choice role="radio" on={on} onPress={() => setReason(r.id)} label={r.title}>
                  <RadioDot on={on} size={22} />
                  <View style={[parts.choiceText, s.choicePad]}>
                    <T v="label">{r.title}</T>
                    <T v="caption" c={color.textSecondary}>
                      {r.hint}
                    </T>
                  </View>
                </Choice>
                {/* Tags vises lige under valget */}
                {r.id === 'kategori' && pickTags && (
                  <View style={[s.other, s.tagPick]}>
                    <T v="label">Hvilke tags passer ikke?</T>
                    <View style={s.tags}>
                      {tags.map((t) => {
                        const sel = wrongTags.includes(t);
                        return (
                          <Chip key={t} selected={sel} icon={sel ? 'check' : undefined} onPress={() => setWrongTags((w) => (sel ? w.filter((x) => x !== t) : [...w, t]))}>
                            {`#${t}`}
                          </Chip>
                        );
                      })}
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </View>
        {needsText && (
          <View style={s.other}>
            <T v="label">Beskriv problemet</T>
            <TextInput
              style={[s.field, noOutline]}
              accessibilityLabel="Beskriv problemet"
              placeholder="Fortæl kort, hvad der er galt"
              placeholderTextColor={color.textSecondary}
              multiline
              maxLength={1000}
              value={other}
              onChangeText={setOther}
              autoFocus
            />
          </View>
        )}
        <T v="caption" c={error ? color.danger : color.textSecondary} accessibilityLiveRegion="polite">
          {error || status}
        </T>
        <Button block disabled={!canSend} loading={busy} onPress={send} style={{ alignSelf: 'stretch' }}>
          Send rapport
        </Button>
      </ModalScreen>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  /* .report .choice: 10 px 14 px (Choice har 8 px; 2 px ekstra her) */
  choicePad: { paddingVertical: 2 },
  other: { gap: 8, alignSelf: 'stretch' },
  tagPick: { paddingTop: 10, paddingHorizontal: 4, paddingBottom: 4 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  field: {
    minHeight: 90,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: color.borderStrong,
    borderRadius: radius.md,
    backgroundColor: color.bgSurface,
    color: color.textPrimary,
    fontFamily: font.body,
    fontSize: 16,
    lineHeight: 22,
    textAlignVertical: 'top',
  },
});
