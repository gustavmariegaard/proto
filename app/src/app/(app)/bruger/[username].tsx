import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { IconButton } from '@/components/IconButton';
import { MenuItem } from '@/components/MenuItem';
import { ProfileHeader } from '@/components/ProfileHeader';
import { ProfilePosts } from '@/components/ProfilePosts';
import { Screen } from '@/components/Screen';
import { Sheet } from '@/components/Sheet';
import { T } from '@/components/T';
import { follow, postsBy, profileView, reportReasons, unfollow, type ProfileView } from '@/lib/profiles';
import { useMe } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import type { PostCard } from '@/lib/types';
import { color } from '@/theme/tokens';

type Step = 'closed' | 'menu' | 'bloker' | 'anmeld' | 'anmeldt' | 'fjern';

/** En andens profil */
export default function UserProfile() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const me = useMe();
  const [p, setP] = useState<ProfileView | null | undefined>(undefined);
  const [posts, setPosts] = useState<PostCard[]>([]);
  const [step, setStep] = useState<Step>('closed');
  const [reason, setReason] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (username === me.username) {
      router.replace('/profil');
      return;
    }
    const v = await profileView(username);
    setP(v);
    setPosts(v && !v.i_blocked ? await postsBy(v.id) : []);
  }, [username, me.username]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (p === undefined) {
    return (
      <Screen title="">
        <ActivityIndicator color={color.textPrimary} />
      </Screen>
    );
  }
  if (p === null) {
    return (
      <Screen title="Profil">
        <T v="body" c={color.textSecondary}>
          Profilen findes ikke.
        </T>
      </Screen>
    );
  }

  const first = p.name.split(' ')[0];
  const close = () => {
    setStep('closed');
    setReason(null);
  };

  const toggleFollow = async () => {
    setBusy(true);
    if (p.my_follow) await unfollow(me.id, p.id);
    else await follow(me.id, p.id);
    await load();
    setBusy(false);
  };

  const message = async () => {
    setBusy(true);
    const { data, error } = await supabase.rpc('start_conversation', { member_ids: [p.id] });
    setBusy(false);
    if (!error && data) router.push(`/samtale/${data}`);
  };

  const block = async () => {
    await supabase.from('blocks').insert({ blocker_id: me.id, blocked_id: p.id });
    close();
    load();
  };
  const unblock = async () => {
    await supabase.from('blocks').delete().eq('blocker_id', me.id).eq('blocked_id', p.id);
    close();
    load();
  };
  const removeFollower = async () => {
    await supabase.from('follows').delete().eq('follower_id', p.id).eq('followee_id', me.id);
    close();
    load();
  };
  const report = async () => {
    await supabase.from('reports').insert({ reporter_id: me.id, profile_id: p.id, reason });
    setStep('anmeldt');
  };

  const title =
    step === 'bloker' ? `Bloker ${first}?` : step === 'fjern' ? `Fjern ${first} som følger?` : step === 'anmeld' ? `Anmeld ${first}` : step === 'anmeldt' ? 'Tak for din anmeldelse' : first;

  return (
    <Screen title=" " right={<IconButton icon="dots" label="Flere muligheder" onPress={() => setStep('menu')} />}>
      {p.i_blocked ? (
        <View style={s.blocked}>
          <T v="titleL">{p.name}</T>
          <T v="bodyS" c={color.textSecondary}>
            @{p.username} · Blokeret
          </T>
          <Button title="Fjern blokering" variant="secondary" onPress={unblock} />
        </View>
      ) : (
        <>
          <ProfileHeader p={{ ...p, posts: p.posts }}>
            <View style={s.buttons}>
              <Button
                title={p.my_follow === 'accepted' ? 'Følger' : p.my_follow === 'pending' ? 'Anmodet' : 'Følg'}
                variant={p.my_follow ? 'secondary' : 'primary'}
                style={{ flex: 1 }}
                loading={busy}
                onPress={toggleFollow}
              />
              <Button title="Besked" variant="secondary" style={{ flex: 1 }} onPress={message} />
            </View>
          </ProfileHeader>
          <ProfilePosts posts={posts} locked={!p.can_see} onChanged={load} />
        </>
      )}

      <Sheet open={step !== 'closed'} onClose={close} title={title}>
        {step === 'menu' && (
          <View>
            {p.i_blocked ? (
              <MenuItem icon="ban" label="Fjern blokering" onPress={unblock} />
            ) : (
              <MenuItem icon="ban" label="Bloker" danger onPress={() => setStep('bloker')} />
            )}
            <MenuItem icon="flag" label="Anmeld" danger onPress={() => setStep('anmeld')} />
            {p.follows_me && !p.i_blocked && <MenuItem icon="user-minus" label="Fjern følger" onPress={() => setStep('fjern')} />}
          </View>
        )}
        {step === 'bloker' && (
          <View style={s.sheet}>
            <T v="bodyS" c={color.textSecondary}>
              {first} kan ikke se din profil eller skrive til dig. {first} får ikke besked.
            </T>
            <Button title="Bloker" block onPress={block} />
            <Button title="Annuller" variant="secondary" block onPress={() => setStep('menu')} />
          </View>
        )}
        {step === 'fjern' && (
          <View style={s.sheet}>
            <T v="bodyS" c={color.textSecondary}>
              {first} får ikke besked.
            </T>
            <Button title="Fjern følger" block onPress={removeFollower} />
            <Button title="Annuller" variant="secondary" block onPress={() => setStep('menu')} />
          </View>
        )}
        {step === 'anmeld' && (
          <View style={s.sheet}>
            <View style={s.reasons}>
              {reportReasons.map((r) => (
                <Chip key={r.id} label={r.title} selected={reason === r.id} onPress={() => setReason(r.id)} />
              ))}
            </View>
            <Button title="Send anmeldelse" block disabled={!reason} onPress={report} />
            <Button title="Annuller" variant="secondary" block onPress={() => setStep('menu')} />
          </View>
        )}
        {step === 'anmeldt' && (
          <View style={s.sheet}>
            <T v="bodyS" c={color.textSecondary}>
              Vi kigger på profilen. Din anmeldelse er anonym.
            </T>
            {!p.i_blocked && <Button title={`Bloker ${first}`} variant="secondary" block onPress={block} />}
            <Button title="Færdig" block onPress={close} />
          </View>
        )}
      </Sheet>
    </Screen>
  );
}

const s = StyleSheet.create({
  buttons: { flexDirection: 'row', gap: 8, alignSelf: 'stretch' },
  blocked: { alignItems: 'center', gap: 8, paddingVertical: 32 },
  sheet: { padding: 20, gap: 12 },
  reasons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
