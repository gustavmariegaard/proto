import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AccScreen, SetRow } from '@/components/AccountParts';
import { Button } from '@/components/Button';
import { T } from '@/components/T';
import { useMe, useSession } from '@/lib/session';
import { languageByCode } from '@/lib/settings';
import { supabase } from '@/lib/supabase';
import { color } from '@/theme/tokens';

type Status = 'ingen' | 'behandles' | 'godkendt' | 'afvist';

const publicFigureHint: Record<Status, string> = {
  ingen: 'Ansøg om globus ved dit navn',
  behandles: 'Ansøgning under behandling',
  godkendt: 'Godkendt · globus ved dit navn',
  afvist: 'Ansøgning afvist · du kan søge igen',
};

/** Indstillinger: én oversigt (prototypens Settings) */
export default function Settings() {
  const me = useMe();
  const { signOut } = useSession();
  const [language, setLanguage] = useState('da');
  const [status, setStatus] = useState<Status>('ingen');
  const [children, setChildren] = useState<string[]>([]);

  const load = useCallback(async () => {
    const [lang, pf, kids] = await Promise.all([
      supabase.from('user_settings').select('language').eq('user_id', me.id).maybeSingle(),
      supabase.from('public_figure_applications').select('status').eq('user_id', me.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.rpc('my_children'),
    ]);
    setLanguage((lang.data as { language: string } | null)?.language ?? 'da');
    setStatus(((pf.data as { status: Status } | null)?.status ?? 'ingen') as Status);
    setChildren(((kids.data ?? []) as { name: string }[]).map((c) => c.name.split(' ')[0]!));
  }, [me.id]);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <AccScreen title="Indstillinger" fallback="/profil">
      <Group title="Konto">
        <SetRow
          icon="lock"
          title="Privatliv og data"
          hint={`${me.is_private ? 'Privat' : 'Offentlig'} profil · aktivitet, blokerede`}
          onPress={() => router.push('/indstillinger/privatliv')}
        />
        <SetRow icon="globe" title="Offentlig person" hint={publicFigureHint[status]} onPress={() => router.push('/indstillinger/offentlig-person')} />
      </Group>

      <Group title="Sprog">
        <SetRow
          icon="chat"
          title="Sprog og oversættelse"
          hint={`${languageByCode(language).native} · oversæt opslag og beskeder`}
          onPress={() => router.push('/indstillinger/sprog')}
        />
      </Group>

      <Group title="Familie">
        <SetRow
          icon="user"
          title="Forældrekontrol"
          hint={children.length ? `${children.join(' og ')} er tilknyttet` : 'Tilknyt dine børn, og bestem hvad de kan se'}
          onPress={() => router.push('/foraeldrekontrol')}
        />
      </Group>

      <Group title="Om og jura">
        <SetRow icon="info" title="Privatlivspolitik" hint="Hvilke data vi behandler, og dine rettigheder" onPress={() => router.push('/indstillinger/jura/privatlivspolitik')} />
        <SetRow icon="info" title="Databehandleraftale" hint="For sider, grupper og virksomheder" onPress={() => router.push('/indstillinger/jura/databehandleraftale')} />
      </Group>

      <Button variant="secondary" style={s.logout} onPress={signOut}>
        Log ud
      </Button>
    </AccScreen>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <T v="headingS" c={color.textSecondary} accessibilityRole="header" style={s.group}>
        {title}
      </T>
      <View style={s.list}>{children}</View>
    </>
  );
}

const s = StyleSheet.create({
  group: { marginTop: 6 },
  list: { gap: 8 },
  logout: { alignSelf: 'flex-start', marginTop: 10 },
});
