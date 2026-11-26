import { View } from 'react-native';
import { Screen } from '@/components/Screen';
import { T } from '@/components/T';
import { sections } from '@/lib/privacyText';

/** Kort privatlivserklæring for testfasen */
export default function PublicPrivacy() {
  return (
    <Screen title="Privatliv i testen">
      {sections.map((s) => (
        <View key={s.title} style={{ gap: 6 }}>
          <T v="headingM">{s.title}</T>
          {s.items.map((i) => (
            <T key={i} v="bodyS">
              • {i}
            </T>
          ))}
        </View>
      ))}
    </Screen>
  );
}
