import { useState } from 'react';
import { AuthShell } from '@/components/AuthShell';
import { Button } from '@/components/Button';
import { PasswordField } from '@/components/PasswordField';
import { useSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';

/** Efter linket i "glemt adgangskode"-mailen: vælg en ny */
export default function NewPassword() {
  const { doneRecovering } = useSession();
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    setBusy(true);
    setError('');
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) setError('Adgangskoden kunne ikke gemmes. Prøv en anden.');
    else doneRecovering();
  };

  return (
    <AuthShell title="Vælg en ny adgangskode." onBack={false} footer={<Button title="Gem" variant="accent" block disabled={password.length < 8 || password2 !== password} loading={busy} onPress={save} />}>
      <PasswordField dark isNew label="Ny adgangskode" value={password} onChangeText={setPassword} hint="Mindst 8 tegn" autoFocus />
      <PasswordField
        dark
        isNew
        label="Gentag adgangskode"
        value={password2}
        onChangeText={setPassword2}
        error={error || (password2.length >= password.length && password2 && password2 !== password ? 'Adgangskoderne er ikke ens.' : undefined)}
      />
    </AuthShell>
  );
}
