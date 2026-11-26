import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Platform } from 'react-native';
import { AuthShell, authText } from '@/components/AuthShell';
import { Button } from '@/components/Button';
import { T } from '@/components/T';
import { TextField } from '@/components/TextField';
import { supabase } from '@/lib/supabase';

/** Glemt adgangskode: vi sender et link, der logger ind og beder om en ny */
export default function Forgot() {
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? '');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const cleanEmail = email.trim().toLowerCase();
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail);

  const send = async () => {
    setBusy(true);
    setError('');
    const redirectTo = Platform.OS === 'web' ? window.location.origin + window.location.pathname.replace(/glemt-adgangskode\/?$/, '') : undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, { redirectTo });
    setBusy(false);
    if (error) setError(error.status === 429 ? 'For mange forsøg. Prøv igen om lidt.' : 'Mailen kunne ikke sendes. Prøv igen.');
    else setSent(true);
  };

  return (
    <AuthShell
      title={sent ? 'Tjek din mail.' : 'Glemt adgangskode?'}
      footer={!sent && <Button title="Send link" variant="accent" block disabled={!ok} loading={busy} onPress={send} />}
    >
      {sent ? (
        <T v="body" c={authText.muted}>
          Findes der en konto med {cleanEmail}, har vi sendt et link. Tryk på det for at vælge en ny adgangskode.
        </T>
      ) : (
        <>
          <T v="body" c={authText.muted}>
            Vi sender et link, så du kan vælge en ny.
          </T>
          <TextField dark label="E-mail" autoComplete="email" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} onSubmitEditing={() => ok && send()} error={error} autoFocus />
        </>
      )}
    </AuthShell>
  );
}
