import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { groupMembers, listGroups, type GroupCard } from '@/lib/community';
import { imageSource } from '@/lib/media';
import { supabase } from '@/lib/supabase';
import { color, font, radius } from '@/theme/tokens';
import { Avatar, initials } from './Avatar';
import { Icon } from './Icon';
import { T } from './T';
import { TextField } from './TextField';

type Person = { id: string; name: string; username: string; avatar_path: string | null };
export type Invites = { allFollowers: boolean; people: Person[]; groups: (GroupCard & { memberIds: string[] })[] };
export const noInvites: Invites = { allFollowers: false, people: [], groups: [] };

/** Dine følgere (til "Alle dine følgere") */
export function useFollowers(me: string) {
  const [list, setList] = useState<string[]>([]);
  useEffect(() => {
    supabase
      .from('follows')
      .select('follower_id')
      .eq('followee_id', me)
      .eq('status', 'accepted')
      .then(({ data }) => setList((data ?? []).map((r) => r.follower_id as string)));
  }, [me]);
  return list;
}

/** Alle, der bliver inviteret (uden dubletter og uden dig selv) */
export function resolveInvites(v: Invites, followers: string[], me: string) {
  const out = new Set<string>();
  if (v.allFollowers) followers.forEach((id) => out.add(id));
  v.groups.forEach((g) => g.memberIds.forEach((id) => out.add(id)));
  v.people.forEach((p) => out.add(p.id));
  out.delete(me);
  return [...out];
}

/**
 * Inviter (prototypens InvitePicker): enten alle dine følgere med ét tryk,
 * eller søg personer og grupper frem. En gruppe inviterer alle dens medlemmer.
 */
export function EventInvitePicker({ me, value, onChange }: { me: string; value: Invites; onChange: (v: Invites) => void }) {
  const [q, setQ] = useState('');
  const [people, setPeople] = useState<Person[]>([]);
  const [groups, setGroups] = useState<GroupCard[]>([]);
  const followers = useFollowers(me);
  const query = q.trim().toLocaleLowerCase('da');

  useEffect(() => {
    listGroups().then((g) => setGroups(g.filter((x) => x.my_status === 'medlem')));
  }, []);

  useEffect(() => {
    let alive = true;
    const term = q.trim().replace(/^@/, '').replace(/[%_,()]/g, '');
    if (!term) {
      setPeople([]);
      return;
    }
    const t = setTimeout(async () => {
      const { data } = await supabase.from('profiles').select('id, name, username, avatar_path').or(`name.ilike.%${term}%,username.ilike.%${term}%`).neq('id', me).order('name').limit(8);
      if (alive) setPeople((data ?? []) as Person[]);
    }, 200);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q, me]);

  const personHits = people.filter((p) => !value.people.some((x) => x.id === p.id));
  const groupHits = groups.filter((g) => g.name.toLocaleLowerCase('da').includes(query) && !value.groups.some((x) => x.id === g.id));
  const total = resolveInvites(value, followers, me).length;

  const set = (patch: Partial<Invites>) => onChange({ ...value, ...patch });
  const pickGroup = async (g: GroupCard) => {
    setQ('');
    const members = await groupMembers(g.id);
    set({ groups: [...value.groups, { ...g, memberIds: members.filter((m) => m.status === 'medlem').map((m) => m.id) }] });
  };

  return (
    <View style={s.invite}>
      <Pressable accessibilityRole="switch" accessibilityState={{ checked: value.allFollowers }} onPress={() => set({ allFollowers: !value.allFollowers })} style={s.all}>
        <View style={s.allIcon}>
          <Icon name="user" size={20} />
        </View>
        <View style={{ flex: 1 }}>
          <T v="label">Alle dine følgere</T>
          <T v="caption" c={color.textSecondary}>
            {followers.length === 1 ? '1 person' : `${followers.length} personer`}
          </T>
        </View>
        <View style={[s.toggle, value.allFollowers && { backgroundColor: color.actionPrimary }]}>
          <View style={[s.knob, value.allFollowers && { transform: [{ translateX: 18 }] }]} />
        </View>
      </Pressable>

      <TextField label="Søg efter navn eller gruppe" showLabel={false} value={q} onChangeText={setQ} autoCapitalize="none" autoCorrect={false} />

      {!!query && (
        <View style={s.results} accessibilityLabel="Resultater">
          {personHits.slice(0, 5).map((p) => (
            <Pressable
              key={p.id}
              accessibilityRole="button"
              accessibilityLabel={`Inviter ${p.name}`}
              onPress={() => {
                set({ people: [...value.people, p] });
                setQ('');
              }}
              style={({ pressed }) => [s.row, pressed && { backgroundColor: color.bgSubtle }]}
            >
              <Avatar name={p.name} path={p.avatar_path} size="S" />
              <T v="label" style={s.name} numberOfLines={1}>
                {p.name}
              </T>
              <Icon name="plus" size={18} />
            </Pressable>
          ))}
          {groupHits.slice(0, 4).map((g) => (
            <Pressable key={g.id} accessibilityRole="button" accessibilityLabel={`Inviter ${g.name}`} onPress={() => pickGroup(g)} style={({ pressed }) => [s.row, pressed && { backgroundColor: color.bgSubtle }]}>
              <View style={s.group}>
                {g.avatar_path ? (
                  <Image source={imageSource(g.avatar_path)} style={StyleSheet.absoluteFill} contentFit="cover" />
                ) : (
                  <T style={s.groupInitials} c={color.avatarSandFg}>
                    {initials(g.name)}
                  </T>
                )}
              </View>
              <View style={s.name}>
                <T v="label" numberOfLines={1}>
                  {g.name}
                </T>
                <T v="caption" c={color.textSecondary}>
                  Inviter alle {g.members} medlemmer
                </T>
              </View>
              <Icon name="plus" size={18} />
            </Pressable>
          ))}
          {personHits.length + groupHits.length === 0 && (
            <T v="caption" c={color.textSecondary} style={{ padding: 10 }}>
              Ingen hedder “{q.trim()}”.
            </T>
          )}
        </View>
      )}

      {(value.people.length > 0 || value.groups.length > 0) && (
        <View style={s.chosen} accessibilityLabel="Inviteret">
          {value.groups.map((g) => (
            <Pressable key={g.id} accessibilityRole="button" accessibilityLabel={`Fjern ${g.name}`} onPress={() => set({ groups: value.groups.filter((x) => x.id !== g.id) })} hitSlop={{ top: 4, bottom: 4 }} style={s.chip}>
              <Icon name="circles" size={14} color={color.textOnAction} />
              <T style={s.chipText} c={color.textOnAction}>
                {g.name}
              </T>
              <Icon name="close" size={14} color={color.textOnAction} />
            </Pressable>
          ))}
          {value.people.map((p) => (
            <Pressable key={p.id} accessibilityRole="button" accessibilityLabel={`Fjern ${p.name}`} onPress={() => set({ people: value.people.filter((x) => x.id !== p.id) })} hitSlop={{ top: 4, bottom: 4 }} style={s.chip}>
              <T style={s.chipText} c={color.textOnAction}>
                {p.name}
              </T>
              <Icon name="close" size={14} color={color.textOnAction} />
            </Pressable>
          ))}
        </View>
      )}

      <T v="caption" c={color.textSecondary} accessibilityLiveRegion="polite">
        {total === 0 ? 'Ingen inviteret endnu.' : total === 1 ? '1 person bliver inviteret.' : `${total} personer bliver inviteret.`}
      </T>
    </View>
  );
}

const s = StyleSheet.create({
  invite: { gap: 10, alignSelf: 'stretch' },
  all: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, paddingVertical: 8, paddingLeft: 8, paddingRight: 14, borderWidth: 1, borderColor: color.borderDefault, borderRadius: radius.lg, backgroundColor: color.bgSurface },
  allIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: color.bgSubtle, alignItems: 'center', justifyContent: 'center' },
  toggle: { width: 46, height: 28, flexShrink: 0, borderRadius: 14, backgroundColor: color.borderStrong },
  knob: { position: 'absolute', top: 3, left: 3, width: 22, height: 22, borderRadius: 11, backgroundColor: color.white },
  results: { padding: 4, borderWidth: 1, borderColor: color.borderDefault, borderRadius: radius.lg, backgroundColor: color.bgSurface },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, paddingVertical: 6, paddingHorizontal: 10, borderRadius: radius.md },
  name: { flex: 1, minWidth: 0 },
  group: { width: 36, height: 36, borderRadius: 10, overflow: 'hidden', backgroundColor: color.avatarSandBg, alignItems: 'center', justifyContent: 'center' },
  groupInitials: { fontFamily: font.bodySemi, fontSize: 12, lineHeight: 16 },
  chosen: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36, paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: color.actionPrimary },
  chipText: { fontFamily: font.bodySemi, fontSize: 13, lineHeight: 18 },
});
