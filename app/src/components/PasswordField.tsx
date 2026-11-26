import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { color, font, radius, TAP } from '@/theme/tokens';
import { T } from './T';
import { darkField, darkFocus, noOutline } from './TextField';

type Props = TextInputProps & {
  label?: string;
  hint?: string;
  error?: string;
  isNew?: boolean;
  dark?: boolean;
  /** Bekræftelsesfelt: må ikke udfyldes ved at indsætte, trække tekst ind eller autoudfylde */
  typeOnly?: boolean;
};

/** Adgangskode med "Vis"/"Skjul" */
export function PasswordField({ label = 'Adgangskode', hint, error, isNew, dark, typeOnly, onFocus, onBlur, ...rest }: Props) {
  const [show, setShow] = useState(false);
  const [focus, setFocus] = useState(false);
  const ref = useRef<React.ComponentRef<typeof TextInput>>(null);

  // Web: bloker indsæt og træk-og-slip i bekræftelsesfeltet
  useEffect(() => {
    if (!typeOnly || Platform.OS !== 'web') return;
    const el = ref.current as unknown as HTMLElement | null;
    if (!el?.addEventListener) return;
    const stop = (e: Event) => e.preventDefault();
    el.addEventListener('paste', stop);
    el.addEventListener('drop', stop);
    return () => {
      el.removeEventListener('paste', stop);
      el.removeEventListener('drop', stop);
    };
  }, [typeOnly]);
  return (
    <View style={{ gap: 6, alignSelf: 'stretch' }}>
      <T v="label" c={dark ? color.white : color.textPrimary} style={{ paddingLeft: 4 }}>
        {label}
      </T>
      <View style={[s.wrap, dark && { backgroundColor: darkField.backgroundColor, borderColor: darkField.borderColor }, focus && (dark ? darkFocus : s.focus)]}>
        <TextInput
          accessibilityLabel={label}
          secureTextEntry={!show}
          autoCapitalize="none"
          autoCorrect={false}
          ref={ref}
          autoComplete={typeOnly ? 'off' : isNew ? 'new-password' : 'current-password'}
          textContentType={typeOnly ? 'none' : isNew ? 'newPassword' : 'password'}
          // Telefon: ingen "Indsæt"-menu i bekræftelsesfeltet
          contextMenuHidden={typeOnly}
          placeholderTextColor={dark ? 'rgba(255,255,255,0.4)' : color.textSecondary}
          onFocus={(e) => (setFocus(true), onFocus?.(e))}
          onBlur={(e) => (setFocus(false), onBlur?.(e))}
          style={[s.input, dark && { color: color.white }, noOutline]}
          {...rest}
        />
        <Pressable accessibilityRole="button" accessibilityLabel={show ? 'Skjul adgangskode' : 'Vis adgangskode'} onPress={() => setShow((v) => !v)} style={s.toggle}>
          <T v="captionStrong" c={dark ? 'rgba(255,255,255,0.6)' : color.textSecondary}>
            {show ? 'Skjul' : 'Vis'}
          </T>
        </Pressable>
      </View>
      {(error || hint) && (
        <T v="caption" c={error ? (dark ? '#ff8a7a' : color.danger) : dark ? 'rgba(255,255,255,0.55)' : color.textSecondary} style={{ paddingLeft: 4 }}>
          {error || hint}
        </T>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderDefault,
    backgroundColor: color.bgSurface,
    paddingLeft: 18,
  },
  focus: { borderColor: color.textPrimary, borderWidth: 1.5 },
  input: { flex: 1, minHeight: 50, color: color.textPrimary, fontFamily: font.body, fontSize: 16 },
  toggle: { minWidth: TAP, minHeight: TAP, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
});
