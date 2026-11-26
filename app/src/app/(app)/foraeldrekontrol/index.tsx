import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, Share, StyleSheet, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { T } from '@/components/T';
import { TextField } from '@/components/TextField';
import { useMe } from '@/lib/session';
import { ageOf } from '@/lib/settings';
import { supabase } from '@/lib/supabase';
import { color, radius } from '@/theme/tokens';

type Child = { id: string; username: string; name: string; avatar_path: string | null; is_private: boolean; birthdate: string | null };

/**
 * Forældrekontrol. Forælderen laver en kode; barnet skriver koden her på sin egen profil.
 * (I den færdige app sker tilknytningen med MitID.)
 */
export default function ParentalControl() {
  const me = useMe();
  const [children, setChildren] = useState<Child[]>([]);
  const [guardians, setGuardians] = useState<string[]>([]);
  const [code, setCode] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [{ data: kids }, { data: links }] = await Promise.all([
      supabase.rpc('my_children'),
      supabase.from('guardian_links').select('guardian_id, status, code, profiles!guardian_links_guardian_id_fkey(name)').or(`child_id.eq.${me.id},guardian_id.eq.${me.id}`),
    ]);
    setChildren((kids ?? []) as Child[]);
    const all = (links ?? []) as any[];
    setGuardians(all.filter((l) => l.guardian_id !== me.id && l.status === 'aktiv').map((l) => l.profiles?.name).filter(Boolean));
    setCode(all.find((l) => l.guardian_id === me.id && l.status === 'afventer')?.code ?? null);
  }, [me.id]);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const newCode = async () => {
    const { data } = await supabase.rpc('create_guardian_code');
    setCode(data as string);
  };

  const accept = async () => {
    setBusy(true);
    setMsg('');
    const { data, error } = await supabase.rpc('accept_guardian_code', { c: input.trim().toUpperCase() });
    setBusy(false);
    if (error) setMsg(error.message.includes('selv') ? 'Du kan ikke tilknytte dig selv.' : 'Koden passer ikke.');
    else {
      setMsg(`Du er nu tilknyttet ${data}.`);
      setInput('');
      load();
    }
  };

  return (
    <Screen title="Forældrekontrol">
      <T v="headingM">Dine børn</T>
      {children.length === 0 ? (
        <View style={s.panel}>
          <T v="bodyS">Du har ikke tilknyttet nogen børn endnu.</T>
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          {children.map((c) => {
            const age = ageOf(c.birthdate);
            return (
              <Pressable key={c.id} accessibilityRole="link" onPress={() => router.push(`/foraeldrekontrol/${c.id}`)} style={({ pressed }) => [s.card, pressed && { opacity: 0.7 }]}>
                <Avatar name={c.name} path={c.avatar_path} />
                <View style={{ flex: 1 }}>
                  <T v="headingS">
                    {c.name}
                    {age !== null ? `, ${age} år` : ''}
                  </T>
                  <T v="caption" c={color.textSecondary}>
                    @{c.username} · {c.is_private ? 'Privat profil' : 'Offentlig profil'}
                  </T>
                </View>
                <Icon name="chevron-right" size={20} color={color.textSecondary} />
              </Pressable>
            );
          })}
        </View>
      )}

      {code ? (
        <View style={s.codeBox}>
          <T v="caption" c={color.textSecondary}>
            Barnets kode
          </T>
          <T v="titleXl" style={s.code} selectable accessibilityLabel={`Kode: ${code.split('').join(' ')}`}>
            {code}
          </T>
          <T v="caption" c={color.textSecondary} style={{ textAlign: 'center' }}>
            Barnet skriver koden under Indstillinger → Forældrekontrol.
          </T>
          <Button title="Del koden" variant="secondary" icon="send" onPress={() => Share.share({ message: `Min kode til forældrekontrol på ciircle: ${code}` })} />
        </View>
      ) : (
        <Button title="Tilknyt et barn" block onPress={newCode} />
      )}

      <T v="headingM">Har du fået en kode?</T>
      {guardians.length > 0 && (
        <View style={s.panel}>
          <T v="bodyS">Tilknyttet {guardians.join(' og ')}.</T>
        </View>
      )}
      <TextField label="Kode fra din forælder" autoCapitalize="characters" autoCorrect={false} maxLength={6} value={input} onChangeText={setInput} />
      <Button title="Tilknyt" variant="secondary" block disabled={input.trim().length !== 6} loading={busy} onPress={accept} />
      {!!msg && (
        <T v="bodyS" c={msg.startsWith('Du er') ? color.green700 : color.danger}>
          {msg}
        </T>
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  panel: { padding: 16, borderRadius: radius.xl, borderWidth: 1, borderColor: color.borderDefault, backgroundColor: color.bgSurface },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.lg, borderWidth: 1, borderColor: color.borderDefault, backgroundColor: color.bgSurface },
  codeBox: { alignItems: 'center', gap: 8, padding: 20, borderRadius: radius.xl, backgroundColor: color.noteBg },
  code: { fontSize: 36, lineHeight: 44, letterSpacing: 6 },
});
