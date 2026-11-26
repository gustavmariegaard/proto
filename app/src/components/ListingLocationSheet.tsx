import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { cities, deviceLocation, type MyLocation } from '@/lib/market';
import { color, TAP } from '@/theme/tokens';
import { Button } from './Button';
import { Icon } from './Icon';
import { Sheet } from './Sheet';
import { T } from './T';
import { TextField } from './TextField';

/** Hvor er du? Brug telefonens placering (afrundet) eller vælg en by */
export function ListingLocationSheet({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (loc: MyLocation) => void }) {
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const list = useMemo(() => cities.filter((c) => c.name.toLowerCase().includes(q.trim().toLowerCase())), [q]);

  const useDevice = async () => {
    setBusy(true);
    setError('');
    try {
      const loc = await deviceLocation();
      if (loc) {
        onPick(loc);
        onClose();
      } else setError('Placering er slået fra. Vælg en by i stedet.');
    } catch {
      setError('Placeringen kunne ikke findes. Vælg en by i stedet.');
    }
    setBusy(false);
  };

  return (
    <Sheet open={open} onClose={onClose} title="Hvor er du?">
      <View style={s.body}>
        <Button title="Brug min placering" icon="pin" block loading={busy} onPress={useDevice} />
        {!!error && (
          <T v="caption" c={color.danger}>
            {error}
          </T>
        )}
        <TextField label="Søg efter by" showLabel={false} placeholder="Eller vælg en by" value={q} onChangeText={setQ} />
        <FlatList
          data={list}
          keyExtractor={(c) => c.name}
          style={{ maxHeight: 280 }}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                onPick({ lat: item.lat, lng: item.lng, city: item.name });
                onClose();
              }}
              style={({ pressed }) => [s.row, pressed && { backgroundColor: color.bgSubtle }]}
            >
              <Icon name="pin" size={18} color={color.textSecondary} />
              <T v="body">{item.name}</T>
            </Pressable>
          )}
        />
      </View>
    </Sheet>
  );
}

const s = StyleSheet.create({
  body: { padding: 20, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: TAP, paddingHorizontal: 8, borderRadius: 10 },
});
