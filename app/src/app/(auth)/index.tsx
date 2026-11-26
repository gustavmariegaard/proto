import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { T } from '@/components/T';
import { color } from '@/theme/tokens';

/** Velkomst */
export default function Welcome() {
  return (
    <SafeAreaView style={s.root}>
      <View style={s.center}>
        <T v="titleXl" style={s.logo} accessibilityRole="header">
          ciircle
        </T>
        <T v="body" c={color.textSecondary} style={{ textAlign: 'center' }}>
          Dit netværk. Dine mennesker.
        </T>
      </View>
      <Button title="Kom i gang" block onPress={() => router.push('/log-ind')} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, padding: 24, backgroundColor: color.bgApp },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  logo: { fontSize: 48, lineHeight: 56 },
});
