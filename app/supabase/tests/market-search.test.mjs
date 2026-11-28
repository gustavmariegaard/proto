// Tester søgning på Torvet: hele landet, egne annoncer, kategorier som synonymer, begyndelse af ord og stavefejl.
// Kør: node supabase/tests/market-search.test.mjs
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


const seller = await user('Sælger Sørensen', 'saelger');
const buyer = await user('Køber Kristensen', 'koeber');
const AARHUS = { lat: 56.16, lng: 10.2, city: 'Aarhus' };
const AALBORG = { lat: 57.05, lng: 9.92 };
const tag = Math.random().toString(36).slice(2, 7);

const add = (title, extra = {}) =>
  seller.c.from('listings').insert({ seller_id: seller.id, title, description: `test ${tag}`, price: 100, image_paths: ['x'], category: 'Fritid', ...AARHUS, ...extra }).select().single();

const { data: car, error: ce } = await add('Polestar 2 Long Range', { category: 'Biler', price: 250000 });
check('bil-annonce oprettet', !ce, ce?.message);
const { data: sold } = await add(`Solgt sofa ${tag}`, { category: 'Møbler' });
await seller.c.from('listings').update({ sold: true }).eq('id', sold.id);
const { data: far } = await add(`Kajak ${tag}`, { lat: 55.05, lng: 8.4, city: 'Rømø' });

const find = async (c, q) => {
  const { data, error } = await c.rpc('search_listings', { q, lat: AALBORG.lat, lng: AALBORG.lng, max_rows: 100 });
  if (error) throw error;
  return data ?? [];
};
const has = (rows, id) => rows.some((r) => r.id === id);

for (const q of ['bil', 'Polestar 2', 'polestar', 'pole', 'polstar', 'biler']) {
  check(`"${q}" finder Polestar-annoncen`, has(await find(buyer.c, q), car.id));
}
const bilTop = (await find(buyer.c, 'Polestar 2'))[0];
check('bedste match står øverst', bilTop?.id === car.id, bilTop?.title);
check('sælgeren finder sin egen annonce', has(await find(seller.c, 'polestar'), car.id));
check('solgte annoncer findes ikke', !has(await find(buyer.c, `sofa ${tag}`), sold.id));
const kajak = await find(buyer.c, 'kajak');
check('annoncer langt væk findes (hele landet)', has(kajak, far.id));
check('afstanden er med', typeof kajak.find((r) => r.id === far.id)?.distance_km === 'number');
check('tom søgning giver intet', (await find(buyer.c, '   ')).length === 0);
check('mærkelige tegn giver ingen fejl', Array.isArray(await find(buyer.c, `"'():*&|!`)));

console.log(failed ? `\n${failed} fejlede` : '\nAlle tests bestået');
process.exit(failed ? 1 : 0);
