import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AuthLink, AuthShell, authText } from '@/components/AuthShell';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { T } from '@/components/T';
import { TextField } from '@/components/TextField';
import { pickImage, uploadImage } from '@/lib/media';
import { useSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { cleanUsername, USERNAME } from '@/lib/validate';
import { color } from '@/theme/tokens';

/**
 * Nødløsning: en konto uden profil (fx oprettet før tilmeldingen fik navn og brugernavn).
 * Normalt oprettes profilen automatisk ved tilmelding, og denne side ses aldrig.
 */
export default function CreateProfile() {
  const { session, refreshProfile, signOut } = useSession();
  const meta = session?.user.user_metadata ?? {};
  const [name, setName] = useState<string>(meta.name ?? '');
  const [username, setUsername] = useState<string>(meta.username ?? '');
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const clean = cleanUsername(username);
  const ok = name.trim().length > 0 && USERNAME.test(clean);

  const save = async () => {
    if (!session) return;
    setBusy(true);
    setError('');
    try {
      const avatar_path = photo ? await uploadImage(session.user.id, photo, 'image/jpeg', 'avatar') : null;
      const { error } = await supabase.from('profiles').insert({ id: session.user.id, name: name.trim(), username: clean, avatar_path });
      if (error) throw error;
      await supabase.auth.updateUser({ data: { onboarded: true } });
      await refreshProfile();
    } catch (e: any) {
      setError(e?.code === '23505' ? 'Brugernavnet er taget.' : 'Profilen kunne ikke gemmes. Prøv igen.');
      setBusy(false);
    }
  };

  return (
    <AuthShell
      onBack={false}
      title="Din profil."
      footer={
        <>
          <Button title="Fortsæt" variant="accent" block disabled={!ok} loading={busy} onPress={save} />
          <AuthLink label="Log ud" muted onPress={signOut} />
        </>
      }
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Vælg profilbillede"
        style={s.photo}
        onPress={async () => {
          const a = await pickImage(true);
          if (a) setPhoto(a.uri);
        }}
      >
        <View style={s.ring}>
          <Avatar name={name || '?'} uri={photo ?? undefined} size="XL" />
        </View>
        <T v="label" c={color.white}>
          Vælg profilbillede
        </T>
      </Pressable>
      <TextField dark label="Navn" autoComplete="name" value={name} onChangeText={setName} />
      <TextField
        dark
        label="Brugernavn"
        autoCapitalize="none"
        autoCorrect={false}
        value={username}
        onChangeText={(t) => setUsername(t.toLowerCase().replace(/\s/g, ''))}
        error={username.trim() && !USERNAME.test(clean) ? 'Brug 2–30 tegn: bogstaver, tal, punktum eller understreg.' : error || undefined}
      />
      {!!error && !username.trim() && (
        <T v="bodyS" c={authText.error}>
          {error}
        </T>
      )}
    </AuthShell>
  );
}

const s = StyleSheet.create({
  photo: { alignItems: 'center', gap: 8, paddingVertical: 8 },
  ring: { padding: 6, borderRadius: 60, borderWidth: 2, borderColor: color.accent },
});
