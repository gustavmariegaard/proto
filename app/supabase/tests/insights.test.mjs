// Tester analytics (visninger, profilbesøg, my_insights), tagging med @ og at deling altid er tilladt.
// Kør: node supabase/tests/insights.test.mjs
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

async function user(name, username, priv = false) {
  const email = `${username}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@test.local`;
  const { data, error } = await admin.auth.admin.createUser({ email, password: 'test-password-123', email_confirm: true });
  if (error) throw error;
  const c = createClient(URL, env.ANON_KEY, { auth: { persistSession: false } });
  await c.auth.signInWithPassword({ email, password: 'test-password-123' });
  const uname = `${username}${Date.now() % 100000}${Math.floor(Math.random() * 90 + 10)}`;
  // Profilen kan allerede være lavet af signup-triggeren
  await admin.from('profiles').upsert({ id: data.user.id, username: uname, name, is_private: priv });
  return { id: data.user.id, c, username: uname };
}

const anna = await user('Anna Holm', 'anna');
const bo = await user('Bo Krogh', 'bo');
const cecilie = await user('Cecilie Dal', 'cecilie', true);

// Bo følger Anna
await bo.c.from('follows').insert({ follower_id: bo.id, followee_id: anna.id });

// Anna laver et opslag og tagger Bo og Cecilie (privat, følger ikke – men Annas profil er offentlig)
const { data: post, error: pe } = await anna.c
  .from('posts')
  .insert({ author_id: anna.id, text: `Tur med @${bo.username} og @${cecilie.username.toUpperCase()} i dag`, allow_share: false })
  .select()
  .single();
check('Anna kan lave et opslag med tags', !pe, pe?.message);

let r = await admin.from('notifications').select('user_id, type, post_id, actor_id').eq('post_id', post.id).eq('type', 'mention');
const got = new Set((r.data ?? []).map((n) => n.user_id));
check('Bo får besked om at være tagget', got.has(bo.id), JSON.stringify(r.data));
check('Cecilie får også besked (store bogstaver tæller som små)', got.has(cecilie.id), JSON.stringify(r.data));
check('Anna får ikke besked om sig selv', !got.has(anna.id));

// Bio-tag: kun nye tags giver besked
await anna.c.from('profiles').update({ bio: `Hej, jeg er venner med @${bo.username}` }).eq('id', anna.id);
await anna.c.from('profiles').update({ bio: `Hej, jeg er gode venner med @${bo.username}` }).eq('id', anna.id);
r = await admin.from('notifications').select('id').eq('user_id', bo.id).eq('type', 'mention_bio').eq('actor_id', anna.id);
check('Bo får én besked om tag i Annas bio (ikke ved hver rettelse)', r.data?.length === 1, JSON.stringify(r.data));

// Deling er altid tilladt, selvom allow_share er false
r = await bo.c.from('posts').insert({ author_id: bo.id, text: 'Se her', shared_post_id: post.id });
check('Bo kan dele Annas opslag videre', !r.error, r.error?.message);

// Visninger og besøg
r = await bo.c.rpc('record_views', { ids: [post.id] });
check('Bo kan melde en visning', !r.error, r.error?.message);
await bo.c.rpc('record_views', { ids: [post.id] });
await cecilie.c.rpc('record_views', { ids: [post.id] });
await anna.c.rpc('record_views', { ids: [post.id] });
await bo.c.rpc('record_profile_visit', { p: anna.id });
await cecilie.c.rpc('record_profile_visit', { p: anna.id });
await anna.c.rpc('record_profile_visit', { p: anna.id });
await bo.c.from('post_likes').insert({ post_id: post.id, user_id: bo.id });
await bo.c.from('comments').insert({ post_id: post.id, author_id: bo.id, text: 'Fedt!' });
await bo.c.from('saves').insert({ post_id: post.id, user_id: bo.id });

r = await bo.c.from('post_views').select('*');
check('Ingen kan læse visningerne direkte', (r.data ?? []).length === 0);

const { data: ins, error: ie } = await anna.c.rpc('my_insights', { days: 30 });
check('Anna kan hente sine tal', !ie && !!ins, ie?.message);
check('Rækkevidde = 2 personer (egne visninger tæller ikke, kun én pr. dag)', ins?.reach === 2 && ins?.views === 2, JSON.stringify(ins));
check('Profilbesøg = 2', ins?.visits === 2, String(ins?.visits));
check('Interaktioner: 1 like, 1 kommentar, 1 gemt, 1 deling', ins?.likes === 1 && ins?.comments === 1 && ins?.saves === 1 && ins?.shares === 1, JSON.stringify(ins));
check('Følgere = 1, ny følger = 1', ins?.followers === 1 && ins?.new_followers === 1);
check('Én af dem, der så det, følger Anna', ins?.reach_followers === 1);
check('30 dage i grafen', ins?.series?.length === 30);
check('Opslaget er øverst blandt de bedste', ins?.top?.[0]?.id === post.id, JSON.stringify(ins?.top));

const { data: other } = await bo.c.rpc('my_insights', { days: 30 });
check('Bos tal viser ikke Annas', other?.reach === 0 && other?.visits === 0, JSON.stringify(other));

// Visninger på debatopslag: alle kan se antallet (ikke hvem)
const { data: deb } = await anna.c.from('posts').insert({ author_id: anna.id, kind: 'debat', text: 'Flere cykelstier?', tags: ['Cykelstier'] }).select().single();
await bo.c.rpc('record_views', { ids: [deb.id] });
await cecilie.c.rpc('record_views', { ids: [deb.id] });
const { data: vc, error: ve } = await bo.c.rpc('post_view_counts', { ids: [deb.id, post.id] });
check('Debatopslag viser antal visninger (2)', !ve && vc?.length === 1 && Number(vc[0].views) === 2, JSON.stringify(vc ?? ve));

console.log(failed ? `\n${failed} fejlede` : '\nAlle tests bestået');
process.exit(failed ? 1 : 0);
