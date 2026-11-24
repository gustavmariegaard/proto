import { useState } from 'react';
import { Avatar } from '../../components/Avatar';
import { Icon } from '../../components/Icon';
import { groupMembers, guestFullNames, guestPeople, myFollowers, type Guest } from '../../data/events';
import { groupStore } from '../more/store';
import './InvitePicker.css';

export type Invites = { allFollowers: boolean; people: string[]; groups: string[] };

/** Alle, der bliver inviteret (uden dubletter) */
export function resolveInvites(v: Invites): Guest[] {
  const out: Guest[] = [];
  const add = (gs: Guest[]) => gs.forEach((g) => !out.some((x) => x.id === g.id) && out.push(g));
  if (v.allFollowers) add(myFollowers);
  v.groups.forEach((id) => add(groupMembers[id] ?? []));
  add(v.people.map((id) => guestPeople[id]!).filter(Boolean));
  return out;
}

/**
 * Inviter: enten alle dine følgere med ét tryk, eller søg personer og grupper frem.
 * En gruppe inviterer alle dens medlemmer.
 */
export function InvitePicker({ value, onChange }: { value: Invites; onChange: (v: Invites) => void }) {
  const [q, setQ] = useState('');
  const groups = groupStore.use();
  const query = q.trim().toLowerCase();
  const people = Object.values(guestPeople).filter((p) => (guestFullNames[p.id] ?? p.name).toLowerCase().includes(query) && !value.people.includes(p.id));
  const groupHits = groups.filter((g) => g.name.toLowerCase().includes(query) && !value.groups.includes(g.id));
  const total = resolveInvites(value).length;

  const set = (patch: Partial<Invites>) => onChange({ ...value, ...patch });
  const pick = (patch: Partial<Invites>) => {
    set(patch);
    setQ('');
  };

  return (
    <div className="invite">
      <button
        type="button"
        role="switch"
        aria-checked={value.allFollowers}
        className="invite__all"
        onClick={() => set({ allFollowers: !value.allFollowers })}
      >
        <span className="invite__all-icon" aria-hidden="true">
          <Icon name="user" size={20} />
        </span>
        <span className="invite__all-text">
          <span className="t-label">Alle dine følgere</span>
          <span className="t-caption invite__muted">{myFollowers.length} personer</span>
        </span>
        <span className={['invite__toggle', value.allFollowers && 'invite__toggle--on'].filter(Boolean).join(' ')} aria-hidden="true" />
      </button>

      <input
        className="field"
        type="search"
        placeholder="Søg efter navn eller gruppe"
        aria-label="Søg efter navn eller gruppe"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      {query && (
        <ul className="invite__results" aria-label="Resultater">
          {people.slice(0, 5).map((p) => (
            <li key={p.id}>
              <button type="button" className="invite__row" onClick={() => pick({ people: [...value.people, p.id] })}>
                <Avatar name={guestFullNames[p.id] ?? p.name} tone={p.tone} src={p.avatarSrc} size="S" />
                <span className="t-label invite__name">{guestFullNames[p.id] ?? p.name}</span>
                <Icon name="plus" size={18} />
              </button>
            </li>
          ))}
          {groupHits.slice(0, 4).map((g) => (
            <li key={g.id}>
              <button type="button" className="invite__row" onClick={() => pick({ groups: [...value.groups, g.id] })}>
                <span className={`invite__group avatar--${g.tone}`} aria-hidden="true">
                  {g.avatarSrc ? <img src={g.avatarSrc} alt="" /> : g.initials}
                </span>
                <span className="invite__name">
                  <span className="t-label">{g.name}</span>
                  <span className="t-caption invite__muted">Inviter alle {(groupMembers[g.id] ?? []).length} medlemmer</span>
                </span>
                <Icon name="plus" size={18} />
              </button>
            </li>
          ))}
          {people.length + groupHits.length === 0 && <li className="t-caption invite__muted">Ingen hedder “{q.trim()}”.</li>}
        </ul>
      )}

      {(value.people.length > 0 || value.groups.length > 0) && (
        <ul className="invite__chosen" aria-label="Inviteret">
          {value.groups.map((id) => {
            const g = groups.find((x) => x.id === id);
            return (
              <li key={id}>
                <button type="button" className="invite__chip" aria-label={`Fjern ${g?.name}`} onClick={() => set({ groups: value.groups.filter((x) => x !== id) })}>
                  <Icon name="circles" size={14} /> {g?.name} <Icon name="close" size={14} />
                </button>
              </li>
            );
          })}
          {value.people.map((id) => (
            <li key={id}>
              <button type="button" className="invite__chip" aria-label={`Fjern ${guestFullNames[id]}`} onClick={() => set({ people: value.people.filter((x) => x !== id) })}>
                {guestFullNames[id] ?? id} <Icon name="close" size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="t-caption invite__muted" aria-live="polite">
        {total === 0 ? 'Ingen inviteret endnu.' : total === 1 ? '1 person bliver inviteret.' : `${total} personer bliver inviteret.`}
      </p>
    </div>
  );
}
