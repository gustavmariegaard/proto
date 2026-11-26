import { View } from 'react-native';
import { AuthShell, authText } from '@/components/AuthShell';
import { T } from '@/components/T';
import { sections } from '@/lib/privacyText';
import { color } from '@/theme/tokens';

/** Privatlivserklæringen for testen, før man er logget ind */
export default function PublicPrivacy() {
  return (
    <AuthShell title="Privatliv i testen">
      {sections.map((s) => (
        <View key={s.title} style={{ gap: 6 }}>
          <T v="headingM" c={color.textPrimary}>
            {s.title}
          </T>
          {s.items.map((i) => (
            <T key={i} v="bodyS" c={authText.muted}>
              • {i}
            </T>
          ))}
        </View>
      ))}
    </AuthShell>
  );
}
