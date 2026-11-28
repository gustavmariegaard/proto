import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useSession } from './session';
import { supabase } from './supabase';
import { useWebPushSync } from './webPush';

/*
 * Push-notifikationer via Expos gratis push-tjeneste.
 * Kræver en rigtig telefon og et EAS-projekt-id (app.json → extra.eas.projectId,
 * sættes af `eas init`). Mangler det, springes push bare over – appen virker stadig.
 */

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
}

function projectId(): string | undefined {
  return Constants.easConfig?.projectId ?? (Constants.expoConfig?.extra as any)?.eas?.projectId;
}

/** Bed om lov og gem telefonens push-token. Returnerer token eller null. */
export async function registerForPush(userId: string): Promise<string | null> {
  try {
    if (Platform.OS === 'web' || !Device.isDevice) return null;
    const id = projectId();
    if (!id) return null;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'ciircle',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
    if (status !== 'granted') return null;
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: id });
    await supabase.from('push_tokens').upsert({ user_id: userId, token, platform: Platform.OS, updated_at: new Date().toISOString() });
    return token;
  } catch {
    // Fx simulator uden push eller ingen netværk: ikke kritisk
    return null;
  }
}

/** Registrér push, når man er logget ind, og åbn det rigtige sted, når man trykker på en notifikation */
export function usePushRegistration() {
  const { session } = useSession();
  const uid = session?.user.id;
  // Browseren: hold push-abonnementet frisk og åbn det rigtige sted ved tryk
  useWebPushSync(uid);

  useEffect(() => {
    if (uid) registerForPush(uid);
  }, [uid]);

  const response = Platform.OS === 'web' ? null : Notifications.useLastNotificationResponse();
  useEffect(() => {
    const url = response?.notification.request.content.data?.url;
    if (typeof url === 'string' && url.startsWith('/')) router.push(url as any);
  }, [response]);
}
