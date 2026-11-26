import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { SettingsRow } from '@/components/SettingsRow';
import { T } from '@/components/T';
import { useSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { color, radius } from '@/theme/tokens';

/** Indstillinger */
export default function Settings() {
  const { signOut } = useSession();
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);

  const deleteAccount = async () => {
    setBusy(true);
    const { error } = await supabase.rpc('delete_my_account');
    setBusy(false);
    if (!error) await signOut();
  };

  return (
    <Screen title="Indstillinger">
      <View style={{ gap: 10 }}>
        <SettingsRow icon="lock" title="Privatliv" hint="Profil, følgeanmodninger, blokerede" onPress={() => router.push('/indstillinger/privatliv')} />
        <SettingsRow icon="compass" title="Interesser" hint="Det, du ser i Offentlig debat" onPress={() => router.push('/interesser')} />
        <SettingsRow icon="bookmark" title="Gemt" onPress={() => router.push('/gemt')} />
        <SettingsRow icon="info" title="Privatlivserklæring for testen" onPress={() => router.push('/indstillinger/privatlivserklaering')} />
      </View>

      <Button title="Log ud" variant="secondary" icon="logout" block onPress={signOut} />

      {deleting ? (
        <View style={{ gap: 12, padding: 16, borderRadius: radius.xl, borderWidth: 1, borderColor: color.borderDefault, backgroundColor: color.bgSurface }}>
          <T v="bodyS">Slet din konto? Din profil, dine opslag, billeder og beskeder slettes med det samme.</T>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button title="Annuller" variant="secondary" style={{ flex: 1 }} onPress={() => setDeleting(false)} />
            <Button title="Slet konto" style={{ flex: 1 }} loading={busy} onPress={deleteAccount} />
          </View>
        </View>
      ) : (
        <Button title="Slet konto" variant="danger" onPress={() => setDeleting(true)} />
      )}
    </Screen>
  );
}
