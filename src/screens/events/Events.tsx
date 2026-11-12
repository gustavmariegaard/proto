import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/Button';
import { Chip } from '../../components/Chip';
import { dateBadge, rsvpLabel, type EventItem } from '../../data/events';
import { useEvents } from './store';
import './Events.css';

type Filter = 'alle' | 'deltager' | 'interesseret' | 'private';

const filters: { value: Filter; label: string }[] = [
  { value: 'alle', label: 'Alle' },
  { value: 'deltager', label: 'Deltager' },
  { value: 'interesseret', label: 'Interesseret' },
  { value: 'private', label: 'Private' },
];

function matchesFilter(e: EventItem, filter: Filter) {
  if (filter === 'deltager') return e.rsvp === 'deltager';
  if (filter === 'interesseret') return e.rsvp === 'interesseret';
  if (filter === 'private') return e.visibility === 'privat';
  return true;
}

/** Mærket på kortet: din status, ellers "Privat" for private begivenheder. */
function statusFor(e: EventItem) {
  if (e.rsvp !== 'none') return rsvpLabel[e.rsvp];
  return e.visibility === 'privat' ? 'Privat' : undefined;
}

export function EventCard({ event }: { event: EventItem }) {
  const { day, month } = dateBadge(event.date);
  const status = statusFor(event);
  return (
    <Link to={`/begivenheder/${event.id}`} className="event-card">
      <span className="event-card__date" aria-hidden="true">
        <span className="event-card__day">{day}</span>
        <span className="t-micro">{month}</span>
      </span>
      <span className="event-card__text">
        <span className="t-heading-s">{event.title}</span>
        <span className="t-caption event-card__place">{event.place}</span>
      </span>
      {status && <span className="event-card__status">{status}</span>}
    </Link>
  );
}

/** Begivenheder (fanen i appen). Kun indholdet – topbar og menu kommer fra AppShell. */
export function Events() {
  const navigate = useNavigate();
  const events = useEvents();
  const [filter, setFilter] = useState<Filter>('alle');
  const shown = events.filter((e) => matchesFilter(e, filter)).sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="events">
      <div className="events__head">
        <h1 className="t-title-xl">Begivenheder</h1>
        <Button onClick={() => navigate('/begivenheder/ny')}>Opret</Button>
      </div>
      <p className="t-body-s events__intro">Det der sker i dine cirkler og i nærområdet. Tryk for at se detaljer.</p>
      <div className="events__filters" role="group" aria-label="Vis begivenheder">
        {filters.map((f) => (
          <Chip key={f.value} selected={filter === f.value} onClick={() => setFilter(f.value)}>
            {f.label}
          </Chip>
        ))}
      </div>
      {shown.length ? (
        <ul className="events__list">
          {shown.map((e) => (
            <li key={e.id}>
              <EventCard event={e} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="t-body-s events__empty">Ingen begivenheder her endnu.</p>
      )}
    </div>
  );
}
