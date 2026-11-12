import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/Button';
import { Chip } from '../../components/Chip';
import { TextField } from '../../components/TextField';
import { inviteGroups, type Guest, type Visibility } from '../../data/events';
import { img } from '../../data/sample';
import { useSession } from '../../state/session';
import { CloseHeader, Toggle, useClose } from '../create/parts';
import { addEvent } from './store';
import './EventDetail.css';
import './NewEvent.css';

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Felt, der viser pladsholder som tekst og skifter til dato/tid-vælger ved tryk. */
function PickerField({ kind, label, value, onChange }: { kind: 'date' | 'time'; label: string; value: string; onChange: (v: string) => void }) {
  const [focused, setFocused] = useState(false);
  return (
    <TextField
      label={label}
      type={focused || value ? kind : 'text'}
      value={value}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

/** Ny begivenhed (fuld skærm). Offentlig / Privat skifter mellem de to Figma-tilstande. */
export function NewEvent() {
  const navigate = useNavigate();
  const close = useClose('/begivenheder');
  const { profile } = useSession();

  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [place, setPlace] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('offentlig');
  const [allowShare, setAllowShare] = useState(true);
  const [groups, setGroups] = useState<string[]>(['familien']);
  const [description, setDescription] = useState('');

  const isPublic = visibility === 'offentlig';
  const toggleGroup = (id: string) => setGroups((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));

  const create = () => {
    const invited: Guest[] = [];
    if (!isPublic) {
      for (const group of inviteGroups.filter((gr) => groups.includes(gr.id))) {
        for (const m of group.members) if (!invited.some((x) => x.id === m.id)) invited.push(m);
      }
    }
    const id = addEvent({
      title: title.trim(),
      date: date || todayIso(),
      time: time ? `Kl. ${time.replace(':', '.')}` : 'Tidspunkt følger',
      place: place.trim() || 'Sted følger',
      organizer: { name: profile.name.trim() || 'Dig', tone: 'sand', avatarSrc: img('mig.jpg') },
      visibility,
      description: description.trim(),
      image: img('begivenhed.jpg'),
      allowShare: isPublic && allowShare,
      rsvp: 'deltager',
      invitedMe: false,
      guests: { going: [], notGoing: [], invited },
    });
    navigate(`/begivenheder/${id}`, { replace: true });
  };

  return (
    <div className="event-screen">
      <CloseHeader title="Ny begivenhed" onClose={close} />
      <form
        className="event-screen__content"
        onSubmit={(e) => {
          e.preventDefault();
          if (title.trim()) create();
        }}
      >
        <TextField label="Titel" value={title} onChange={(e) => setTitle(e.target.value)} />
        <div className="new-event__row">
          <PickerField kind="date" label="Dato" value={date} onChange={setDate} />
          <PickerField kind="time" label="Tid" value={time} onChange={setTime} />
        </div>
        <TextField label="Sted" value={place} onChange={(e) => setPlace(e.target.value)} />

        <h2 className="t-heading-s" id="new-event-privacy">
          Hvem kan se den?
        </h2>
        <div className="new-event__chips" role="radiogroup" aria-labelledby="new-event-privacy">
          {(['privat', 'offentlig'] as const).map((v) => (
            <Chip
              key={v}
              role="radio"
              aria-checked={visibility === v}
              aria-pressed={undefined}
              selected={visibility === v}
              onClick={() => setVisibility(v)}
            >
              {v === 'privat' ? 'Privat' : 'Offentlig'}
            </Chip>
          ))}
        </div>
        <p className="t-caption event-screen__muted new-event__full">
          {isPublic
            ? 'Offentlig: alle verificerede kan finde den, vise interesse og tilmelde sig. Den vises under Begivenheder og Opdag.'
            : 'Privat: kun dem, du inviterer, kan se den og tilmelde sig.'}
        </p>

        {isPublic ? (
          <button
            type="button"
            role="switch"
            aria-checked={allowShare}
            className="new-event__switch"
            onClick={() => setAllowShare((v) => !v)}
          >
            <span className="new-event__switch-text">
              <span className="t-label">Tillad deling</span>
              <span className="t-caption event-screen__muted">Gæster kan dele begivenheden videre.</span>
            </span>
            <Toggle on={allowShare} />
          </button>
        ) : (
          <>
            <h2 className="t-heading-s" id="new-event-invite">
              Inviter
            </h2>
            <div className="new-event__chips new-event__full" role="group" aria-labelledby="new-event-invite">
              {inviteGroups.map((gr) => (
                <Chip key={gr.id} selected={groups.includes(gr.id)} onClick={() => toggleGroup(gr.id)}>
                  {gr.label}
                </Chip>
              ))}
            </div>
          </>
        )}

        <textarea
          className="new-event__desc"
          aria-label="Beskrivelse"
          placeholder="Beskrivelse"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <Button type="submit" block disabled={!title.trim()}>
          Opret begivenhed
        </Button>
      </form>
    </div>
  );
}
