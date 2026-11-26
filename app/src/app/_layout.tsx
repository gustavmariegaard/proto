import { BricolageGrotesque_700Bold } from '@expo-google-fonts/bricolage-grotesque';
import { Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold, Figtree_700Bold, useFonts } from '@expo-google-fonts/figtree';
import { router, Stack } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SessionProvider, useSession } from '@/lib/session';
import { color } from '@/theme/tokens';

/** Hele appen: fonte, login og hvilke skærme man må se */
export default function RootLayout() {
  const [fontsLoaded] = useFonts({ BricolageGrotesque_700Bold, Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold, Figtree_700Bold });
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <StatusBar style="dark" />
        {fontsLoaded ? <Gate /> : <Loading />}
      </SessionProvider>
    </SafeAreaProvider>
  );
}

function Loading() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: color.bgApp }}>
      <ActivityIndicator color={color.textPrimary} />
    </View>
  );
}

/** Ikke logget ind → velkomst. Logget ind uden profil → opret profil. Ellers appen. */
function Gate() {
  const { session, profile } = useSession();
  // Web på GitHub Pages: en genindlæst underside sendes hertil som #!/sti (se 404.html)
  useEffect(() => {
    if (Platform.OS !== 'web' || !session || !profile) return;
    const h = window.location.hash;
    if (h.startsWith('#!/')) {
      window.history.replaceState(null, '', window.location.pathname);
      router.replace(h.slice(2) as never);
    }
  }, [session, profile]);
  if (session === undefined || (session && profile === undefined)) return <Loading />;
  const loggedIn = !!session;
  const hasProfile = !!profile;
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.bgApp } }}>
      <Stack.Protected guard={!loggedIn}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={loggedIn && !hasProfile}>
        <Stack.Screen name="opret-profil" />
      </Stack.Protected>
      <Stack.Protected guard={loggedIn && hasProfile}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
    </Stack>
  );
}
