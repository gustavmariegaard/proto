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
      <T v="headingS" c={color.textSecondary}>
        Generelt
      </T>
      <View style={{ gap: 10 }}>
        <SettingsRow icon="lock" title="Privatliv" hint="Profil, følgeanmodninger, blokerede" onPress={() => router.push('/indstillinger/privatliv')} />
        <SettingsRow icon="globe" title="Sprog og oversættelse" hint="Standardsprog og automatisk oversættelse" onPress={() => router.push('/indstillinger/sprog')} />
        <SettingsRow icon="compass" title="Interesser" hint="Det, du ser i Offentlig debat" onPress={() => router.push('/interesser')} />
        <SettingsRow icon="bookmark" title="Gemt" onPress={() => router.push('/gemt')} />
      </View>

      <T v="headingS" c={color.textSecondary}>
        Profil
      </T>
      <View style={{ gap: 10 }}>
        <SettingsRow icon="megaphone" title="Offentlig person" hint="Ansøg om globus ved dit navn" onPress={() => router.push('/indstillinger/offentlig-person')} />
        <SettingsRow icon="star" title="Skaber" hint="Dit publikum i tal" onPress={() => router.push('/skaber')} />
        <SettingsRow icon="user-plus" title="Udvid cirkel" hint="Forslag og anmodninger" onPress={() => router.push('/find-folk')} />
        <SettingsRow icon="user" title="Forældrekontrol" hint="Tilknyt dine børn eller din forælder" onPress={() => router.push('/foraeldrekontrol')} />
      </View>

      <T v="headingS" c={color.textSecondary}>
        Om og jura
      </T>
      <View style={{ gap: 10 }}>
        <SettingsRow icon="info" title="Privatlivspolitik" hint="Hvilke data vi behandler, og dine rettigheder" onPress={() => router.push('/indstillinger/jura/privatlivspolitik')} />
        <SettingsRow icon="info" title="Databehandleraftale" hint="For sider, grupper og virksomheder" onPress={() => router.push('/indstillinger/jura/databehandleraftale')} />
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
