import { useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { Button } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { PageHeader } from '../../components/PageHeader';
import { TextField } from '../../components/TextField';
import { addNote, notesFor, rateNote, useNotes, type Note } from '../../state/notes';
import { usePost } from '../../state/posts';
import '../profile/Screens.css';
import '../profile/EditProfile.css';
import './Notes.css';

const MAX = 280;

/**
 * Fællesskabsnoter på et opslag i Offentlig debat (inspireret af Community Notes).
 * Alle kan foreslå en note med kilde og vurdere andres. Rute: /opslag/:id/noter
 */
export function Notes() {
  const { id } = useParams();
  const post = usePost(id);
  const state = useNotes();
  const [writing, setWriting] = useState(false);
  const [text, setText] = useState('');
  const [source, setSource] = useState('');
  if (!post || !id) return <Navigate to="/opdag" replace />;

  const notes = notesFor(state, id);
  const shown = notes.filter((n) => n.status === 'vist');
  const proposals = notes.filter((n) => n.status === 'forslag');
  const canSend = text.trim().length >= 10 && source.trim().length >= 4;

  const send = () => {
    if (!canSend) return;
    addNote(id, text.trim(), source.trim());
    setText('');
    setSource('');
    setWriting(false);
  };

  const card = (n: Note) => {
    const r = state.ratings[n.id];
    return (
      <li key={n.id} className="note">
        <p className="t-body-s">{n.text}</p>
        {n.source && <p className="t-caption note__muted note__source">Kilde: {n.source}</p>}
        {n.mine ? (
          <p className="t-caption-strong note__muted">Din note · Venter på vurderinger</p>
        ) : (
          <div className="note__rate" role="group" aria-label="Er noten hjælpsom?">
            <span className="t-caption-strong">Hjælpsom?</span>
            {(['ja', 'nej'] as const).map((v) => (
              <button
                key={v}
                type="button"
                className={['note__btn', r === v && 'note__btn--on'].filter(Boolean).join(' ')}
                aria-pressed={r === v}
                onClick={() => rateNote(n.id, v)}
              >
                {r === v && <Icon name="check" size={16} />}
                <span className="t-label">{v === 'ja' ? 'Ja' : 'Nej'}</span>
              </button>
            ))}
          </div>
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

        <p className="t-caption note__muted">Noter vises, når folk med forskellige holdninger finder dem hjælpsomme.</p>

        {shown.length > 0 && (
          <section className="notes__section" aria-labelledby="notes-shown">
            <h2 id="notes-shown" className="t-heading-s">På opslaget</h2>
            <ul className="notes__list">{shown.map(card)}</ul>
          </section>
        )}

        {proposals.length > 0 && (
          <section className="notes__section" aria-labelledby="notes-prop">
            <h2 id="notes-prop" className="t-heading-s">Forslag</h2>
            <ul className="notes__list">{proposals.map(card)}</ul>
          </section>
        )}

        {writing ? (
          <form
            className="notes__section"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <h2 className="t-heading-s">Ny note</h2>
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
            <Button type="submit" block disabled={!canSend}>
              Send note
            </Button>
            <Button variant="secondary" block onClick={() => setWriting(false)}>
              Annuller
            </Button>
          </form>
        ) : (
          <Button variant="secondary" block onClick={() => setWriting(true)}>
            Skriv en note
          </Button>
        )}
      </main>
    </div>
  );
}
