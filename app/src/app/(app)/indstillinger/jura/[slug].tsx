import { Redirect, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { Screen } from '@/components/Screen';
import { T } from '@/components/T';
import { legalDocs, type LegalKind } from '@/lib/settings';
import { color } from '@/theme/tokens';

/** Privatlivspolitik og Databehandleraftale. Rute: /indstillinger/jura/:slug */
export default function LegalDoc() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const doc = legalDocs[slug as LegalKind];
  if (!doc) return <Redirect href="/indstillinger" />;
  return (
    <Screen title={doc.title}>
      <T v="body" c={color.textSecondary}>
        {doc.intro}
      </T>
      {doc.sections.map(([h, text]) => (
        <View key={h} style={{ gap: 4 }}>
          <T v="headingM" accessibilityRole="header">
            {h}
          </T>
          <T v="bodyS">{text}</T>
        </View>
      ))}
    </Screen>
  );
}
