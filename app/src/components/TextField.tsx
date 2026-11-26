import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { color, font, radius } from '@/theme/tokens';
import { T } from './T';

type Props = TextInputProps & { label: string; showLabel?: boolean; hint?: string; error?: string; multiline?: boolean };

/** Tekstfelt med synlig label over (som Rediger profil i prototypen) */
export function TextField({ label, showLabel = true, hint, error, multiline, style, ...rest }: Props) {
  return (
    <View style={s.group}>
      {showLabel && (
        <T v="label" style={s.label}>
          {label}
        </T>
      )}
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={color.textSecondary}
        multiline={multiline}
        style={[s.field, multiline && s.multi, style]}
        {...rest}
      />
      {error ? (
        <T v="caption" c={color.danger} style={s.label}>
          {error}
        </T>
      ) : hint ? (
        <T v="caption" c={color.textSecondary} style={s.label}>
          {hint}
        </T>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  group: { gap: 6, alignSelf: 'stretch' },
  label: { paddingLeft: 4 },
  field: {
    minHeight: 52,
    paddingHorizontal: 18,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderDefault,
    backgroundColor: color.bgSurface,
    color: color.textPrimary,
    fontFamily: font.body,
    fontSize: 16,
  },
  multi: { minHeight: 110, borderRadius: 20, paddingTop: 14, paddingBottom: 14, textAlignVertical: 'top' },
});
