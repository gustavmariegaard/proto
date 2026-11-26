// Tester Torvets regler med rigtige brugere mod den lokale Supabase.
// Kør: node supabase/tests/market.test.mjs
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
  const uname = `${username}${Date.now() % 100000}${Math.floor(Math.random() * 100)}`;
  const { error: e2 } = await c.from('profiles').insert({ id: data.user.id, username: uname, name });
  if (e2) throw e2;
  return { id: data.user.id, c };
}

const AARHUS = { lat: 56.16, lng: 10.2 };
const RANDERS = { lat: 56.46, lng: 10.04 }; // ca. 35 km fra Aarhus
const KBH = { lat: 55.68, lng: 12.57 }; // ca. 160 km

const seller = await user('Sælger Sørensen', 'saelger');
const buyer = await user('Køber Kristensen', 'koeber');
const far = await user('Fjern Frederiksen', 'fjern');

// Placering afrundes til ca. 1 km
await buyer.c.from('user_locations').upsert({ user_id: buyer.id, lat: 56.16789, lng: 10.20345, city: 'Aarhus' });
let r = await buyer.c.from('user_locations').select('lat, lng').eq('user_id', buyer.id).single();
check('Placering gemmes afrundet', r.data?.lat === 56.17 && r.data?.lng === 10.2, JSON.stringify(r.data));
r = await seller.c.from('user_locations').select('*').eq('user_id', buyer.id);
check('Andre kan ikke se din placering', r.data.length === 0);

// Annonce
const { data: l, error: le } = await seller.c
  .from('listings')
  .insert({ seller_id: seller.id, title: 'Spisebord i eg', description: 'Pænt bord', price: 1200, category: 'Møbler', condition: 'God', image_paths: [`${seller.id}/a.jpg`, `${seller.id}/b.jpg`], city: 'Randers', ...RANDERS })
  .select()
  .single();
check('Sælger kan oprette en annonce med 2 billeder', !le, le?.message);
const { error: fake } = await buyer.c.from('listings').insert({ seller_id: seller.id, title: 'Falsk', price: 1, image_paths: ['x'], ...AARHUS });
check('Man kan ikke oprette en annonce i en andens navn', !!fake);
const { error: noPic } = await seller.c.from('listings').insert({ seller_id: seller.id, title: 'Uden billede', price: 1, image_paths: [], ...AARHUS });
check('En annonce kræver mindst ét billede', !!noPic);

// Radius
r = await buyer.c.rpc('listings_near', { ...AARHUS, km: 50 });
check('Køber i Aarhus ser annoncen inden for 50 km', r.data?.some((x) => x.id === l.id), JSON.stringify(r.error));
const hit = r.data?.find((x) => x.id === l.id);
check('Afstanden er ca. 35 km', hit && hit.distance_km > 30 && hit.distance_km < 40, String(hit?.distance_km));
r = await buyer.c.rpc('listings_near', { ...AARHUS, km: 10 });
check('… men ikke inden for 10 km', !r.data?.some((x) => x.id === l.id));
r = await far.c.rpc('listings_near', { ...KBH, km: 100 });
check('Køber i København ser den ikke inden for 100 km', !r.data?.some((x) => x.id === l.id));
r = await far.c.rpc('listings_near', { ...KBH, km: null });
check('… men ser den med "Hele landet"', r.data?.some((x) => x.id === l.id));
r = await seller.c.rpc('listings_near', { ...RANDERS, km: 50 });
check('Egne annoncer vises ikke under "Til salg"', !r.data?.some((x) => x.id === l.id));

// Ændringer: kun sælger
const { data: upd } = await buyer.c.from('listings').update({ price: 1 }).eq('id', l.id).select();
check('Køber kan ikke ændre prisen', (upd ?? []).length === 0);

// Til dig
await buyer.c.from('listing_views').upsert({ user_id: buyer.id, listing_id: l.id });
r = await buyer.c.rpc('my_recent_listing_categories');
check('Sete annoncer giver "Til dig" (Møbler)', r.data?.[0]?.category === 'Møbler', JSON.stringify(r));
r = await seller.c.from('listing_views').select('*');
check('Andre kan ikke se, hvad du har kigget på', r.data.length === 0);

// Gem
const { error: se } = await buyer.c.from('listing_saves').insert({ user_id: buyer.id, listing_id: l.id });
check('Køber kan gemme annoncen', !se, se?.message);

// Skriv til sælger med annoncen som kontekst
const { data: conv } = await buyer.c.rpc('start_conversation', { member_ids: [seller.id] });
const { error: me } = await buyer.c.from('messages').insert({ conversation_id: conv, sender_id: buyer.id, body: 'Om: Spisebord i eg · 1.200 kr.', listing_id: l.id });
check('Køber kan skrive til sælger om annoncen', !me, me?.message);
r = await seller.c.from('messages').select('body, listing_id').eq('conversation_id', conv);
check('Sælger ser beskeden med annoncen', r.data?.[0]?.listing_id === l.id, JSON.stringify(r.data));

// Rapportér en annonce
const { error: re } = await buyer.c.from('reports').insert({ reporter_id: buyer.id, listing_id: l.id, reason: 'andet', details: 'Svindel eller snyd' });
check('Køber kan rapportere annoncen', !re, re?.message);

// Solgt → væk for alle andre
await seller.c.from('listings').update({ sold: true }).eq('id', l.id);
r = await buyer.c.from('listings').select('id').eq('id', l.id);
check('Solgt annonce er væk for køber', r.data.length === 0);
r = await buyer.c.rpc('listings_near', { ...AARHUS, km: null });
check('… også i søgningen', !r.data?.some((x) => x.id === l.id));
r = await seller.c.from('listings').select('id').eq('id', l.id);
check('Sælger kan stadig se sin solgte annonce', r.data.length === 1);

// Blokering skjuler annoncer
const { data: l2 } = await seller.c
  .from('listings')
  .insert({ seller_id: seller.id, title: 'Ladcykel', price: 5000, category: 'Cykler', condition: 'Brugt', image_paths: ['x'], city: 'Aarhus', ...AARHUS })
  .select()
  .single();
await buyer.c.from('blocks').insert({ blocker_id: buyer.id, blocked_id: seller.id });
r = await buyer.c.rpc('listings_near', { ...AARHUS, km: null });
check('Blokeret sælgers annoncer vises ikke', !r.data?.some((x) => x.id === l2.id));

console.log(failed ? `\n${failed} test(s) fejlede` : '\nAlle tests bestod');
process.exit(failed ? 1 : 0);
