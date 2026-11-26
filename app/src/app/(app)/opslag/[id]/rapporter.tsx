import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { Screen } from '@/components/Screen';
import { T } from '@/components/T';
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

/** Rapportér et opslag */
export default function Report() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useMe();
  const [post, setPost] = useState<PostCard | null | undefined>(undefined);
  const [reason, setReason] = useState<string | null>(null);
  const [wrongTags, setWrongTags] = useState<string[]>([]);
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getPost(id).then(setPost);
  }, [id]);

  if (post === undefined) {
    return (
      <Screen title="Rapportér">
        <ActivityIndicator color={color.textPrimary} />
      </Screen>
    );
  }
  if (!post) {
    return (
      <Screen title="Rapportér">
        <T v="body">Opslaget findes ikke længere.</T>
      </Screen>
    );
  }

  const tags = post.tags;
  const reasons = tags.length
    ? [
        { id: 'kategori', title: 'Forkert kategoriseret', hint: tags.length > 1 ? 'Et eller flere tags passer ikke' : `Passer ikke til #${tags[0]}` },
        ...reportReasons,
      ]
    : reportReasons;
  const pickTags = reason === 'kategori' && tags.length > 1;
  const needsText = reason === 'andet';
  const canSend = reason !== null && (!pickTags || wrongTags.length > 0) && (!needsText || details.trim().length > 2);

  const send = async () => {
    if (!canSend) return;
    setBusy(true);
    const { error: e } = await supabase.from('reports').insert({
      reporter_id: me.id,
      post_id: post.id,
      reason,
      wrong_tags: reason === 'kategori' ? (tags.length > 1 ? wrongTags : tags) : [],
      details: details.trim(),
    });
    setBusy(false);
    if (e) setError('Rapporten kunne ikke sendes. Prøv igen.');
    else setSent(true);
  };

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  if (sent) {
    return (
      <Screen title="Rapportér">
        <T v="headingM">Tak for din rapport</T>
        <T v="bodyS" c={color.textSecondary}>
          Vi kigger på opslaget hurtigst muligt. Din rapport er anonym for {post.author_name.split(' ')[0]}.
        </T>
        <Button title="Færdig" block onPress={close} />
      </Screen>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen title="Rapportér">
        <View style={{ gap: 4 }}>
          <T v="headingM" accessibilityRole="header">
            Hvad er der galt?
          </T>
          <T v="caption" c={color.textSecondary}>
            Opslag fra {post.author_name}. Din rapport er anonym.
          </T>
        </View>

        <View style={{ gap: 10 }} accessibilityRole="radiogroup">
          {reasons.map((r) => {
            const on = reason === r.id;
            return (
              <View key={r.id} style={{ gap: 10 }}>
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  onPress={() => setReason(r.id)}
                  style={[s.choice, on && s.choiceOn]}
                >
                  <View style={[s.radio, on && s.radioOn]}>{on && <View style={s.radioDot} />}</View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <T v="label">{r.title}</T>
                    <T v="caption" c={color.textSecondary}>
                      {r.hint}
                    </T>
                  </View>
                </Pressable>
                {r.id === 'kategori' && pickTags && (
                  <View style={s.tagPick}>
                    <T v="label">Hvilke tags passer ikke?</T>
                    <View style={s.wrap}>
                      {tags.map((t) => {
                        const sel = wrongTags.includes(t);
                        return (
                          <Chip
                            key={t}
                            label={`#${t}`}
                            selected={sel}
                            icon={sel ? 'check' : undefined}
                            onPress={() => setWrongTags((w) => (sel ? w.filter((x) => x !== t) : [...w, t]))}
                          />
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
          <View style={{ gap: 6 }}>
            <T v="label">Beskriv problemet</T>
            <TextInput
              accessibilityLabel="Beskriv problemet"
              placeholder="Fortæl kort, hvad der er galt"
              placeholderTextColor={color.textSecondary}
              multiline
              maxLength={1000}
              value={details}
              onChangeText={setDetails}
              style={s.area}
            />
          </View>
        )}

        <T v="caption" c={error ? color.danger : color.textSecondary}>
          {error ||
            (reason === null
              ? 'Vælg en kategori for at sende rapporten.'
              : pickTags && wrongTags.length === 0
                ? 'Vælg mindst ét tag.'
                : needsText && !canSend
                  ? 'Skriv et par ord om problemet.'
                  : '')}
        </T>
        <Button title="Send rapport" block disabled={!canSend} loading={busy} onPress={send} />
      </Screen>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.borderDefault,
    backgroundColor: color.bgSurface,
  },
  choiceOn: { backgroundColor: color.accentBg, borderColor: color.textPrimary },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: color.borderStrong, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: color.textPrimary },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: color.textPrimary },
  tagPick: { gap: 8, paddingHorizontal: 4, paddingBottom: 4 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  area: {
    minHeight: 100,
    padding: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.borderStrong,
    color: color.textPrimary,
    fontFamily: font.body,
    fontSize: 16,
    textAlignVertical: 'top',
  },
});
