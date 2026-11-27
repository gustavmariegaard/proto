import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { Icon } from '@/components/Icon';
import { ListingToggle } from '@/components/ListingRadiusSheet';
import { CloseHeader } from '@/components/MessageParts';
import { T } from '@/components/T';
import { noOutline, TextField } from '@/components/TextField';
import { cityFromText, conditions, guessCategory, locationOrDefault, MAX_PHOTOS, type Condition, type MyLocation } from '@/lib/market';
import { uploadImage } from '@/lib/media';
import { useMe } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { color, font, radius } from '@/theme/tokens';

/** Der findes ingen fejlfarve i tokens endnu; prototypen bruger denne kun her */
const ERROR = '#b42318';

type Errors = Partial<Record<'photos' | 'title' | 'price', string>>;

function ErrorText({ children }: { children: string }) {
  return (
    <View style={s.error} accessibilityLiveRegion="polite">
      <View style={s.errorDot}>
        <T v="micro" c={color.white} style={{ fontSize: 11, lineHeight: 14 }}>
          !
        </T>
      </View>
      <T v="captionStrong" c={ERROR}>
        {children}
      </T>
    </View>
  );
}

/** Sælg noget på Torvet (prototypens SellListing). Kategorien gættes ud fra titel og beskrivelse. */
export default function SellListing() {
  const me = useMe();
  const insets = useSafeAreaInsets();
  const [photos, setPhotos] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [condition, setCondition] = useState<Condition>('God');
  const [description, setDescription] = useState('');
  const [place, setPlace] = useState('');
  const [shipping, setShipping] = useState(false);
  const [loc, setLoc] = useState<MyLocation | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [photoNote, setPhotoNote] = useState('');
  const [descFocus, setDescFocus] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    locationOrDefault(me.id).then((l) => {
      setLoc(l);
      setPlace((p) => p || l.city);
    });
  }, [me.id]);

  const addPhotos = async () => {
    const room = MAX_PHOTOS - photos.length;
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: room, quality: 0.8 });
    if (res.canceled) return;
    setPhotoNote(res.assets.length > room ? `Du kan højst have ${MAX_PHOTOS} billeder. Nogle blev ikke tilføjet.` : '');
    setPhotos((p) => [...p, ...res.assets.map((a) => a.uri)].slice(0, MAX_PHOTOS));
    setErrors((e) => ({ ...e, photos: undefined }));
  };

  const submit = async () => {
    const next: Errors = {};
    if (!photos.length) next.photos = 'Tilføj mindst ét billede.';
    if (title.trim().length < 2) next.title = 'Skriv en titel.';
    if (!price || !Number.isFinite(Number(price))) next.price = 'Skriv en pris (0 kr. hvis den er gratis).';
    setErrors(next);
    if (Object.keys(next).length || !loc || busy) return;
    setBusy(true);
    try {
      const image_paths: string[] = [];
      for (const p of photos) image_paths.push(await uploadImage(me.id, p, 'image/jpeg', 'opslag'));
      // Afstanden regnes fra stedet, hvis det er en by, vi kender; ellers fra din placering
      const city = place.trim() || loc.city;
      const at = cityFromText(city) ?? loc;
      const { data, error } = await supabase
        .from('listings')
        .insert({
          seller_id: me.id,
          title: title.trim(),
          description: description.trim(),
          price: Math.round(Number(price)),
          category: guessCategory(`${title} ${description}`),
          condition,
          image_paths,
          city,
          lat: at.lat,
          lng: at.lng,
          shipping,
        })
        .select('id')
        .single();
      if (error) throw error;
      router.replace(`/torvet/${data.id}`);
    } catch {
      setPhotoNote('Annoncen kunne ikke gemmes. Prøv igen.');
      setBusy(false);
    }
  };

  return (
    <View style={s.screen}>
      <CloseHeader title="Sælg noget" label="Annuller" fallback="/torvet" />
      <ScrollView contentContainerStyle={[s.content, { paddingBottom: 24 + insets.bottom }]} keyboardShouldPersistTaps="handled">
        <View style={s.group}>
          <View style={s.labelRow}>
            <T v="headingS" accessibilityRole="header">
              Billeder
            </T>
            <T v="caption" c={color.textSecondary}>
              {photos.length}/{MAX_PHOTOS} · Det første er forsidebilledet
            </T>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.photosScroll} contentContainerStyle={s.photos} accessibilityLabel="Valgte billeder">
            {photos.length < MAX_PHOTOS && (
              <Pressable accessibilityRole="button" onPress={addPhotos} disabled={busy} style={[s.tile, s.add, !!errors.photos && { borderColor: ERROR }]}>
                <Icon name="camera" size={26} />
                <T v="captionStrong">{photos.length ? 'Tilføj flere' : 'Tilføj billeder'}</T>
              </Pressable>
            )}
            {photos.map((p, i) => (
              <View key={`${i}-${p}`}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={i === 0 ? 'Billede 1, forsidebillede' : `Billede ${i + 1}. Tryk for at gøre det til forsidebillede`}
                  onPress={() => i > 0 && setPhotos((list) => [list[i]!, ...list.filter((_, j) => j !== i)])}
                  style={[s.tile, s.thumb]}
                >
                  <Image source={{ uri: p }} style={StyleSheet.absoluteFill} contentFit="cover" />
                  {i === 0 && (
                    <View style={s.cover}>
                      <T v="micro" c={color.textOnAction}>
                        Forside
                      </T>
                    </View>
                  )}
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel={`Fjern billede ${i + 1}`} onPress={() => setPhotos((l) => l.filter((_, j) => j !== i))} style={s.remove}>
                  <View style={s.x}>
                    <Icon name="close" size={14} color={color.textOnAction} />
                  </View>
                </Pressable>
              </View>
            ))}
          </ScrollView>
          {!!errors.photos && <ErrorText>{errors.photos}</ErrorText>}
          {!!photoNote && (
            <T v="caption" c={color.textSecondary} accessibilityLiveRegion="polite">
              {photoNote}
            </T>
          )}
        </View>

        <View style={s.group}>
          <TextField
            label="Titel, fx Spisebord i eg"
            showLabel={false}
            value={title}
            maxLength={70}
            onChangeText={(t) => {
              setTitle(t);
              if (errors.title) setErrors((x) => ({ ...x, title: undefined }));
            }}
            style={errors.title ? { borderColor: ERROR } : undefined}
          />
          {!!errors.title && <ErrorText>{errors.title}</ErrorText>}
        </View>

        <View style={s.group}>
          <View>
            <TextField
              label="Pris"
              showLabel={false}
              keyboardType="number-pad"
              value={price}
              onChangeText={(t) => {
                setPrice(t.replace(/\D/g, '').slice(0, 7));
                if (errors.price) setErrors((x) => ({ ...x, price: undefined }));
              }}
              style={[{ paddingRight: 48 }, errors.price ? { borderColor: ERROR } : null]}
            />
            <View style={s.unit} pointerEvents="none">
              <T v="label" c={color.textSecondary}>
                kr.
              </T>
            </View>
          </View>
          {!!errors.price && <ErrorText>{errors.price}</ErrorText>}
        </View>

        <View style={s.group}>
          <T v="headingS" accessibilityRole="header">
            Stand
          </T>
          <View style={s.chips} accessibilityRole="radiogroup" accessibilityLabel="Stand">
            {conditions.map((c) => (
              <Chip key={c} selected={condition === c} onPress={() => setCondition(c)}>
                {c}
              </Chip>
            ))}
          </View>
        </View>

        <TextInput
          style={[s.desc, descFocus && s.descFocus, noOutline]}
          accessibilityLabel="Beskrivelse"
          placeholder="Beskrivelse – fx mål, alder og eventuelle fejl"
          placeholderTextColor={color.textSecondary}
          multiline
          value={description}
          onChangeText={setDescription}
          maxLength={2000}
          onFocus={() => setDescFocus(true)}
          onBlur={() => setDescFocus(false)}
        />

        <View style={s.group}>
          <T v="headingS" accessibilityRole="header">
            Afhentning
          </T>
          <View>
            <TextField label="Sted for afhentning" showLabel={false} value={place} onChangeText={setPlace} maxLength={80} style={{ paddingLeft: 42 }} />
            <View style={s.pin} pointerEvents="none">
              <Icon name="pin" size={20} color={color.textSecondary} />
            </View>
          </View>
          <Pressable accessibilityRole="switch" accessibilityState={{ checked: shipping }} onPress={() => setShipping((v) => !v)} style={s.switch}>
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <T v="label">Kan sendes</T>
              <T v="caption" c={color.textSecondary}>
                Køberen kan få varen sendt med posten.
              </T>
            </View>
            <ListingToggle on={shipping} />
          </Pressable>
        </View>

        <Button title="Sæt til salg" block loading={busy} onPress={submit} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bgApp },
  content: { gap: 18, paddingTop: 4, paddingHorizontal: 20 },
  group: { gap: 8, minWidth: 0 },
  labelRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 },
  error: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  errorDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: ERROR, alignItems: 'center', justifyContent: 'center' },
  photosScroll: { marginHorizontal: -20, flexGrow: 0 },
  photos: { gap: 10, paddingTop: 8, paddingHorizontal: 20, paddingBottom: 4 },
  tile: { width: 96, height: 96, borderRadius: radius.md },
  add: { alignItems: 'center', justifyContent: 'center', gap: 4, borderWidth: 1.5, borderStyle: 'dashed', borderColor: color.borderStrong, backgroundColor: color.bgSurface },
  thumb: { overflow: 'hidden', backgroundColor: color.bgSubtle },
  cover: { position: 'absolute', left: 6, bottom: 6, paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.pill, backgroundColor: color.actionPrimary },
  /* ✕: 44 px trykflade med en lille rund knap i hjørnet */
  remove: { position: 'absolute', top: -8, right: -8, width: 44, height: 44, padding: 2, alignItems: 'flex-end', justifyContent: 'flex-start' },
  x: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: color.bgApp, backgroundColor: color.actionPrimary, alignItems: 'center', justifyContent: 'center' },
  unit: { position: 'absolute', right: 18, top: 0, bottom: 0, justifyContent: 'center' },
  pin: { position: 'absolute', left: 14, top: 0, bottom: 0, justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  desc: {
    height: 120,
    padding: 14,
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
  descFocus: { borderColor: color.textPrimary, borderWidth: 2, padding: 13 },
  switch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 44,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: color.borderDefault,
    borderRadius: radius.xl,
    backgroundColor: color.bgSurface,
  },
});
