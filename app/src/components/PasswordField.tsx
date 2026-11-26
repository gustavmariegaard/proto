import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { color, font, radius, TAP } from '@/theme/tokens';
import { T } from './T';
import { noOutline } from './TextField';

type Props = TextInputProps & { label?: string; hint?: string; error?: string; isNew?: boolean };

/** Adgangskode med "Vis"/"Skjul" */
export function PasswordField({ label = 'Adgangskode', hint, error, isNew, onFocus, onBlur, ...rest }: Props) {
  const [show, setShow] = useState(false);
  const [focus, setFocus] = useState(false);
  return (
    <View style={{ gap: 6, alignSelf: 'stretch' }}>
      <T v="label" style={{ paddingLeft: 4 }}>
        {label}
      </T>
      <View style={[s.wrap, focus && s.focus]}>
        <TextInput
          accessibilityLabel={label}
          secureTextEntry={!show}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete={isNew ? 'new-password' : 'current-password'}
          textContentType={isNew ? 'newPassword' : 'password'}
          placeholderTextColor={color.textSecondary}
          onFocus={(e) => (setFocus(true), onFocus?.(e))}
          onBlur={(e) => (setFocus(false), onBlur?.(e))}
          style={[s.input, noOutline]}
          {...rest}
        />
        <Pressable accessibilityRole="button" accessibilityLabel={show ? 'Skjul adgangskode' : 'Vis adgangskode'} onPress={() => setShow((v) => !v)} style={s.toggle}>
          <T v="captionStrong" c={color.textSecondary}>
            {show ? 'Skjul' : 'Vis'}
          </T>
        </Pressable>
      </View>
      {(error || hint) && (
        <T v="caption" c={error ? color.danger : color.textSecondary} style={{ paddingLeft: 4 }}>
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
