import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AccCard, AccScreen, useDraft } from '@/components/AccountParts';
import { Avatar } from '@/components/Avatar';
import { ToggleList } from '@/components/CreateParts';
import { Icon } from '@/components/Icon';
import { SaveBar, SavedToast } from '@/components/SaveBar';
import { Sheet } from '@/components/Sheet';
import { T } from '@/components/T';
import { TextField } from '@/components/TextField';
import { useMe } from '@/lib/session';
import { languageByCode, sortedLanguages, translationPreview, translationToggles } from '@/lib/settings';
import { useUserSettings } from '@/lib/userSettings';
import { color, font, radius, TAP } from '@/theme/tokens';

const lena = require('../../../../assets/indstillinger/lena.jpg');
const lake = require('../../../../assets/indstillinger/soe.jpg');

/** Sprog og oversættelse (prototypens LanguageSettings) */
export default function LanguageSettings() {
  const me = useMe();
  const { settings, update } = useUserSettings(me.id);
  const d = useDraft({
    language: settings?.language ?? 'da',
    toggles: { 'oversaet-opslag': settings?.translate_posts ?? true, 'oversaet-beskeder': settings?.translate_messages ?? true } as Record<string, boolean>,
  });
  const [picking, setPicking] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [saving, setSaving] = useState(false);
  const chosen = languageByCode(d.draft.language);
  const ex = translationPreview(chosen.code);
  const fromDa = ex.from;

  const save = async () => {
    setSaving(true);
    await update({ language: d.draft.language, translate_posts: !!d.draft.toggles['oversaet-opslag'], translate_messages: !!d.draft.toggles['oversaet-beskeder'] });
    setSaving(false);
    d.saved();
  };

  return (
    <AccScreen
      title="Sprog og oversættelse"
      footer={
        <>
          <SaveBar dirty={d.dirty} saving={saving} onSave={save} onReset={d.reset} />
          <SavedToast show={d.toast} />
        </>
      }
    >
      <T v="headingM" accessibilityRole="header">
        Standardsprog for indhold
      </T>
      <AccCard label={`Standardsprog: ${chosen.native}. Skift`} onPress={() => setPicking(true)}>
        <View style={s.code}>
          <T style={s.codeText}>{chosen.code.toUpperCase()}</T>
        </View>
        <View style={s.text}>
          <T v="headingS">{chosen.native}</T>
          <T v="caption" c={color.textSecondary}>
            Opslag, kommentarer og beskeder vises på {chosen.da.toLowerCase()}
          </T>
        </View>
        <T v="label" style={{ textDecorationLine: 'underline' }}>
          Skift
        </T>
      </AccCard>

      <ToggleList
        rows={translationToggles}
        values={d.draft.toggles}
        onToggle={(id) => d.patch({ toggles: { ...d.draft.toggles, [id]: !d.draft.toggles[id] } })}
      />

      <T v="headingS" c={color.textSecondary} accessibilityRole="header">
        Sådan ser et oversat opslag ud
      </T>
      <View style={s.post}>
        <View style={s.head}>
          {ex.name === 'Lena Hoffmann' ? <Image source={lena} style={s.avatar} accessible={false} /> : <Avatar name={ex.name} size="S" />}
          <View style={s.who}>
            <T v="headingS">{ex.name}</T>
            <T v="caption" c={color.textSecondary}>
              {ex.meta}
            </T>
          </View>
        </View>
        <T v="body">{showOriginal || !ex.translated ? ex.original : ex.translated}</T>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: showOriginal }}
          onPress={() => setShowOriginal((v) => !v)}
          style={s.toggle}
        >
          <Icon name="chat" size={14} color={color.textSecondary} />
          <T v="caption" c={color.textSecondary}>
            {showOriginal ? `Vist på ${fromDa} · ` : `Oversat fra ${fromDa} · `}
            <T v="captionStrong">{showOriginal ? 'Se oversættelse' : 'Se original'}</T>
          </T>
        </Pressable>
        <Image source={lake} style={s.img} contentFit="cover" accessible={false} />
      </View>

      <LanguagePicker
        open={picking}
        value={d.draft.language}
        onClose={() => setPicking(false)}
        onPick={(code) => {
          d.patch({ language: code });
          setPicking(false);
        }}
      />
    </AccScreen>
  );
}

/** Søgbar liste over Europas sprog */
function LanguagePicker({ open, value, onClose, onPick }: { open: boolean; value: string; onClose: () => void; onPick: (code: string) => void }) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const list = q ? sortedLanguages.filter((l) => l.native.toLowerCase().includes(q) || l.da.toLowerCase().includes(q)) : sortedLanguages;
  const close = () => {
    setQuery('');
    onClose();
  };
  return (
    <Sheet open={open} onClose={close} title="Standardsprog for indhold" dim initialSize="full">
      <View style={s.search}>
        <TextField label="Søg efter sprog" showLabel={false} autoCapitalize="none" autoCorrect={false} spellCheck={false} value={query} onChangeText={setQuery} />
      </View>
      <View style={s.list} accessibilityRole="list" accessibilityLabel="Sprog">
        {list.map((l) => {
          const selected = l.code === value;
          return (
            <Pressable
              key={l.code}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              onPress={() => {
                setQuery('');
                onPick(l.code);
              }}
              style={[s.row, selected && { backgroundColor: color.bgSubtle }]}
            >
              <View style={s.text}>
                <T v="headingS">{l.native}</T>
                {l.native !== l.da && (
                  <T v="caption" c={color.textSecondary}>
                    {l.da}
                  </T>
                )}
              </View>
              {selected && <Icon name="check" size={20} />}
            </Pressable>
          );
        })}
        {list.length === 0 && (
          <T v="bodyS" c={color.textSecondary} style={{ padding: 16, paddingHorizontal: 12 }}>
            Intet sprog matcher “{query}”.
          </T>
        )}
      </View>
    </Sheet>
  );
}

const s = StyleSheet.create({
  code: { width: 40, height: 40, borderRadius: 12, backgroundColor: color.bgSubtle, alignItems: 'center', justifyContent: 'center' },
  codeText: { fontFamily: font.bodyBold, fontSize: 13, lineHeight: 13, letterSpacing: 0.26 },
  text: { flex: 1, minWidth: 0, alignItems: 'flex-start', gap: 2 },
  post: { gap: 8, padding: 14, borderWidth: 1, borderColor: color.borderDefault, borderRadius: radius.xl, backgroundColor: color.bgSurface },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  who: { minWidth: 0, gap: 1 },
  toggle: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, minHeight: TAP, marginTop: -12, marginBottom: -8 },
  img: { width: '100%', height: 150, borderRadius: radius.md, backgroundColor: color.bgSubtle },
  search: { paddingTop: 12, paddingHorizontal: 20, paddingBottom: 8, backgroundColor: color.bgSurface },
  list: { paddingHorizontal: 8, paddingBottom: 24 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 8, paddingHorizontal: 12, borderRadius: radius.lg },
});
