// Tester "Del som moment" med udseende, at flicks ikke kan deles som opslag, og at man kan fjerne en følger.
// Kør: node supabase/tests/moment-layout.test.mjs
import { createClient } from '@supabase/supabase-js';
import { execSync } from 'node:child_process';

const env = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8' }).replace(/^[^{]*/, ''));
const URL = env.API_URL;
const admin = createClient(URL, env.SERVICE_ROLE_KEY, { auth: { persistSession: false } });

let failed = 0;
const check = (name, ok, extra = '') => {
  console.log(`${ok ? '✓' : '✗'} ${name}${ok ? '' : '  ' + extra}`);
  if (!ok) failed++;
};

async function user(name, username) {
  const email = `${username}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@test.local`;
  const { data, error } = await admin.auth.admin.createUser({ email, password: 'test-password-123', email_confirm: true });
  if (error) throw error;
  const c = createClient(URL, env.ANON_KEY, { auth: { persistSession: false } });
  await c.auth.signInWithPassword({ email, password: 'test-password-123' });
  const uname = `${username}${Date.now() % 100000}${Math.floor(Math.random() * 90 + 10)}`;
  await admin.from('profiles').upsert({ id: data.user.id, username: uname, name });
  return { id: data.user.id, c, username: uname };
}

const anna = await user('Anna Holm', 'anna');
const bo = await user('Bo Krogh', 'bo');
await bo.c.from('follows').insert({ follower_id: bo.id, followee_id: anna.id });

const { data: feed } = await anna.c.from('posts').insert({ author_id: anna.id, text: 'Hej' }).select().single();
const { data: flick, error: fe } = await anna.c.from('posts').insert({ author_id: anna.id, kind: 'flick', text: 'Flick', tags: ['Musik'], image_paths: [`${anna.id}/v.mp4`], media_type: 'video' }).select().single();
check('flick oprettet', !fe && !!flick, fe?.message);

// Deling som opslag: almindeligt opslag ja, flick nej
const { error: s1 } = await bo.c.from('posts').insert({ author_id: bo.id, text: '', shared_post_id: feed.id });
check('opslag kan deles som opslag', !s1, s1?.message);
const { error: s2 } = await bo.c.from('posts').insert({ author_id: bo.id, text: '', shared_post_id: flick.id });
check('flick kan ikke deles som opslag', !!s2);

// Flick som moment med udseende
const layout = { v: 1, style: 'medie', bg: 'mint', x: 0.4, y: 0.6, scale: 1.3, rot: 8, texts: [{ id: '1', text: 'Se den her', color: '#ffffff', box: true, x: 0.5, y: 0.2, scale: 1, rot: 0 }] };
const { data: m, error: me } = await bo.c.from('moments').insert({ author_id: bo.id, post_id: flick.id, layout }).select().single();
check('flick kan deles som moment med udseende', !me && !!m, me?.message);
const { data: card } = await anna.c.from('moment_cards').select('layout').eq('id', m?.id).maybeSingle();
check('udseendet kan læses af andre', card?.layout?.style === 'medie' && card?.layout?.texts?.[0]?.text === 'Se den her', JSON.stringify(card));
const { error: big } = await bo.c.from('moments').insert({ author_id: bo.id, post_id: feed.id, layout: { v: 1, texts: [{ text: 'x'.repeat(9000) }] } });
check('for stort udseende afvises', !!big);

// Anna fjerner Bo som følger
const { error: rf } = await anna.c.from('follows').delete().eq('follower_id', bo.id).eq('followee_id', anna.id);
const { count } = await admin.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', bo.id).eq('followee_id', anna.id);
check('man kan fjerne en følger', !rf && count === 0, rf?.message);

console.log(failed ? `\n${failed} fejlede` : '\nAlle tests bestået');
process.exit(failed ? 1 : 0);
