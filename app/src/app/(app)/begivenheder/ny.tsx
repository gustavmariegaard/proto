import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { Segmented } from '@/components/Segmented';
import { T } from '@/components/T';
import { noOutline, TextField } from '@/components/TextField';
import { pickImage, uploadImage } from '@/lib/media';
import { useMe } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { color, font, radius } from '@/theme/tokens';

/** Dag/måned/år + tt:mm → Date, eller fejltekst */
function parseWhen(d: string, m: string, y: string, hh: string, mm: string): { date?: Date; error?: string } {
  if (!d || !m || y.length < 4 || !hh) return {};
  const date = new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm || '0'));
  if (date.getDate() !== Number(d) || date.getMonth() !== Number(m) - 1 || Number(hh) > 23 || Number(mm || '0') > 59) return { error: 'Datoen eller tiden findes ikke.' };
  if (date.getTime() < Date.now() - 3600e3) return { error: 'Tidspunktet er allerede passeret.' };
  return { date };
}

function Part({ label, placeholder, value, onChange, max, wide }: { label: string; placeholder: string; value: string; onChange: (v: string) => void; max: number; wide?: boolean }) {
  return (
    <View style={{ flex: wide ? 1.4 : 1, gap: 6 }}>
      <T v="label" style={{ paddingLeft: 4 }}>
        {label}
      </T>
      <TextInput
        accessibilityLabel={label}
        placeholder={placeholder}
        placeholderTextColor={color.actionOff}
        keyboardType="number-pad"
        maxLength={max}
        value={value}
        onChangeText={(t) => onChange(t.replace(/\D/g, ''))}
        style={[s.part, noOutline]}
      />
    </View>
  );
}

/** Ny begivenhed: titel, dato og tid, sted, synlighed, beskrivelse og billede */
export default function NewEvent() {
  const me = useMe();
  const { gruppe } = useLocalSearchParams<{ gruppe?: string }>();
  const [title, setTitle] = useState('');
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [hh, setHh] = useState('');
  const [mi, setMi] = useState('');
  const [place, setPlace] = useState('');
  const [privacy, setPrivacy] = useState<'offentlig' | 'inviterede'>('offentlig');
  const [description, setDescription] = useState('');
  const [cover, setCover] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const when = parseWhen(day, month, year, hh, mi);
  const ok = title.trim().length > 0 && !!when.date;

  const create = async () => {
    if (!ok || !when.date) return;
    setBusy(true);
    setError('');
    try {
      const cover_path = cover ? await uploadImage(me.id, cover, 'image/jpeg') : null;
      const { data, error } = await supabase
        .from('events')
        .insert({
          title: title.trim(),
          starts_at: when.date.toISOString(),
          location: place.trim(),
          privacy,
          description: description.trim(),
          cover_path,
          group_id: gruppe || null,
          created_by: me.id,
        })
        .select('id')
        .single();
      if (error) throw error;
      // Arrangøren deltager selv
      await supabase.from('event_rsvps').upsert({ event_id: data.id, user_id: me.id, status: 'deltager' });
      router.replace(`/begivenheder/${data.id}`);
    } catch {
      setError('Begivenheden kunne ikke oprettes. Prøv igen.');
      setBusy(false);
    }
  };

  return (
    <Screen title="Ny begivenhed">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={cover ? 'Skift billede' : 'Tilføj billede'}
        onPress={async () => {
          const a = await pickImage();
          if (a) setCover(a.uri);
        }}
        style={s.cover}
      >
        {cover ? (
          <Image source={{ uri: cover }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <>
            <Icon name="image" size={24} />
            <T v="label">Tilføj billede</T>
          </>
        )}
      </Pressable>
      <TextField label="Titel" value={title} onChangeText={setTitle} maxLength={120} />
      <View style={s.row}>
        <Part label="Dag" placeholder="DD" value={day} onChange={setDay} max={2} />
        <Part label="Måned" placeholder="MM" value={month} onChange={setMonth} max={2} />
        <Part label="År" placeholder="ÅÅÅÅ" value={year} onChange={setYear} max={4} wide />
      </View>
      <View style={s.row}>
        <Part label="Time" placeholder="TT" value={hh} onChange={setHh} max={2} />
        <Part label="Minut" placeholder="MM" value={mi} onChange={setMi} max={2} />
        <View style={{ flex: 1.4 }} />
      </View>
      {!!when.error && (
        <T v="caption" c={color.danger}>
          {when.error}
        </T>
      )}
      <TextField label="Sted" value={place} onChangeText={setPlace} maxLength={200} />
      <View style={{ gap: 8 }}>
        <T v="label" style={{ paddingLeft: 4 }}>
          Hvem kan se den?
        </T>
        <Segmented
          label="Hvem kan se den?"
          value={privacy}
          onChange={setPrivacy}
          options={[
            { value: 'offentlig', label: 'Offentlig' },
            { value: 'inviterede', label: 'Kun inviterede' },
          ]}
        />
      </View>
      <TextField label="Beskrivelse" multiline value={description} onChangeText={setDescription} maxLength={2000} />
      {!!error && (
        <T v="bodyS" c={color.danger}>
          {error}
        </T>
      )}
      <Button title="Opret begivenhed" block disabled={!ok} loading={busy} onPress={create} />
    </Screen>
  );
}

const s = StyleSheet.create({
  cover: {
    height: 140,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: color.borderDefault,
    borderStyle: 'dashed',
    backgroundColor: color.bgSurface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', gap: 10 },
  part: {
    minHeight: 52,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.borderDefault,
    backgroundColor: color.bgSurface,
    textAlign: 'center',
    fontFamily: font.bodySemi,
    fontSize: 18,
    color: color.textPrimary,
  },
});
