// Tester begivenheder, grupper og sider (kort-views, svar, anmodninger, notifikationer).
// Kør: node supabase/tests/community.test.mjs
import { createClient } from '@supabase/supabase-js';
import { execSync } from 'node:child_process';

const env = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8' }).replace(/^[^{]*/, ''));
const admin = createClient(env.API_URL, env.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
let failed = 0;
const check = (name, ok, extra = '') => {
  console.log(`${ok ? '✓' : '✗'} ${name}${ok ? '' : '  ' + extra}`);
  if (!ok) failed++;
};
async function user(name, username) {
  const email = `${username}${Date.now()}@test.local`;
  const { data, error } = await admin.auth.admin.createUser({ email, password: 'test-password-123', email_confirm: true });
  if (error) throw error;
  const c = createClient(env.API_URL, env.ANON_KEY, { auth: { persistSession: false } });
  await c.auth.signInWithPassword({ email, password: 'test-password-123' });
  await c.from('profiles').insert({ id: data.user.id, username: `${username}${Date.now() % 100000}`, name });
  return { id: data.user.id, c };
}

const anna = await user('Anna', 'canna');
const lars = await user('Lars', 'clars');
const emil = await user('Emil', 'cemil');

// Begivenheder
const soon = new Date(Date.now() + 2 * 864e5).toISOString();
const { data: pub } = await anna.c.from('events').insert({ title: 'Loppemarked', starts_at: soon, created_by: anna.id }).select().single();
const { data: priv } = await anna.c.from('events').insert({ title: 'Middag', starts_at: soon, privacy: 'inviterede', created_by: anna.id }).select().single();
let r = await lars.c.from('event_cards').select('id').in('id', [pub.id, priv.id]);
check('Lars ser kun den offentlige begivenhed', r.data?.length === 1 && r.data[0].id === pub.id, JSON.stringify(r));
await anna.c.from('event_invites').insert({ event_id: priv.id, user_id: lars.id, invited_by: anna.id });
r = await lars.c.from('event_cards').select('id, invited_me, my_status').eq('id', priv.id).single();
check('Efter invitation: Lars ser den og er markeret inviteret', r.data?.invited_me === true && r.data.my_status === null, JSON.stringify(r));
r = await lars.c.from('notifications').select('type').eq('type', 'event_invite');
check('Lars får en notifikation om invitationen', r.data?.length === 1, JSON.stringify(r));
await lars.c.from('event_rsvps').upsert({ event_id: priv.id, user_id: lars.id, status: 'maaske' });
await emil.c.from('event_rsvps').upsert({ event_id: pub.id, user_id: emil.id, status: 'deltager' });
r = await anna.c.from('event_cards').select('id, going').eq('id', pub.id).single();
check('Antal deltagere tælles', Number(r.data?.going) === 1, JSON.stringify(r));
r = await lars.c.from('event_cards').select('my_status').eq('id', priv.id).single();
check('Lars’ svar "Måske" vises på kortet', r.data?.my_status === 'maaske');
const { error: emilPriv } = await emil.c.from('event_rsvps').upsert({ event_id: priv.id, user_id: emil.id, status: 'deltager' });
check('Ikke-inviteret kan ikke svare på en lukket begivenhed', !!emilPriv);
const { error: evPost } = await lars.c.from('posts').insert({ author_id: lars.id, text: 'Jeg tager vin med', event_id: priv.id });
check('Inviteret kan skrive i begivenheden', !evPost, evPost?.message);
r = await emil.c.from('post_cards').select('id').eq('event_id', priv.id);
check('Andre kan ikke se opslag i en lukket begivenhed', r.data?.length === 0);

// Grupper
const { data: g } = await anna.c.from('groups').insert({ name: 'Strikkeklubben', privacy: 'privat', created_by: anna.id }).select().single();
r = await lars.c.from('group_cards').select('members, my_status').eq('id', g.id).single();
check('Lars ser den private gruppe med antal medlemmer', Number(r.data?.members) === 1 && r.data.my_status === null, JSON.stringify(r));
await lars.c.from('group_members').insert({ group_id: g.id, user_id: lars.id, status: 'anmodet' });
r = await anna.c.from('notifications').select('type').eq('type', 'group_request');
check('Admin får besked om anmodningen', r.data?.length === 1, JSON.stringify(r));
const { error: selfOk } = await lars.c.from('group_members').update({ status: 'medlem' }).eq('group_id', g.id).eq('user_id', lars.id);
r = await lars.c.from('group_cards').select('my_status').eq('id', g.id).single();
check('Man kan ikke selv godkende sin anmodning', r.data?.my_status === 'anmodet', JSON.stringify({ selfOk, r }));
await anna.c.from('group_members').update({ status: 'medlem' }).eq('group_id', g.id).eq('user_id', lars.id);
r = await lars.c.from('group_cards').select('my_status, members').eq('id', g.id).single();
check('Admin godkender: Lars er medlem', r.data?.my_status === 'medlem' && Number(r.data.members) === 2, JSON.stringify(r));
await anna.c.from('group_members').update({ role: 'admin' }).eq('group_id', g.id).eq('user_id', lars.id);
r = await lars.c.from('group_cards').select('my_role').eq('id', g.id).single();
check('Admin kan gøre Lars til admin', r.data?.my_role === 'admin');
const { data: gp } = await lars.c.from('posts').insert({ author_id: lars.id, text: 'Ny opskrift', group_id: g.id }).select().single();
r = await emil.c.from('post_cards').select('id').eq('id', gp.id);
check('Ikke-medlem ser ikke opslag i privat gruppe', r.data?.length === 0);

// Sider
const { data: page } = await anna.c.from('pages').insert({ handle: `bib${Date.now() % 100000}`, name: 'Biblioteket', category: 'Kultur', created_by: anna.id }).select().single();
r = await anna.c.from('page_cards').select('i_admin, followers').eq('id', page.id).single();
check('Opretteren er administrator af siden', r.data?.i_admin === true && Number(r.data.followers) === 0, JSON.stringify(r));
await emil.c.from('page_follows').insert({ page_id: page.id, user_id: emil.id });
r = await emil.c.from('page_cards').select('i_follow, followers').eq('id', page.id).single();
check('Emil følger siden', r.data?.i_follow === true && Number(r.data.followers) === 1);
const { data: pp } = await anna.c.from('posts').insert({ author_id: anna.id, text: 'Ny udstilling', page_id: page.id }).select().single();
r = await emil.c.rpc('feed_interests');
check('Sidens opslag vises under Interesser hos Emil', r.data?.some((p) => p.id === pp.id && p.page_name === 'Biblioteket'), JSON.stringify(r.error));
const { error: edit } = await emil.c.from('pages').update({ name: 'Hacket' }).eq('id', page.id);
r = await admin.from('pages').select('name').eq('id', page.id).single();
check('Kun administratorer kan ændre siden', r.data.name === 'Biblioteket', JSON.stringify(edit));

console.log(failed ? `\n${failed} test(s) fejlede` : '\nAlle tests bestod');
process.exit(failed ? 1 : 0);
