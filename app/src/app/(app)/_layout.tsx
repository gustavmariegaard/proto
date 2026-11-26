import { Stack } from 'expo-router';
import { color } from '@/theme/tokens';

/** Alt bag login. Opret åbner som ark. */
export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.bgApp } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="opret" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
