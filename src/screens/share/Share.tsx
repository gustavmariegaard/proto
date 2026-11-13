import { useState } from 'react';
import { Navigate, useParams, useSearchParams } from 'react-router-dom';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { SegmentedControl } from '../../components/SegmentedControl';
import { TextField } from '../../components/TextField';
import { authorAvatar, myAvatar, pronouns, shareTargets } from '../../data/create';
import { handleOf } from '../../data/handles';
import { usePost } from '../../state/posts';
import { useSession } from '../../state/session';
import { CloseHeader, RadioDot, useClose } from '../create/parts';
import '../create/parts.css';
import './Share.css';

type Mode = 'besked' | 'opslag' | 'moment';

const modes: { value: Mode; label: string }[] = [
  { value: 'besked', label: 'Besked' },
  { value: 'opslag', label: 'Opslag' },
  { value: 'moment', label: 'Moment' },
];

/**
 * Del et opslag på tre måder:
 * - Besked: send det til folk, du følger, eller dine cirkler (én samlet liste)
 * - Opslag: videredel det som eget opslag på din profil
 * - Moment: videredel det som et moment i 24 timer
 * "Del" og "Kopiér link" står altid fast nederst.
 */
export function Share() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const close = useClose(id ? `/opslag/${id}` : '/');
  const { profile } = useSession();
  const post = usePost(id);

  const start = params.get('som');
  const [mode, setMode] = useState<Mode>(start === 'eget' || start === 'opslag' ? 'opslag' : start === 'moment' ? 'moment' : 'besked');
  const [message, setMessage] = useState('');
  const [note, setNote] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  if (!post) return <Navigate to="/" replace />;
  const { first } = pronouns(post.author);
  const postAvatar = authorAvatar(post.author, post.avatarSrc);
  const myName = profile.name || 'Dig';
  const q = query.trim().toLowerCase();
  const targets = q ? shareTargets.filter((t) => t.name.toLowerCase().includes(q)) : shareTargets;

  const toggle = (targetId: string) =>
    setSelected((list) => (list.includes(targetId) ? list.filter((x) => x !== targetId) : [...list, targetId]));

  const copyLink = async () => {
    const url = `${window.location.origin}${import.meta.env.BASE_URL.replace(/\/$/, '')}/opslag/${post.id}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* Ingen adgang til udklipsholderen: vi viser stadig bekræftelsen */
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const shareLabel =
    mode === 'besked'
      ? selected.length > 1
        ? `Send til ${selected.length}`
        : 'Send'
      : mode === 'opslag'
        ? 'Del som opslag'
        : 'Del som moment';

  const quote = (
    <div className="share__quote">
      <div className="share__quote-head">
        <Avatar name={post.author} tone={post.tone} src={postAvatar} size="S" />
        <span className="share__quote-name">
          <span className="t-heading-s">{post.author}</span>
          <span className="t-caption modal-screen__muted">@{post.username || handleOf(post.author)}</span>
        </span>
      </div>
      <p className="t-body-s">{post.text}</p>
      {typeof post.image === 'string' && <img className="share__quote-img" src={post.image} alt="" />}
    </div>
  );

  return (
    <div className="modal-screen share">
      <CloseHeader title="Del" onClose={close} />
      <main className="modal-screen__content">
        <div className="modal-screen__full">
          <SegmentedControl label="Del som" options={modes} value={mode} onChange={setMode} />
        </div>

        {mode === 'besked' && (
          <>
            <div className="share__preview">
              <div className="share__preview-body">
                <span className="share__preview-head">
                  <Avatar name={post.author} tone={post.tone} src={postAvatar} size="S" />
                  <span className="t-caption-strong">{post.author}</span>
                </span>
                <p className="t-caption share__preview-text">{post.text}</p>
              </div>
              {typeof post.image === 'string' && (
                <img className="share__preview-img" src={post.image} alt="Billedet i opslaget" />
              )}
            </div>
            <TextField label="Skriv en besked" value={message} onChange={(e) => setMessage(e.target.value)} />
            <TextField label="Søg efter navn eller cirkel" type="search" value={query} onChange={(e) => setQuery(e.target.value)} />

            <ul className="choice-list" aria-label="Send til">
              {targets.map((t) => {
                const on = selected.includes(t.id);
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      className={['choice', on && 'choice--on'].filter(Boolean).join(' ')}
                      onClick={() => toggle(t.id)}
                    >
                      <Avatar name={t.name} tone={t.tone} src={t.avatarSrc} />
                      <span className="choice__text">
                        <span className="t-label">{t.name}</span>
                        <span className="t-caption choice__hint">{t.kind === 'Cirkel' ? 'Cirkel' : `@${handleOf(t.name)}`}</span>
                      </span>
                      <RadioDot on={on} />
                    </button>
                  </li>
                );
              })}
              {targets.length === 0 && <li className="t-caption modal-screen__muted">Ingen hedder “{query.trim()}”.</li>}
            </ul>
            <p className="t-caption modal-screen__muted">
              Kun dem, du sender til, kan se det. {first} kan se, at opslaget er delt, men ikke med hvem.
            </p>
          </>
        )}

        {mode === 'opslag' && (
          <>
            <div className="share__compose">
              <div className="share__compose-row">
                <Avatar name={myName} src={profile.avatar ?? myAvatar} />
                <textarea
                  className="share__note"
                  aria-label="Hvad vil du sige om det?"
                  placeholder="Hvad vil du sige om det?"
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
              {quote}
            </div>
            <p className="t-caption modal-screen__muted">
              Vises på din profil med kredit til {first}.{' '}
              {profile.private ? 'Din profil er privat, så kun dine følgere kan se det.' : 'Din profil er offentlig, så alle kan se det.'}
            </p>
          </>
        )}

        {mode === 'moment' && (
          <>
            <div className="share__moment" aria-label="Sådan ser dit moment ud">
              <div className="share__moment-card">{quote}</div>
              <span className="share__moment-who">
                <Avatar name={myName} src={profile.avatar ?? myAvatar} size="S" />
                <span className="t-caption-strong">@{profile.username.trim().replace(/^@/, '') || handleOf(myName)}</span>
              </span>
            </div>
            <p className="t-caption modal-screen__muted">
              Vises som moment i 24 timer med kredit til {first}. Dem, der ser det, kan trykke sig videre til opslaget.
            </p>
          </>
        )}
      </main>

      {/* Står altid fast nederst, uanset hvor langt man ruller */}
      <footer className="share__footer">
        <Button block disabled={mode === 'besked' && selected.length === 0} onClick={close}>
          {shareLabel}
        </Button>
        <Button variant="secondary" block onClick={copyLink}>
          {copied ? 'Link kopieret' : 'Kopiér link'}
        </Button>
        <span className="visually-hidden" aria-live="polite">{copied ? 'Link kopieret' : ''}</span>
      </footer>
    </div>
  );
}
