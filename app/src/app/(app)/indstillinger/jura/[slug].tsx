import { Redirect, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { AccScreen } from '@/components/AccountParts';
import { T } from '@/components/T';
import { legalDocs, type LegalKind } from '@/lib/settings';
import { color } from '@/theme/tokens';

/** Privatlivspolitik og Databehandleraftale (prototypens LegalDoc). Rute: /indstillinger/jura/:slug */
export default function LegalDoc() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const doc = legalDocs[slug as LegalKind];
  if (!doc) return <Redirect href="/indstillinger" />;
  return (
    <AccScreen title={doc.title}>
      <View style={s.doc}>
        <T v="caption" c={color.textSecondary}>
          Sidst opdateret 24. november 2026
        </T>
        <T v="body">{doc.intro}</T>
        {doc.sections.map(([heading, text], i) => (
          <View key={heading} style={s.section}>
            <T v="headingS" accessibilityRole="header">
              {i + 1}. {heading}
            </T>
            <T v="bodyS" c={color.textSecondary}>
              {text}
            </T>
          </View>
        ))}
      </View>
    </AccScreen>
  );
}

const s = StyleSheet.create({
  doc: { gap: 16, paddingBottom: 12 },
  section: { gap: 4 },
});
