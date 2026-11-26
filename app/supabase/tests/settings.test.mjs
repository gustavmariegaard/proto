// Tester indstillinger, offentlig person, forældrekontrol, Udvid cirkel og Skaber mod den lokale Supabase.
// Kør: node supabase/tests/settings.test.mjs
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
  const { error: e2 } = await c.from('profiles').insert({ id: data.user.id, username: uname, name });
  if (e2) throw e2;
  return { id: data.user.id, c, username: uname };
}

const mor = await user('Mette Lund', 'mette');
const emil = await user('Emil Lund', 'emil');
const ven = await user('Jonas Krogh', 'jonas');
const venneven = await user('Sofie Holm', 'sofie');

// Sprog
let r = await mor.c.from('user_settings').upsert({ user_id: mor.id, language: 'de', translate_posts: false });
check('Mette kan gemme sprog', !r.error, r.error?.message);
r = await mor.c.from('user_settings').select('language, translate_posts').eq('user_id', mor.id).single();
check('Sproget huskes', r.data?.language === 'de' && r.data?.translate_posts === false, JSON.stringify(r));
r = await emil.c.from('user_settings').select('*').eq('user_id', mor.id);
check('Andre kan ikke se Mettes indstillinger', r.data?.length === 0);

// Offentlig person: 3 bilag i privat mappe
const paths = [];
for (let i = 0; i < 3; i++) {
  const p = `${mor.id}/offentlig-person/bilag-${i + 1}.png`;
  const up = await mor.c.storage.from('dokumenter').upload(p, new Blob([new Uint8Array([137, 80, 78, 71, i])], { type: 'image/png' }), { upsert: true });
  check(`Bilag ${i + 1} uploades`, !up.error, up.error?.message);
  paths.push(p);
}
const seen = await emil.c.storage.from('dokumenter').download(paths[0]);
check('Andre kan ikke hente bilagene', !!seen.error);
const { data: app, error: ae } = await mor.c
  .from('public_figure_applications')
  .insert({ user_id: mor.id, category: 'Politik', links: ['a.dk', 'b.dk', 'c.dk'], attachment_paths: paths })
  .select()
  .single();
check('Ansøgning gemmes med status "behandles"', !ae && app?.status === 'behandles', ae?.message);
r = await mor.c.from('public_figure_applications').insert({ user_id: mor.id, category: 'Politik', links: ['a', 'b', 'c'], attachment_paths: paths, status: 'godkendt' });
check('Man kan ikke sende en allerede godkendt ansøgning', !!r.error);
await mor.c.from('public_figure_applications').update({ status: 'godkendt' }).eq('id', app.id);
r = await admin.from('public_figure_applications').select('status').eq('id', app.id).single();
check('Man kan ikke godkende sig selv', r.data?.status === 'behandles');
await admin.from('public_figure_applications').update({ status: 'godkendt' }).eq('id', app.id);
r = await admin.from('profiles').select('public_kind').eq('id', mor.id).single();
check('Godkendelse (af ciircle) giver globus ved navnet', r.data?.public_kind === 'person', JSON.stringify(r.data));

// Forældrekontrol
const { data: code, error: ce } = await mor.c.rpc('create_guardian_code');
check('Mette laver en kode', !ce && /^[A-Z0-9]{6}$/.test(code), ce?.message);
r = await mor.c.rpc('accept_guardian_code', { c: code });
check('Man kan ikke tilknytte sig selv', !!r.error);
r = await emil.c.rpc('accept_guardian_code', { c: code });
check('Emil skriver koden', !r.error && r.data === 'Mette Lund', JSON.stringify(r));
r = await mor.c.rpc('my_children');
check('Mette ser Emil som sit barn', r.data?.some((c) => c.id === emil.id), JSON.stringify(r.error));
r = await ven.c.rpc('set_child_private', { c: emil.id, p: true });
check('En fremmed kan ikke ændre Emils profil', !!r.error);
r = await mor.c.rpc('set_child_private', { c: emil.id, p: true });
check('Mette gør Emils profil privat', !r.error, r.error?.message);
r = await admin.from('profiles').select('is_private').eq('id', emil.id).single();
check('Emils profil er privat', r.data?.is_private === true);
r = await mor.c.from('child_settings').update({ sensitive: false }).eq('child_id', emil.id).select();
check('Mette kan ændre Emils indstillinger', r.data?.length === 1, JSON.stringify(r.error));
r = await emil.c.from('child_settings').update({ bedtime: false }).eq('child_id', emil.id).select();
check('Emil kan ikke selv ændre sine indstillinger', (r.data?.length ?? 0) === 0);
await mor.c.rpc('set_child_private', { c: emil.id, p: false });
await ven.c.from('follows').insert({ follower_id: ven.id, followee_id: emil.id });
r = await ven.c.from('follows').select('status').eq('followee_id', emil.id).single();
check('"Godkend nye følgere": følg Emil giver en anmodning', r.data?.status === 'pending', JSON.stringify(r));
r = await mor.c.rpc('child_follow_requests', { c: emil.id });
check('Mette ser anmodningen', r.data?.some((p) => p.id === ven.id));
await mor.c.rpc('answer_child_follow', { c: emil.id, follower: ven.id, ok: true });
r = await admin.from('follows').select('status').eq('follower_id', ven.id).eq('followee_id', emil.id).single();
check('Mette godkender, og Jonas følger nu Emil', r.data?.status === 'accepted');

// Udvid cirkel: venners venner
await mor.c.from('follows').insert({ follower_id: mor.id, followee_id: ven.id });
await ven.c.from('follows').insert({ follower_id: ven.id, followee_id: venneven.id });
r = await mor.c.rpc('suggest_people', { max_rows: 20 });
const s = r.data?.find((p) => p.id === venneven.id);
check('Sofie (Jonas’ ven) foreslås til Mette', !!s && s.reason.startsWith('Følges af Jonas'), JSON.stringify(r));
check('Jonas (som Mette følger) foreslås ikke', !r.data?.some((p) => p.id === ven.id));

// Skaber
const { data: post } = await mor.c.from('posts').insert({ author_id: mor.id, text: 'Hej' }).select().single();
await ven.c.from('post_likes').insert({ post_id: post.id, user_id: ven.id });
await ven.c.from('saves').insert({ post_id: post.id, user_id: ven.id });
r = await mor.c.rpc('creator_stats');
const st = r.data?.[0];
check('Skaber-tal: opslag, hjerter, gemt og følgere', st && Number(st.posts) === 1 && Number(st.likes) === 1 && Number(st.saves) === 1, JSON.stringify(r));
r = await mor.c.rpc('creator_top_posts', { max_rows: 3 });
check('Skaber: mest populære opslag', r.data?.[0]?.id === post.id && Number(r.data[0].reactions) === 2, JSON.stringify(r));

console.log(failed ? `\n${failed} test(s) fejlede` : '\nAlle tests bestod');
process.exit(failed ? 1 : 0);
