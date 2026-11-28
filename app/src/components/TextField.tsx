import { useState } from 'react';
import { Platform, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { color, font, radius } from '@/theme/tokens';
import { T } from './T';

type Props = TextInputProps & { label: string; showLabel?: boolean; hint?: string; error?: string; multiline?: boolean; dark?: boolean };

/**
 * Tekstfelt i pilleform, 44 px højt (prototypens TextField: .field).
 * showLabel = synlig label over feltet; uden den er pladsholderen = label.
 * dark = felterne på log ind-skærmene (uændrede).
 */
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
        placeholder={rest.placeholder ?? (showLabel ? undefined : label)}
        multiline={multiline}
        onFocus={(e) => (setFocus(true), onFocus?.(e))}
        onBlur={(e) => (setFocus(false), onBlur?.(e))}
        style={[dark ? s.authField : s.field, multiline && (dark ? s.authMulti : s.multi), dark && darkField, focus && (dark ? darkFocus : s.focus), noOutline, style]}
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
// iPhone/Safari tegner ellers sin egen skygge øverst i feltet (ser ud, som om hjørnet bliver skåret af)
export const noOutline =
  Platform.OS === 'web' ? ({ outlineStyle: 'none', WebkitAppearance: 'none', appearance: 'none', backgroundClip: 'padding-box', boxShadow: 'none' } as object) : null;

/** Felter på login-skærmene: hvide med grøn kant ved fokus */
export const darkField = { backgroundColor: color.bgSurface, borderColor: color.borderDefault, color: color.textPrimary };
export const darkFocus = { borderColor: color.accent, borderWidth: 2, paddingHorizontal: 17 };

const s = StyleSheet.create({
  group: { gap: 6, alignSelf: 'stretch' },
  label: { paddingLeft: 4 },
  field: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.bgSurface,
    color: color.textPrimary,
    fontFamily: font.body,
    // 16 px på telefoner (ellers zoomer iPhone ind), som prototypen på touch-skærme
    fontSize: 16,
  },
  /* Fokus: mørk kant + 1 px ring indenfor (box-shadow 0 0 0 1px) */
  focus: { borderColor: color.textPrimary, borderWidth: 2, paddingHorizontal: 15 },
  multi: { minHeight: 110, borderRadius: 20, paddingTop: 12, paddingBottom: 12, textAlignVertical: 'top' },
  authField: {
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
  authMulti: { minHeight: 110, borderRadius: 20, paddingTop: 14, paddingBottom: 14, textAlignVertical: 'top' },
});
