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
 * Er "Confirm email" slået til i Supabase, sendes en mail med et link.
 * Linket åbner appen og logger ind. Er det slået fra, logges man ind med det samme.
 */
export default function LogIn() {
  const [mode, setMode] = useState<'login' | 'opret'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const cleanEmail = email.trim().toLowerCase();
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) && password.length >= 8;

  const submit = async () => {
    if (!ok) return;
    setBusy(true);
    setError('');
    if (mode === 'opret') {
      // Linket i mailen skal føre tilbage til appen (web: samme adresse som nu)
      const emailRedirectTo = Platform.OS === 'web' ? window.location.origin + window.location.pathname.replace(/log-ind\/?$/, '') : undefined;
      const { data, error } = await supabase.auth.signUp({ email: cleanEmail, password, options: { emailRedirectTo } });
      if (error) setError(error.message.includes('registered') ? 'Der findes allerede en konto med den e-mail.' : error.status === 429 ? 'For mange forsøg. Prøv igen om lidt.' : 'Kontoen kunne ikke oprettes. Prøv igen.');
      else if (!data.session) setSent(true);
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
      if (error) setError(error.message.toLowerCase().includes('confirm') ? 'Bekræft din e-mail først via linket i mailen.' : 'Forkert e-mail eller adgangskode.');
    }
    setBusy(false);
  };

  if (sent) {
    return (
      <Screen title="Tjek din mail">
        <T v="body">Vi har sendt et link til {cleanEmail}. Tryk på linket for at bekræfte din e-mail.</T>
        <Button
          title="Log ind"
          variant="secondary"
          block
          onPress={() => {
            setSent(false);
            setMode('login');
          }}
        />
      </Screen>
    );
  }

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
