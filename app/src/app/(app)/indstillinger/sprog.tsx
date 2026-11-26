import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { Sheet } from '@/components/Sheet';
import { T } from '@/components/T';
import { TextField } from '@/components/TextField';
import { Toggle } from '@/components/Toggle';
import { useMe } from '@/lib/session';
import { languageByCode, sortedLanguages, translationPreview, translationToggles } from '@/lib/settings';
import { useUserSettings } from '@/lib/userSettings';
import { color, radius, TAP } from '@/theme/tokens';

/** Sprog og oversættelse: standardsprog (alle europæiske sprog) og automatisk oversættelse */
export default function LanguageSettings() {
  const me = useMe();
  const { settings, update } = useUserSettings(me.id);
  const [picking, setPicking] = useState(false);
  const [query, setQuery] = useState('');
  const [original, setOriginal] = useState(false);
  if (!settings) return <Screen title="Sprog og oversættelse">{null}</Screen>;
  const chosen = languageByCode(settings.language);
  const q = query.trim().toLowerCase();
  const list = q ? sortedLanguages.filter((l) => l.da.toLowerCase().includes(q) || l.native.toLowerCase().includes(q)) : sortedLanguages;
  const ex = translationPreview(chosen.code);
  const translated = settings.translate_posts && !original && !!ex.translated;

  return (
    <Screen title="Sprog og oversættelse">
      <T v="headingM">Standardsprog for indhold</T>
      <Pressable accessibilityRole="button" accessibilityLabel={`Standardsprog: ${chosen.da}. Skift`} onPress={() => setPicking(true)} style={({ pressed }) => [s.card, pressed && { opacity: 0.7 }]}>
        <View style={s.code}>
          <T v="micro">{chosen.code.toUpperCase()}</T>
        </View>
        <View style={{ flex: 1 }}>
          <T v="headingS">{chosen.native}</T>
          <T v="caption" c={color.textSecondary}>
            Opslag, kommentarer og beskeder vises på {chosen.da.toLowerCase()}
          </T>
        </View>
        <T v="label" style={{ textDecorationLine: 'underline' }}>
          Skift
        </T>
      </Pressable>

      <Toggle title={translationToggles[0].title} hint={translationToggles[0].hint} value={settings.translate_posts} onChange={(v) => update({ translate_posts: v })} />
      <Toggle title={translationToggles[1].title} hint={translationToggles[1].hint} value={settings.translate_messages} onChange={(v) => update({ translate_messages: v })} />

      {/* Forhåndsvisning: sådan ser et oversat opslag ud */}
      <T v="headingM">Sådan ser det ud</T>
      <View style={s.preview}>
        <View style={s.previewHead}>
          <Avatar name={ex.name} />
          <View style={{ flex: 1 }}>
            <T v="headingS">{ex.name}</T>
            <T v="caption" c={color.textSecondary}>
              {ex.meta}
            </T>
          </View>
        </View>
        <T v="body">{translated ? ex.translated : ex.original}</T>
        {settings.translate_posts && ex.translated ? (
          <Pressable accessibilityRole="button" onPress={() => setOriginal((v) => !v)} style={s.toggleLink}>
            <Icon name="globe" size={16} color={color.textSecondary} />
            <T v="captionStrong" c={color.textSecondary}>
              {original ? `Vis på ${chosen.da.toLowerCase()}` : `Oversat fra ${ex.from} · Vis original`}
            </T>
          </Pressable>
        ) : (
          <T v="caption" c={color.textSecondary}>
            {settings.translate_posts ? `Oversættes til ${chosen.da.toLowerCase()}` : 'Automatisk oversættelse er slået fra'}
          </T>
        )}
      </View>

      <Sheet open={picking} onClose={() => setPicking(false)} title="Standardsprog">
        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          <TextField label="Søg efter sprog" showLabel={false} placeholder="Søg efter sprog" value={query} onChangeText={setQuery} autoCorrect={false} />
        </View>
        <FlatList
          style={{ maxHeight: 420 }}
          data={list}
          keyExtractor={(l) => l.code}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const on = item.code === settings.language;
            return (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                onPress={() => {
                  update({ language: item.code });
                  setPicking(false);
                  setQuery('');
                }}
                style={({ pressed }) => [s.lang, pressed && { backgroundColor: color.bgSubtle }]}
              >
                <View style={{ flex: 1 }}>
                  <T v="headingS">{item.native}</T>
                  <T v="caption" c={color.textSecondary}>
                    {item.da}
                  </T>
                </View>
                {on && <Icon name="check" size={20} />}
              </Pressable>
            );
          }}
        />
      </Sheet>
    </Screen>
  );
}

const s = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.borderDefault,
    backgroundColor: color.bgSurface,
  },
  code: { width: 40, height: 40, borderRadius: 20, backgroundColor: color.bgSubtle, alignItems: 'center', justifyContent: 'center' },
  preview: { gap: 10, padding: 16, borderRadius: radius.xl, borderWidth: 1, borderColor: color.borderDefault, backgroundColor: color.bgSurface },
  previewHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  toggleLink: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: TAP, alignSelf: 'flex-start' },
  lang: { flexDirection: 'row', alignItems: 'center', minHeight: TAP + 12, paddingHorizontal: 20 },
});
