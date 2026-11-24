import { useMemo, useSyncExternalStore } from 'react';
import { formatPrice, listings as sampleListings, type Listing } from '../../data/market';
import { contacts, type Thread } from '../../data/messages';
import { keep, save } from '../../state/keep';
import { openConversation, sendMessage } from '../messages/store';

/*
 * Et lille lager til Torvet: dine egne annoncer, gemte annoncer
 * og annoncer, du har markeret som solgt. Huskes i fanen via keep/save.
 */

type MarketState = {
  /** Annoncer, du selv har sat til salg (nyeste først) */
  own: Listing[];
  /** Id'er på gemte annoncer */
  saved: string[];
};

const KEY = 'market';
let state: MarketState = keep<MarketState>(KEY, { own: [], saved: [] });
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

/** Alle annoncer: dine egne først, derefter eksemplerne */
export function useListings() {
  const { own } = useMarket();
  return useMemo(() => [...own, ...sampleListings], [own]);
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
  set({ own: state.own.filter((l) => l.id !== id), saved: state.saved.filter((x) => x !== id) });
}

/** Kontakten i Beskeder, hvis sælgeren er en, du kender */
export function sellerContactId(l: Listing) {
  return contacts.find((c) => c.name === l.seller.name)?.id;
}

/** Første linje, når du skriver om en annonce, fx "Om: Spisebord i massiv eg · 1.200 kr." */
export function aboutLine(l: Listing) {
  return `Om: ${l.title} · ${formatPrice(l.price)}`;
}

/**
 * Skriver til sælgeren – altid som dig ("me"). Er sælgeren en kendt kontakt,
 * åbnes samtalen. Sender du tekst, kommer først en linje om annoncen
 * (medmindre samtalen allerede handler om den), og så din besked.
 * Returnerer stien, der skal navigeres til.
 */
export function messageSeller(l: Listing, text?: string, threads: Thread[] = []): string {
  const contactId = sellerContactId(l);
  if (!contactId) return '/beskeder/ny';
  const threadId = openConversation([contactId]);
  const body = text?.trim();
  if (body) {
    const thread = threads.find((t) => t.id === threadId);
    const lastAbout = [...(thread?.messages ?? [])]
      .reverse()
      .find((m) => m.from === 'me' && m.kind === 'text' && m.text.startsWith('Om: '));
    const about = aboutLine(l);
    if (!lastAbout || lastAbout.kind !== 'text' || lastAbout.text !== about) {
      sendMessage(threadId, about);
      sendMessage(threadId, body);
    } else {
      sendMessage(threadId, body);
    }
  }
  return `/beskeder/${threadId}`;
}
