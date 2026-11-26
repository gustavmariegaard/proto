import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { T } from '@/components/T';
import { TextField } from '@/components/TextField';
import { supabase } from '@/lib/supabase';
import { color } from '@/theme/tokens';

/** Skriv koden fra e-mailen. Bagefter sender appen dig selv videre. */
export default function Code() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const ok = /^\d{6}$/.test(code);

  const verify = async () => {
    setBusy(true);
    setError('');
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' });
    setBusy(false);
    if (error) setError('Koden passer ikke, eller den er udløbet.');
  };

  return (
    <Screen title="Skriv koden">
      <T v="body" c={color.textSecondary}>
        Vi har sendt en kode på 6 cifre til {email}.
      </T>
      <TextField
        label="Kode"
        keyboardType="number-pad"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        maxLength={6}
        value={code}
        onChangeText={(t) => setCode(t.replace(/\D/g, ''))}
        onSubmitEditing={() => ok && verify()}
        error={error}
        autoFocus
      />
      <Button title="Log ind" block disabled={!ok} loading={busy} onPress={verify} />
    </Screen>
  );
}
