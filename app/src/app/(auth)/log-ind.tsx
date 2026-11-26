import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { Button } from '@/components/Button';
import { PasswordField } from '@/components/PasswordField';
import { Screen } from '@/components/Screen';
import { T } from '@/components/T';
import { TextField } from '@/components/TextField';
import { supabase } from '@/lib/supabase';
import { color, TAP } from '@/theme/tokens';

/** Log ind med e-mail og adgangskode */
export default function LogIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const cleanEmail = email.trim().toLowerCase();
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) && password.length > 0;

  const submit = async () => {
    if (!ok) return;
    setBusy(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
    setBusy(false);
    if (error) {
      const msg = error.message.toLowerCase();
      setError(msg.includes('confirm') ? 'Bekræft din e-mail først via linket i mailen.' : error.status === 429 ? 'For mange forsøg. Prøv igen om lidt.' : 'Forkert e-mail eller adgangskode.');
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen title="Log ind">
        <TextField label="E-mail" autoComplete="email" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} autoFocus />
        <PasswordField value={password} onChangeText={setPassword} onSubmitEditing={submit} error={error} />
        <Pressable accessibilityRole="link" onPress={() => router.push({ pathname: '/glemt-adgangskode', params: { email: cleanEmail } })} style={{ minHeight: TAP, justifyContent: 'center', alignSelf: 'flex-start' }}>
          <T v="label" style={{ textDecorationLine: 'underline' }}>
            Glemt adgangskode?
          </T>
        </Pressable>
        <Button title="Log ind" block disabled={!ok} loading={busy} onPress={submit} />
        <Pressable accessibilityRole="button" onPress={() => router.replace('/opret-konto')} style={{ minHeight: TAP, alignItems: 'center', justifyContent: 'center' }}>
          <T v="label" c={color.textSecondary}>
            Ny her? Opret konto
          </T>
        </Pressable>
      </Screen>
    </KeyboardAvoidingView>
  );
}
