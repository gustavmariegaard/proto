// Tester push: egne abonnementer, nøgle-tabellen er skjult, og kun den offentlige nøgle kan hentes.
// Kør: node supabase/tests/web-push.test.mjs
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

const sub = { endpoint: `https://push.example/${Date.now()}`, user_id: anna.id, p256dh: 'x', auth: 'y' };
const { error: e1 } = await anna.c.from('web_push_subscriptions').insert(sub);
check('Anna kan gemme sit eget abonnement', !e1, e1?.message);
const { error: e2 } = await bo.c.from('web_push_subscriptions').insert({ ...sub, endpoint: sub.endpoint + 'b', user_id: anna.id });
check('Bo kan ikke gemme et abonnement for Anna', !!e2);
const { data: seen } = await bo.c.from('web_push_subscriptions').select('*');
check('Bo kan ikke se Annas abonnementer', (seen ?? []).length === 0, JSON.stringify(seen));
const { data: cfg, error: e3 } = await bo.c.from('push_config').select('*');
check('nøgle-tabellen kan ikke læses fra appen', !!e3 || (cfg ?? []).length === 0, JSON.stringify(cfg));
const { error: e4 } = await bo.c.rpc('push_public_key');
check('den offentlige nøgle kan hentes', !e4, e4?.message);
const { error: e5 } = await anna.c.from('user_settings').upsert({ user_id: anna.id, push_prefs: { likes: false } });
check('man kan slå typer fra', !e5, e5?.message);

console.log(failed ? `\n${failed} fejlede` : '\nAlle tests bestået');
process.exit(failed ? 1 : 0);
