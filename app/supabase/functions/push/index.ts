/*
 * Edge Function "push": sender push-notifikationer via Expos gratis push-tjeneste.
 *
 * Sådan slås den til (når Supabase-projektet findes):
 * 1. Deploy:  npx supabase functions deploy push --no-verify-jwt
 * 2. Sæt en hemmelighed, som kun webhooken kender:
 *      npx supabase secrets set PUSH_WEBHOOK_SECRET=<lang tilfældig tekst>
 * 3. I Supabase-dashboardet → Database → Webhooks: opret to webhooks (INSERT) på
 *    tabellerne public.notifications og public.messages, der kalder
 *    https://<projekt>.supabase.co/functions/v1/push med headeren
 *    "x-webhook-secret: <samme tekst>".
 *
 * Funktionen læser modtagerens push-tokens med service role (SUPABASE_SERVICE_ROLE_KEY
 * sættes automatisk af Supabase) og sender en kort dansk tekst. Selve beskedteksten
 * sendes ikke med i push – kun hvem der skrev – så indholdet ikke ligger hos Apple/Google.
 */
import { createClient } from 'npm:@supabase/supabase-js@2';

type Payload = { type: 'INSERT'; table: 'notifications' | 'messages'; record: Record<string, any> };

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
});

const texts: Record<string, string> = {
  follow: 'begyndte at følge dig',
  follow_request: 'vil følge dig',
  like: 'synes godt om dit opslag',
  comment: 'kommenterede dit opslag',
};

async function nameOf(id: string | null) {
  if (!id) return null;
  const { data } = await supabase.from('profiles').select('name').eq('id', id).maybeSingle();
  return data?.name ?? null;
}

async function tokensFor(userIds: string[]) {
  if (!userIds.length) return [];
  const { data } = await supabase.from('push_tokens').select('token').in('user_id', userIds);
  return (data ?? []).map((r) => r.token as string);
}

Deno.serve(async (req) => {
  const secret = Deno.env.get('PUSH_WEBHOOK_SECRET');
  if (!secret || req.headers.get('x-webhook-secret') !== secret) return new Response('forbidden', { status: 403 });

  const p = (await req.json()) as Payload;
  if (p.type !== 'INSERT') return new Response('ignored');

  let to: string[] = [];
  let title = 'ciircle';
  let body = '';
  let url = '/';

  if (p.table === 'notifications') {
    const n = p.record;
    to = [n.user_id];
    const actor = await nameOf(n.actor_id);
    if (n.type === 'note') body = 'Læsere har tilføjet kontekst til dit opslag';
    else if (texts[n.type]) body = `${actor ?? 'Nogen'} ${texts[n.type]}`;
    else return new Response('ignored');
    url = n.post_id ? `/opslag/${n.post_id}` : '/notifikationer';
  } else if (p.table === 'messages') {
    const m = p.record;
    const { data: members } = await supabase
      .from('conversation_members')
      .select('user_id')
      .eq('conversation_id', m.conversation_id)
      .neq('user_id', m.sender_id);
    to = (members ?? []).map((r) => r.user_id as string);
    title = (await nameOf(m.sender_id)) ?? 'Ny besked';
    body = 'Har sendt dig en besked';
    url = `/samtale/${m.conversation_id}`;
  }

  const tokens = await tokensFor(to);
  if (!tokens.length) return new Response('no tokens');

  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(tokens.map((t) => ({ to: t, title, body, data: { url }, sound: 'default' }))),
  });

  // Tokens, som Expo afviser (app slettet), ryddes op
  const out = await res.json().catch(() => null);
  const bad = (out?.data ?? [])
    .map((r: any, i: number) => (r?.details?.error === 'DeviceNotRegistered' ? tokens[i] : null))
    .filter(Boolean);
  if (bad.length) await supabase.from('push_tokens').delete().in('token', bad);

  return new Response(JSON.stringify({ sent: tokens.length }), { headers: { 'Content-Type': 'application/json' } });
});
