import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Chip } from '@/components/Chip';
import { Icon } from '@/components/Icon';
import { IconButton } from '@/components/IconButton';
import { CloseHeader, msg, PickRow, usePeople, type Person } from '@/components/MessageParts';
import { T } from '@/components/T';
import { noOutline, TextField } from '@/components/TextField';
import { useMe } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { color, font } from '@/theme/tokens';

/** Ny besked: vælg en eller flere personer, skriv evt. den første besked, og samtalen åbner */
export default function NewMessage() {
  const me = useMe();
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<Person[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const people = usePeople(me.id, q);

  const toggle = (m: Person) => setPicked((p) => (p.some((x) => x.id === m.id) ? p.filter((x) => x.id !== m.id) : [...p, m]));

  const start = async () => {
    if (!picked.length || busy) return;
    setBusy(true);
    setError('');
    const group = picked.length > 1;
    const { data, error } = await supabase.rpc('start_conversation', {
      member_ids: picked.map((m) => m.id),
      group_name: group ? picked.map((m) => m.name.split(' ')[0]).join(', ') : null,
    });
    if (error || !data) {
      setBusy(false);
      setError('Samtalen kunne ikke startes.');
      return;
    }
    const body = text.trim();
    if (body) await supabase.from('messages').insert({ conversation_id: data, sender_id: me.id, body });
    router.replace(`/samtale/${data}`);
  };

  return (
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <CloseHeader title="Ny besked" />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={msg.content} keyboardShouldPersistTaps="handled">
        <View style={[msg.card, s.to]}>
          <T v="captionStrong" c={color.textSecondary}>
            Til
          </T>
          {picked.map((m) => (
            <Chip key={m.id} selected onPress={() => toggle(m)}>
              {m.name}
            </Chip>
          ))}
          <TextInput
            style={[s.toInput, noOutline]}
            placeholder="Søg efter navn"
            placeholderTextColor={color.textSecondary}
            accessibilityLabel="Søg efter navn"
            value={q}
            onChangeText={setQ}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <T v="headingS" accessibilityRole="header">
          Forslag
        </T>
        <View style={s.list}>
          {people.map((m) => (
            <PickRow key={m.id} name={m.name} sub={m.follows ? 'Du følger' : `@${m.username}`} path={m.avatar_path} selected={picked.some((x) => x.id === m.id)} onToggle={() => toggle(m)} />
          ))}
          <Pressable accessibilityRole="button" onPress={() => router.push('/ny-cirkel')} style={({ pressed }) => [msg.card, pressed && { backgroundColor: color.bgSunken }]}>
            <View style={msg.tile}>
              <Icon name="circles" />
            </View>
            <View style={msg.cardText}>
              <T v="headingS">Ny cirkel</T>
              <T v="caption" c={color.textSecondary}>
                Opret en gruppe med flere personer
              </T>
            </View>
          </Pressable>
        </View>
        {!!error && (
          <T v="caption" c={color.danger}>
            {error}
          </T>
        )}
      </ScrollView>

      <View style={[msg.composer, { paddingBottom: Math.max(18, insets.bottom) }]}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <TextField label="Skriv din første besked" showLabel={false} value={text} onChangeText={setText} onSubmitEditing={start} returnKeyType="send" />
        </View>
        <IconButton icon="send" label="Send" variant="filled" disabled={!picked.length || busy} onPress={start} style={!picked.length ? { opacity: 0.4 } : undefined} />
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bgApp },
  to: { flexWrap: 'wrap', rowGap: 8 },
  toInput: { flex: 1, minWidth: 120, height: 44, padding: 0, color: color.textPrimary, fontFamily: font.body, fontSize: 16 },
  list: { gap: 14 },
});
