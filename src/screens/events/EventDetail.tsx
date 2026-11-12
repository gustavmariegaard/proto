import { Link, useParams } from 'react-router-dom';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { PageHeader } from '../../components/PageHeader';
import { Tag } from '../../components/Tag';
import { longDate, type EventItem, type Guest, type Rsvp } from '../../data/events';
import { img } from '../../data/sample';
import { setRsvp, useEvent } from './store';
import './EventDetail.css';

const me: Guest = { id: 'mig', name: 'dig', tone: 'sand', avatarSrc: img('mig.jpg') };

/** "Mette og Jonas og dig" – som i Figma */
function names(list: Guest[]) {
  const text = list.map((g) => g.name).join(' og ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Gæstelisterne med dig placeret efter dit svar. */
function guestRows(event: EventItem, rsvp: Rsvp) {
  const { going, notGoing, invited } = event.guests;
  const awaiting = event.invitedMe && (rsvp === 'none' || rsvp === 'interesseret');
  return [
    { label: 'Deltager', list: rsvp === 'deltager' ? [...going, me] : going },
    { label: 'Deltager ikke', list: rsvp === 'deltager-ikke' ? [...notGoing, me] : notGoing },
    { label: 'Inviteret', list: awaiting ? [...invited, me] : invited },
  ].filter((row) => row.list.length > 0);
}

/** Begivenhed (fuld skærm). Interesseret og Deltager / Deltager ikke skifter din status. */
export function EventDetail() {
  const { id } = useParams();
  const event = useEvent(id);

  if (!event) {
    return (
      <div className="event-screen">
        <PageHeader title="Begivenhed" fallback="/begivenheder" />
        <main className="event-screen__content">
          <p className="t-body-s event-screen__muted">Begivenheden findes ikke længere.</p>
          <Link to="/begivenheder" className="event-screen__link t-label">
            Se alle begivenheder
          </Link>
        </main>
      </div>
    );
  }

  const { rsvp } = event;
  const toggle = (value: Exclude<Rsvp, 'none'>) => setRsvp(event.id, rsvp === value ? 'none' : value);
  const isPublic = event.visibility === 'offentlig';

  return (
    <div className="event-screen">
      <PageHeader title="Begivenhed" fallback="/begivenheder" />
      <main className="event-screen__content">
        <img className="event-screen__photo" src={event.image} alt="" />
        <h2 className="t-title-l">{event.title}</h2>

        <div className="event-info">
          <span className="event-info__tile" aria-hidden="true">
            <Icon name="calendar" />
          </span>
          <span className="event-info__text">
            <span className="t-label">{longDate(event.date)}</span>
            <span className="t-caption event-screen__muted">{event.time}</span>
          </span>
        </div>

        <div className="event-info">
          <span className="event-info__tile" aria-hidden="true">
            <Icon name="pin" />
          </span>
          <span className="event-info__text">
            <span className="t-label">{event.place}</span>
            <span className="t-caption event-screen__muted">Vis på kort</span>
          </span>
        </div>

        <div className="event-organizer">
          {event.organizer.initials ? (
            <span className={`avatar avatar--M avatar--${event.organizer.tone}`} aria-hidden="true">
              {event.organizer.initials}
            </span>
          ) : (
            <Avatar name={event.organizer.name} tone={event.organizer.tone} src={event.organizer.avatarSrc} />
          )}
          <span className="event-info__text">
            <span className="t-heading-s">{event.organizer.name}</span>
            <span className="t-caption event-screen__muted">Arrangør</span>
          </span>
        </div>

        <div className="event-privacy">
          <Tag>{isPublic ? 'Offentlig begivenhed' : 'Privat begivenhed'}</Tag>
          <p className="t-caption event-screen__muted">
            {isPublic ? 'Alle verificerede kan se og tilmelde sig.' : 'Kun inviterede kan se og tilmelde sig.'}
          </p>
        </div>

        {event.description && <p className="t-body-s event-screen__desc">{event.description}</p>}

        <Button
          block
          variant={rsvp === 'interesseret' ? 'primary' : 'secondary'}
          aria-pressed={rsvp === 'interesseret'}
          onClick={() => toggle('interesseret')}
        >
          Interesseret
        </Button>

        <div className="event-picker" role="group" aria-label="Dit svar">
          {(['deltager', 'deltager-ikke'] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={rsvp === value}
              className={['event-picker__option', rsvp === value && 'event-picker__option--on'].filter(Boolean).join(' ')}
              onClick={() => toggle(value)}
            >
              {value === 'deltager' ? 'Deltager' : 'Deltager ikke'}
            </button>
          ))}
        </div>

        <section className="event-guests" aria-labelledby="event-guests-title">
          <h3 id="event-guests-title" className="t-heading-m">
            Gæster
          </h3>
          {guestRows(event, rsvp).map((row) => (
            <div key={row.label} className="event-guests__row">
              <span className="t-caption-strong event-guests__label">{row.label}</span>
              <span className="event-guests__faces" aria-hidden="true">
                {row.list.map((g) => (
                  <Avatar key={g.id} name={g.name} tone={g.tone} size="S" src={g.avatarSrc} />
                ))}
              </span>
              <span className="t-caption event-guests__names">{names(row.list)}</span>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
