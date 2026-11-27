import { router } from 'expo-router';
import { useState } from 'react';
import { useAvatarPicker } from '@/components/AvatarCropper';
import { Button } from '@/components/Button';
import { MoreScreen, PhotoPicker } from '@/components/MoreParts';
import { T } from '@/components/T';
import { TextField } from '@/components/TextField';
import { uploadImage } from '@/lib/media';
import { useMe } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { color } from '@/theme/tokens';

/** Sidens adresse (@navn) laves ud fra navnet: "Det lokale bageri" → "detlokalebageri" */
function handleFrom(name: string) {
  const h = name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9æøå]/g, '')
    .slice(0, 24);
  return h.length >= 2 ? h : `side${h}`;
}

/** Opret side (prototypens NewPage) */
export default function NewPage() {
  const me = useMe();
  const [photo, setPhoto] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
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
      const base = handleFrom(n);
      // Er adressen taget, prøves med et tal bagefter
      for (let i = 0; i < 6; i++) {
        const handle = i === 0 ? base : `${base}${Math.floor(Math.random() * 9000) + 100}`;
        const { error } = await supabase
          .from('pages')
          .insert({ handle, name: n, category: category.trim(), bio: description.trim(), avatar_path, created_by: me.id });
        if (!error) return router.replace('/sider');
        if (error.code !== '23505') throw error;
      }
      throw new Error('taget');
    } catch {
      setError('Siden kunne ikke oprettes. Prøv igen.');
      setBusy(false);
    }
  };

  return (
    <MoreScreen title="Opret side" fallback="/sider">
      <PhotoPicker value={photo} onPick={choose} onRemove={() => setPhoto(null)} />
      <TextField label="Sidens navn" showLabel={false} value={name} onChangeText={setName} maxLength={80} />
      <TextField label="Kategori" showLabel={false} value={category} onChangeText={setCategory} maxLength={40} />
      <TextField label="Beskrivelse" showLabel={false} value={description} onChangeText={setDescription} maxLength={300} />
      {!!error && (
        <T v="bodyS" c={color.danger}>
          {error}
        </T>
      )}
      <Button block disabled={!name.trim()} loading={busy} onPress={create}>
        Opret side
      </Button>
      {cropper}
    </MoreScreen>
  );
}
