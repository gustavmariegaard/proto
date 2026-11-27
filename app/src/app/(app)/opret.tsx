import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useVideoPlayer, VideoView as ExpoVideoView } from 'expo-video';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Button } from '@/components/Button';
import { CloseHeader, closeTo, ModalScreen, ToggleList } from '@/components/CreateParts';
import { CreateTagInput } from '@/components/CreateTagInput';
import { Icon, type IconName } from '@/components/Icon';
import { SharedPost } from '@/components/SharedPost';
import { T } from '@/components/T';
import { noOutline, TextField } from '@/components/TextField';
import { listEvents, listGroups } from '@/lib/community';
import { imageSource, pickMedia, uploadImage, uploadVideo } from '@/lib/media';
import { useMe } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { color, font, radius } from '@/theme/tokens';

type Kind = 'opslag' | 'flick' | 'moment';
type Audience = 'offentlig' | 'debat';
type Media = { uri: string; mime: string; type: 'image' | 'video' };
type PlaceKind = 'gruppe' | 'begivenhed' | 'side';
type Place = { id: string; name: string; path: string | null; meta: string };

const kinds: { value: Kind; label: string }[] = [
  { value: 'opslag', label: 'Opslag' },
  { value: 'flick', label: 'Flick' },
  { value: 'moment', label: 'Moment' },
];

const audiences: { value: Audience; label: string; hint: string; icon: IconName }[] = [
  { value: 'offentlig', label: 'Din profil', icon: 'user', hint: 'Til dem, der følger dig.' },
  { value: 'debat', label: 'Offentlig debat', icon: 'compass', hint: 'Til alle' },
];

/** Flere indstillinger: kun dem, databasen kan gemme (Tillad deling) */
const postSettings = [{ id: 'deling', title: 'Tillad deling', hint: 'Andre kan dele opslaget til deres egen profil.' }];

const colOf = { gruppe: 'group_id', begivenhed: 'event_id', side: 'page_id' } as const;

/**
 * Opret (prototypens Create): skriv et opslag, vælg hvor det deles, og tilføj evt. et billede eller en video.
 * Med et billede/en video skifter skærmen til "Nyt billede"/"Ny video".
 * ?gruppe= | ?begivenhed= | ?side= låser stedet. ?deler=<opslag-id> deler et andet opslag som nyt opslag.
 * ?sted=debat vælger Offentlig debat.
 */
export default function Create() {
  const me = useMe();
  const params = useLocalSearchParams<{ gruppe?: string; begivenhed?: string; side?: string; deler?: string; sted?: string }>();
  const sharing = params.deler ?? null;
  const placeKind: PlaceKind | null = params.gruppe ? 'gruppe' : params.begivenhed ? 'begivenhed' : params.side ? 'side' : null;
  const [placeId, setPlaceId] = useState<string | null>(params.gruppe ?? params.begivenhed ?? params.side ?? null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [text, setText] = useState('');
  const [audience, setAudience] = useState<Audience>(params.sted === 'debat' ? 'debat' : 'offentlig');
  const [tags, setTags] = useState<string[]>([]);
  const [tagError, setTagError] = useState(false);
  const [more, setMore] = useState(false);
  const [settings, setSettings] = useState<Record<string, boolean>>({ deling: true });
  const [media, setMedia] = useState<Media | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const textRef = useRef<React.ComponentRef<typeof TextInput>>(null);

  // Stederne, man kan skifte til: grupper, man er med i, og begivenheder, man er med i
  useEffect(() => {
    if (placeKind === 'gruppe') {
      listGroups().then((gs) =>
        setPlaces(gs.filter((g) => g.my_role || g.id === placeId).map((g) => ({ id: g.id, name: g.name, path: g.avatar_path, meta: `${g.members} ${g.members === 1 ? 'medlem' : 'medlemmer'}` }))),
      );
    } else if (placeKind === 'begivenhed') {
      listEvents().then((es) =>
        setPlaces(es.filter((e) => e.my_status || e.invited_me || e.created_by === me.id || e.id === placeId).map((e) => ({ id: e.id, name: e.title, path: e.cover_path, meta: e.location }))),
      );
    } else if (placeKind === 'side' && placeId) {
      supabase
        .from('pages')
        .select('id, name, avatar_path')
        .eq('id', placeId)
        .maybeSingle()
        .then(({ data }) => data && setPlaces([{ id: data.id, name: data.name, path: data.avatar_path, meta: '' }]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placeKind]);
  const place = places.find((p) => p.id === placeId) ?? null;

  const close = closeTo('/');

  const pick = async (type: Media['type']) => {
    const a = await pickMedia(type === 'video');
    if (!a) return;
    const video = a.type === 'video' || (a.mimeType ?? '').startsWith('video');
    if (type === 'video' && !video) return;
    setMedia({ uri: a.uri, mime: a.mimeType ?? (video ? 'video/mp4' : 'image/jpeg'), type: video ? 'video' : 'image' });
  };

  const publish = async () => {
    if (busy) return;
    if (!media && !text.trim() && !sharing) {
      textRef.current?.focus();
      return;
    }
    const debat = !placeKind && audience === 'debat';
    if (debat && tags.length === 0) {
      setTagError(true);
      return;
    }
    if (placeKind && !placeId) return;
    setBusy(true);
    setError('');
    try {
      const path = media ? (media.type === 'video' ? await uploadVideo(me.id, media.uri, media.mime) : await uploadImage(me.id, media.uri, media.mime)) : null;
      const { error } = await supabase.from('posts').insert({
        author_id: me.id,
        kind: debat ? 'debat' : 'feed',
        text: text.trim(),
        image_paths: path ? [path] : [],
        media_type: media?.type ?? 'image',
        tags: debat ? tags : [],
        allow_share: settings.deling,
        ...(placeKind && placeId ? { [colOf[placeKind]]: placeId } : {}),
        ...(sharing ? { shared_post_id: sharing } : {}),
      });
      if (error) throw error;
      if (placeKind && placeId) {
        if (placeKind === 'side') close();
        else router.replace(placeKind === 'gruppe' ? `/grupper/${placeId}` : `/begivenheder/${placeId}`);
      } else router.replace(debat ? '/debat' : '/');
    } catch {
      setError('Opslaget kunne ikke deles. Prøv igen.');
      setBusy(false);
    }
  };

  const hint = audience === 'offentlig' && me.is_private ? 'Din profil er privat, så kun dine følgere kan se opslaget. Det kan du ændre på din profil.' : '';

  const audiencePicker = placeKind ? (
    <PlacePicker kind={placeKind} places={places} place={place} onPlace={setPlaceId} />
  ) : (
    <View style={s.audience}>
      <T v="headingS" accessibilityRole="header">
        Hvor skal det deles?
      </T>
      <View style={s.dest} accessibilityRole="radiogroup">
        {audiences.map((a) => {
          const on = audience === a.value;
          return (
            <Pressable key={a.value} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => setAudience(a.value)} style={[s.destItem, on && s.destItemOn]}>
              <View style={[s.destIcon, on && s.destIconOn]}>
                <Icon name={a.icon} size={20} />
              </View>
              <View style={s.destText}>
                <T v="label">{a.label}</T>
                <T v="caption" c={color.textSecondary}>
                  {a.hint}
                </T>
              </View>
              <View style={[s.destCheck, on && s.destCheckOn]}>{on && <Icon name="check" size={14} color={color.textOnAction} />}</View>
            </Pressable>
          );
        })}
      </View>
      {!!hint && (
        <T v="caption" c={color.textSecondary}>
          {hint}
        </T>
      )}
      {audience === 'debat' && (
        <CreateTagInput
          tags={tags}
          onTags={(t) => {
            setTags(t);
            setTagError(false);
          }}
          error={tagError}
          required
        />
      )}
    </View>
  );

  const errorLine = !!error && (
    <T v="bodyS" c={color.danger}>
      {error}
    </T>
  );

  /* ---------- Opret · Billede / Video ---------- */
  if (media) {
    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ModalScreen
          header={
            <CloseHeader title={media.type === 'image' ? 'Nyt billede' : 'Ny video'} closeLabel={media.type === 'image' ? 'Fjern billede' : 'Fjern video'} onClose={() => setMedia(null)}>
              <Button onPress={publish} disabled={busy} loading={busy}>
                Del
              </Button>
            </CloseHeader>
          }
        >
          <View style={s.previewWrap}>
            <View style={s.preview}>
              {media.type === 'image' ? (
                <Image source={{ uri: media.uri }} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityLabel="Det valgte billede" />
              ) : (
                <LocalVideo uri={media.uri} />
              )}
            </View>
          </View>
          {sharing && (
            <View style={{ alignSelf: 'stretch' }}>
              <SharedPost id={sharing} />
            </View>
          )}
          <TextInput
            style={[s.field, s.caption, noOutline]}
            accessibilityLabel="Skriv en tekst (valgfri)"
            placeholder="Skriv en tekst (valgfri)"
            placeholderTextColor={color.textSecondary}
            multiline
            maxLength={2200}
            value={text}
            onChangeText={setText}
          />
          {audiencePicker}
          <ToggleList rows={postSettings} values={settings} onToggle={(id) => setSettings((v) => ({ ...v, [id]: !v[id] }))} />
          {errorLine}
        </ModalScreen>
      </KeyboardAvoidingView>
    );
  }

  /* ---------- Opret ---------- */
  const addButtons: { label: string; icon: IconName; onPress: () => void }[] = [
    { label: 'Foto', icon: 'image', onPress: () => pick('image') },
    { label: 'Video', icon: 'clip', onPress: () => pick('video') },
  ];

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ModalScreen
        header={
          <CloseHeader title="Opret" onClose={close}>
            <Button onPress={publish} disabled={busy} loading={busy}>
              Publicér
            </Button>
          </CloseHeader>
        }
        contentStyle={s.content}
      >
        {!placeKind && !sharing && (
          <View style={s.tabs} accessibilityRole="tablist" accessibilityLabel="Hvad vil du oprette?">
            {kinds.map((k) => {
              const on = k.value === 'opslag';
              return (
                <Pressable
                  key={k.value}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: on }}
                  // Flick og Moment åbner deres egen skærm (vælg video/billede og del)
                  onPress={() => (k.value === 'flick' ? router.push('/flicks/ny') : k.value === 'moment' ? router.push('/ny-moment') : undefined)}
                  style={s.tab}
                >
                  <T v="label" c={on ? color.textPrimary : color.textSecondary}>
                    {k.label}
                  </T>
                  <View style={[s.tabLine, on && s.tabLineOn]} />
                </Pressable>
              );
            })}
          </View>
        )}

        <TextInput
          ref={textRef}
          style={[s.field, s.post, noOutline]}
          accessibilityLabel="Hvad har du på hjerte?"
          placeholder="Hvad har du på hjerte?"
          placeholderTextColor={color.textSecondary}
          multiline
          maxLength={2200}
          value={text}
          onChangeText={setText}
        />

        {sharing && (
          <View style={{ alignSelf: 'stretch' }}>
            <SharedPost id={sharing} />
          </View>
        )}

        <View style={s.add}>
          {addButtons.map((b) => (
            <Pressable key={b.label} accessibilityRole="button" onPress={b.onPress} style={({ pressed }) => [s.addBtn, pressed && { transform: [{ scale: 0.97 }] }]}>
              <Icon name={b.icon} size={20} />
              <T v="label">{b.label}</T>
            </Pressable>
          ))}
        </View>

        {audiencePicker}

        <Pressable accessibilityRole="button" accessibilityState={{ expanded: more }} onPress={() => setMore((m) => !m)} style={s.more}>
          <T v="label" c={color.textSecondary}>
            Flere indstillinger
          </T>
          <View style={{ transform: [{ rotate: more ? '-90deg' : '90deg' }] }}>
            <Icon name="chevron-right" />
          </View>
        </Pressable>

        {more && <ToggleList rows={postSettings} values={settings} onToggle={(id) => setSettings((v) => ({ ...v, [id]: !v[id] }))} />}
        {errorLine}
      </ModalScreen>
    </KeyboardAvoidingView>
  );
}

/**
 * Opslag i en gruppe, begivenhed eller som side: stedet er valgt på forhånd.
 * "Skift" åbner en søgning (grupper og begivenheder).
 */
function PlacePicker({ kind, places, place, onPlace }: { kind: PlaceKind; places: Place[]; place: Place | null; onPlace: (id: string) => void }) {
  const [searching, setSearching] = useState(false);
  const [q, setQ] = useState('');
  const noun = kind === 'gruppe' ? 'gruppe' : 'begivenhed';
  const query = q.trim().toLowerCase();
  const hits = query ? places.filter((p) => p.name.toLowerCase().includes(query)).slice(0, 6) : [];
  const title = kind === 'gruppe' ? 'Deles i gruppen' : kind === 'begivenhed' ? 'Deles i begivenheden' : 'Deles som siden';
  const hint = kind === 'gruppe' ? 'Kun gruppens medlemmer kan se det.' : kind === 'begivenhed' ? 'Kun dem, der er med i begivenheden, kan se det.' : 'Vises på siden.';

  return (
    <View style={s.audience}>
      <T v="headingS" accessibilityRole="header">
        {title}
      </T>
      {place && (
        <View style={s.place}>
          <PlacePic place={place} />
          <View style={s.destText}>
            <T v="label">{place.name}</T>
            <T v="caption" c={color.textSecondary}>
              {hint}
            </T>
          </View>
          {kind !== 'side' && (
            <Pressable accessibilityRole="button" onPress={() => setSearching((v) => !v)} style={s.placeChange}>
              <T v="captionStrong" style={{ textDecorationLine: 'underline' }}>
                {searching ? 'Luk' : 'Skift'}
              </T>
            </Pressable>
          )}
        </View>
      )}
      {(searching || (!place && kind !== 'side' && places.length > 0)) && (
        <>
          <TextField label={`Søg efter ${noun}`} showLabel={false} value={q} onChangeText={setQ} autoFocus={!place} />
          {!!query && hits.length === 0 && (
            <T v="caption" c={color.textSecondary}>
              Ingen {noun === 'gruppe' ? 'grupper' : 'begivenheder'} matcher “{q.trim()}”.
            </T>
          )}
          {hits.length > 0 && (
            <View style={s.groups} accessibilityLabel="Resultater">
              {hits.map((p) => (
                <Pressable
                  key={p.id}
                  accessibilityRole="button"
                  onPress={() => {
                    onPlace(p.id);
                    setSearching(false);
                    setQ('');
                  }}
                  style={s.group}
                >
                  <PlacePic place={p} />
                  <View style={s.destText}>
                    <T v="label" numberOfLines={1}>
                      {p.name}
                    </T>
                    {!!p.meta && (
                      <T v="caption" c={color.textSecondary} numberOfLines={1}>
                        {p.meta}
                      </T>
                    )}
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </>
      )}
    </View>
  );
}

function PlacePic({ place }: { place: Place }) {
  const initials = place.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
  return (
    <View style={s.groupPic}>
      {place.path ? (
        <Image source={imageSource(place.path)} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : (
        <T v="label" c={color.avatarSandFg}>
          {initials}
        </T>
      )}
    </View>
  );
}

/** Den valgte video (fra telefonen) */
function LocalVideo({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });
  return <ExpoVideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} accessibilityLabel="Den valgte video" />;
}

const s = StyleSheet.create({
  content: { gap: 18, paddingTop: 8 },
  tabs: { flexDirection: 'row', alignItems: 'flex-end', gap: 22, alignSelf: 'stretch', borderBottomWidth: 1, borderBottomColor: color.borderDefault, marginTop: -5 },
  tab: { minHeight: 44, paddingTop: 13, paddingBottom: 11 },
  tabLine: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, borderRadius: 2 },
  tabLineOn: { backgroundColor: color.accentHighlight },
  field: {
    alignSelf: 'stretch',
    borderWidth: 1,
    borderColor: color.borderStrong,
    borderRadius: radius.lg,
    backgroundColor: color.bgSurface,
    color: color.textPrimary,
    fontFamily: font.body,
    fontSize: 16,
    lineHeight: 22,
    textAlignVertical: 'top',
  },
  post: { height: 170, padding: 16 },
  caption: { height: 90, padding: 14 },
  add: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
    paddingLeft: 14,
    paddingRight: 16,
    borderWidth: 1,
    borderColor: color.borderStrong,
    borderRadius: radius.pill,
    backgroundColor: color.bgSurface,
  },
  audience: { gap: 10, alignSelf: 'stretch' },
  dest: { gap: 8 },
  destItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 64,
    paddingVertical: 10,
    paddingLeft: 10,
    paddingRight: 14,
    borderWidth: 1.5,
    borderColor: color.borderDefault,
    borderRadius: radius.lg,
    backgroundColor: color.bgSurface,
  },
  destItemOn: { borderColor: color.textPrimary },
  destIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: color.bgSubtle, alignItems: 'center', justifyContent: 'center' },
  destIconOn: { backgroundColor: color.accentVerifiedBg },
  destText: { flex: 1, minWidth: 0 },
  destCheck: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: color.borderStrong, alignItems: 'center', justifyContent: 'center' },
  destCheckOn: { borderColor: color.actionPrimary, backgroundColor: color.actionPrimary },
  more: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, marginVertical: -12 },
  previewWrap: { alignSelf: 'stretch', alignItems: 'center' },
  preview: { width: 224, maxWidth: '100%', aspectRatio: 4 / 5, overflow: 'hidden', borderRadius: radius.lg, backgroundColor: color.bgSubtle },
  place: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingLeft: 10,
    paddingRight: 12,
    borderWidth: 1.5,
    borderColor: color.textPrimary,
    borderRadius: radius.lg,
    backgroundColor: color.bgSurface,
  },
  placeChange: { minHeight: 44, paddingHorizontal: 10, justifyContent: 'center' },
  groups: { gap: 6 },
  group: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingVertical: 6,
    paddingLeft: 6,
    paddingRight: 12,
    borderWidth: 1,
    borderColor: color.borderDefault,
    borderRadius: radius.md,
  },
  groupPic: { width: 44, height: 44, borderRadius: 12, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: color.avatarSandBg },
});
