import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { T } from '@/components/T';
import { TextField } from '@/components/TextField';
import { pickImage, uploadImage } from '@/lib/media';
import { useSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { color } from '@/theme/tokens';
import { USERNAME } from '@/lib/validate';



/** Første gang: navn, brugernavn og evt. profilbillede */
export default function CreateProfile() {
  const { session, refreshProfile, signOut } = useSession();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [photo, setPhoto] = useState<{ uri: string; mime: string } | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const clean = username.trim().replace(/^@/, '').toLowerCase();
  const ok = name.trim().length > 0 && USERNAME.test(clean) && accepted;

  const save = async () => {
    if (!session) return;
    setBusy(true);
    setError('');
    try {
      const avatar_path = photo ? await uploadImage(session.user.id, photo.uri, photo.mime, 'avatar') : null;
      const { error } = await supabase.from('profiles').insert({ id: session.user.id, name: name.trim(), username: clean, avatar_path });
      if (error) throw error;
      await refreshProfile();
    } catch (e: any) {
      setError(e?.code === '23505' ? 'Brugernavnet er taget.' : 'Profilen kunne ikke gemmes. Prøv igen.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title="Opret profil" back={false} right={<Button title="Log ud" variant="ghost" onPress={signOut} />}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Vælg profilbillede"
        style={s.photo}
        onPress={async () => {
          const a = await pickImage(true);
          if (a) setPhoto({ uri: a.uri, mime: a.mimeType ?? 'image/jpeg' });
        }}
      >
        <Avatar name={name || '?'} uri={photo?.uri} size="XL" />
        <T v="label">Vælg profilbillede</T>
      </Pressable>
      <TextField label="Navn" autoComplete="name" value={name} onChangeText={setName} />
      <TextField
        label="Brugernavn"
        autoCapitalize="none"
        autoCorrect={false}
        value={username}
        onChangeText={setUsername}
        error={username.trim() && !USERNAME.test(clean) ? 'Brug 2–30 tegn: bogstaver, tal, punktum eller understreg.' : error}
      />
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: accepted }} onPress={() => setAccepted((v) => !v)} style={s.check}>
        <View style={[s.box, accepted && s.boxOn]}>{accepted && <Icon name="check" size={16} color={color.white} />}</View>
        <T v="bodyS" style={{ flex: 1 }}>
          Jeg har læst privatlivserklæringen for testen og ved, at appen er under udvikling.
        </T>
      </Pressable>
      <Button title="Opret profil" block disabled={!ok} loading={busy} onPress={save} />
    </Screen>
  );
}

const s = StyleSheet.create({
  photo: { alignItems: 'center', gap: 8, paddingVertical: 8 },
  check: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  box: { width: 24, height: 24, borderRadius: 6, borderWidth: 1.5, borderColor: color.borderStrong, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: color.actionPrimary, borderColor: color.actionPrimary },
});
