import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { color } from '@/theme/tokens';
import { IconButton } from './IconButton';
import { T } from './T';

type Props = {
  title?: string;
  /** Tilbage-knap (standard: ja, hvis title er sat) */
  back?: boolean;
  /** Til højre i toppen */
  right?: ReactNode;
  children: ReactNode;
  /** false = børnene styrer selv scroll (fx FlatList) */
  scroll?: boolean;
  contentStyle?: ViewStyle;
  /** Tabs har ingen bundmargen (fanebjælken ligger ovenpå) */
  edges?: ('top' | 'bottom')[];
  footer?: ReactNode;
};

/** Fælles skærmramme: sikker afstand til notch, baggrund og evt. topbjælke med titel */
export function Screen({ title, back = !!title, right, children, scroll = true, contentStyle, edges = ['top', 'bottom'], footer }: Props) {
  return (
    <SafeAreaView style={s.root} edges={edges}>
      {(title || right) && (
        <View style={s.header}>
          {back && (
            <IconButton
              icon="chevron-left"
              label="Tilbage"
              outline
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            />
          )}
          {title && (
            <T v="titleL" style={s.title} numberOfLines={1} accessibilityRole="header">
              {title}
            </T>
          )}
          <View style={s.right}>{right}</View>
        </View>
      )}
      {scroll ? (
        <ScrollView contentContainerStyle={[s.content, contentStyle]} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, contentStyle]}>{children}</View>
      )}
      {footer}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bgApp },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  title: { flex: 1 },
  right: { flexDirection: 'row', alignItems: 'center', marginLeft: 'auto' },
  content: { padding: 20, paddingTop: 8, gap: 16, paddingBottom: 40 },
});
