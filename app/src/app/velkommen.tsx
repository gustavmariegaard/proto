import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AuthLink, AuthShell, authText } from '@/components/AuthShell';
import { Avatar } from '@/components/Avatar';
import { useAvatarPicker } from '@/components/AvatarCropper';
import { Button } from '@/components/Button';
import { T } from '@/components/T';
import { uploadImage } from '@/lib/media';
import { useSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { color } from '@/theme/tokens';

/** Første gang efter tilmelding: velkommen + valgfrit profilbillede */
export default function Welcome() {
  const { session, profile, refreshProfile } = useSession();
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const first = profile?.name.split(' ')[0] ?? '';

  const finish = async (withPhoto: boolean) => {
    if (!session || !profile) return;
    setBusy(true);
    setError('');
    try {
      if (withPhoto && photo) {
        const avatar_path = await uploadImage(session.user.id, photo, 'image/jpeg', 'avatar');
        const { error } = await supabase.from('profiles').update({ avatar_path }).eq('id', profile.id);
        if (error) throw error;
      }
      // Husk, at velkomsten er vist (gemmes på kontoen, så den ikke kommer igen)
      await supabase.auth.updateUser({ data: { onboarded: true } });
      await refreshProfile();
    } catch {
      setError('Billedet kunne ikke gemmes. Prøv igen.');
      setBusy(false);
    }
  };

  const { choose, cropper } = useAvatarPicker(setPhoto);

  return (
    <AuthShell
      onBack={false}
      kicker="Du er med"
      title={`Velkommen, ${first}.`}
      footer={
        <>
          <Button title={photo ? 'Gem og fortsæt' : 'Vælg profilbillede'} variant="accent" block loading={busy} onPress={() => (photo ? finish(true) : choose())} />
          {!photo && <AuthLink label="Spring over" muted onPress={() => finish(false)} />}
        </>
      }
    >
      <T v="body" c={authText.muted}>
        Tilføj et billede, så dine venner kan genkende dig.
      </T>
      <Pressable accessibilityRole="button" accessibilityLabel="Vælg profilbillede" onPress={choose} style={s.photo}>
        <View style={s.ring}>
          <Avatar name={profile?.name ?? '?'} uri={photo ?? undefined} size={96} tone="sand" />
        </View>
        <T v="headingS" c={color.textPrimary}>
          {profile?.name}
        </T>
        <T v="caption" c={authText.faint}>
          @{profile?.username}
        </T>
      </Pressable>
      {photo && (
        <View style={{ alignItems: 'center' }}>
          <Button title="Skift billede" variant="outlineLight" icon="image" onPress={choose} style={{ minHeight: 44, paddingHorizontal: 20 }} />
        </View>
      )}
      {cropper}
      {!!error && (
        <T v="bodyS" c={authText.error}>
          {error}
        </T>
      )}
    </AuthShell>
  );
}

const s = StyleSheet.create({
  photo: { alignItems: 'center', gap: 6, paddingVertical: 16 },
  ring: { padding: 6, borderRadius: 60, borderWidth: 2, borderColor: color.accent, marginBottom: 8 },
});
