import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Chip } from '@/components/Chip';
import { CreateButton, CreateShell, createField, MintTile, OptionRow } from '@/components/CreateFlow';
import { closeTo } from '@/components/CreateParts';
import type { IconName } from '@/components/Icon';
import { T } from '@/components/T';
import { noOutline } from '@/components/TextField';
import { getPost } from '@/lib/posts';
import { useMe } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import type { PostCard } from '@/lib/types';
import { color } from '@/theme/tokens';

/** Samme grunde som prototypen (src/data/create.ts) */
const reportReasons = [
  { id: 'had', icon: 'ban' as IconName, title: 'Hadefuldt eller truende', hint: 'Trusler, chikane eller hadtale.' },
  { id: 'ulovligt', icon: 'lock' as IconName, title: 'Ulovligt indhold', hint: 'Noget, der er ulovligt, hvor du bor.' },
  { id: 'svindel', icon: 'user-minus' as IconName, title: 'Svindel eller falsk profil', hint: 'Forsøg på at snyde eller udgive sig for andre.' },
  { id: 'misinformation', icon: 'megaphone' as IconName, title: 'Misinformation', hint: 'Påstande, der kan skade andre.' },
  { id: 'boern', icon: 'heart' as IconName, title: 'Børns sikkerhed', hint: 'Noget, der kan skade et barn.' },
  { id: 'andet', icon: 'dots' as IconName, title: 'Andet', hint: 'Noget, der ikke passer til listen.' },
];

/** Anmeld et opslag: vælg, hvad der er galt, og send. Samme udtryk som oprettelsen. */
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

  const shell = (title: string, children: React.ReactNode, footer?: React.ReactNode, lead?: string) => (
    <CreateShell kind="opslag" title={title} lead={lead} onClose={close} footer={footer}>
      {children}
    </CreateShell>
  );
  if (post === undefined) return shell('Anmeld opslag', null);
  if (!post) {
    return shell(
      'Anmeld opslag',
      <T v="bodyS" c={color.textSecondary}>
        Opslaget findes ikke længere.
      </T>,
    );
  }

  const first = post.author_name.split(' ')[0];
  const tags = post.tags;
  const reasons = tags.length
    ? [{ id: 'kategori', icon: 'compass' as IconName, title: 'Forkert kategoriseret', hint: tags.length > 1 ? 'Et eller flere tags passer ikke' : `Passer ikke til #${tags[0]}` }, ...reportReasons]
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
    if (e) setError('Anmeldelsen kunne ikke sendes. Prøv igen.');
    else setSent(true);
  };

  if (sent) {
    return shell(
      'Tak for din anmeldelse',
      <View style={s.done}>
        <MintTile icon="check" size={48} />
      </View>,
      <CreateButton onPress={close}>Færdig</CreateButton>,
      `Vi kigger på opslaget hurtigst muligt. ${first} får ikke at vide, hvem der har anmeldt det.`,
    );
  }

  const status =
    reason === null ? 'Vælg, hvad der er galt.' : pickTags && wrongTags.length === 0 ? 'Vælg mindst ét tag.' : needsText && !canSend ? 'Skriv et par ord om problemet.' : '';

  return shell(
    'Hvad er der galt?',
    <>
      <View style={s.list} accessibilityRole="radiogroup">
        {reasons.map((r) => (
          <View key={r.id} style={{ gap: 10 }}>
            <OptionRow role="radio" icon={r.icon} title={r.title} text={r.hint} on={reason === r.id} onPress={() => setReason(r.id)} />
            {/* Tags vises lige under valget */}
            {r.id === 'kategori' && pickTags && (
              <View style={s.tagPick}>
                <T v="label" c={color.textSecondary}>
                  Hvilke tags passer ikke?
                </T>
                <View style={s.tags}>
                  {tags.map((t) => {
                    const sel = wrongTags.includes(t);
                    return (
                      <Chip key={t} selected={sel} icon={sel ? 'check' : undefined} iconSize={16} onPress={() => setWrongTags((w) => (sel ? w.filter((x) => x !== t) : [...w, t]))}>
                        {`#${t}`}
                      </Chip>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        ))}
      </View>
      {needsText && (
        <TextInput
          style={[createField.box, { minHeight: 100 }, noOutline]}
          accessibilityLabel="Beskriv problemet"
          placeholder="Fortæl kort, hvad der er galt"
          placeholderTextColor={color.textSecondary}
          multiline
          maxLength={1000}
          value={other}
          onChangeText={setOther}
          autoFocus
        />
      )}
    </>,
    <>
      {!!(error || status) && (
        <T v="caption" c={error ? color.danger : color.textSecondary} accessibilityLiveRegion="polite" style={{ textAlign: 'center' }}>
          {error || status}
        </T>
      )}
      <CreateButton disabled={!canSend} loading={busy} onPress={send}>
        Send anmeldelse
      </CreateButton>
    </>,
    `Opslag fra ${post.author_name}. Din anmeldelse er anonym.`,
  );
}

const s = StyleSheet.create({
  list: { gap: 10 },
  tagPick: { gap: 8, paddingHorizontal: 4, paddingBottom: 4 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  done: { alignItems: 'flex-start' },
});
