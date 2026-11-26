import { useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { Button } from '../../components/Button';
import { Chip } from '../../components/Chip';
import { Icon } from '../../components/Icon';
import { PageHeader } from '../../components/PageHeader';
import { TextField } from '../../components/TextField';
import {
  addNote,
  deleteNote,
  editNote,
  notesFor,
  rateNote,
  reasons,
  statusLabel,
  toggleReason,
  useNotes,
  type Note,
  type NoteStatus,
  type Rating,
} from '../../state/notes';
import { usePost } from '../../state/posts';
import '../profile/Screens.css';
import '../profile/EditProfile.css';
import './Notes.css';

const MAX = 280;
const ratingLabel: Record<Rating, string> = { ja: 'Ja', lidt: 'Lidt', nej: 'Nej' };
const order: NoteStatus[] = ['vist', 'forslag', 'ikke'];

/**
 * Fællesskabsnoter på et opslag i Offentlig debat (inspireret af Community Notes på X).
 * Rute: /opslag/:id/noter
 */
export function Notes() {
  const { id } = useParams();
  const post = usePost(id);
  const state = useNotes();
  // null = ingen formular, 'ny' = ny note, ellers id på din note, der rettes
  const [form, setForm] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [source, setSource] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  if (!post || !id) return <Navigate to="/opdag" replace />;

  const notes = notesFor(state, id);
  const canSend = text.trim().length >= 10 && source.trim().length >= 4;

  const open = (n?: Note) => {
    setForm(n ? n.id : 'ny');
    setText(n?.text ?? '');
    setSource(n?.source ?? '');
  };

  const send = () => {
    if (!canSend) return;
    if (form === 'ny') addNote(id, text.trim(), source.trim());
    else if (form) editNote(form, text.trim(), source.trim());
    setForm(null);
  };

  const noteForm = (
    <form
      className="note note--form"
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
    >
      <textarea
        className="edit-profile__field t-body-s"
        aria-label="Hvad mangler opslaget?"
        placeholder="Hvad mangler opslaget?"
        maxLength={MAX}
        rows={4}
        value={text}
        onChange={(e) => setText(e.target.value)}
        autoFocus
      />
      <span className="t-caption edit-profile__count">
        {text.length}/{MAX}
      </span>
      <TextField label="Kilde (link)" inputMode="url" autoCapitalize="none" value={source} onChange={(e) => setSource(e.target.value)} />
      <div className="note__row">
        <Button variant="secondary" onClick={() => setForm(null)}>
          Annuller
        </Button>
        <Button type="submit" disabled={!canSend}>
          {form === 'ny' ? 'Send note' : 'Gem'}
        </Button>
      </div>
    </form>
  );

  const card = (n: Note) => {
    if (form === n.id) return <li key={n.id}>{noteForm}</li>;
    const mine = state.ratings[n.id];
    const count = n.ratings + (mine ? 1 : 0);
    return (
      <li key={n.id} className={['note', n.status === 'ikke' && 'note--faded'].filter(Boolean).join(' ')}>
        <p className={`t-caption-strong note__status note__status--${n.status}`}>
          {n.mine ? `Din note · ${statusLabel[n.status]}` : statusLabel[n.status]}
        </p>
        <p className="t-body-s">{n.text}</p>
        {n.source && <p className="t-caption note__muted note__source">Kilde: {n.source}</p>}

        {n.mine ? (
          deleting === n.id ? (
            <div className="note__row">
              <span className="t-caption-strong note__ask">Slet noten?</span>
              <Button variant="secondary" onClick={() => setDeleting(null)}>
                Annuller
              </Button>
              <Button onClick={() => deleteNote(n.id)}>Slet</Button>
            </div>
          ) : (
            <div className="note__row">
              <span className="t-caption note__muted note__ask">
                {n.ratings ? `${n.ratings} vurderinger indtil videre` : 'Ingen vurderinger endnu'}
              </span>
              <button type="button" className="note__btn" onClick={() => open(n)}>
                <Icon name="edit" size={16} />
                <span className="t-label">Rediger</span>
              </button>
              <button type="button" className="note__btn" onClick={() => setDeleting(n.id)}>
                <span className="t-label">Slet</span>
              </button>
            </div>
          )
        ) : (
          <>
            <div className="note__row" role="group" aria-label="Er noten hjælpsom?">
              <span className="t-caption-strong note__ask">Hjælpsom?</span>
              {(['ja', 'lidt', 'nej'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  className={['note__btn', mine?.r === v && 'note__btn--on'].filter(Boolean).join(' ')}
                  aria-pressed={mine?.r === v}
                  onClick={() => rateNote(n.id, v)}
                >
                  <span className="t-label">{ratingLabel[v]}</span>
                </button>
              ))}
            </div>
            {mine && (
              <div className="note__why">
                <p className="t-caption-strong">Hvorfor?</p>
                <div className="note__reasons">
                  {(mine.r === 'nej' ? reasons.daarlig : reasons.god).map((r) => (
                    <Chip key={r} selected={mine.reasons.includes(r)} onClick={() => toggleReason(n.id, r)}>
                      {r}
                    </Chip>
                  ))}
                </div>
                <p className="t-caption note__muted">{count} vurderinger</p>
              </div>
            )}
          </>
        )}
      </li>
    );
  };

  return (
    <div className="pf-screen">
      <PageHeader title="Fællesskabsnoter" fallback={`/opslag/${id}`} />
      <main className="notes">
        <figure className="notes__post">
          <figcaption className="t-heading-s">{post.author}</figcaption>
          <blockquote className="t-body-s notes__quote">{post.text}</blockquote>
        </figure>

        {form === 'ny' ? (
          noteForm
        ) : (
          <Button variant="secondary" block onClick={() => open()}>
            Skriv en note
          </Button>
        )}

        {order.map((st) => {
          const list = notes.filter((n) => n.status === st);
          return list.length > 0 ? (
            <ul key={st} className="notes__list" aria-label={statusLabel[st]}>
              {list.map(card)}
            </ul>
          ) : null;
        })}
      </main>
    </div>
  );
}
