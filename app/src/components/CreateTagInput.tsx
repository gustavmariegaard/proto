import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { allTopics } from '@/lib/topics';
import { color, radius } from '@/theme/tokens';
import { Icon } from './Icon';
import { T } from './T';
import { TextField } from './TextField';

const MAX_TAGS = 5;
const trending = ['Cykelstier', 'Julemarked', 'Skolevalg', 'Klima', 'Sport'];

type Props = {
  tags: string[];
  onTags: (t: string[]) => void;
  error?: boolean;
  /** Mindst ét tag (Offentlig debat) */
  required?: boolean;
  hint?: string;
  /** Oprettelses-flowets udtryk (som oprettelsen af en konto): lyse felter og grønne valgte tags */
  flow?: boolean;
};

/** Tags på opslag (prototypens TagInput): skriv selv, eller vælg blandt forslag. Højst fem. */
export function CreateTagInput({ tags, onTags, error = false, required = false, hint, flow = false }: Props) {
  const [text, setText] = useState('');
  const q = text.trim().replace(/^#/, '');
  const known = [...new Set([...trending, ...allTopics])];
  const suggestions = (q ? known.filter((t) => t.toLowerCase().includes(q.toLowerCase())) : known.slice(0, 8)).filter((t) => !tags.includes(t)).slice(0, 8);
  const full = tags.length >= MAX_TAGS;

  const add = (raw: string) => {
    const t = raw.trim().replace(/^#/, '');
    if (!t || full) return;
    const nice = (t.charAt(0).toUpperCase() + t.slice(1)).slice(0, 40);
    const existing = known.find((k) => k.toLowerCase() === nice.toLowerCase()) ?? nice;
    if (!tags.includes(existing)) onTags([...tags, existing]);
    setText('');
  };

  return (
    <View style={s.tags}>
      <T v={flow ? 'label' : 'headingS'} c={flow ? color.textSecondary : undefined} accessibilityRole="header">
        Tags{' '}
        {!required && (
          <T v="caption" c={color.textSecondary}>
            (valgfrit)
          </T>
        )}
      </T>
      <T v="caption" c={error ? color.danger : color.textSecondary} accessibilityLiveRegion="polite">
        {error
          ? 'Tilføj mindst ét tag, så andre kan finde opslaget.'
          : (hint ?? (required ? `Højst ${MAX_TAGS} tags pr. opslag` : `Gør opslaget lettere at finde, fx #Bagning eller #Håndbold. Højst ${MAX_TAGS}.`))}
      </T>
      {tags.length > 0 && (
        <View style={s.wrap}>
          {tags.map((t, i) => (
            <TagChip key={t} selected flow={flow} label={`Fjern tagget ${t}`} onPress={() => onTags(tags.filter((x) => x !== t))} icon="close">
              {`#${t}`}
              {i === 0 && required && (
                <View style={s.main}>
                  <T v="micro" c={color.ink900}>
                    emne
                  </T>
                </View>
              )}
            </TagChip>
          ))}
        </View>
      )}
      {!full && (
        <TextField
          label="Skriv et tag"
          showLabel={false}
          dark={flow}
          placeholder="Skriv et tag, fx Cykelstier"
          value={text}
          autoCapitalize="sentences"
          returnKeyType="done"
          blurOnSubmit={false}
          onChangeText={(v) => (v.endsWith(',') ? add(v.slice(0, -1)) : setText(v))}
          onSubmitEditing={() => add(text)}
        />
      )}
      {!full && suggestions.length > 0 && (
        <View style={s.wrap} accessibilityLabel="Forslag">
          {!!q && !known.some((k) => k.toLowerCase() === q.toLowerCase()) && (
            <TagChip flow={flow} onPress={() => add(q)} icon="plus">
              {`Nyt tag: #${q}`}
            </TagChip>
          )}
          {suggestions.map((t) => (
            <TagChip key={t} flow={flow} onPress={() => add(t)} icon="plus">
              {`#${t}`}
            </TagChip>
          ))}
        </View>
      )}
    </View>
  );
}

/** Chip med tekst, evt. "emne"-mærke og et ikon til sidst (.chip.create__tag: 0 12 0 14, gap 6) */
function TagChip({ children, selected, onPress, icon, label, flow }: { children: React.ReactNode; selected?: boolean; onPress: () => void; icon: 'close' | 'plus'; label?: string; flow?: boolean }) {
  const fg = selected && !flow ? color.textOnAction : color.textPrimary;
  const [text, ...rest] = Array.isArray(children) ? children : [children];
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={[s.chip, flow && s.flowChip, selected && (flow ? s.flowOn : s.on)]}>
      <T v="label" c={fg} numberOfLines={1}>
        {text}
      </T>
      {rest}
      <Icon name={icon} size={16} color={fg} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  tags: { gap: 10, alignSelf: 'stretch' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: 44,
    paddingLeft: 14,
    paddingRight: 12,
    gap: 6,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.bgSurface,
  },
  on: { backgroundColor: color.actionPrimary, borderColor: color.actionPrimary },
  flowChip: { minHeight: 40, borderColor: color.borderDefault },
  flowOn: { backgroundColor: color.accentVerifiedBg, borderColor: color.accent },
  main: { paddingVertical: 1, paddingHorizontal: 6, borderRadius: radius.pill, backgroundColor: color.accentHighlight },
});
