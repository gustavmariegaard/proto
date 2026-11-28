import { router } from 'expo-router';
import { useState } from 'react';
import { AuthLink, AuthShell } from '@/components/AuthShell';
import { Button } from '@/components/Button';
import { PasswordField } from '@/components/PasswordField';
import { TextField } from '@/components/TextField';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { T } from '@/components/T';
import { getRememberMe, setRememberMe, supabase } from '@/lib/supabase';
import { color, radius, TAP } from '@/theme/tokens';

/** Log ind med e-mail og adgangskode */
export default function LogIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [remember, setRemember] = useState(getRememberMe());
  const cleanEmail = email.trim().toLowerCase();
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) && password.length > 0;

  const submit = async () => {
    if (!ok) return;
    setBusy(true);
    setError('');
    setRememberMe(remember);
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
      <View style={s.row}>
        {/* Husk mig: forbliv logget ind, når appen lukkes */}
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: remember }}
          aria-checked={remember}
          onPress={() => setRemember((r) => !r)}
          hitSlop={6}
          style={s.remember}
        >
          <View style={[s.box, remember && s.boxOn]}>{remember && <Icon name="check" size={14} color={color.ink900} stroke={3} />}</View>
          <T v="label">Husk mig</T>
        </Pressable>
        <AuthLink label="Glemt adgangskode?" onPress={() => router.push({ pathname: '/glemt-adgangskode', params: { email: cleanEmail } })} />
      </View>
    </AuthShell>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: -4 },
  remember: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: TAP, paddingLeft: 4 },
  box: { width: 22, height: 22, borderRadius: radius.sm - 4, borderWidth: 1.5, borderColor: color.borderStrong, backgroundColor: color.bgSurface, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: color.accent, borderColor: color.accent },
});
