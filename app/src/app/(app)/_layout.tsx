import { Stack } from 'expo-router';
import { View } from 'react-native';
import { CallLayer } from '@/components/CallLayer';
import { usePushRegistration } from '@/lib/push';
import { color } from '@/theme/tokens';

/** Alt bag login. Opret åbner som ark. */
export default function AppLayout() {
  usePushRegistration();
  return (
    <View style={{ flex: 1 }}>
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.bgApp } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="opret" options={{ presentation: 'modal' }} />
      <Stack.Screen name="medie/[id]" options={{ animation: 'fade' }} />
    </Stack>
    {/* Opkald (bliv ringet op hvor som helst i appen) */}
    <CallLayer />
    </View>
  );
}
