import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AccScreen } from '@/components/AccountParts';
import { Button } from '@/components/Button';
import { ToggleList } from '@/components/CreateParts';
import { MintTile } from '@/components/CreateFlow';
import { Icon, type IconName } from '@/components/Icon';
import { T } from '@/components/T';
import { useMe } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { usePush } from '@/lib/webPush';
import { color, radius } from '@/theme/tokens';

/** Hvad man kan få push om (gemmes i user_settings.push_prefs; tom = alt slået til) */
const kinds = [
  { id: 'beskeder', title: 'Beskeder', hint: 'Når nogen skriver til dig eller en af dine cirkler.' },
  { id: 'opkald', title: 'Opkald', hint: 'Når nogen ringer til dig.' },
  { id: 'kommentarer', title: 'Kommentarer', hint: 'Når nogen kommenterer dine opslag.' },
  { id: 'likes', title: 'Synes godt om', hint: 'Når nogen giver et hjerte til dine opslag.' },
  { id: 'foelgere', title: 'Nye følgere', hint: 'Når nogen følger dig eller vil følge dig.' },
  { id: 'tags', title: 'Tags', hint: 'Når nogen nævner dig med @.' },
  { id: 'andet', title: 'Grupper, begivenheder og noter', hint: 'Anmodninger, invitationer og kontekst på dine opslag.' },
];

/** Indstillinger → Notifikationer: slå push til på denne enhed, og vælg hvad man vil have besked om */
export default function NotificationSettings() {
  const me = useMe();
  const push = usePush(me.id);
  const [prefs, setPrefs] = useState<Record<string, boolean> | null>(null);

  useEffect(() => {
    supabase
      .from('user_settings')
      .select('push_prefs')
      .eq('user_id', me.id)
      .maybeSingle()
      .then(({ data }) => setPrefs((data?.push_prefs as Record<string, boolean>) ?? {}));
  }, [me.id]);

  const values = Object.fromEntries(kinds.map((k) => [k.id, prefs?.[k.id] !== false]));
  const toggle = async (id: string) => {
    const next = { ...(prefs ?? {}), [id]: !values[id] };
    setPrefs(next);
    await supabase.from('user_settings').upsert({ user_id: me.id, push_prefs: next, updated_at: new Date().toISOString() });
  };

  return (
    <AccScreen title="Notifikationer">
      <DeviceCard push={push} />

      <T v="headingM" accessibilityRole="header" style={{ marginTop: 8 }}>
        Giv mig besked om
      </T>
      <View style={{ opacity: push.state === 'on' ? 1 : 0.55 }}>
        <ToggleList rows={kinds} values={values} onToggle={toggle} />
      </View>
      <T v="caption" c={color.textSecondary}>
        Du kan altid se alt under klokken i appen, også det du ikke får push om.
      </T>
    </AccScreen>
  );
}

function DeviceCard({ push }: { push: ReturnType<typeof usePush> }) {
  const { state, busy, error, enable, disable } = push;
  if (state === null) return <View style={[s.card, { minHeight: 120 }]} />;

  if (state === 'on') {
    return (
      <View style={s.card}>
        <View style={s.head}>
          <MintTile icon="bell" size={48} />
          <View style={s.text}>
            <T v="headingS">Slået til på denne enhed</T>
            <T v="caption" c={color.textSecondary}>
              Du får besked, også når appen er lukket.
            </T>
          </View>
        </View>
        <Button variant="secondary" block loading={busy} onPress={disable}>
          Slå fra på denne enhed
        </Button>
      </View>
    );
  }

  if (state === 'needs-install') {
    return (
      <View style={s.card}>
        <View style={s.head}>
          <MintTile icon="bell" size={48} />
          <View style={s.text}>
            <T v="headingS">Læg ciircle på hjemmeskærmen</T>
            <T v="caption" c={color.textSecondary}>
              På iPhone kan du kun få notifikationer, når appen er lagt på hjemmeskærmen.
            </T>
          </View>
        </View>
        <View style={s.steps}>
          <Step n={1} icon="send">
            Tryk på Del-knappen nederst i Safari
          </Step>
          <Step n={2} icon="plus">
            Vælg “Føj til hjemmeskærm”
          </Step>
          <Step n={3} icon="bell">
            Åbn ciircle fra hjemmeskærmen, og slå notifikationer til her
          </Step>
        </View>
      </View>
    );
  }

  if (state === 'denied') {
    return (
      <View style={s.card}>
        <View style={s.head}>
          <MintTile icon="bell" size={48} tone="danger" />
          <View style={s.text}>
            <T v="headingS">Notifikationer er blokeret</T>
            <T v="caption" c={color.textSecondary}>
              Du har sagt nej til notifikationer. Slå dem til igen i telefonens indstillinger under ciircle (eller browserens indstillinger for siden).
            </T>
          </View>
        </View>
      </View>
    );
  }

  if (state === 'unsupported') {
    return (
      <View style={s.card}>
        <View style={s.head}>
          <MintTile icon="bell" size={48} />
          <View style={s.text}>
            <T v="headingS">Ikke muligt i denne browser</T>
            <T v="caption" c={color.textSecondary}>
              Prøv Safari på iPhone (lagt på hjemmeskærmen), eller Chrome, Edge eller Firefox.
            </T>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={s.card}>
      <View style={s.head}>
        <MintTile icon="bell" size={48} />
        <View style={s.text}>
          <T v="headingS">Få besked, når der sker noget</T>
          <T v="caption" c={color.textSecondary}>
            Beskeder, opkald, kommentarer og nye følgere, også når appen er lukket.
          </T>
        </View>
      </View>
      {!!error && (
        <T v="bodyS" c={color.danger} accessibilityLiveRegion="polite">
          {error}
        </T>
      )}
      <Button variant="accent" block loading={busy} onPress={enable}>
        Slå notifikationer til
      </Button>
    </View>
  );
}

function Step({ n, icon, children }: { n: number; icon: IconName; children: string }) {
  return (
    <View style={s.step}>
      <View style={s.num}>
        <T v="captionStrong">{n}</T>
      </View>
      <T v="bodyS" style={{ flex: 1 }}>
        {children}
      </T>
      <Icon name={icon} size={18} color={color.textSecondary} />
    </View>
  );
}

const s = StyleSheet.create({
  card: { gap: 14, padding: 16, borderWidth: 1, borderColor: color.borderDefault, borderRadius: radius.xl, backgroundColor: color.bgSurface },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  text: { flex: 1, minWidth: 0, gap: 2 },
  steps: { gap: 8 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: radius.lg, backgroundColor: color.bgSunken },
  num: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: color.noteBg, borderWidth: 1, borderColor: color.accentBg },
});
