import { router } from 'expo-router';
import { useState } from 'react';
import { AuthLink, AuthShell } from '@/components/AuthShell';
import { Button } from '@/components/Button';
import { PasswordField } from '@/components/PasswordField';
import { TextField } from '@/components/TextField';
import { supabase } from '@/lib/supabase';

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
    <AuthShell
      title="Velkommen tilbage."
      footer={
        <>
          <Button title="Log ind" variant="accent" block disabled={!ok} loading={busy} onPress={submit} />
          <AuthLink label="Ny her? Opret konto" muted onPress={() => router.replace('/opret-konto')} />
        </>
      }
    >
      <TextField dark label="E-mail" autoComplete="email" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} autoFocus />
      <PasswordField dark value={password} onChangeText={setPassword} onSubmitEditing={submit} error={error} />
      <AuthLink label="Glemt adgangskode?" onPress={() => router.push({ pathname: '/glemt-adgangskode', params: { email: cleanEmail } })} />
    </AuthShell>
  );
}
