/*
 * Edge Function "push": sender push-notifikationer, når der kommer en ny notifikation eller besked.
 *
 * - Browsere (også iPhone med appen på hjemmeskærmen): Web Push. Gratis, leveres af browseren selv.
 * - Telefon-app (senere, via App Store/Google Play): Expos gratis push-tjeneste.
 *
 * Sådan slås den til (én gang):
 * 1. Kør trin5-opsaetning.sql i Supabase → SQL Editor (laver tabeller, nøgle-tabel og trigger).
 * 2. Supabase → Edge Functions → Deploy a new function → Via Editor. Navn: push.
 *    Indsæt hele denne fil, og slå "Verify JWT" fra (funktionen tjekker selv en hemmelig nøgle,
 *    som databasen har lavet). Tryk Deploy.
 * Ingen hemmeligheder skal kopieres nogen steder hen: nøglerne laves og gemmes automatisk i databasen.
 */
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

type Payload = { type: 'INSERT'; table: 'notifications' | 'messages' | 'ring'; record: Record<string, any> };

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
});

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

/* ---------- Nøgler (laves første gang og gemmes i databasen) ---------- */

type Config = { hook_secret: string; vapid_public: string | null; vapid_private: string | null };

async function config(): Promise<Config> {
  const { data, error } = await supabase.from('push_config').select('hook_secret, vapid_public, vapid_private').eq('id', 1).single();
  if (error || !data) throw new Error('push_config mangler. Kør trin5-opsaetning.sql.');
  if (data.vapid_public && data.vapid_private) return data as Config;
  const keys = webpush.generateVAPIDKeys();
  // Kun hvis ingen andre har nået det først (to samtidige kald)
  await supabase.from('push_config').update({ vapid_public: keys.publicKey, vapid_private: keys.privateKey }).eq('id', 1).is('vapid_public', null);
  const { data: again } = await supabase.from('push_config').select('hook_secret, vapid_public, vapid_private').eq('id', 1).single();
  return again as Config;
}

/* ---------- Tekster ---------- */

const texts: Record<string, string> = {
  follow: 'begyndte at følge dig',
  follow_request: 'vil gerne følge dig',
  like: 'synes godt om dit opslag',
  comment: 'kommenterede dit opslag',
  mention: 'nævnte dig i et opslag',
  mention_bio: 'nævnte dig i sin bio',
  group_request: 'vil gerne være med i din gruppe',
  event_invite: 'inviterede dig til en begivenhed',
};

/** Hvilken indstilling styrer typen (Indstillinger → Notifikationer) */
const category: Record<string, string> = {
  like: 'likes',
  comment: 'kommentarer',
  follow: 'foelgere',
  follow_request: 'foelgere',
  mention: 'tags',
  mention_bio: 'tags',
  note: 'andet',
  group_request: 'andet',
  event_invite: 'andet',
  message: 'beskeder',
  call: 'opkald',
  missed_call: 'opkald',
};

async function nameOf(id: string | null) {
  if (!id) return null;
  const { data } = await supabase.from('profiles').select('name, username').eq('id', id).maybeSingle();
  return data ?? null;
}

/** Modtagere, der ikke har slået kategorien fra */
async function wanting(userIds: string[], cat: string) {
  if (!userIds.length) return [];
  const { data } = await supabase.from('user_settings').select('user_id, push_prefs').in('user_id', userIds);
  const off = new Set((data ?? []).filter((r) => r.push_prefs?.[cat] === false).map((r) => r.user_id as string));
  return userIds.filter((id) => !off.has(id));
}

/* ---------- Afsendelse ---------- */

async function sendWeb(cfg: Config, userIds: string[], msg: { title: string; body: string; url: string; tag: string; hiddenOnly?: boolean }, ttl = 60 * 60 * 24) {
  const { data: subs } = await supabase.from('web_push_subscriptions').select('endpoint, p256dh, auth').in('user_id', userIds);
  if (!subs?.length || !cfg.vapid_public || !cfg.vapid_private) return 0;
  webpush.setVapidDetails('https://gustavmariegaard.github.io/proto/app/', cfg.vapid_public, cfg.vapid_private);
  let sent = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(msg), { TTL: ttl, urgency: 'high' });
        sent++;
      } catch (e: any) {
        // Browseren har afmeldt push (fx data ryddet): fjern abonnementet
        if (e?.statusCode === 404 || e?.statusCode === 410) await supabase.from('web_push_subscriptions').delete().eq('endpoint', s.endpoint);
      }
    }),
  );
  return sent;
}

async function sendExpo(userIds: string[], msg: { title: string; body: string; url: string }) {
  const { data } = await supabase.from('push_tokens').select('token').in('user_id', userIds);
  const tokens = (data ?? []).map((r) => r.token as string);
  if (!tokens.length) return 0;
  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(tokens.map((t) => ({ to: t, title: msg.title, body: msg.body, data: { url: msg.url }, sound: 'default' }))),
  });
  const out = await res.json().catch(() => null);
  const bad = (out?.data ?? []).map((r: any, i: number) => (r?.details?.error === 'DeviceNotRegistered' ? tokens[i] : null)).filter(Boolean);
  if (bad.length) await supabase.from('push_tokens').delete().in('token', bad);
  return tokens.length;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  // Appen henter den offentlige nøgle (laver nøglerne første gang)
  if (req.method === 'GET') {
    try {
      const cfg = await config();
      return json({ publicKey: cfg.vapid_public });
    } catch (e) {
      return json({ error: String(e) }, 500);
    }
  }

  let cfg: Config;
  try {
    cfg = await config();
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
  if (req.headers.get('x-webhook-secret') !== cfg.hook_secret) return new Response('forbidden', { status: 403, headers: cors });

  const p = (await req.json()) as Payload;
  if (p.type !== 'INSERT') return json({ ignored: true });

  let to: string[] = [];
  let cat = 'andet';
  let title = 'ciircle';
  let body = '';
  let preview = '';
  let url = '/notifikationer';
  let tag = 'ciircle';

  if (p.table === 'notifications') {
    const n = p.record;
    to = [n.user_id];
    cat = category[n.type] ?? 'andet';
    const actor = await nameOf(n.actor_id);
    if (n.type === 'note') body = 'Læsere har tilføjet kontekst til dit opslag';
    else if (texts[n.type]) body = `${actor?.name ?? 'Nogen'} ${texts[n.type]}`;
    else return json({ ignored: true });
    url = n.post_id ? `/opslag/${n.post_id}` : n.type.startsWith('follow') || n.type === 'mention_bio' ? (actor ? `/bruger/${actor.username}` : '/notifikationer') : '/notifikationer';
    tag = `n-${n.type}-${n.post_id ?? n.actor_id ?? ''}`;
  } else if (p.table === 'ring') {
    // Nogen ringer: kort levetid (et opkald, der er slut, skal ikke dukke op senere)
    const r = p.record;
    const caller = await nameOf(r.caller);
    const ok = await wanting([r.callee], 'opkald');
    if (!ok.length) return json({ sent: 0 });
    const web = await sendWeb(
      cfg,
      ok,
      { title: caller?.name ?? 'Opkald', body: r.video ? 'Videoopkald … tryk for at svare' : 'Ringer til dig … tryk for at svare', url: `/samtale/${r.conversation_id}`, tag: `ring-${r.caller}`, hiddenOnly: true },
      30,
    );
    const expo = await sendExpo(ok, { title: caller?.name ?? 'Opkald', body: r.video ? 'Videoopkald' : 'Ringer til dig', url: `/samtale/${r.conversation_id}` });
    return json({ web, expo });
  } else if (p.table === 'messages') {
    const m = p.record;
    cat = 'beskeder';
    // Opkald i samtalen: kun ubesvarede giver besked (afsluttede og afviste kender begge allerede)
    if (m.kind === 'call') {
      const status = m.call?.status;
      if (status !== 'missed' && status !== 'busy') return json({ ignored: true });
      cat = 'opkald';
    }
    const { data: members } = await supabase.from('conversation_members').select('user_id').eq('conversation_id', m.conversation_id).neq('user_id', m.sender_id);
    to = (members ?? []).map((r) => r.user_id as string);
    const { data: conv } = await supabase.from('conversations').select('name, is_group').eq('id', m.conversation_id).maybeSingle();
    const sender = await nameOf(m.sender_id);
    title = conv?.is_group && conv?.name ? `${sender?.name ?? 'Nogen'} i ${conv.name}` : (sender?.name ?? 'Ny besked');
    const text = String(m.body ?? '').trim();
    body = 'Har sendt dig en besked';
    // Web Push er krypteret helt frem til browseren, så her må teksten gerne stå
    preview = m.kind === 'call' ? (m.call?.video ? 'Ubesvaret videoopkald' : 'Ubesvaret opkald') : m.post_id ? 'Delte et opslag med dig' : text ? (text.length > 90 ? text.slice(0, 88) + '…' : text) : body;
    if (m.kind === 'call') body = preview;
    url = `/samtale/${m.conversation_id}`;
    tag = `m-${m.conversation_id}`;
  }

  to = await wanting(to, cat);
  if (!to.length) return json({ sent: 0 });

  const web = await sendWeb(cfg, to, { title, body: preview || body, url, tag });
  const expo = await sendExpo(to, { title, body, url });
  return json({ web, expo });
});
