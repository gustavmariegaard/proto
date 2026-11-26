// Tester moments, highlights og deling som besked mod den lokale Supabase.
// Kør: node supabase/tests/moments.test.mjs
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
async function user(name, username, opts = {}) {
  const email = `${username}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@test.local`;
  const { data, error } = await admin.auth.admin.createUser({ email, password: 'test-password-123', email_confirm: true });
  if (error) throw error;
  const c = createClient(URL, env.ANON_KEY, { auth: { persistSession: false } });
  await c.auth.signInWithPassword({ email, password: 'test-password-123' });
  const uname = `${username}${Date.now() % 100000}${Math.floor(Math.random() * 90 + 10)}`;
  const { error: e2 } = await c.from('profiles').insert({ id: data.user.id, username: uname, name, is_private: !!opts.private });
  if (e2) throw e2;
  return { id: data.user.id, c };
}

const anna = await user('Anna', 'anna');
const lars = await user('Lars', 'lars');
const emil = await user('Emil', 'emil', { private: true });
await lars.c.from('follows').insert({ follower_id: lars.id, followee_id: anna.id });
await anna.c.from('follows').insert({ follower_id: anna.id, followee_id: lars.id });

// Moment
const { data: m1, error: me1 } = await anna.c.from('moments').insert({ author_id: anna.id, text: 'Solnedgang ved søen' }).select().single();
check('Anna kan lave et moment', !me1, me1?.message);
let r = await lars.c.rpc('moment_rings');
check('Lars ser Anna i moment-rækken (uset)', r.data?.some((x) => x.author_id === anna.id && x.unseen), JSON.stringify(r.error ?? r.data));
await lars.c.from('moment_views').insert({ moment_id: m1.id, user_id: lars.id });
r = await lars.c.rpc('moment_rings');
check('Efter visning er det markeret set', r.data?.some((x) => x.author_id === anna.id && !x.unseen));
const { error: le } = await lars.c.from('moment_likes').insert({ moment_id: m1.id, user_id: lars.id });
check('Lars kan give hjerte', !le, le?.message);
r = await anna.c.from('moment_cards').select('views').eq('id', m1.id).single();
check('Anna kan se antal visninger', Number(r.data?.views) === 1, JSON.stringify(r));

// Privat profil: Emil (privat) laver moment, Lars følger ikke
const { data: em } = await emil.c.from('moments').insert({ author_id: emil.id, text: 'Privat' }).select().single();
r = await lars.c.from('moments').select('id').eq('id', em.id);
check('Lars kan ikke se moment fra privat profil', r.data.length === 0);

// Udløbet moment forsvinder – men bliver i en highlight
await admin.from('moments').update({ expires_at: new Date(Date.now() - 1000).toISOString() }).eq('id', m1.id);
r = await lars.c.from('moments').select('id').eq('id', m1.id);
check('Udløbet moment er skjult', r.data.length === 0);
const { data: h, error: he } = await anna.c.from('highlights').insert({ owner_id: anna.id, title: 'Sommer' }).select().single();
check('Anna kan lave en highlight', !he, he?.message);
const { error: hie } = await anna.c.from('highlight_items').insert({ highlight_id: h.id, moment_id: m1.id });
check('… og lægge sit moment i den', !hie, hie?.message);
r = await lars.c.from('moments').select('id').eq('id', m1.id);
check('Moment i highlight kan ses efter 24 t', r.data.length === 1);
const { data: lm } = await lars.c.from('moments').insert({ author_id: lars.id, text: 'Lars' }).select().single();
const { error: foreign } = await anna.c.from('highlight_items').insert({ highlight_id: h.id, moment_id: lm.id });
check('Man kan ikke lægge andres moments i sin highlight', !!foreign);

// Side-moment under Interesser
const { data: page } = await anna.c.from('pages').insert({ handle: 'side' + (Date.now() % 100000), name: 'Kulturhuset', created_by: anna.id }).select().single();
const { error: pme } = await lars.c.from('moments').insert({ author_id: lars.id, page_id: page.id, text: 'Falsk' });
check('Kun sidens admins kan lave moments som siden', !!pme);
await anna.c.from('moments').insert({ author_id: anna.id, page_id: page.id, text: 'Koncert i aften' });
await lars.c.from('page_follows').insert({ page_id: page.id, user_id: lars.id });
r = await lars.c.rpc('page_moment_rings');
check('Lars ser sidens moment under Interesser', r.data?.some((x) => x.page_id === page.id), JSON.stringify(r.error));
r = await lars.c.rpc('moment_rings');
check('Side-moments står ikke i Brugere-rækken', !r.data?.some((x) => x.count > 0 && x.author_id === anna.id));

// Del opslag som besked
const { data: post } = await anna.c.from('posts').insert({ author_id: anna.id, text: 'Hej' }).select().single();
const { data: conv } = await lars.c.rpc('start_conversation', { member_ids: [anna.id] });
const { error: msgErr } = await lars.c.from('messages').insert({ conversation_id: conv, sender_id: lars.id, body: 'Se det her', post_id: post.id });
check('Opslag kan deles i en besked', !msgErr, msgErr?.message);

// Del opslag som moment
const { error: sm } = await lars.c.from('moments').insert({ author_id: lars.id, post_id: post.id, text: 'Godt skrevet' });
check('Opslag kan deles som moment', !sm, sm?.message);

console.log(failed ? `\n${failed} test(s) fejlede` : '\nAlle tests bestod');
process.exit(failed ? 1 : 0);
