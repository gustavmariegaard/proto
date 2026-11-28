// Tester opkald i samtaler (log som besked), sletning af egne beskeder og samtalelisten.
// Kør: node supabase/tests/calls.test.mjs
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
const cecilie = await user('Cecilie Dal', 'cecilie');
await bo.c.from('follows').insert({ follower_id: bo.id, followee_id: anna.id });
await anna.c.from('follows').insert({ follower_id: anna.id, followee_id: bo.id });

const { data: conv } = await anna.c.rpc('start_conversation', { member_ids: [bo.id] });
const { data: circle } = await anna.c.rpc('start_conversation', { member_ids: [bo.id, cecilie.id], group_name: 'Vennerne' });

// Opkald logges som besked
const { error: c1 } = await anna.c.from('messages').insert({ conversation_id: conv, sender_id: anna.id, body: 'Opkald', kind: 'call', call: { video: false, status: 'ended', seconds: 133 } });
check('opkald kan logges i en 1:1-samtale', !c1, c1?.message);
const { error: c2 } = await anna.c.from('messages').insert({ conversation_id: circle, sender_id: anna.id, body: 'Opkald', kind: 'call', call: { video: false, status: 'missed', seconds: 0 } });
check('opkald kan ikke logges i en cirkel', !!c2);
const { error: c3 } = await anna.c.from('messages').insert({ conversation_id: conv, sender_id: anna.id, body: 'Opkald', kind: 'call', call: { status: 'hacket' } });
check('ugyldig opkaldsstatus afvises', !!c3);
const { error: c4 } = await anna.c.from('messages').insert({ conversation_id: conv, sender_id: anna.id, body: 'x', kind: 'text', call: { status: 'ended' } });
check('almindelig besked kan ikke have opkaldsdata', !!c4);
const { error: c5 } = await cecilie.c.from('messages').insert({ conversation_id: conv, sender_id: cecilie.id, body: 'Opkald', kind: 'call', call: { status: 'missed' } });
check('udenforstående kan ikke logge opkald i andres samtale', !!c5);

// Samtalelisten viser opkaldet
const { data: list } = await bo.c.rpc('my_conversations');
const row = (list ?? []).find((r) => r.id === conv);
check('samtalelisten kender seneste opkald', row?.last_kind === 'call' && row?.last_call?.seconds === 133, JSON.stringify(row));

// Slet egne beskeder, ikke andres
const { data: m } = await bo.c.from('messages').insert({ conversation_id: conv, sender_id: bo.id, body: 'Hov, forkert' }).select().single();
const { data: gone1 } = await anna.c.from('messages').delete().eq('id', m.id).select();
check('man kan ikke slette andres beskeder', (gone1 ?? []).length === 0);
const { data: gone2, error: de } = await bo.c.from('messages').delete().eq('id', m.id).select();
check('man kan slette sine egne beskeder', !de && (gone2 ?? []).length === 1, de?.message);

// Begge kan se, hvornår den anden sidst læste (til "Set")
const { data: reads } = await anna.c.from('conversation_members').select('user_id, last_read_at').eq('conversation_id', conv);
check('man kan se den andens læsetidspunkt', (reads ?? []).length === 2);

console.log(failed ? `\n${failed} fejlede` : '\nAlle tests bestået');
process.exit(failed ? 1 : 0);
