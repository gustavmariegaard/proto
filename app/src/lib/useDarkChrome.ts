import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Platform } from 'react-native';
import { color } from '@/theme/tokens';

/** Baggrund på login-skærmene: samme lyse grå som resten af appen */
export const INK = '#fafaf9';

/** Mobilbrowserens top og bund følger login-skærmenes baggrund (kun web) */
export function useDarkChrome() {
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'web') return;
      const meta =
        document.querySelector('meta[name="theme-color"]') ??
        Object.assign(document.head.appendChild(document.createElement('meta')), { name: 'theme-color' });
      const prev = { meta: meta.getAttribute('content'), html: document.documentElement.style.backgroundColor, body: document.body.style.backgroundColor };
      meta.setAttribute('content', INK);
      document.documentElement.style.backgroundColor = INK;
      document.body.style.backgroundColor = INK;
      return () => {
        meta.setAttribute('content', prev.meta ?? color.bgApp);
        document.documentElement.style.backgroundColor = prev.html;
        document.body.style.backgroundColor = prev.body;
      };
    }, []),
  );
}
