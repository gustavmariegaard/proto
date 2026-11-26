// Tester Flicks-feedet (feed_flicks) med rigtige brugere mod den lokale Supabase.
// Kør: node supabase/tests/flicks.test.mjs
import { createClient } from '@supabase/supabase-js';
import { execSync } from 'node:child_process';

const env = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8' }).replace(/^[^{]*/, ''));
const admin = createClient(env.API_URL, env.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
let failed = 0;
const check = (name, ok, extra = '') => {
  console.log(`${ok ? '✓' : '✗'} ${name}${ok ? '' : '  ' + extra}`);
  if (!ok) failed++;
};
async function user(name, username, opts = {}) {
  const email = `${username}-${Date.now()}@test.local`;
  const { data, error } = await admin.auth.admin.createUser({ email, password: 'test-password-123', email_confirm: true });
  if (error) throw error;
  const c = createClient(env.API_URL, env.ANON_KEY, { auth: { persistSession: false } });
  await c.auth.signInWithPassword({ email, password: 'test-password-123' });
  await c.from('profiles').upsert({ id: data.user.id, username: `${username}${Date.now() % 100000}`, name, is_private: !!opts.private });
  return { id: data.user.id, c };
}
const flick = (u, tags, extra = {}) =>
  u.c.from('posts').insert({ author_id: u.id, kind: 'flick', media_type: 'video', image_paths: [`${u.id}/x.mp4`], text: 'Flick', tags, ...extra }).select().single();

const anna = await user('Anna', 'fanna');
const lars = await user('Lars', 'flars');
const emil = await user('Emil', 'femil', { private: true });

const { data: f1, error: e1 } = await flick(anna, ['Musik']);
check('Anna kan oprette en flick', !e1, e1?.message);
const { error: noMedia } = await anna.c.from('posts').insert({ author_id: anna.id, kind: 'flick', text: 'Uden video', tags: ['Musik'] });
check('En flick kræver en video eller et billede', !!noMedia);
const { data: f2 } = await flick(lars, ['Cykling']);
const { data: fe } = await flick(emil, ['Musik']);

// Interesser: Lars følger Musik
await lars.c.from('interests').upsert({ user_id: lars.id, topic: 'Musik', active: true });
let r = await lars.c.rpc('feed_flicks', { mode: 'interesser' });
const ids = (r.data ?? []).map((p) => p.id);
check('Interesser viser flicks om Musik', ids.includes(f1.id), JSON.stringify(r.error));
check('… og egne flicks', ids.includes(f2.id));
check('… men ikke en privat profils flick', !ids.includes(fe.id));
check('Opslag i feedet er kun flicks', (r.data ?? []).every((p) => p.kind === 'flick'));

// Uden interesser: alle offentlige flicks
r = await anna.c.rpc('feed_flicks', { mode: 'interesser' });
check('Uden valgte interesser ses alle offentlige flicks', (r.data ?? []).some((p) => p.id === f2.id));

// Følger
r = await anna.c.rpc('feed_flicks', { mode: 'foelger' });
check('Følger er tom, når man ikke følger nogen', (r.data ?? []).length === 0);
await anna.c.from('follows').insert({ follower_id: anna.id, followee_id: lars.id });
r = await anna.c.rpc('feed_flicks', { mode: 'foelger' });
check('Følger viser flicks fra dem, man følger', (r.data ?? []).some((p) => p.id === f2.id) && !(r.data ?? []).some((p) => p.id === f1.id));

// Ikke interesseret og blokering
await anna.c.from('hidden_posts').insert({ user_id: anna.id, post_id: f2.id });
r = await anna.c.rpc('feed_flicks', { mode: 'foelger' });
check('"Ikke interesseret" skjuler flicken', !(r.data ?? []).some((p) => p.id === f2.id));
await lars.c.from('blocks').insert({ blocker_id: lars.id, blocked_id: anna.id });
r = await lars.c.rpc('feed_flicks', { mode: 'interesser' });
check('Blokeret: Annas flicks vises ikke for Lars', !(r.data ?? []).some((p) => p.id === f1.id));

// Hjerter og kommentarer virker på flicks
const { error: likeErr } = await emil.c.from('post_likes').insert({ post_id: f1.id, user_id: emil.id });
check('Man kan give hjerte til en flick', !likeErr, likeErr?.message);
const { error: cErr } = await emil.c.from('comments').insert({ post_id: f1.id, author_id: emil.id, text: 'Fed lyd!' });
check('Man kan kommentere en flick', !cErr, cErr?.message);

// Flicks må ikke dukke op i Hjem-feedet
await emil.c.from('follows').insert({ follower_id: emil.id, followee_id: anna.id });
r = await emil.c.rpc('feed_home');
check('Flicks vises ikke i Hjem', !(r.data ?? []).some((p) => p.id === f1.id));

console.log(failed ? `\n${failed} test(s) fejlede` : '\nAlle tests bestod');
process.exit(failed ? 1 : 0);
