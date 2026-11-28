// Tester sideroller (Admin, Redaktør, Moderator), at siden altid har en admin, add_page_member og forældrekontrol.
// Kør: node supabase/tests/page-roles.test.mjs
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
const cille = await user('Cille Dal', 'cille');
const dan = await user('Dan Ravn', 'dan');
const kid = await user('Karl Barn', 'karl');
// Karl er under forældrekontrol (Anna er forælder)
await admin.from('guardian_links').insert({ guardian_id: anna.id, child_id: kid.id, code: 'K' + String(Date.now()).slice(-5), status: 'aktiv' });

const { data: page, error: pe } = await anna.c.from('pages').insert({ handle: `klub${Date.now() % 100000}`, name: 'Klubben', created_by: anna.id }).select().single();
check('Anna opretter en side og bliver admin', !pe && !!page, pe?.message);
const { data: card } = await anna.c.from('page_cards').select('my_role').eq('id', page.id).single();
check('page_cards viser min rolle', card?.my_role === 'admin', JSON.stringify(card));

// Tilføj personer
const { error: a1 } = await anna.c.rpc('add_page_member', { page: page.id, username: bo.username, role: 'redaktoer' });
check('Anna tilføjer Bo som redaktør', !a1, a1?.message);
const { error: a2 } = await anna.c.rpc('add_page_member', { page: page.id, username: '@' + cille.username, role: 'moderator' });
check('Anna tilføjer Cille som moderator (med @)', !a2, a2?.message);
const { error: a3 } = await bo.c.rpc('add_page_member', { page: page.id, username: dan.username, role: 'admin' });
check('Redaktør kan ikke tilføje personer', !!a3);
const { error: a4 } = await anna.c.rpc('add_page_member', { page: page.id, username: bo.username, role: 'moderator' });
check('Samme person kan ikke tilføjes to gange', !!a4);
const { error: a5 } = await anna.c.rpc('add_page_member', { page: page.id, username: 'findesikke' + Date.now(), role: 'moderator' });
check('Ukendt brugernavn afvises', !!a5);
const { error: a6 } = await anna.c.rpc('add_page_member', { page: page.id, username: kid.username, role: 'moderator' });
check('Barn under forældrekontrol kan ikke tilføjes', !!a6 && /forældrekontrol/.test(a6.message), a6?.message);
const { error: a7 } = await anna.c.from('page_admins').insert({ page_id: page.id, user_id: kid.id, role: 'moderator' });
check('Barn kan heller ikke tilføjes direkte', !!a7);
const { data: n } = await admin.from('notifications').select('type, detail, page_id').eq('user_id', bo.id).eq('type', 'page_role');
check('Bo får en notifikation om rollen', n?.[0]?.detail === 'redaktoer' && n?.[0]?.page_id === page.id, JSON.stringify(n));

// Skrive som siden
const { data: bp, error: b1 } = await bo.c.from('posts').insert({ author_id: bo.id, text: 'Fra redaktøren', page_id: page.id }).select().single();
check('Redaktør kan skrive som siden', !b1, b1?.message);
const { error: c1 } = await cille.c.from('posts').insert({ author_id: cille.id, text: 'Fra moderator', page_id: page.id });
check('Moderator kan ikke skrive som siden', !!c1);
const { data: ap } = await anna.c.from('posts').insert({ author_id: anna.id, text: 'Fra admin', page_id: page.id }).select().single();
const { data: del } = await bo.c.from('posts').delete().eq('id', ap.id).select();
check('Redaktør kan slette andres opslag på siden', (del ?? []).length === 1, JSON.stringify(del));
const { data: cdel } = await cille.c.from('posts').delete().eq('id', bp.id).select();
check('Moderator kan ikke slette sidens opslag', (cdel ?? []).length === 0);

// Sidens oplysninger
const { data: bu } = await bo.c.from('pages').update({ bio: 'Ny tekst' }).eq('id', page.id).select();
check('Redaktør kan rette siden', (bu ?? []).length === 1);
const { data: cu } = await cille.c.from('pages').update({ bio: 'Moderator' }).eq('id', page.id).select();
check('Moderator kan ikke rette siden', (cu ?? []).length === 0);
const { data: bd } = await bo.c.from('pages').delete().eq('id', page.id).select();
check('Redaktør kan ikke slette siden', (bd ?? []).length === 0);

// Roller
const { data: bupd } = await bo.c.from('page_admins').update({ role: 'admin' }).eq('page_id', page.id).eq('user_id', bo.id).select();
check('Redaktør kan ikke gøre sig selv til admin', (bupd ?? []).length === 0);
const { error: last } = await anna.c.from('page_admins').update({ role: 'redaktoer' }).eq('page_id', page.id).eq('user_id', anna.id);
check('Sidste admin kan ikke nedgradere sig selv', !!last);
const { error: leave } = await anna.c.from('page_admins').delete().eq('page_id', page.id).eq('user_id', anna.id);
check('Sidste admin kan ikke forlade siden', !!leave);
const { data: cl, error: cle } = await cille.c.from('page_admins').delete().eq('page_id', page.id).eq('user_id', cille.id).select();
check('Moderator kan selv forlade siden', !cle && (cl ?? []).length === 1, cle?.message);
const { error: up } = await anna.c.from('page_admins').update({ role: 'admin' }).eq('page_id', page.id).eq('user_id', bo.id);
check('Admin kan gøre Bo til admin', !up, up?.message);
const { error: down } = await anna.c.from('page_admins').update({ role: 'redaktoer' }).eq('page_id', page.id).eq('user_id', anna.id);
check('Med to admins kan den ene nedgradere sig selv', !down, down?.message);
const { data: members } = await anna.c.rpc('page_members', { page: page.id });
check('page_members viser personer og roller', (members ?? []).length === 2 && members[0].role === 'admin', JSON.stringify(members));

// Forældrekontrol: barn kan ikke oprette sider
const { error: kp } = await kid.c.from('pages').insert({ handle: `barn${Date.now() % 100000}`, name: 'Barnets side', created_by: kid.id });
check('Barn under forældrekontrol kan ikke oprette en side', !!kp && /forældrekontrol/.test(kp.message), kp?.message);

// Admin (Bo) sletter siden: rollerne forsvinder med
const { data: pd, error: pde } = await bo.c.from('pages').delete().eq('id', page.id).select();
check('Admin kan slette siden', !pde && (pd ?? []).length === 1, pde?.message);

console.log(failed ? `\n${failed} fejlede` : '\nAlle tests bestået');
process.exit(failed ? 1 : 0);
