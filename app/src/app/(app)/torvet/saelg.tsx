import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { Icon } from '@/components/Icon';
import { ListingLocationSheet } from '@/components/ListingLocationSheet';
import { Screen } from '@/components/Screen';
import { T } from '@/components/T';
import { TextField } from '@/components/TextField';
import { conditions, getMyLocation, guessCategory, MAX_PHOTOS, saveMyLocation, type Condition, type MyLocation } from '@/lib/market';
import { uploadImage } from '@/lib/media';
import { useMe } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { color, radius, TAP } from '@/theme/tokens';

/** Sælg noget på Torvet. Kategorien vælges ikke – den gættes ud fra titel og beskrivelse. */
export default function SellListing() {
  const me = useMe();
  const [photos, setPhotos] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [condition, setCondition] = useState<Condition | null>(null);
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  const [shipping, setShipping] = useState(false);
  const [loc, setLoc] = useState<MyLocation | null>(null);
  const [locOpen, setLocOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getMyLocation(me.id).then((l) => {
      setLoc(l);
      if (l) setCity(l.city);
    });
  }, [me.id]);

  const addPhotos = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_PHOTOS - photos.length,
      quality: 0.8,
    });
    if (res.canceled) return;
    setPhotos((p) => [...p, ...res.assets.map((a) => a.uri)].slice(0, MAX_PHOTOS));
  };

  const priceKr = price === '' ? NaN : Number(price);
  const ok = photos.length > 0 && title.trim().length >= 2 && Number.isFinite(priceKr) && condition && city.trim() && loc;

  const publish = async () => {
    if (!ok || !loc || !condition) return;
    setBusy(true);
    setError('');
    try {
      const image_paths: string[] = [];
      for (const p of photos) image_paths.push(await uploadImage(me.id, p, 'image/jpeg', 'opslag'));
      const { data, error } = await supabase
        .from('listings')
        .insert({
          seller_id: me.id,
          title: title.trim(),
          description: description.trim(),
          price: priceKr,
          category: guessCategory(`${title} ${description}`),
          condition,
          image_paths,
          city: city.trim(),
          lat: loc.lat,
          lng: loc.lng,
          shipping,
        })
        .select('id')
        .single();
      if (error) throw error;
      router.replace(`/torvet/${data.id}`);
    } catch {
      setError('Annoncen kunne ikke gemmes. Prøv igen.');
      setBusy(false);
    }
  };

  return (
    <Screen
      title="Sælg noget"
      footer={
        <View style={s.footer}>
          {!!error && (
            <T v="bodyS" c={color.danger}>
              {error}
            </T>
          )}
          <Button title="Sæt til salg" block disabled={!ok} loading={busy} onPress={publish} />
        </View>
      }
    >
      <View style={{ gap: 8 }}>
        <View style={s.labelRow}>
          <T v="headingS">Billeder</T>
          <T v="caption" c={color.textSecondary}>
            {photos.length}/{MAX_PHOTOS}
          </T>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
          {photos.map((p, i) => (
            <View key={p} style={s.photo}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={i === 0 ? 'Billede 1, forsidebillede' : `Billede ${i + 1}. Tryk for at gøre det til forsidebillede`}
                onPress={() => i > 0 && setPhotos((list) => [list[i], ...list.filter((_, j) => j !== i)])}
              >
                <Image source={{ uri: p }} style={s.photoImg} contentFit="cover" />
              </Pressable>
              {i === 0 && (
                <View style={s.cover}>
                  <T v="micro" c={color.white}>
                    Forside
                  </T>
                </View>
              )}
              <Pressable accessibilityRole="button" accessibilityLabel={`Fjern billede ${i + 1}`} onPress={() => setPhotos((l) => l.filter((_, j) => j !== i))} hitSlop={8} style={s.remove}>
                <Icon name="close" size={14} color={color.white} />
              </Pressable>
            </View>
          ))}
          {photos.length < MAX_PHOTOS && (
            <Pressable accessibilityRole="button" accessibilityLabel="Tilføj billeder" onPress={addPhotos} style={[s.photo, s.add]}>
              <Icon name="camera" size={24} />
              <T v="captionStrong">Tilføj</T>
            </Pressable>
          )}
        </ScrollView>
      </View>

      <TextField label="Titel" placeholder="Fx Spisebord i eg" value={title} onChangeText={setTitle} maxLength={80} />
      <TextField label="Pris" placeholder="0 kr. hvis den er gratis" keyboardType="number-pad" value={price} onChangeText={(t) => setPrice(t.replace(/\D/g, ''))} />

      <View style={{ gap: 8 }}>
        <T v="headingS">Stand</T>
        <View style={s.chips}>
          {conditions.map((c) => (
            <Chip key={c} label={c} selected={condition === c} onPress={() => setCondition(c)} />
          ))}
        </View>
      </View>

      <TextField
        label="Beskrivelse"
        placeholder="Fx mål, alder og eventuelle fejl"
        multiline
        value={description}
        onChangeText={setDescription}
        maxLength={2000}
      />

      <View style={{ gap: 8 }}>
        <T v="headingS">Afhentning</T>
        <TextField label="Sted for afhentning" showLabel={false} placeholder="Sted for afhentning" value={city} onChangeText={setCity} />
        <Pressable accessibilityRole="button" onPress={() => setLocOpen(true)} style={s.locRow}>
          <Icon name="pin" size={18} color={color.textSecondary} />
          <T v="bodyS" c={color.textSecondary} style={{ flex: 1 }}>
            {loc ? `Afstand regnes fra ${loc.city}` : 'Vælg placering'}
          </T>
          <T v="label" style={{ textDecorationLine: 'underline' }}>
            {loc ? 'Skift' : 'Vælg'}
          </T>
        </Pressable>
        <Pressable accessibilityRole="switch" accessibilityState={{ checked: shipping }} onPress={() => setShipping((v) => !v)} style={s.switch}>
          <T v="label">Kan sendes</T>
          <Switch value={shipping} onValueChange={setShipping} trackColor={{ true: color.actionPrimary, false: color.borderStrong }} thumbColor={color.white} />
        </Pressable>
      </View>

      <ListingLocationSheet
        open={locOpen}
        onClose={() => setLocOpen(false)}
        onPick={async (l) => {
          const saved = await saveMyLocation(me.id, l);
          setLoc(saved);
          if (!city.trim() || city === loc?.city) setCity(saved.city);
        }}
      />
    </Screen>
  );
}

const s = StyleSheet.create({
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  photo: { width: 96, height: 96, borderRadius: radius.md, overflow: 'hidden', backgroundColor: color.bgSubtle },
  photoImg: { width: 96, height: 96 },
  add: { alignItems: 'center', justifyContent: 'center', gap: 4, borderWidth: 1, borderStyle: 'dashed', borderColor: color.borderStrong },
  cover: { position: 'absolute', left: 6, bottom: 6, paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.pill, backgroundColor: 'rgba(0,0,0,0.6)' },
  remove: { position: 'absolute', top: 4, right: 4, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: TAP, paddingHorizontal: 4 },
  switch: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: TAP, paddingHorizontal: 4 },
  footer: { paddingHorizontal: 20, paddingBottom: 12, paddingTop: 8, gap: 8, backgroundColor: color.bgApp },
});
