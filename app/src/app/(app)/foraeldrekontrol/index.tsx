import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';
import { AccCard, AccPanel, AccScreen } from '@/components/AccountParts';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Sheet } from '@/components/Sheet';
import { T } from '@/components/T';
import { TextField } from '@/components/TextField';
import { useMe } from '@/lib/session';
import { ageOf, childAreas } from '@/lib/settings';
import { supabase } from '@/lib/supabase';
import { color, radius } from '@/theme/tokens';

type Child = { id: string; username: string; name: string; avatar_path: string | null; is_private: boolean; birthdate: string | null };

/**
 * Forældrekontrol (prototypens ParentalControl): dine tilknyttede børn.
 * Tilknytning sker med en kode: forælderen laver koden, barnet skriver den på sin egen profil.
 */
export default function ParentalControl() {
  const me = useMe();
  const [children, setChildren] = useState<Child[] | null>(null);
  const [areasOn, setAreasOn] = useState<Record<string, number>>({});
  const [guardians, setGuardians] = useState<string[]>([]);
  const [code, setCode] = useState<string | null>(null);
  const [sheet, setSheet] = useState<'kode' | 'barn' | null>(null);
  const [input, setInput] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [{ data: kids }, { data: links }] = await Promise.all([
      supabase.rpc('my_children'),
      supabase
        .from('guardian_links')
        .select('guardian_id, status, code, profiles!guardian_links_guardian_id_fkey(name)')
        .or(`child_id.eq.${me.id},guardian_id.eq.${me.id}`),
    ]);
    const list = (kids ?? []) as Child[];
    setChildren(list);
    const all = (links ?? []) as any[];
    setGuardians(all.filter((l) => l.guardian_id !== me.id && l.status === 'aktiv').map((l) => l.profiles?.name).filter(Boolean));
    setCode(all.find((l) => l.guardian_id === me.id && l.status === 'afventer')?.code ?? null);
    if (list.length) {
      const { data } = await supabase.from('child_settings').select('child_id, areas').in('child_id', list.map((c) => c.id));
      setAreasOn(Object.fromEntries(((data ?? []) as { child_id: string; areas: Record<string, boolean> }[]).map((r) => [r.child_id, childAreas.filter((a) => r.areas?.[a.id]).length])));
    }
  }, [me.id]);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const openCode = async () => {
    setSheet('kode');
    if (!code) {
      const { data } = await supabase.rpc('create_guardian_code');
      setCode(data as string);
    }
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

  const closeSheet = () => {
    setSheet(null);
    setMsg('');
    setInput('');
  };

  return (
    <AccScreen title="Forældrekontrol">
      <T v="bodyS" c={color.textSecondary}>
        Tilknyt dine børns profiler, og bestem selv, hvad de kan se og bruge, hvem der kan skrive til dem, og hvor længe de må være på.
      </T>

      <T v="headingM" accessibilityRole="header">
        Dine børn
      </T>
      {children?.length === 0 ? (
        <AccPanel>
          <T v="bodyS">Du har ikke tilknyttet nogen børn endnu.</T>
        </AccPanel>
      ) : (
        <View style={s.list}>
          {children?.map((c) => {
            const age = ageOf(c.birthdate);
            const first = c.name.split(' ')[0];
            return (
              <AccCard key={c.id} label={c.name} onPress={() => router.push(`/foraeldrekontrol/${c.id}`)}>
                <Avatar name={c.name} path={c.avatar_path} />
                <View style={s.text}>
                  <T v="headingS">
                    {first}
                    {age !== null ? `, ${age} år` : ''}
                  </T>
                  <T v="caption" c={color.textSecondary}>
                    @{c.username}
                    {areasOn[c.id] !== undefined ? ` · ${areasOn[c.id]} af ${childAreas.length} områder slået til` : ''}
                  </T>
                </View>
                <Icon name="chevron-right" />
              </AccCard>
            );
          })}
        </View>
      )}

      <Button block onPress={openCode}>
        Tilknyt et barn
      </Button>

      <View style={s.note}>
        <View style={{ marginTop: 1 }}>
          <Icon name="lock" size={18} color={color.accentNoteText} />
        </View>
        <T v="caption" c={color.accentNoteText} style={{ flex: 1 }}>
          Du kan aldrig læse dit barns beskeder. Du kan se, hvem de skriver med, og hvor meget tid de bruger. Børn under 16 år kan ikke selv slå
          forældrekontrol fra.
        </T>
      </View>

      {/* Barnets side: skriv koden fra din forælder */}
      {guardians.length > 0 ? (
        <T v="caption" c={color.textSecondary} style={{ textAlign: 'center' }}>
          Du er tilknyttet {guardians.join(' og ')}.
        </T>
      ) : (
        <Button variant="ghost" style={{ alignSelf: 'center' }} onPress={() => setSheet('barn')}>
          Har du fået en kode fra din forælder?
        </Button>
      )}

      <Sheet open={sheet !== null} onClose={closeSheet} title={sheet === 'barn' ? 'Kode fra din forælder' : 'Tilknyt et barn'} dim>
        <View style={s.sheet}>
          {sheet === 'kode' ? (
            <>
              <T v="bodyS">Dit barn skriver koden på sin egen profil under Indstillinger → Forældrekontrol. Så er I tilknyttet.</T>
              <View style={s.codeBox}>
                <T v="titleXl" style={s.code} selectable accessibilityLabel={code ? `Kode: ${code.split('').join(' ')}` : 'Laver kode'}>
                  {code ?? '······'}
                </T>
              </View>
              <Button block disabled={!code} onPress={() => code && Share.share({ message: `Min kode til forældrekontrol på ciircle: ${code}` })}>
                Del koden
              </Button>
              <Button variant="ghost" block onPress={closeSheet}>
                Luk
              </Button>
            </>
          ) : (
            <>
              <T v="bodyS">Skriv koden, din forælder har fået under Forældrekontrol.</T>
              <TextField label="Kode" showLabel={false} autoCapitalize="characters" autoCorrect={false} maxLength={6} value={input} onChangeText={setInput} />
              {!!msg && (
                <T v="bodyS" c={msg.startsWith('Du er') ? color.green700 : color.danger}>
                  {msg}
                </T>
              )}
              <Button block disabled={input.trim().length !== 6} loading={busy} onPress={accept}>
                Tilknyt
              </Button>
              <Button variant="ghost" block onPress={closeSheet}>
                Annuller
              </Button>
            </>
          )}
        </View>
      </Sheet>
    </AccScreen>
  );
}

const s = StyleSheet.create({
  list: { gap: 14 },
  text: { flex: 1, minWidth: 0, alignItems: 'flex-start', gap: 2 },
  note: { flexDirection: 'row', gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderRadius: radius.md, backgroundColor: color.accentNoteBg },
  sheet: { gap: 14, paddingTop: 16, paddingHorizontal: 20, paddingBottom: 24 },
  codeBox: { alignItems: 'center', paddingVertical: 16, borderRadius: radius.lg, backgroundColor: color.bgSubtle },
  code: { fontSize: 36, lineHeight: 44, letterSpacing: 6 },
});
