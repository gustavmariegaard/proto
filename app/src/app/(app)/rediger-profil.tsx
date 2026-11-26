import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { T } from '@/components/T';
import { TextField } from '@/components/TextField';
import { uploadImage } from '@/lib/media';
import { useAvatarPicker } from '@/components/AvatarCropper';
import { useMe, useSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { cleanUsername, USERNAME } from '@/lib/validate';
import { color } from '@/theme/tokens';

const BIO_MAX = 150;

/** Rediger profil: profilbillede, navn, brugernavn og bio */
export default function EditProfile() {
  const me = useMe();
  const { refreshProfile } = useSession();
  const [name, setName] = useState(me.name);
  const [username, setUsername] = useState(me.username);
  const [bio, setBio] = useState(me.bio);
  const [photo, setPhoto] = useState<{ uri: string; mime: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const clean = cleanUsername(username);
  const ok = name.trim().length > 0 && USERNAME.test(clean);

  const { choose, cropper } = useAvatarPicker((uri) => setPhoto({ uri, mime: 'image/jpeg' }));

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      const avatar_path = photo ? await uploadImage(me.id, photo.uri, photo.mime, 'avatar') : me.avatar_path;
      const { error } = await supabase.from('profiles').update({ name: name.trim(), username: clean, bio: bio.trim(), avatar_path }).eq('id', me.id);
      if (error) throw error;
      await refreshProfile();
      router.canGoBack() ? router.back() : router.replace('/profil');
    } catch (e: any) {
      setError(e?.code === '23505' ? 'Brugernavnet er taget.' : 'Profilen kunne ikke gemmes. Prøv igen.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title="Rediger profil" right={<Button title="Gem" variant="ghost" disabled={!ok} onPress={save} />}>
      <Pressable accessibilityRole="button" accessibilityLabel="Skift profilbillede" onPress={choose} style={s.photo}>
        {photo ? <Avatar name={name || me.name} uri={photo.uri} size="XL" /> : <Avatar name={name || me.name} path={me.avatar_path} size="XL" />}
      </Pressable>
      <View style={{ alignItems: 'center' }}>
        <Button title="Skift billede" variant="secondary" icon="image" onPress={choose} style={{ minHeight: 44, paddingHorizontal: 20 }} />
      </View>
      {cropper}
      <TextField label="Navn" autoComplete="name" value={name} onChangeText={setName} />
      <TextField
        label="Brugernavn"
        autoCapitalize="none"
        autoCorrect={false}
        value={username}
        onChangeText={setUsername}
        error={username.trim() && !USERNAME.test(clean) ? 'Brug 2–30 tegn: bogstaver, tal, punktum eller understreg.' : error}
      />
      <View style={{ gap: 4 }}>
        <TextField label="Bio" placeholder="Skriv lidt om dig selv" multiline maxLength={BIO_MAX} value={bio} onChangeText={setBio} />
        <T v="caption" c={color.textSecondary} style={{ alignSelf: 'flex-end' }}>
          {bio.length}/{BIO_MAX}
        </T>
      </View>
      <Button title="Gem" block disabled={!ok} loading={busy} onPress={save} />
    </Screen>
  );
}

const s = StyleSheet.create({
  photo: { alignItems: 'center', gap: 8, paddingVertical: 8 },
});
