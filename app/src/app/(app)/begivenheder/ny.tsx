import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { EventInvitePicker, noInvites, resolveInvites, useFollowers, type Invites } from '@/components/EventInvitePicker';
import { CloseHeader } from '@/components/MessageParts';
import { T } from '@/components/T';
import { noOutline, TextField } from '@/components/TextField';
import { invite } from '@/lib/community';
import { useMe } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { color, font, radius } from '@/theme/tokens';

/** "27112026" → "27.11.2026", "1830" → "18.30" (mens man skriver) */
function formatDate(t: string) {
  const d = t.replace(/\D/g, '').slice(0, 8);
  return [d.slice(0, 2), d.slice(2, 4), d.slice(4)].filter(Boolean).join('.');
}
function formatTime(t: string) {
  const d = t.replace(/\D/g, '').slice(0, 4);
  return [d.slice(0, 2), d.slice(2)].filter(Boolean).join('.');
}

/** Dato (dd.mm.åååå, året kan udelades) og tid (tt.mm) → Date, eller en fejltekst */
function parseWhen(date: string, time: string): { at?: Date; error?: string } {
  const today = new Date();
  const [dd, mm, yy] = date ? date.split('.').map(Number) : [today.getDate(), today.getMonth() + 1, today.getFullYear()];
  const [hh, mi] = time.split('.').map(Number);
  if (!time || hh === undefined || Number.isNaN(hh)) return {};
  const year = yy && yy > 999 ? yy : today.getFullYear();
  const at = new Date(year, (mm ?? 0) - 1, dd ?? 0, hh, mi || 0);
  if (!dd || !mm || at.getDate() !== dd || at.getMonth() !== mm - 1 || hh > 23 || (mi ?? 0) > 59) return { error: 'Datoen eller tiden findes ikke.' };
  if (at.getTime() < Date.now() - 3600e3) return { error: 'Tidspunktet er allerede passeret.' };
  return { at };
}

/** Felt, der viser "Dato"/"Tid" og formatet, når man trykker i det (prototypens PickerField) */
function PickerField({ label, format, value, onChange, max }: { label: string; format: string; value: string; onChange: (v: string) => void; max: number }) {
  const [focus, setFocus] = useState(false);
  return (
    <View style={{ flex: 1, minWidth: 0 }}>
      <TextField
        label={label}
        showLabel={false}
        placeholder={focus ? format : label}
        keyboardType="number-pad"
        maxLength={max}
        value={value}
        onChangeText={onChange}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
      />
    </View>
  );
}

/** Ny begivenhed (prototypens NewEvent): titel, dato og tid, sted, synlighed, invitationer og beskrivelse */
export default function NewEvent() {
  const me = useMe();
  const insets = useSafeAreaInsets();
  const { gruppe } = useLocalSearchParams<{ gruppe?: string }>();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [place, setPlace] = useState('');
  const [privacy, setPrivacy] = useState<'offentlig' | 'inviterede'>('offentlig');
  const [invites, setInvites] = useState<Invites>(noInvites);
  const [description, setDescription] = useState('');
  const [descFocus, setDescFocus] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const followers = useFollowers(me.id);
  const isPublic = privacy === 'offentlig';
  const when = parseWhen(date, time);
  const ok = title.trim().length > 0 && !!when.at;

  const create = async () => {
    if (!ok || !when.at || busy) return;
    setBusy(true);
    setError('');
    try {
      const { data, error } = await supabase
        .from('events')
        .insert({
          title: title.trim(),
          starts_at: when.at.toISOString(),
          location: place.trim(),
          privacy,
          description: description.trim(),
          group_id: gruppe || null,
          created_by: me.id,
        })
        .select('id')
        .single();
      if (error) throw error;
      // Arrangøren deltager selv
      await supabase.from('event_rsvps').upsert({ event_id: data.id, user_id: me.id, status: 'deltager' });
      // Både offentlige og private begivenheder kan invitere
      await invite(data.id, me.id, resolveInvites(invites, followers, me.id));
      router.replace(`/begivenheder/${data.id}`);
    } catch {
      setError('Begivenheden kunne ikke oprettes. Prøv igen.');
      setBusy(false);
    }
  };

  return (
    <View style={s.screen}>
      <CloseHeader title="Ny begivenhed" fallback="/begivenheder" />
      <ScrollView contentContainerStyle={[s.content, { paddingBottom: 24 + insets.bottom }]} keyboardShouldPersistTaps="handled">
        <TextField label="Titel" showLabel={false} value={title} onChangeText={setTitle} maxLength={120} />
        <View style={s.row}>
          <PickerField label="Dato" format="dd.mm.åååå" value={date} onChange={(t) => setDate(formatDate(t))} max={10} />
          <PickerField label="Tid" format="tt.mm" value={time} onChange={(t) => setTime(formatTime(t))} max={5} />
        </View>
        {!!when.error && (
          <T v="caption" c={color.danger}>
            {when.error}
          </T>
        )}
        <TextField label="Sted" showLabel={false} value={place} onChangeText={setPlace} maxLength={200} />

        <T v="headingS" accessibilityRole="header">
          Hvem kan se den?
        </T>
        <View style={s.chips} accessibilityRole="radiogroup" accessibilityLabel="Hvem kan se den?">
          {(['inviterede', 'offentlig'] as const).map((v) => (
            <Chip key={v} selected={privacy === v} onPress={() => setPrivacy(v)}>
              {v === 'inviterede' ? 'Privat' : 'Offentlig'}
            </Chip>
          ))}
        </View>
        <T v="caption" c={color.textSecondary} style={{ alignSelf: 'stretch' }}>
          {isPublic
            ? 'Offentlig: alle kan finde den under Begivenheder › Find begivenheder, vise interesse og tilmelde sig uden invitation.'
            : 'Privat: kun dem, du inviterer, kan se den og tilmelde sig.'}
        </T>

        <T v="headingS" accessibilityRole="header">
          Inviter{' '}
          {isPublic && (
            <T v="caption" c={color.textSecondary}>
              (valgfrit – alle kan stadig finde den)
            </T>
          )}
        </T>
        <EventInvitePicker me={me.id} value={invites} onChange={setInvites} />

        <TextInput
          style={[s.desc, descFocus && s.descFocus, noOutline]}
          accessibilityLabel="Beskrivelse"
          placeholder="Beskrivelse"
          placeholderTextColor={color.textSecondary}
          multiline
          value={description}
          onChangeText={setDescription}
          maxLength={2000}
          onFocus={() => setDescFocus(true)}
          onBlur={() => setDescFocus(false)}
        />
        {!!error && (
          <T v="bodyS" c={color.danger}>
            {error}
          </T>
        )}
        <View style={{ alignSelf: 'stretch' }}>
          <Button title="Opret begivenhed" block disabled={!ok} loading={busy} onPress={create} />
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bgApp },
  content: { alignItems: 'flex-start', gap: 14, paddingTop: 4, paddingHorizontal: 20 },
  row: { flexDirection: 'row', gap: 8, alignSelf: 'stretch' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  desc: {
    alignSelf: 'stretch',
    height: 110,
    padding: 14,
    borderWidth: 1,
    borderColor: color.borderStrong,
    borderRadius: radius.lg,
    backgroundColor: color.bgSurface,
    color: color.textPrimary,
    fontFamily: font.body,
    fontSize: 16,
    lineHeight: 22,
    textAlignVertical: 'top',
  },
  descFocus: { borderColor: color.textPrimary, borderWidth: 2, padding: 13 },
});
