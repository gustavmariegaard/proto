import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';

/*
 * Opkald mellem to personer (lyd og video) direkte mellem browserne (WebRTC).
 *
 * Signalering går over Supabase Realtime (gratis, ingen ekstra tjeneste):
 *  - kanalen "ring:<brugerId>": her ringer andre til dig (begivenheden "ring")
 *  - kanalen "call:<opkaldsId>": svar, afvis, optaget, læg på, SDP og ICE
 * Forbindelsen findes via Googles gratis STUN-server. Et TURN-relæ (til netværk,
 * der blokerer direkte forbindelser) kan slås til med EXPO_PUBLIC_TURN_URL/_USER/_PASS.
 *
 * Kun den, der ringer, logger opkaldet i samtalen bagefter (så det ikke står to gange).
 */

export type Peer = { id: string; name: string; username: string; avatar_path: string | null };
export type CallStatus = 'ringing-in' | 'calling' | 'connecting' | 'active' | 'ended';
export type EndReason = 'hangup' | 'declined' | 'busy' | 'no-answer' | 'remote-hangup' | 'failed' | 'denied' | 'cancelled' | 'unsupported';

export type CallState = {
  id: string;
  role: 'caller' | 'callee';
  peer: Peer;
  conversationId: string;
  video: boolean;
  status: CallStatus;
  startedAt: number | null;
  muted: boolean;
  cameraOff: boolean;
  facing: 'user' | 'environment';
  local: MediaStream | null;
  remote: MediaStream | null;
  remoteVideo: boolean;
  endReason: EndReason | null;
};

export const callsSupported = () => Platform.OS === 'web' && typeof window !== 'undefined' && !!window.RTCPeerConnection && !!navigator.mediaDevices?.getUserMedia;

const RING_TIMEOUT = 30000;

function iceServers(): RTCIceServer[] {
  const list: RTCIceServer[] = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];
  const url = process.env.EXPO_PUBLIC_TURN_URL;
  if (url) list.push({ urls: url.split(','), username: process.env.EXPO_PUBLIC_TURN_USER, credential: process.env.EXPO_PUBLIC_TURN_PASS });
  return list;
}

/* ---------- Tilstand (én samtale ad gangen) ---------- */

let state: CallState | null = null;
/** Læs tilstanden på ny efter en await (TypeScript tror ellers, den ikke kan have ændret sig) */
const now = (): CallState | null => state;
const listeners = new Set<(s: CallState | null) => void>();
function set(next: CallState | null) {
  state = next;
  listeners.forEach((l) => l(state));
}
function patch(p: Partial<CallState>) {
  if (state) set({ ...state, ...p });
}

/** Opkaldet lige nu (null = intet opkald) */
export function useCall() {
  const [s, setS] = useState(state);
  useEffect(() => {
    listeners.add(setS);
    setS(state);
    return () => {
      listeners.delete(setS);
    };
  }, []);
  return s;
}

let me: Peer | null = null;
let pc: RTCPeerConnection | null = null;
let callCh: RealtimeChannel | null = null;
let ringCh: RealtimeChannel | null = null;
let ringTimer: ReturnType<typeof setTimeout> | null = null;
let ringRepeat: ReturnType<typeof setInterval> | null = null;
let pendingIce: RTCIceCandidateInit[] = [];
let tone: { stop: () => void } | null = null;
let logged = false;

const uuid = () => (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

function send(event: string, payload: Record<string, unknown> = {}) {
  callCh?.send({ type: 'broadcast', event, payload: { ...payload, from: me?.id } });
}

function clearTimers() {
  if (ringTimer) clearTimeout(ringTimer);
  if (ringRepeat) clearInterval(ringRepeat);
  ringTimer = null;
  ringRepeat = null;
}

/* ---------- Lyde (genereret, ingen filer) ---------- */

function playTone(kind: 'ring' | 'ringback') {
  if (Platform.OS !== 'web') return null;
  try {
    const AC = (window as any).AudioContext ?? (window as any).webkitAudioContext;
    if (!AC) return null;
    const ctx = new AC();
    let stopped = false;
    const beep = () => {
      if (stopped) return;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = kind === 'ring' ? 660 : 440;
      o.connect(g);
      g.connect(ctx.destination);
      const t = ctx.currentTime;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(kind === 'ring' ? 0.12 : 0.06, t + 0.05);
      g.gain.setValueAtTime(kind === 'ring' ? 0.12 : 0.06, t + (kind === 'ring' ? 0.35 : 1));
      g.gain.linearRampToValueAtTime(0, t + (kind === 'ring' ? 0.45 : 1.1));
      o.start(t);
      o.stop(t + 1.2);
      if (kind === 'ring') {
        const o2 = ctx.createOscillator();
        o2.frequency.value = 880;
        o2.connect(g);
        o2.start(t + 0.5);
        o2.stop(t + 0.9);
        g.gain.linearRampToValueAtTime(0.12, t + 0.55);
        g.gain.linearRampToValueAtTime(0, t + 0.9);
        try {
          navigator.vibrate?.([300, 200, 300]);
        } catch {}
      }
    };
    beep();
    const t = setInterval(beep, kind === 'ring' ? 2000 : 3000);
    return {
      stop: () => {
        stopped = true;
        clearInterval(t);
        ctx.close?.();
      },
    };
  } catch {
    return null;
  }
}
function stopTone() {
  tone?.stop();
  tone = null;
}

/* ---------- Medier og forbindelse ---------- */

async function getMedia(video: boolean, facing: 'user' | 'environment' = 'user') {
  return navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true },
    video: video ? { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } } : false,
  });
}

function makePeer(local: MediaStream) {
  const conn = new RTCPeerConnection({ iceServers: iceServers() });
  local.getTracks().forEach((t) => conn.addTrack(t, local));
  conn.onicecandidate = (e) => {
    if (e.candidate) send('ice', { candidate: e.candidate.toJSON() });
  };
  conn.ontrack = (e) => {
    const stream = e.streams[0] ?? new MediaStream([e.track]);
    patch({ remote: stream, remoteVideo: stream.getVideoTracks().length > 0 });
    stream.onaddtrack = () => patch({ remoteVideo: stream.getVideoTracks().length > 0 });
  };
  conn.onconnectionstatechange = () => {
    if (!state) return;
    if (conn.connectionState === 'connected' && state.status !== 'active') patch({ status: 'active', startedAt: Date.now() });
    if (conn.connectionState === 'failed') finish('failed');
  };
  return conn;
}

async function addIce(c: RTCIceCandidateInit) {
  if (!pc || !pc.remoteDescription) {
    pendingIce.push(c);
    return;
  }
  try {
    await pc.addIceCandidate(c);
  } catch {}
}
async function flushIce() {
  const list = pendingIce;
  pendingIce = [];
  for (const c of list) await addIce(c);
}

function joinCall(id: string) {
  callCh = supabase.channel(`call:${id}`, { config: { broadcast: { self: false } } });
  callCh
    .on('broadcast', { event: 'accept' }, async () => {
      // Den, der ringer: modtageren har svaret → lav et tilbud
      if (!state || state.role !== 'caller' || !pc) return;
      clearTimers();
      stopTone();
      patch({ status: 'connecting' });
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      send('offer', { sdp: offer });
    })
    .on('broadcast', { event: 'offer' }, async ({ payload }) => {
      if (!state || state.role !== 'callee' || !pc) return;
      await pc.setRemoteDescription(payload.sdp);
      await flushIce();
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      send('answer', { sdp: answer });
    })
    .on('broadcast', { event: 'answer' }, async ({ payload }) => {
      if (!pc) return;
      await pc.setRemoteDescription(payload.sdp);
      await flushIce();
    })
    .on('broadcast', { event: 'ice' }, ({ payload }) => addIce(payload.candidate))
    .on('broadcast', { event: 'decline' }, () => finish('declined', false))
    .on('broadcast', { event: 'busy' }, () => finish('busy', false))
    .on('broadcast', { event: 'hangup' }, () => finish(state?.role === 'callee' && state.status === 'ringing-in' ? 'cancelled' : 'remote-hangup', false))
    .on('broadcast', { event: 'answered-elsewhere' }, () => finish('cancelled', false));
  return new Promise<void>((resolve) => {
    let done = false;
    callCh!.subscribe((s) => {
      if (!done && (s === 'SUBSCRIBED' || s === 'CHANNEL_ERROR' || s === 'TIMED_OUT')) {
        done = true;
        resolve();
      }
    });
    setTimeout(() => {
      if (!done) {
        done = true;
        resolve();
      }
    }, 4000);
  });
}

/* ---------- Ring op ---------- */

/** Ring op til en person i en 1:1-samtale */
export async function startCall(peer: Peer, conversationId: string, video: boolean) {
  if (state) return;
  logged = false;
  const id = uuid();
  const base: CallState = {
    id,
    role: 'caller',
    peer,
    conversationId,
    video,
    status: 'calling',
    startedAt: null,
    muted: false,
    cameraOff: false,
    facing: 'user',
    local: null,
    remote: null,
    remoteVideo: false,
    endReason: null,
  };
  if (!callsSupported()) {
    set({ ...base, status: 'ended', endReason: 'unsupported' });
    return;
  }
  set(base);
  let local: MediaStream;
  try {
    local = await getMedia(video);
  } catch {
    set({ ...base, status: 'ended', endReason: 'denied' });
    return;
  }
  if (now()?.id !== id) {
    local.getTracks().forEach((t) => t.stop());
    return;
  }
  patch({ local });
  pc = makePeer(local);
  await joinCall(id);
  if (now()?.id !== id) return;
  tone = playTone('ringback');

  // Ring hos modtageren (gentages, hvis de først lige er kommet online)
  const target = supabase.channel(`ring:${peer.id}`, { config: { broadcast: { self: false } } });
  const ring = () => target.send({ type: 'broadcast', event: 'ring', payload: { id, conversationId, video, from: me } });
  target.subscribe((s) => {
    if (s === 'SUBSCRIBED') ring();
  });
  ringRepeat = setInterval(ring, 3000);
  ringTimer = setTimeout(() => {
    send('hangup');
    finish('no-answer');
  }, RING_TIMEOUT);
  const cleanupTarget = () => supabase.removeChannel(target);
  const stopWhenDone = setInterval(() => {
    if (!state || state.id !== id || state.status !== 'calling') {
      clearInterval(stopWhenDone);
      cleanupTarget();
    }
  }, 500);
}

/* ---------- Bliv ringet op ---------- */

/** Lyt efter opkald til dig (monteres én gang, når man er logget ind) */
export function listenForCalls(self: Peer) {
  me = self;
  if (ringCh) supabase.removeChannel(ringCh);
  ringCh = supabase.channel(`ring:${self.id}`, { config: { broadcast: { self: false } } });
  ringCh.on('broadcast', { event: 'ring' }, async ({ payload }) => {
    const { id, conversationId, video, from } = payload as { id: string; conversationId: string; video: boolean; from: Peer };
    if (!from?.id || from.id === self.id) return;
    if (state?.id === id) return;
    // Optaget i et andet opkald
    if (state && state.status !== 'ended') {
      const ch = supabase.channel(`call:${id}`);
      ch.subscribe((s) => {
        if (s === 'SUBSCRIBED') {
          ch.send({ type: 'broadcast', event: 'busy', payload: {} });
          setTimeout(() => supabase.removeChannel(ch), 1000);
        }
      });
      return;
    }
    // Kun fra den anden person i en fælles 1:1-samtale, og ikke fra nogen, du har blokeret
    const [{ data: members }, { data: blocked }] = await Promise.all([
      supabase.from('conversation_members').select('user_id').eq('conversation_id', conversationId),
      supabase.from('blocks').select('blocked_id').eq('blocker_id', self.id).eq('blocked_id', from.id),
    ]);
    const ids = (members ?? []).map((m) => m.user_id as string);
    if (ids.length !== 2 || !ids.includes(from.id) || !ids.includes(self.id) || (blocked ?? []).length) return;
    if (state && state.status !== 'ended') return;
    logged = true; // modtageren logger ikke
    set({
      id,
      role: 'callee',
      peer: from,
      conversationId,
      video: !!video,
      status: 'ringing-in',
      startedAt: null,
      muted: false,
      cameraOff: false,
      facing: 'user',
      local: null,
      remote: null,
      remoteVideo: false,
      endReason: null,
    });
    await joinCall(id);
    tone = playTone('ring');
    // Opgiver den, der ringer, ser vi det som "hangup"; ellers stop efter lidt over 30 sek.
    ringTimer = setTimeout(() => {
      if (state?.id === id && state.status === 'ringing-in') finish('cancelled', false);
    }, RING_TIMEOUT + 5000);
  });
  ringCh.subscribe();
  return () => {
    if (ringCh) supabase.removeChannel(ringCh);
    ringCh = null;
  };
}

/** Tag den */
export async function acceptCall() {
  if (!state || state.role !== 'callee' || state.status !== 'ringing-in') return;
  clearTimers();
  stopTone();
  const id = state.id;
  if (!callsSupported()) return finish('unsupported', false, true);
  patch({ status: 'connecting' });
  let local: MediaStream;
  try {
    local = await getMedia(state.video);
  } catch {
    send('decline');
    return finish('denied', false);
  }
  if (now()?.id !== id) {
    local.getTracks().forEach((t) => t.stop());
    return;
  }
  patch({ local });
  pc = makePeer(local);
  send('accept');
}

/** Afvis */
export function declineCall() {
  if (!state) return;
  send('decline');
  finish('declined', false);
}

/** Læg på (eller opgiv at ringe) */
export function hangUp() {
  if (!state) return;
  send('hangup');
  finish(state.status === 'calling' ? 'cancelled' : 'hangup');
}

export function toggleMute() {
  if (!state?.local) return;
  const muted = !state.muted;
  state.local.getAudioTracks().forEach((t) => (t.enabled = !muted));
  patch({ muted });
}

export function toggleCamera() {
  if (!state?.local) return;
  const off = !state.cameraOff;
  state.local.getVideoTracks().forEach((t) => (t.enabled = !off));
  patch({ cameraOff: off });
}

/** Skift mellem kameraet foran og bagpå (telefon) */
export async function flipCamera() {
  if (!state?.local || !state.video) return;
  const facing = state.facing === 'user' ? 'environment' : 'user';
  try {
    const fresh = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing } });
    const track = fresh.getVideoTracks()[0];
    if (!track) return;
    const sender = pc?.getSenders().find((s) => s.track?.kind === 'video');
    await sender?.replaceTrack(track);
    const old = state.local.getVideoTracks()[0];
    old?.stop();
    if (old) state.local.removeTrack(old);
    state.local.addTrack(track);
    track.enabled = !state.cameraOff;
    patch({ facing, local: new MediaStream(state.local.getTracks()) });
  } catch {}
}

/** Luk opkaldsskærmen efter "Opkaldet er slut" */
export function dismissCall() {
  if (state?.status === 'ended') set(null);
}

/* ---------- Afslut og log ---------- */

function finish(reason: EndReason, _notify = true, quiet = false) {
  if (!state || state.status === 'ended') return;
  clearTimers();
  stopTone();
  const s = state;
  const seconds = s.startedAt ? Math.round((Date.now() - s.startedAt) / 1000) : 0;
  pc?.getSenders().forEach((x) => x.track?.stop());
  s.local?.getTracks().forEach((t) => t.stop());
  pc?.close();
  pc = null;
  pendingIce = [];
  const ch = callCh;
  callCh = null;
  if (ch) setTimeout(() => supabase.removeChannel(ch), 800);

  // Kun den, der ringede, skriver opkaldet i samtalen
  if (s.role === 'caller' && !logged && reason !== 'denied' && reason !== 'unsupported') {
    logged = true;
    const status = s.startedAt ? 'ended' : reason === 'declined' ? 'declined' : reason === 'busy' ? 'busy' : 'missed';
    supabase
      .from('messages')
      .insert({ conversation_id: s.conversationId, sender_id: me?.id, body: s.video ? 'Videoopkald' : 'Opkald', kind: 'call', call: { video: s.video, status, seconds } } as never)
      .then(() => {});
  }

  if (quiet) return set(null);
  set({ ...s, status: 'ended', endReason: reason, local: null, remote: null });
  // Skærmen "Opkaldet er slut" lukker af sig selv
  const id = s.id;
  setTimeout(() => {
    if (state?.id === id && state.status === 'ended') set(null);
  }, reason === 'denied' || reason === 'unsupported' ? 6000 : 1800);
}

/* ---------- Tekster ---------- */

export const fmtDuration = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

export function endText(r: EndReason | null) {
  switch (r) {
    case 'declined':
      return 'Opkaldet blev afvist';
    case 'busy':
      return 'Optaget';
    case 'no-answer':
      return 'Intet svar';
    case 'failed':
      return 'Forbindelsen blev afbrudt';
    case 'denied':
      return 'Giv adgang til mikrofon (og kamera) i browseren for at ringe';
    case 'unsupported':
      return 'Opkald virker kun i browseren endnu';
    case 'cancelled':
      return 'Ubesvaret opkald';
    default:
      return 'Opkaldet er slut';
  }
}

/** Tekst til et opkald i samtalen og samtalelisten */
export function callLabel(call: { video?: boolean; status?: string; seconds?: number } | null | undefined, mine: boolean) {
  const kind = call?.video ? 'Videoopkald' : 'Opkald';
  if (!call) return kind;
  if (call.status === 'ended') return `${kind} · ${fmtDuration(call.seconds ?? 0)}`;
  if (call.status === 'declined') return mine ? `${kind} · afvist` : `Afvist ${kind.toLowerCase()}`;
  if (call.status === 'busy') return `${kind} · optaget`;
  return mine ? `${kind} · intet svar` : `Ubesvaret ${kind.toLowerCase()}`;
}
