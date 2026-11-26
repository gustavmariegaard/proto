import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { T } from '@/components/T';
import { TextField } from '@/components/TextField';
import { supabase } from '@/lib/supabase';
import { color, TAP } from '@/theme/tokens';

/*
 * Log ind eller opret konto med e-mail og adgangskode.
 * Testfase: e-mailen bekræftes ikke (slået fra i Supabase), så der sendes ingen mails.
 * Før offentlig lancering: slå bekræftelse til igen (eller brug koden i kode.tsx).
 */
export default function LogIn() {
  const [mode, setMode] = useState<'login' | 'opret'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const cleanEmail = email.trim().toLowerCase();
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) && password.length >= 8;

  const submit = async () => {
    if (!ok) return;
    setBusy(true);
    setError('');
    if (mode === 'opret') {
      const { data, error } = await supabase.auth.signUp({ email: cleanEmail, password });
      if (error) setError(error.message.includes('registered') ? 'Der findes allerede en konto med den e-mail.' : 'Kontoen kunne ikke oprettes. Prøv igen.');
      else if (!data.session) setError('Kontoen er oprettet, men e-mailen skal bekræftes først.');
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
      if (error) setError('Forkert e-mail eller adgangskode.');
    }
    setBusy(false);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen title={mode === 'login' ? 'Log ind' : 'Opret konto'}>
        <TextField
          label="E-mail"
          autoComplete="email"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
          autoFocus
        />
        <TextField
          label="Adgangskode"
          secureTextEntry
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          textContentType={mode === 'login' ? 'password' : 'newPassword'}
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={submit}
          hint={mode === 'opret' ? 'Mindst 8 tegn' : undefined}
          error={error}
        />
        <Button title={mode === 'login' ? 'Log ind' : 'Opret konto'} block disabled={!ok} loading={busy} onPress={submit} />
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setMode(mode === 'login' ? 'opret' : 'login');
            setError('');
          }}
          style={{ minHeight: TAP, alignItems: 'center', justifyContent: 'center' }}
        >
          <T v="label" c={color.textSecondary}>
            {mode === 'login' ? 'Ny her? Opret konto' : 'Har du en konto? Log ind'}
          </T>
        </Pressable>
      </Screen>
    </KeyboardAvoidingView>
  );
}
