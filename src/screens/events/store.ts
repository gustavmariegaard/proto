import { useSyncExternalStore } from 'react';
import { initialEvents, type EventItem, type Rsvp } from '../../data/events';

/*
 * Et lille lager til begivenheder i hukommelsen.
 * Dine svar og nye begivenheder er der stadig, når man går
 * mellem listen og en begivenhed. Intet sendes nogen steder hen.
 */

import { keep, save } from '../../state/keep';

/** Gemte svar beholdes, og nye eksempler, der ikke var gemt endnu, kommer med. */
function withNewSamples(saved: EventItem[]) {
  const ids = new Set(saved.map((e) => e.id));
  return [...saved, ...initialEvents.filter((e) => !ids.has(e.id))];
}

let events: EventItem[] = withNewSamples(keep('events', initialEvents));
const listeners = new Set<() => void>();

function set(next: EventItem[]) {
  events = next;
  save('events', next);
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getEvents = () => events;

export function useEvents() {
  return useSyncExternalStore(subscribe, getEvents, getEvents);
}

export function useEvent(id: string | undefined) {
  return useEvents().find((e) => e.id === id);
}

export function setRsvp(id: string, rsvp: Rsvp) {
  set(events.map((e) => (e.id === id ? { ...e, rsvp } : e)));
}

/** Tilføjer en ny begivenhed øverst og returnerer dens id. */
export function addEvent(event: Omit<EventItem, 'id'>): string {
  const id = `ny-${Date.now()}`;
  set([{ ...event, id }, ...events]);
  return id;
}
