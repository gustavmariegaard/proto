import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { useAvatarPicker } from '@/components/AvatarCropper';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { T } from '@/components/T';
import { TextField } from '@/components/TextField';
import { uploadImage } from '@/lib/media';
import { useMe } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { cleanUsername, USERNAME } from '@/lib/validate';
import { color } from '@/theme/tokens';

/** Opret side: billede, navn, brugernavn, kategori og beskrivelse */
export default function NewPage() {
  const me = useMe();
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [category, setCategory] = useState('');
  const [bio, setBio] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [taken, setTaken] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { choose, cropper } = useAvatarPicker(setPhoto);
  const h = cleanUsername(handle);
  const valid = USERNAME.test(h);

  // Tjek om brugernavnet er ledigt blandt sider
  useEffect(() => {
    setTaken(null);
    if (!valid) return;
    const t = setTimeout(async () => {
      const { data } = await supabase.from('pages').select('id').eq('handle', h).maybeSingle();
      setTaken(!!data);
    }, 300);
    return () => clearTimeout(t);
  }, [h, valid]);

  const create = async () => {
    setBusy(true);
    setError('');
    try {
      const avatar_path = photo ? await uploadImage(me.id, photo, 'image/jpeg', 'avatar') : null;
      const { error } = await supabase.from('pages').insert({ handle: h, name: name.trim(), category: category.trim(), bio: bio.trim(), avatar_path, created_by: me.id });
      if (error) throw error;
      router.replace(`/sider/${h}`);
    } catch (e: any) {
      setError(e?.code === '23505' ? 'Brugernavnet er taget.' : 'Siden kunne ikke oprettes. Prøv igen.');
      setBusy(false);
    }
  };

  return (
    <Screen title="Opret side">
      <Pressable accessibilityRole="button" accessibilityLabel="Vælg billede" onPress={choose} style={s.photo}>
        <Avatar name={name || '?'} uri={photo ?? undefined} size="XL" />
      </Pressable>
      <View style={{ alignItems: 'center' }}>
        <Button title={photo ? 'Skift billede' : 'Vælg billede'} variant="secondary" icon="image" onPress={choose} style={{ minHeight: 44, paddingHorizontal: 20 }} />
      </View>
      <TextField label="Sidens navn" value={name} onChangeText={setName} maxLength={80} />
      <TextField
        label="Brugernavn"
        autoCapitalize="none"
        autoCorrect={false}
        value={handle}
        onChangeText={(t) => setHandle(t.toLowerCase().replace(/\s/g, ''))}
        error={handle && !valid ? 'Brug 2–30 tegn: bogstaver, tal, punktum eller understreg.' : taken ? 'Brugernavnet er taget.' : undefined}
        hint={valid && taken === false ? `@${h} er ledigt` : undefined}
      />
      <TextField label="Kategori" placeholder="Fx Forening, Kultur, Butik" value={category} onChangeText={setCategory} maxLength={40} />
      <TextField label="Beskrivelse" multiline value={bio} onChangeText={setBio} maxLength={300} />
      {!!error && (
        <T v="bodyS" c={color.danger}>
          {error}
        </T>
      )}
      <Button title="Opret side" block disabled={!name.trim() || !valid || taken !== false} loading={busy} onPress={create} />
      {cropper}
    </Screen>
  );
}

const s = StyleSheet.create({ photo: { alignItems: 'center', paddingTop: 8 } });
