import { router } from 'expo-router';
import { useState } from 'react';
import { useAvatarPicker } from '@/components/AvatarCropper';
import { Button } from '@/components/Button';
import { ChoicePair, MoreScreen, PhotoPicker } from '@/components/MoreParts';
import { T } from '@/components/T';
import { TextField } from '@/components/TextField';
import { uploadImage } from '@/lib/media';
import { useMe } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { color } from '@/theme/tokens';

const visibility = [
  { value: 'privat', label: 'Lukket' },
  { value: 'offentlig', label: 'Åben' },
] as const;

/** Opret gruppe (prototypens NewGroup) */
export default function NewGroup() {
  const me = useMe();
  const [photo, setPhoto] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState<'privat' | 'offentlig'>('privat');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { choose, cropper } = useAvatarPicker(setPhoto);

  const create = async () => {
    const n = name.trim();
    if (!n) return;
    setBusy(true);
    setError('');
    try {
      const avatar_path = photo ? await uploadImage(me.id, photo, 'image/jpeg', 'avatar') : null;
      const { error } = await supabase.from('groups').insert({ name: n, description: description.trim(), privacy, avatar_path, created_by: me.id });
      if (error) throw error;
      router.replace('/grupper');
    } catch {
      setError('Gruppen kunne ikke oprettes. Prøv igen.');
      setBusy(false);
    }
  };

  return (
    <MoreScreen title="Opret gruppe" fallback="/grupper">
      <PhotoPicker value={photo} onPick={choose} onRemove={() => setPhoto(null)} />
      <TextField label="Gruppens navn" showLabel={false} value={name} onChangeText={setName} maxLength={80} />
      <TextField label="Beskrivelse" showLabel={false} value={description} onChangeText={setDescription} maxLength={500} />
      <T v="headingS" accessibilityRole="header">
        Hvem kan se den?
      </T>
      <ChoicePair label="Hvem kan se den?" options={visibility} value={privacy} onChange={setPrivacy} />
      <T v="caption" c={color.textSecondary} accessibilityLiveRegion="polite">
        {privacy === 'privat' ? 'Nye medlemmer skal anmode om adgang, og du godkender dem.' : 'Alle kan finde gruppen og blive medlem med det samme.'}
      </T>
      {!!error && (
        <T v="bodyS" c={color.danger}>
          {error}
        </T>
      )}
      <Button block disabled={!name.trim()} loading={busy} onPress={create}>
        Opret gruppe
      </Button>
      {cropper}
    </MoreScreen>
  );
}
