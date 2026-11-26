import { useState } from 'react';
import { Linking, Pressable, View } from 'react-native';
import { color, TAP } from '@/theme/tokens';
import { T } from './T';

const LIMIT = 3;
const href = (s: string) => (/^https?:\/\//i.test(s) ? s : `https://${s}`);

/** Kilder under en note. Over 3 foldes resten ind bag "Vis alle kilder". */
export function NoteSources({ sources }: { sources: string[] }) {
  const [all, setAll] = useState(false);
  if (!sources.length) return null;
  const shown = all ? sources : sources.slice(0, LIMIT);
  return (
    <View style={{ gap: 2 }}>
      {shown.map((src, i) => (
        <Pressable key={i} accessibilityRole="link" onPress={() => Linking.openURL(href(src))}>
          <T v="caption" c={color.textSecondary} style={{ textDecorationLine: 'underline' }}>
            {src}
          </T>
        </Pressable>
      ))}
      {sources.length > LIMIT && (
        <Pressable accessibilityRole="button" onPress={() => setAll((v) => !v)} style={{ minHeight: TAP, justifyContent: 'center' }}>
          <T v="captionStrong">{all ? 'Vis færre kilder' : `Vis alle kilder (${sources.length})`}</T>
        </Pressable>
      )}
    </View>
  );
}
