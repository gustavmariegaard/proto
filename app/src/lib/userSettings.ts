import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';

export type UserSettings = { language: string; translate_posts: boolean; translate_messages: boolean; hide_active: boolean };

const defaults: UserSettings = { language: 'da', translate_posts: true, translate_messages: true, hide_active: false };

/** Dine indstillinger fra databasen (sprog, oversættelse). Gemmes med det samme. */
export function useUserSettings(userId: string) {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  useEffect(() => {
    supabase
      .from('user_settings')
      .select('language, translate_posts, translate_messages, hide_active')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => setSettings({ ...defaults, ...(data ?? {}) }));
  }, [userId]);
  const update = useCallback(
    async (patch: Partial<UserSettings>) => {
      setSettings((s) => ({ ...(s ?? defaults), ...patch }));
      await supabase.from('user_settings').upsert({ user_id: userId, ...patch, updated_at: new Date().toISOString() });
    },
    [userId],
  );
  return { settings, update };
}
