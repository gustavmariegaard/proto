// Tester databasens regler med rigtige brugere mod den lokale Supabase.
// Kør: npx supabase start && node supabase/tests/rls.test.mjs
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
  const email = `${username.replace(/\./g, '')}-${Date.now()}@test.local`;
  const { data, error } = await admin.auth.admin.createUser({ email, password: 'test-password-123', email_confirm: true });
  if (error) throw error;
  const c = createClient(URL, env.ANON_KEY, { auth: { persistSession: false } });
  await c.auth.signInWithPassword({ email, password: 'test-password-123' });
  const uname = `${username}${Date.now() % 100000}`;
  const { error: e2 } = await c.from('profiles').insert({ id: data.user.id, username: uname, name, is_private: !!opts.private });
  if (e2) throw e2;
  return { id: data.user.id, c, username: uname };
}

const anna = await user('Anna', 'anna');
const lars = await user('Lars', 'lars');
const emil = await user('Emil', 'emil', { private: true });

// Opslag
const { data: aPost, error: pe } = await anna.c.from('posts').insert({ author_id: anna.id, text: 'Hej verden' }).select().single();
check('Anna kan oprette et opslag', !pe, pe?.message);
const { data: ePost } = await emil.c.from('posts').insert({ author_id: emil.id, text: 'Privat' }).select().single();
const { data: dPost, error: de } = await lars.c.from('posts').insert({ author_id: lars.id, kind: 'debat', text: 'Fjern cykelstierne', tags: ['Byudvikling'] }).select().single();
check('Lars kan oprette et debatopslag', !de, de?.message);
const { error: badDebate } = await lars.c.from('posts').insert({ author_id: lars.id, kind: 'debat', text: 'Uden tags' });
check('Debatopslag kræver mindst ét tag', !!badDebate);
const { error: fake } = await lars.c.from('posts').insert({ author_id: anna.id, text: 'Falsk' });
check('Man kan ikke skrive i en andens navn', !!fake);

// Privat profil
let r = await lars.c.from('posts').select('id').eq('id', ePost.id);
check('Lars kan ikke se Emils private opslag', r.data.length === 0);
await lars.c.from('follows').insert({ follower_id: lars.id, followee_id: emil.id });
r = await lars.c.from('follows').select('status').eq('followee_id', emil.id).single();
check('Følg privat profil giver en anmodning', r.data?.status === 'pending', JSON.stringify(r));
await emil.c.from('follows').update({ status: 'accepted' }).eq('follower_id', lars.id);
r = await lars.c.from('posts').select('id').eq('id', ePost.id);
check('Efter godkendelse kan Lars se Emils opslag', r.data.length === 1);

// Offentlig profil og hjem-feed
await lars.c.from('follows').insert({ follower_id: lars.id, followee_id: anna.id });
r = await lars.c.rpc('feed_home');
check('Lars’ hjem-feed viser Annas og Emils opslag', r.data?.length === 2, JSON.stringify(r.error ?? r.data?.length));

// Hjerter og enig/uenig
await lars.c.from('post_likes').insert({ post_id: aPost.id, user_id: lars.id });
r = await anna.c.from('post_cards').select('likes').eq('id', aPost.id).single();
check('Hjertet tælles', Number(r.data?.likes) === 1, JSON.stringify(r));
await anna.c.from('post_stances').insert({ post_id: dPost.id, user_id: anna.id, stance: 'uenig' });
r = await lars.c.from('post_stances').select('*').eq('post_id', dPost.id);
check('Andres enig/uenig er hemmelige', r.data.length === 0);
r = await lars.c.rpc('stance_counts', { p_id: dPost.id });
check('Tallene for enig/uenig kan ses', Number(r.data?.[0]?.disagree) === 1, JSON.stringify(r));

// Fællesskabsnoter
const { data: note, error: ne } = await anna.c.from('notes').insert({ post_id: dPost.id, author_id: anna.id, text: 'Tællingerne viser mange cyklister om vinteren.', sources: ['a.dk', 'b.dk'] }).select().single();
check('Anna kan skrive en note med flere kilder', !ne, ne?.message);
const { error: ownNote } = await lars.c.from('notes').insert({ post_id: dPost.id, author_id: lars.id, text: 'Min egen note her', sources: ['x.dk'] });
check('Man kan ikke skrive note på sit eget opslag', !!ownNote);
const { error: selfRate } = await anna.c.from('note_ratings').insert({ note_id: note.id, user_id: anna.id, rating: 'ja' });
check('Man kan ikke vurdere sin egen note', !!selfRate);
const { error: rateErr } = await emil.c.from('note_ratings').insert({ note_id: note.id, user_id: emil.id, rating: 'lidt', reasons: ['Gode kilder'] });
check('Emil kan vurdere noten', !rateErr, rateErr?.message);
r = await lars.c.rpc('notes_for_post', { p_id: dPost.id });
check('Noten vises med status og antal', r.data?.[0]?.status === 'vist' && Number(r.data[0].ratings) === 1, JSON.stringify(r));

// Skjul i debatten
await anna.c.from('debate_mutes').insert({ user_id: anna.id, muted_id: lars.id });
r = await anna.c.rpc('feed_debate');
check('Skjult afsender vises ikke i Annas debat', !r.data.some((p) => p.id === dPost.id));
r = await emil.c.rpc('feed_debate');
check('… men stadig hos Emil', r.data.some((p) => p.id === dPost.id), JSON.stringify(r.error));

// Beskeder
const { data: convId, error: ce } = await lars.c.rpc('start_conversation', { member_ids: [anna.id] });
check('Lars kan starte en samtale', !ce, ce?.message);
await lars.c.from('messages').insert({ conversation_id: convId, sender_id: lars.id, body: 'Hej Anna' });
r = await anna.c.from('messages').select('body').eq('conversation_id', convId);
check('Anna kan læse beskeden', r.data?.length === 1);
r = await emil.c.from('messages').select('body').eq('conversation_id', convId);
check('Emil kan ikke læse den', r.data?.length === 0);
r = await anna.c.from('conversation_members').select('is_request').eq('conversation_id', convId).eq('user_id', anna.id).single();
check('Anna følger ikke Lars, så det er en anmodning', r.data?.is_request === true, JSON.stringify(r));

// Blokering
await anna.c.from('blocks').insert({ blocker_id: anna.id, blocked_id: lars.id });
r = await lars.c.from('posts').select('id').eq('id', aPost.id);
check('Blokeret: Lars kan ikke se Annas opslag', r.data.length === 0);
r = await lars.c.from('follows').select('*').eq('followee_id', anna.id);
check('Blokering fjerner følgerskab', r.data.length === 0);
const { error: blockedMsg } = await lars.c.from('messages').insert({ conversation_id: convId, sender_id: lars.id, body: 'Hallo?' });
check('Blokeret: Lars kan ikke skrive til Anna', !!blockedMsg);

// Notifikationer
r = await anna.c.from('notifications').select('type');
check('Anna fik notifikationer (følg, hjerte)', r.data?.some((n) => n.type === 'follow') && r.data?.some((n) => n.type === 'like'), JSON.stringify(r.data));
r = await lars.c.from('notifications').select('type');
check('Lars fik besked om en note', r.data?.some((n) => n.type === 'note'), JSON.stringify(r.data));

// Offentlig person kan ikke sættes af brugeren selv
await lars.c.from('profiles').update({ public_kind: 'person' }).eq('id', lars.id);
r = await admin.from('profiles').select('public_kind').eq('id', lars.id).single();
check('Man kan ikke selv gøre sig til offentlig person', r.data.public_kind === null);

// Rapport
const { error: rep } = await emil.c.from('reports').insert({ reporter_id: emil.id, post_id: dPost.id, reason: 'kategori', wrong_tags: ['Byudvikling'] });
check('Emil kan rapportere forkert kategori', !rep, rep?.message);
r = await emil.c.from('reports').select('*');
check('Rapporter kan ikke læses af brugere', r.data.length === 0);

// Billeder
const up = await anna.c.storage.from('media').upload(`${anna.id}/test.png`, new Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' }));
check('Anna kan uploade i sin egen mappe', !up.error, up.error?.message);
const bad = await anna.c.storage.from('media').upload(`${lars.id}/x.png`, new Blob([new Uint8Array([1])], { type: 'image/png' }));
check('… men ikke i andres', !!bad.error);

// Slet konto
const del = await emil.c.rpc('delete_my_account');
r = await admin.from('profiles').select('id').eq('id', emil.id);
check('Emil kan slette sin konto', !del.error && r.data.length === 0, del.error?.message);

console.log(failed ? `\n${failed} test(s) fejlede` : '\nAlle tests bestod');
process.exit(failed ? 1 : 0);
