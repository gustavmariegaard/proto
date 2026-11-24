import { useMemo, useSyncExternalStore } from 'react';
import { formatPrice, initialRadius, listings as sampleListings, type Listing } from '../../data/market';
import { contacts, type Thread } from '../../data/messages';
import { keep, save } from '../../state/keep';
import { openConversation, openPersonConversation, sendMessage } from '../messages/store';

/*
 * Et lille lager til Torvet: dine egne annoncer, gemte annoncer
 * og annoncer, du har markeret som solgt. Huskes i fanen via keep/save.
 */

type MarketState = {
  /** Annoncer, du selv har sat til salg (nyeste først) */
  own: Listing[];
  /** Id'er på gemte annoncer */
  saved: string[];
  /** Senest sete annoncer (nyeste først) */
  recent?: string[];
  /** Valgt afstand på Torvet (km). null = hele landet. */
  radius?: number | null;
};

const KEY = 'market';
let state: MarketState = keep<MarketState>(KEY, { own: [], saved: [], recent: [] });
const listeners = new Set<() => void>();

function set(next: MarketState) {
  state = next;
  save(KEY, next);
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getState = () => state;

export function useMarket() {
  return useSyncExternalStore(subscribe, getState, getState);
}

export function useRadius() {
  const { radius } = useMarket();
  return radius === undefined ? initialRadius : radius;
}

/** Alle annoncer: dine egne først, derefter eksemplerne */
export function useListings() {
  const { own } = useMarket();
  return useMemo(() => [...own, ...sampleListings].filter((l) => !l.sold), [own]);
}

export function useListing(id: string | undefined) {
  return useListings().find((l) => l.id === id);
}

export function useSaved(id: string) {
  return useMarket().saved.includes(id);
}

export function toggleSaved(id: string) {
  const saved = state.saved.includes(id) ? state.saved.filter((x) => x !== id) : [id, ...state.saved];
  set({ ...state, saved });
}

function slug(text: string) {
  return (
    text
      .toLowerCase()
      .replace(/æ/g, 'ae')
      .replace(/ø/g, 'oe')
      .replace(/å/g, 'aa')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 32) || 'annonce'
  );
}

/** Sætter en ny annonce til salg. Returnerer dens id. */
export function addListing(listing: Omit<Listing, 'id' | 'createdAt' | 'mine' | 'sold' | 'km'>): string {
  const id = `${slug(listing.title)}-${Date.now().toString(36)}`;
  const full: Listing = { ...listing, id, km: 0, createdAt: Date.now(), mine: true, sold: false };
  set({ ...state, own: [full, ...state.own] });
  return id;
}

function updateOwn(id: string, patch: Partial<Listing>) {
  set({ ...state, own: state.own.map((l) => (l.id === id ? { ...l, ...patch } : l)) });
}

export const setSold = (id: string, sold: boolean) => updateOwn(id, { sold });
export const setPrice = (id: string, price: number) => updateOwn(id, { price });

export function deleteListing(id: string) {
  set({
    ...state,
    own: state.own.filter((l) => l.id !== id),
    saved: state.saved.filter((x) => x !== id),
    recent: (state.recent ?? []).filter((x) => x !== id),
  });
}

export function setRadius(radius: number | null) {
  set({ ...state, radius });
}

/** Husker, at du har kigget på annoncen (de 12 seneste) */
export function markViewed(id: string) {
  const recent = state.recent ?? [];
  if (recent[0] === id) return;
  set({ ...state, recent: [id, ...recent.filter((x) => x !== id)].slice(0, 12) });
}

/**
 * Annoncer i de kategorier, du senest har kigget på – nyeste kategori først.
 * Tom, hvis du ikke har set nogen annoncer endnu.
 */
export function relatedFirst(all: Listing[], recent: string[] = []): { forYou: Listing[]; rest: Listing[] } {
  const order: string[] = [];
  for (const id of recent) {
    const cat = all.find((l) => l.id === id)?.category;
    if (cat && !order.includes(cat)) order.push(cat);
  }
  const rank = (l: Listing) => order.indexOf(l.category);
  const forYou = all
    .filter((l) => rank(l) >= 0 && !l.sold)
    .sort((a, b) => rank(a) - rank(b));
  return { forYou, rest: all.filter((l) => !forYou.includes(l)) };
}

/** Kontakten i Beskeder, hvis sælgeren er en, du kender */
export function sellerContactId(l: Listing) {
  return contacts.find((c) => c.name === l.seller.name)?.id;
}

/** Første linje, når du skriver om en annonce, fx "Om: Spisebord i massiv eg · 1.200 kr." */
export function aboutLine(l: Listing) {
  return `Om: ${l.title} · ${formatPrice(l.price)}`;
}

/** Finder (eller opretter) samtalen med sælgeren. Returnerer dens id. */
export function sellerThread(l: Listing): string {
  const contactId = sellerContactId(l);
  if (contactId) return openConversation([contactId]);
  return openPersonConversation({ name: l.seller.name, tone: l.seller.tone, avatarSrc: l.seller.avatarSrc });
}

/** Er samtalens seneste "Om: …"-linje allerede denne annonce? */
function aboutSent(l: Listing, thread: Thread | undefined) {
  const last = [...(thread?.messages ?? [])]
    .reverse()
    .find((m) => m.from === 'me' && m.kind === 'text' && m.text.startsWith('Om: '));
  return last?.kind === 'text' && last.text === aboutLine(l);
}

/**
 * Sender en besked om annoncen: først "Om: …" (medmindre samtalen
 * allerede handler om den), så din tekst.
 */
export function sendAboutListing(threadId: string, l: Listing, text: string, threads: Thread[]) {
  if (!aboutSent(l, threads.find((t) => t.id === threadId))) sendMessage(threadId, aboutLine(l));
  sendMessage(threadId, text);
}

/** Skal annoncekortet vises i samtalen? (Nej, når "Om: …" allerede er sendt.) */
export function needsAbout(threadId: string, l: Listing, threads: Thread[]) {
  return !aboutSent(l, threads.find((t) => t.id === threadId));
}

/**
 * Åbner samtalen med sælgeren. Uden tekst sendes intet – samtalen viser
 * annoncen som et lille kort, og "Om: …" følger med din første besked.
 * Med tekst (fx et bud) sendes den med det samme.
 * Returnerer stien, der skal navigeres til.
 */
export function messageSeller(l: Listing, text?: string, threads: Thread[] = []): string {
  const threadId = sellerThread(l);
  const body = text?.trim();
  if (body) {
    sendAboutListing(threadId, l, body, threads);
    return `/beskeder/${threadId}`;
  }
  return `/beskeder/${threadId}?annonce=${encodeURIComponent(l.id)}`;
}
