import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { AuthLink, AuthShell, authText } from '@/components/AuthShell';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { PasswordField } from '@/components/PasswordField';
import { T } from '@/components/T';
import { darkField, noOutline, TextField } from '@/components/TextField';
import { supabase } from '@/lib/supabase';
import { cleanUsername, USERNAME } from '@/lib/validate';
import { color, font, radius, TAP } from '@/theme/tokens';

type InputRef = React.ComponentRef<typeof TextInput>;

const MIN_AGE = 13;
const STEPS = 3;

/** Webadressen, linket i bekræftelsesmailen skal føre tilbage til */
const redirectTo = () =>
  Platform.OS === 'web' ? window.location.origin + window.location.pathname.replace(/opret-konto\/?$/, '') : undefined;

/** Dag/måned/år → ISO-dato, eller en fejltekst */
function parseBirthdate(d: string, m: string, y: string): { iso?: string; error?: string } {
  if (!d || !m || y.length < 4) return {};
  const day = Number(d);
  const month = Number(m);
  const year = Number(y);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day || year < 1900) {
    return { error: 'Datoen findes ikke.' };
  }
  const now = new Date();
  let age = now.getFullYear() - year;
  if (now.getMonth() + 1 < month || (now.getMonth() + 1 === month && now.getDate() < day)) age--;
  if (age < 0) return { error: 'Datoen findes ikke.' };
  if (age < MIN_AGE) return { error: `Du skal være mindst ${MIN_AGE} år.` };
  return { iso: `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}` };
}

/** Opret konto i tre trin: hvem du er, fødselsdato, e-mail og adgangskode */
export default function SignUp() {
  const [step, setStep] = useState(1);
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const name = `${first.trim()} ${last.trim()}`.trim();
  const [username, setUsername] = useState('');
  const [taken, setTaken] = useState<boolean | null>(null);
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const monthRef = useRef<InputRef>(null);
  const yearRef = useRef<InputRef>(null);

  const uname = cleanUsername(username);
  const unameValid = USERNAME.test(uname);
  const birth = parseBirthdate(day, month, year);
  const cleanEmail = email.trim().toLowerCase();
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail);

  // Tjek om brugernavnet er ledigt, mens man skriver
  useEffect(() => {
    setTaken(null);
    if (!unameValid) return;
    const t = setTimeout(async () => {
      const { data, error } = await supabase.rpc('username_available', { u: uname });
      // Kan det ikke tjekkes, lader vi databasen afvise et optaget navn ved oprettelsen
      setTaken(error ? false : data === false);
    }, 350);
    return () => clearTimeout(t);
  }, [uname, unameValid]);

  const canNext =
    step === 1 ? first.trim().length > 0 && last.trim().length > 0 && unameValid && taken === false : step === 2 ? !!birth.iso : emailOk && password.length >= 8 && password2 === password && accepted;

  const back = () => (step > 1 ? setStep(step - 1) : router.canGoBack() ? router.back() : router.replace('/'));

  const submit = async () => {
    setBusy(true);
    setError('');
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: { emailRedirectTo: redirectTo(), data: { name, first_name: first.trim(), last_name: last.trim(), username: uname, birthdate: birth.iso } },
    });
    setBusy(false);
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('registered') || msg.includes('exists')) setError('Der findes allerede en konto med den e-mail.');
      else if (msg.includes('database')) {
        setError('Brugernavnet blev taget lige nu. Vælg et andet.');
        setStep(1);
      } else if (error.status === 429) setError('For mange forsøg. Prøv igen om lidt.');
      else setError('Kontoen kunne ikke oprettes. Prøv igen.');
      return;
    }
    // Uden e-mailbekræftelse er man logget ind med det samme, og appen går selv videre
    if (!data.session) setSentTo(cleanEmail);
  };

  if (sentTo) return <CheckMail email={sentTo} />;

  const titles = ['Hvem er du?', 'Hvornår er du født?', 'Din konto.'];

  return (
    <AuthShell
      progress={[step, STEPS]}
      onBack={back}
      kicker={`Trin ${step} af ${STEPS}`}
      title={titles[step - 1]}
      footer={
        <Button
          title={step < STEPS ? 'Fortsæt' : 'Opret konto'}
          variant="accent"
          block
          disabled={!canNext}
          loading={busy}
          onPress={() => (step < STEPS ? (setError(''), setStep(step + 1)) : submit())}
        />
      }
    >
      {step === 1 && (
        <>
          <TextField dark label="Fornavn" autoComplete="given-name" textContentType="givenName" value={first} onChangeText={setFirst} autoFocus />
          <TextField dark label="Efternavn" autoComplete="family-name" textContentType="familyName" value={last} onChangeText={setLast} />
          <View style={{ gap: 6 }}>
            <TextField
              dark
              label="Brugernavn"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username-new"
              value={username}
              onChangeText={(t) => setUsername(t.toLowerCase().replace(/\s/g, ''))}
              error={username && !unameValid ? 'Brug 2–30 tegn: bogstaver, tal, punktum eller understreg.' : taken ? 'Brugernavnet er taget.' : undefined}
            />
            {unameValid && taken === false && (
              <View style={s.ok}>
                <Icon name="check" size={16} color={color.accent} />
                <T v="captionStrong" c={color.accent}>
                  @{uname} er ledigt
                </T>
              </View>
            )}
          </View>
        </>
      )}

      {step === 2 && (
        <>
          <View style={s.dateRow}>
            <DatePart label="Dag" placeholder="DD" value={day} max={2} onChange={(v) => { setDay(v); if (v.length === 2) monthRef.current?.focus(); }} autoFocus />
            <DatePart inputRef={monthRef} label="Måned" placeholder="MM" value={month} max={2} onChange={(v) => { setMonth(v); if (v.length === 2) yearRef.current?.focus(); }} />
            <DatePart inputRef={yearRef} label="År" placeholder="ÅÅÅÅ" value={year} max={4} onChange={setYear} wide />
          </View>
          <T v="caption" c={birth.error ? authText.error : authText.faint}>
            {birth.error ?? 'Vises ikke på din profil.'}
          </T>
        </>
      )}

      {step === 3 && (
        <>
          <TextField dark label="E-mail" autoComplete="email" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} autoFocus />
          <PasswordField dark isNew value={password} onChangeText={setPassword} hint="Mindst 8 tegn" />
          <PasswordField
            dark
            isNew
            typeOnly
            label="Gentag adgangskode"
            value={password2}
            onChangeText={setPassword2}
            error={password2.length >= password.length && password2 && password2 !== password ? 'Adgangskoderne er ikke ens.' : undefined}
          />
          <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: accepted }} onPress={() => setAccepted((v) => !v)} style={s.check}>
            <View style={[s.box, accepted && s.boxOn]}>{accepted && <Icon name="check" size={16} color="#0a0a0a" />}</View>
            <T v="bodyS" c={color.white} style={{ flex: 1 }}>
              Jeg har læst{' '}
              <T v="label" c={color.white} onPress={() => router.push('/privatliv')} style={{ textDecorationLine: 'underline' }}>
                privatlivserklæringen
              </T>
              .
            </T>
          </Pressable>
        </>
      )}

      {!!error && (
        <T v="bodyS" c={authText.error}>
          {error}
        </T>
      )}
    </AuthShell>
  );
}

function DatePart({
  label,
  placeholder,
  value,
  onChange,
  max,
  wide,
  autoFocus,
  inputRef,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  max: number;
  wide?: boolean;
  autoFocus?: boolean;
  inputRef?: React.RefObject<InputRef | null>;
}) {
  const [focus, setFocus] = useState(false);
  return (
    <View style={{ flex: wide ? 1.4 : 1, gap: 6 }}>
      <T v="label" c={color.white} style={{ paddingLeft: 4 }}>
        {label}
      </T>
      <TextInput
        ref={inputRef}
        accessibilityLabel={label}
        placeholder={placeholder}
        placeholderTextColor="rgba(255,255,255,0.3)"
        keyboardType="number-pad"
        maxLength={max}
        value={value}
        autoFocus={autoFocus}
        onChangeText={(t) => onChange(t.replace(/\D/g, ''))}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        style={[s.dateInput, focus && { borderColor: color.accent, borderWidth: 1.5 }, noOutline]}
      />
    </View>
  );
}

/** Efter oprettelse: tjek mailen. "Send igen" med pause på 60 sekunder. */
function CheckMail({ email }: { email: string }) {
  const [wait, setWait] = useState(60);
  const [note, setNote] = useState('');
  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait(wait - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);
  return (
    <AuthShell
      onBack={false}
      title="Tjek din mail."
      footer={
        <>
          <Button
            title={wait > 0 ? `Send igen om ${wait} s` : 'Send mailen igen'}
            variant="outlineLight"
            block
            disabled={wait > 0}
            onPress={async () => {
              const { error } = await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: redirectTo() } });
              setNote(error ? 'Mailen kunne ikke sendes. Prøv igen senere.' : 'Mailen er sendt igen.');
              setWait(60);
            }}
          />
          <AuthLink label="Til log ind" muted onPress={() => router.replace('/log-ind')} />
        </>
      }
    >
      <View style={s.mailIcon}>
        <Icon name="send" size={30} color="#0a0a0a" />
      </View>
      <T v="body" c={authText.muted}>
        Vi har sendt et link til{' '}
        <T v="headingS" c={color.white}>
          {email}
        </T>
        . Tryk på linket for at bekræfte din konto.
      </T>
      {!!note && (
        <T v="caption" c={authText.faint}>
          {note}
        </T>
      )}
    </AuthShell>
  );
}

const s = StyleSheet.create({
  ok: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 4 },
  dateRow: { flexDirection: 'row', gap: 10 },
  dateInput: {
    minHeight: 58,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: darkField.borderColor,
    backgroundColor: darkField.backgroundColor,
    textAlign: 'center',
    fontFamily: font.bodySemi,
    fontSize: 22,
    color: color.white,
  },
  check: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: TAP },
  box: { width: 24, height: 24, borderRadius: 6, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)', alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: color.accent, borderColor: color.accent },
  mailIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: color.accent, alignItems: 'center', justifyContent: 'center' },
});
