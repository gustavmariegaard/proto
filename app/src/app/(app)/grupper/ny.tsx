import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { useAvatarPicker } from '@/components/AvatarCropper';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Segmented } from '@/components/Segmented';
import { T } from '@/components/T';
import { TextField } from '@/components/TextField';
import { uploadImage } from '@/lib/media';
import { useMe } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { color } from '@/theme/tokens';

/** Opret gruppe: navn, beskrivelse, synlighed og billede */
export default function NewGroup() {
  const me = useMe();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState<'offentlig' | 'privat'>('privat');
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { choose, cropper } = useAvatarPicker(setPhoto);

  const create = async () => {
    setBusy(true);
    setError('');
    try {
      const avatar_path = photo ? await uploadImage(me.id, photo, 'image/jpeg', 'avatar') : null;
      const { data, error } = await supabase
        .from('groups')
        .insert({ name: name.trim(), description: description.trim(), privacy, avatar_path, created_by: me.id })
        .select('id')
        .single();
      if (error) throw error;
      router.replace(`/grupper/${data.id}`);
    } catch {
      setError('Gruppen kunne ikke oprettes. Prøv igen.');
      setBusy(false);
    }
  };

  return (
    <Screen title="Opret gruppe">
      <Pressable accessibilityRole="button" accessibilityLabel="Vælg billede" onPress={choose} style={s.photo}>
        <Avatar name={name || '?'} uri={photo ?? undefined} size={96} />
      </Pressable>
      <View style={{ alignItems: 'center' }}>
        <Button title={photo ? 'Skift billede' : 'Vælg billede'} variant="secondary" icon="image" onPress={choose} style={{ minHeight: 44, paddingHorizontal: 20 }} />
      </View>
      <TextField label="Gruppens navn" value={name} onChangeText={setName} maxLength={80} />
      <TextField label="Beskrivelse" multiline value={description} onChangeText={setDescription} maxLength={500} />
      <View style={{ gap: 8 }}>
        <T v="label" style={{ paddingLeft: 4 }}>
          Hvem kan se den?
        </T>
        <Segmented
          label="Hvem kan se den?"
          value={privacy}
          onChange={setPrivacy}
          options={[
            { value: 'privat', label: 'Privat' },
            { value: 'offentlig', label: 'Offentlig' },
          ]}
        />
        <T v="caption" c={color.textSecondary} style={{ paddingLeft: 4 }}>
          {privacy === 'privat' ? 'Kun medlemmer ser opslag. Nye medlemmer skal godkendes.' : 'Alle kan se opslag og blive medlem.'}
        </T>
      </View>
      {!!error && (
        <T v="bodyS" c={color.danger}>
          {error}
        </T>
      )}
      <Button title="Opret gruppe" block disabled={!name.trim()} loading={busy} onPress={create} />
      {cropper}
    </Screen>
  );
}

const s = StyleSheet.create({ photo: { alignItems: 'center', paddingTop: 8 } });
