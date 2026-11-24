import { useSyncExternalStore } from 'react';
import { keep, save } from './keep';
import { useSession } from './session';

/*
 * Dine emner: ét fælles sæt for Offentlig debat og Flicks.
 * Hvilke emner man følger, ligger på profilen (session). Her ligger,
 * hvilke af dem man midlertidigt har slået fra i filteret, så filteret
 * er det samme begge steder.
 */

let off: string[] = keep('topics.off', []);
const listeners = new Set<() => void>();
const get = () => off;

function setOff(next: string[]) {
  off = next;
  save('topics.off', next);
  listeners.forEach((l) => l());
}

export function useTopics() {
  const { profile, setProfile } = useSession();
  const offNow = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
    get,
    get,
  );
  const topics = profile.interests;
  const isOn = (t: string) => !offNow.includes(t);
  const active = topics.filter(isOn);
  return {
    /** Emner, man følger */
    topics,
    /** De af dem, der er slået til i filteret */
    active,
    isOn,
    /** Slå et emne til eller fra i filteret */
    toggle: (t: string) => setOff(offNow.includes(t) ? offNow.filter((x) => x !== t) : [...offNow, t]),
    following: (t: string) => topics.includes(t),
    /** Følg eller stop med at følge et emne (Rediger emner) */
    follow: (t: string) => {
      if (topics.includes(t)) {
        setProfile({ ...profile, interests: topics.filter((x) => x !== t) });
      } else {
        setProfile({ ...profile, interests: [...topics, t] });
        // Et emne, man lige har valgt, skal vises med det samme
        if (offNow.includes(t)) setOff(offNow.filter((x) => x !== t));
      }
    },
  };
}

/** Passer indholdet til filteret? Er alle emner slået fra, vises alt (som i Offentlig debat). */
export function inTopics(tags: string[] | undefined, active: string[]) {
  return active.length === 0 || (tags ?? []).some((t) => active.includes(t));
}
