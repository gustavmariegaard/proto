import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useAvatarPicker } from '@/components/AvatarCropper';
import { Button } from '@/components/Button';
import { MintTile } from '@/components/CreateFlow';
import { MoreScreen, PhotoPicker } from '@/components/MoreParts';
import { Sheet } from '@/components/Sheet';
import { T } from '@/components/T';
import { TextField } from '@/components/TextField';
import { loadMyPages, switchTo } from '@/lib/actingAs';
import { uploadImage } from '@/lib/media';
import { Avatar } from '@/components/Avatar';
import { useMe } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { color } from '@/theme/tokens';

/** Rediger side: billede, navn, kategori og beskrivelse. Adressen (@navn) kan ikke ændres. Siden kan slettes. */
export default function EditPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useMe();
  const [loaded, setLoaded] = useState(false);
  const [handle, setHandle] = useState('');
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [bio, setBio] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(false);
  const { choose, cropper } = useAvatarPicker(setPhoto);

  useEffect(() => {
    supabase
      .from('pages')
      .select('handle, name, category, bio, avatar_path')
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setHandle(data.handle);
          setName(data.name);
          setCategory(data.category);
          setBio(data.bio);
          setAvatarPath(data.avatar_path);
        }
        setLoaded(true);
      });
  }, [id]);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/profil'));

  const save = async () => {
    const n = name.trim();
    if (!n) return;
    setBusy(true);
    setError('');
    try {
      const avatar_path = photo ? await uploadImage(me.id, photo, 'image/jpeg', 'avatar') : avatarPath;
      const { error } = await supabase.from('pages').update({ name: n, category: category.trim(), bio: bio.trim(), avatar_path }).eq('id', id);
      if (error) throw error;
      await loadMyPages(me.id);
      back();
    } catch {
      setError('Ændringerne kunne ikke gemmes. Prøv igen.');
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    const { error } = await supabase.from('pages').delete().eq('id', id);
    if (error) {
      setError('Siden kunne ikke slettes. Prøv igen.');
      setBusy(false);
      setConfirm(false);
      return;
    }
    await switchTo(me.id, null);
    await loadMyPages(me.id);
    router.replace('/profil');
  };

  return (
    <MoreScreen title="Rediger side" fallback="/profil">
      {loaded && (
        <>
          {!photo && avatarPath ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Skift billede" onPress={choose} style={s.current}>
              <Avatar name={name} path={avatarPath} size="XL" />
              <T v="label" style={{ textDecorationLine: 'underline' }}>
                Skift billede
              </T>
            </Pressable>
          ) : (
            <PhotoPicker value={photo} onPick={choose} onRemove={() => setPhoto(null)} />
          )}
          <TextField label="Sidens navn" value={name} onChangeText={setName} maxLength={80} />
          <View style={s.locked} accessible accessibilityLabel={`Sidens adresse: @${handle}. Kan ikke ændres.`}>
            <T v="caption" c={color.textSecondary}>
              Sidens adresse
            </T>
            <T v="body" c={color.textSecondary}>
              @{handle}
            </T>
          </View>
          <TextField label="Kategori" value={category} onChangeText={setCategory} maxLength={40} />
          <TextField label="Beskrivelse" value={bio} onChangeText={setBio} maxLength={300} multiline />
          {!!error && (
            <T v="bodyS" c={color.danger}>
              {error}
            </T>
          )}
          <Button block disabled={!name.trim()} loading={busy && !confirm} onPress={save}>
            Gem
          </Button>
          <Button variant="danger" block onPress={() => setConfirm(true)}>
            Slet side
          </Button>
        </>
      )}
      {cropper}
      <Sheet open={confirm} onClose={() => setConfirm(false)} initialSize="auto" dim>
        <View style={s.confirm}>
          <MintTile icon="building" size={48} tone="danger" />
          <T v="titleL" style={s.center}>
            Slet {name || 'siden'}?
          </T>
          <T v="bodyS" c={color.textSecondary} style={s.center}>
            Siden, dens opslag og følgere slettes for altid. Det kan ikke fortrydes.
          </T>
          <Button variant="danger" block loading={busy} onPress={remove}>
            Slet side
          </Button>
          <Button variant="secondary" block onPress={() => setConfirm(false)}>
            Annullér
          </Button>
        </View>
      </Sheet>
    </MoreScreen>
  );
}

const s = StyleSheet.create({
  current: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  locked: { alignSelf: 'stretch', gap: 2, paddingVertical: 10, paddingHorizontal: 18, borderRadius: 16, backgroundColor: color.bgSubtle },
  confirm: { alignItems: 'center', gap: 10, paddingTop: 8, paddingHorizontal: 20, paddingBottom: 24 },
  center: { textAlign: 'center' },
});
