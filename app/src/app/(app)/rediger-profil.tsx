import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '@/components/Avatar';
import { useAvatarPicker } from '@/components/AvatarCropper';
import { Button } from '@/components/Button';
import { PageHeader } from '@/components/PageHeader';
import { T } from '@/components/T';
import { noOutline, TextField } from '@/components/TextField';
import { uploadImage } from '@/lib/media';
import { useMe, useSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { cleanUsername, splitName, USERNAME } from '@/lib/validate';
import { color, font, TAP } from '@/theme/tokens';

const BIO_MAX = 150;

/** Rediger profil (prototypens EditProfile): profilbillede, navn, brugernavn og bio */
export default function EditProfile() {
  const me = useMe();
  const insets = useSafeAreaInsets();
  const { refreshProfile } = useSession();
  const [first, setFirst] = useState(splitName(me.name).first);
  const [last, setLast] = useState(splitName(me.name).last);
  const name = `${first.trim()} ${last.trim()}`.trim();
  const [username, setUsername] = useState(me.username);
  const [bio, setBio] = useState(me.bio ?? '');
  const [bioFocus, setBioFocus] = useState(false);
  const [photo, setPhoto] = useState<{ uri: string; mime: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const clean = cleanUsername(username);
  const usernameOk = USERNAME.test(clean);
  const ok = first.trim().length > 0 && last.trim().length > 0 && usernameOk;

  const { choose, cropper } = useAvatarPicker((uri) => setPhoto({ uri, mime: 'image/jpeg' }));

  const save = async () => {
    if (!ok || busy) return;
    setBusy(true);
    setError('');
    try {
      const avatar_path = photo ? await uploadImage(me.id, photo.uri, photo.mime, 'avatar') : me.avatar_path;
      const { error } = await supabase.from('profiles').update({ name, username: clean, bio: bio.trim(), avatar_path }).eq('id', me.id);
      if (error) throw error;
      await refreshProfile();
      router.canGoBack() ? router.back() : router.replace('/profil');
    } catch (e: any) {
      setError(e?.code === '23505' ? 'Brugernavnet er taget.' : 'Profilen kunne ikke gemmes. Prøv igen.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={s.root}>
      <PageHeader title="Rediger profil" fallback="/profil">
        <Button variant="ghost" disabled={!ok || busy} onPress={save}>
          Gem
        </Button>
      </PageHeader>
      <ScrollView contentContainerStyle={[s.form, { paddingBottom: 32 + insets.bottom }]} keyboardShouldPersistTaps="handled">
        <View style={s.photo}>
          <Pressable accessibilityRole="button" accessibilityLabel="Skift profilbillede" onPress={choose} style={s.avatar}>
            {photo ? <Avatar name={name || me.name} uri={photo.uri} size={96} tone="blue" /> : <Avatar name={name || me.name} path={me.avatar_path} size={96} tone="blue" />}
          </Pressable>
          <Pressable accessibilityRole="button" onPress={choose} style={s.change}>
            <T v="label">Skift profilbillede</T>
          </Pressable>
        </View>
        {cropper}

        <TextField label="Fornavn" autoComplete="given-name" value={first} onChangeText={setFirst} />
        <TextField label="Efternavn" autoComplete="family-name" value={last} onChangeText={setLast} />
        <TextField
          label="Brugernavn"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect={false}
          value={username}
          onChangeText={setUsername}
          error={username.trim() && !usernameOk ? 'Brug 2–30 tegn: bogstaver, tal, punktum eller understreg.' : undefined}
        />
        <View style={s.group}>
          <T v="label" style={s.label}>
            Bio
          </T>
          <TextInput
            accessibilityLabel="Bio"
            placeholder="Skriv lidt om dig selv"
            placeholderTextColor={color.textSecondary}
            multiline
            numberOfLines={4}
            maxLength={BIO_MAX}
            value={bio}
            onChangeText={setBio}
            onFocus={() => setBioFocus(true)}
            onBlur={() => setBioFocus(false)}
            style={[s.bio, bioFocus && { borderColor: color.textPrimary }, noOutline]}
          />
          <T v="caption" c={color.textSecondary} style={s.count}>
            {bio.length}/{BIO_MAX}
          </T>
        </View>

        {!!error && (
          <T v="caption" c={color.danger} style={s.label}>
            {error}
          </T>
        )}

        <Button block disabled={!ok} loading={busy} onPress={save}>
          Gem
        </Button>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bgApp },
  form: { gap: 16, paddingTop: 8, paddingHorizontal: 20 },
  photo: { alignItems: 'center', gap: 4, paddingTop: 8, paddingBottom: 4 },
  avatar: { width: 96, height: 96, borderRadius: 48, overflow: 'hidden', backgroundColor: color.bgSubtle },
  change: { minHeight: TAP, paddingHorizontal: 12, justifyContent: 'center' },
  group: { gap: 6 },
  label: { paddingLeft: 4 },
  bio: {
    // 4 linjer á 20 px + 2 × 14 px luft + kant
    minHeight: 110,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: color.borderDefault,
    borderRadius: 20,
    backgroundColor: color.bgSurface,
    color: color.textPrimary,
    fontFamily: font.body,
    // 16 px på telefoner (ellers zoomer iPhone ind), som prototypen på touch-skærme
    fontSize: 16,
    lineHeight: 22,
    textAlignVertical: 'top',
  },
  count: { alignSelf: 'flex-end' },
});
