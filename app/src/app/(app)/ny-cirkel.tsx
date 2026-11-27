import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { CloseHeader, msg, PickRow, usePeople, type Person } from '@/components/MessageParts';
import { T } from '@/components/T';
import { TextField } from '@/components/TextField';
import { useMe } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { color } from '@/theme/tokens';

/** Ny cirkel: navn og medlemmer. Opret åbner cirklen. (Prototypens NewCircle) */
export default function NewCircle() {
  const me = useMe();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<Person[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const people = usePeople(me.id, q, true);
  const canCreate = name.trim().length > 0 && picked.length > 0;

  const toggle = (m: Person) => setPicked((p) => (p.some((x) => x.id === m.id) ? p.filter((x) => x.id !== m.id) : [...p, m]));

  const create = async () => {
    if (!canCreate || busy) return;
    setBusy(true);
    setError('');
    const { data, error } = await supabase.rpc('start_conversation', { member_ids: picked.map((m) => m.id), group_name: name.trim() });
    if (error || !data) {
      setBusy(false);
      setError('Cirklen kunne ikke oprettes.');
      return;
    }
    router.replace(`/samtale/${data}`);
  };

  return (
    <View style={s.screen}>
      <CloseHeader title="Ny cirkel" />
      <ScrollView contentContainerStyle={[msg.content, { paddingBottom: 24 + insets.bottom }]} keyboardShouldPersistTaps="handled">
        <T v="bodyS" c={color.textSecondary}>
          En cirkel er en privat gruppe med chat. Kun dem, du inviterer, kan se den.
        </T>
        <TextField label="Navn på cirklen" showLabel={false} value={name} onChangeText={setName} maxLength={60} />

        <T v="headingS" accessibilityRole="header">
          Tilføj medlemmer
        </T>
        {picked.length > 0 && (
          <View style={s.chips}>
            {picked.map((m) => (
              <Chip key={m.id} selected onPress={() => toggle(m)}>
                {m.name}
              </Chip>
            ))}
          </View>
        )}
        <TextField label="Søg blandt dem, du følger" showLabel={false} value={q} onChangeText={setQ} autoCapitalize="none" autoCorrect={false} />
        <T v="caption" c={color.textSecondary}>
          Skriv et navn. Viser kun folk, du følger.
        </T>

        <View style={s.list}>
          {people.map((m) => (
            <PickRow key={m.id} name={m.name} sub="Du følger" path={m.avatar_path} selected={picked.some((x) => x.id === m.id)} onToggle={() => toggle(m)} />
          ))}
        </View>

        {!!error && (
          <T v="caption" c={color.danger}>
            {error}
          </T>
        )}
        <Button title="Opret cirkel" block disabled={!canCreate} loading={busy} onPress={create} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bgApp },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  list: { gap: 14 },
});
