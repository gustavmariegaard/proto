import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { Chip } from '../../components/Chip';
import { Icon } from '../../components/Icon';
import { SegmentedControl } from '../../components/SegmentedControl';
import {
  attendeeCount,
  dateBadge,
  isDiscoverable,
  isMine,
  rsvpLabel,
  shortDate,
  toIso,
  type EventItem,
  type Rsvp,
} from '../../data/events';
import { setRsvp, useEvents } from './store';
import './Events.css';

type Tab = 'dine' | 'find';
type Filter = 'alle' | Exclude<Rsvp, 'none'>;
type When = 'alle' | 'i-dag' | 'uge' | 'weekend';

const tabs: { value: Tab; label: string }[] = [
  { value: 'dine', label: 'Dine begivenheder' },
  { value: 'find', label: 'Find begivenheder' },
];

/** Rækkefølgen på filtrene. Et filter vises kun, hvis mindst én af dine begivenheder har den status. */
const statusFilters: Exclude<Filter, 'alle'>[] = ['interesseret', 'deltager', 'maaske', 'deltager-ikke'];

const whens: { value: When; label: string }[] = [
  { value: 'alle', label: 'Alle' },
  { value: 'i-dag', label: 'I dag' },
  { value: 'uge', label: 'Denne uge' },
  { value: 'weekend', label: 'Weekend' },
];

function matchesFilter(e: EventItem, filter: Filter) {
  return filter === 'alle' || e.rsvp === filter;
}

/** Dato-interval for chipsene. Ugen slutter søndag; weekenden er den kommende lørdag og søndag. */
function whenRange(when: When): [string, string] | null {
  if (when === 'alle') return null;
  const today = new Date();
  const iso = toIso(today);
  if (when === 'i-dag') return [iso, iso];
  const dow = today.getDay(); // 0 = søndag
  const toSunday = (7 - dow) % 7;
  const sunday = new Date(today);
  sunday.setDate(today.getDate() + toSunday);
  if (when === 'uge') return [iso, toIso(sunday)];
  const saturday = new Date(sunday);
  saturday.setDate(sunday.getDate() - 1);
  return [dow === 0 ? iso : toIso(saturday), toIso(sunday)];
}

function matchesSearch(e: EventItem, q: string) {
  if (!q) return true;
  const hay = `${e.title} ${e.place} ${e.organizer.name} ${e.description}`.toLocaleLowerCase('da');
  return q
    .toLocaleLowerCase('da')
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => hay.includes(word));
}

/** Mærket på kortet: din status, ellers "Privat" for private begivenheder. */
function statusFor(e: EventItem) {
  if (e.rsvp !== 'none') return rsvpLabel[e.rsvp];
  return e.visibility === 'privat' ? 'Privat' : undefined;
}

export function EventCard({ event }: { event: EventItem }) {
  const { day, month } = dateBadge(event.date);
  const status = statusFor(event);
  const sharedPublicly = event.createdByMe && event.visibility === 'offentlig';
  return (
    <Link to={`/begivenheder/${event.id}`} className="event-card">
      <span className="event-card__date" aria-hidden="true">
        <span className="event-card__day">{day}</span>
        <span className="t-micro">{month}</span>
      </span>
      <span className="event-card__text">
        <span className="t-heading-s">{event.title}</span>
        <span className="t-caption event-card__place">{event.place}</span>
        {sharedPublicly && <span className="t-caption event-card__note">Synlig for alle under Find begivenheder</span>}
      </span>
      {status && <span className="event-card__status">{status}</span>}
    </Link>
  );
}

function participants(n: number) {
  return `${n} deltager`;
}

/** Kort i Find begivenheder: billede, dato, titel, sted, arrangør, antal og hurtige svar. */
function DiscoverCard({ event, onJoin }: { event: EventItem; onJoin: (rsvp: 'deltager' | 'interesseret') => void }) {
  const { organizer } = event;
  return (
    <article className="find-card">
      <Link to={`/begivenheder/${event.id}`} className="find-card__link">
        <img className="find-card__photo" src={event.image} alt="" loading="lazy" />
        <span className="find-card__body">
          <span className="t-caption-strong find-card__when">
            {shortDate(event.date)} · {event.time.replace(/^Kl\. /, 'kl. ')}
          </span>
          <span className="t-heading-s">{event.title}</span>
          <span className="t-caption find-card__muted find-card__line">
            <Icon name="pin" size={16} />
            {event.place}
          </span>
          <span className="find-card__meta">
            {organizer.initials ? (
              <span className={`avatar avatar--S avatar--${organizer.tone}`} aria-hidden="true">
                {organizer.initials}
              </span>
            ) : (
              <Avatar name={organizer.name} tone={organizer.tone} src={organizer.avatarSrc} size="S" />
            )}
            <span className="t-caption find-card__org">{organizer.name}</span>
            <span className="t-caption find-card__muted find-card__count">{participants(attendeeCount(event))}</span>
          </span>
        </span>
      </Link>
      <div className="find-card__actions">
        <Button variant="secondary" onClick={() => onJoin('interesseret')} aria-label={`Interesseret i ${event.title}`}>
          Interesseret
        </Button>
        <Button onClick={() => onJoin('deltager')} aria-label={`Deltag i ${event.title}`}>
          Deltag
        </Button>
      </div>
    </article>
  );
}

/** Begivenheder (fanen i appen). Kun indholdet – topbar og menu kommer fra AppShell. */
export function Events() {
  const navigate = useNavigate();
  const events = useEvents();
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get('vis') === 'find' ? 'find' : 'dine';
  const [filter, setFilter] = useState<Filter>('alle');
  const [when, setWhen] = useState<When>('alle');
  const [query, setQuery] = useState('');
  const [moved, setMoved] = useState<{ title: string; rsvp: 'deltager' | 'interesseret' } | null>(null);

  const setTab = (next: Tab) => {
    setMoved(null);
    setParams(next === 'find' ? { vis: 'find' } : {}, { replace: true });
  };

  const byDate = (a: EventItem, b: EventItem) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time);
  const allMine = events.filter(isMine);
  const filters: { value: Filter; label: string }[] = [
    { value: 'alle', label: 'Alle' },
    ...statusFilters.filter((f) => allMine.some((e) => e.rsvp === f)).map((f) => ({ value: f, label: rsvpLabel[f] })),
  ];
  // Forsvinder det valgte filter (fx fordi du har ændret dit svar), vises alle igen
  const activeFilter: Filter = filters.some((f) => f.value === filter) ? filter : 'alle';
  const mine = allMine.filter((e) => matchesFilter(e, activeFilter)).sort(byDate);

  const today = toIso(new Date());
  const range = whenRange(when);
  const discoverable = events.filter((e) => isDiscoverable(e, today));
  const found = discoverable
    .filter((e) => (range ? e.date >= range[0] && e.date <= range[1] : true))
    .filter((e) => matchesSearch(e, query.trim()))
    .sort(byDate);

  const join = (e: EventItem, rsvp: 'deltager' | 'interesseret') => {
    setRsvp(e.id, rsvp);
    setMoved({ title: e.title, rsvp });
  };

  return (
    <div className="events">
      <div className="events__head">
        <h1 className="t-title-xl">Begivenheder</h1>
        <Button onClick={() => navigate('/begivenheder/ny')}>Opret</Button>
      </div>

      <SegmentedControl label="Vis begivenheder" options={tabs} value={tab} onChange={setTab} />

      {tab === 'dine' ? (
        <>
          <p className="t-body-s events__intro">Det, du er inviteret til, har svaret på eller selv har oprettet.</p>
          <div className="events__filters events__filters--scroll" role="group" aria-label="Filtrer dine begivenheder">
            {filters.map((f) => (
              <Chip key={f.value} selected={activeFilter === f.value} onClick={() => setFilter(f.value)}>
                {f.label}
              </Chip>
            ))}
          </div>
          {mine.length ? (
            <ul className="events__list">
              {mine.map((e) => (
                <li key={e.id}>
                  <EventCard event={e} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="t-body-s events__empty">Ingen begivenheder her endnu.</p>
          )}
          <button type="button" className="events__more t-label" onClick={() => setTab('find')}>
            Find offentlige begivenheder i nærheden
            <Icon name="search" size={20} />
          </button>
        </>
      ) : (
        <>
          <p className="t-body-s events__intro">
            Offentlige begivenheder i nærheden. Du behøver ikke en invitation – tilmeld dig direkte.
          </p>
          <label className="events__search">
            <Icon name="search" size={20} />
            <input
              type="search"
              className="events__search-input"
              aria-label="Søg i begivenheder"
              placeholder="Søg efter titel, sted eller arrangør"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <div className="events__filters events__filters--scroll" role="group" aria-label="Hvornår">
            {whens.map((w) => (
              <Chip key={w.value} selected={when === w.value} onClick={() => setWhen(w.value)}>
                {w.label}
              </Chip>
            ))}
          </div>

          <div aria-live="polite" className="events__live">
            {moved && (
              <div className="events__moved">
                <p className="t-body-s">
                  {moved.rsvp === 'deltager' ? 'Du deltager i' : 'Du er interesseret i'} „{moved.title}“. Den ligger nu under Dine begivenheder.
                </p>
                <button type="button" className="events__moved-link t-label" onClick={() => setTab('dine')}>
                  Se dine begivenheder
                </button>
              </div>
            )}
          </div>

          {found.length ? (
            <ul className="events__list">
              {found.map((e) => (
                <li key={e.id}>
                  <DiscoverCard event={e} onJoin={(rsvp) => join(e, rsvp)} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="t-body-s events__empty">
              {discoverable.length
                ? 'Ingen offentlige begivenheder passer til din søgning. Prøv en anden dato eller et andet ord.'
                : 'Du er allerede med i alle offentlige begivenheder i nærheden.'}
            </p>
          )}
        </>
      )}
    </div>
  );
}
