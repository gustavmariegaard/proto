import { useState } from 'react';
import { Platform, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { color, font, radius } from '@/theme/tokens';
import { T } from './T';

type Props = TextInputProps & { label: string; showLabel?: boolean; hint?: string; error?: string; multiline?: boolean; dark?: boolean };

/** Tekstfelt med synlig label over (som Rediger profil i prototypen) */
export function TextField({ label, showLabel = true, hint, error, multiline, dark, style, onFocus, onBlur, ...rest }: Props) {
  const [focus, setFocus] = useState(false);
  return (
    <View style={s.group}>
      {showLabel && (
        <T v="label" c={color.textPrimary} style={s.label}>
          {label}
        </T>
      )}
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={color.textSecondary}
        multiline={multiline}
        onFocus={(e) => (setFocus(true), onFocus?.(e))}
        onBlur={(e) => (setFocus(false), onBlur?.(e))}
        style={[s.field, multiline && s.multi, dark && darkField, focus && (dark ? darkFocus : s.focus), noOutline, style]}
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

/** Browserens egen fokusramme passer ikke til de runde felter; vi viser en mørk kant i stedet */
export const noOutline = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null;

/** Felter på login-skærmene: hvide med grøn kant ved fokus */
export const darkField = { backgroundColor: color.bgSurface, borderColor: color.borderDefault, color: color.textPrimary };
export const darkFocus = { borderColor: color.accent, borderWidth: 1.5 };

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
  focus: { borderColor: color.textPrimary, borderWidth: 1.5 },
  multi: { minHeight: 110, borderRadius: 20, paddingTop: 14, paddingBottom: 14, textAlignVertical: 'top' },
});
