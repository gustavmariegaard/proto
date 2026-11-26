import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { T } from '@/components/T';
import { TextField } from '@/components/TextField';
import { supabase } from '@/lib/supabase';
import { color } from '@/theme/tokens';

/** Log ind eller opret: skriv din e-mail, så sender vi en kode */
export default function LogIn() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const send = async () => {
    setBusy(true);
    setError('');
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim().toLowerCase(), options: { shouldCreateUser: true } });
    setBusy(false);
    if (error) setError('Koden kunne ikke sendes. Prøv igen om lidt.');
    else router.push({ pathname: '/kode', params: { email: email.trim().toLowerCase() } });
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen title="Log ind">
        <T v="body" c={color.textSecondary}>
          Vi sender en kode til din e-mail. Har du ikke en profil, opretter vi den.
        </T>
        <TextField
          label="E-mail"
          autoComplete="email"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
          onSubmitEditing={() => ok && send()}
          error={error}
          autoFocus
        />
        <Button title="Send kode" block disabled={!ok} loading={busy} onPress={send} />
      </Screen>
    </KeyboardAvoidingView>
  );
}
