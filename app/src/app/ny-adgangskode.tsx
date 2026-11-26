import { useState } from 'react';
import { Button } from '@/components/Button';
import { PasswordField } from '@/components/PasswordField';
import { Screen } from '@/components/Screen';
import { useSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';

/** Efter linket i "glemt adgangskode"-mailen: vælg en ny */
export default function NewPassword() {
  const { doneRecovering } = useSession();
  const [password, setPassword] = useState('');
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
    <Screen title="Ny adgangskode" back={false}>
      <PasswordField isNew label="Ny adgangskode" value={password} onChangeText={setPassword} hint="Mindst 8 tegn" error={error} autoFocus />
      <Button title="Gem" block disabled={password.length < 8} loading={busy} onPress={save} />
    </Screen>
  );
}
