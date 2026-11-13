import { useState } from 'react';
import { Navigate, useParams, useSearchParams } from 'react-router-dom';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { Chip } from '../../components/Chip';
import { SegmentedControl } from '../../components/SegmentedControl';
import { TextField } from '../../components/TextField';
import { authorAvatar, myAvatar, pronouns, shareTargets, shareVisibilities, type ShareVisibility } from '../../data/create';
import { usePost } from '../../state/posts';
import { useSession } from '../../state/session';
import { CloseHeader, RadioDot, useClose } from '../create/parts';
import '../create/parts.css';
import './Share.css';

type Mode = 'besked' | 'eget';

/**
 * Del et opslag. To måder: send det som besked/til en cirkel,
 * eller del det som eget opslag på din profil (Del · Eget opslag).
 * Åbn med /opslag/:id/del, eller /opslag/:id/del?som=eget for at starte i "Eget opslag".
 */
export function Share() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const close = useClose(id ? `/opslag/${id}` : '/');
  const { profile } = useSession();
  const post = usePost(id);

  const [mode, setMode] = useState<Mode>(params.get('som') === 'eget' ? 'eget' : 'besked');
  const [note, setNote] = useState('');
  const [selected, setSelected] = useState<string[]>(['familien']);
  const [visibility, setVisibility] = useState<ShareVisibility>('offentligt');
  const [copied, setCopied] = useState(false);

  if (!post) return <Navigate to="/" replace />;
  const { first, possessive } = pronouns(post.author);
  const postAvatar = authorAvatar(post.author, post.avatarSrc);

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

  const myName = profile.name || 'Dig';

  return (
    <div className="modal-screen share">
      <CloseHeader title="Del" onClose={close} />
      <main className="modal-screen__content">
        {mode === 'besked' && (
          <div className="share__preview">
            <Avatar name={post.author} tone={post.tone} src={postAvatar} size="S" />
            <p className="t-caption share__preview-text">
              {post.author} · {post.text}
            </p>
          </div>
        )}

        {mode === 'besked' && <h2 className="t-heading-s">Del som</h2>}
        <div className="share__chips" role="radiogroup" aria-label="Del som">
          <Chip role="radio" aria-pressed={undefined} aria-checked={mode === 'besked'} selected={mode === 'besked'} onClick={() => setMode('besked')}>
            Besked eller cirkel
          </Chip>
          <Chip role="radio" aria-pressed={undefined} aria-checked={mode === 'eget'} selected={mode === 'eget'} onClick={() => setMode('eget')}>
            Eget opslag
          </Chip>
        </div>

        {mode === 'besked' ? (
          <>
            <p className="t-caption modal-screen__muted">
              Kun dem, du vælger, kan se det. Opslagets ejer kan se, at det er delt, men ikke med hvem.
            </p>
            <TextField label="Tilføj din egen tekst" value={note} onChange={(e) => setNote(e.target.value)} />

            <h2 id="share-to" className="t-heading-s">Send til</h2>
            <ul className="choice-list" aria-labelledby="share-to">
              {shareTargets.map((t) => {
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
                        <span className="t-caption choice__hint">{t.kind}</span>
                      </span>
                      <RadioDot on={on} />
                    </button>
                  </li>
                );
              })}
            </ul>

            <Button variant="secondary" block onClick={copyLink}>
              {copied ? 'Link kopieret' : 'Kopiér link'}
            </Button>
            <span className="visually-hidden" aria-live="polite">{copied ? 'Link kopieret' : ''}</span>
            <Button block disabled={selected.length === 0} onClick={close}>
              Del
            </Button>
          </>
        ) : (
          <>
            <div className="share__compose">
              <div className="share__compose-row">
                <Avatar name={myName} src={profile.avatar ?? myAvatar} />
                <textarea
                  className="share__note"
                  aria-label="Skriv noget om dette opslag…"
                  placeholder="Skriv noget om dette opslag…"
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
              <div className="share__quote">
                <div className="share__quote-head">
                  <Avatar name={post.author} tone={post.tone} src={postAvatar} size="S" />
                  <span className="t-heading-s">{post.author}</span>
                </div>
                <p className="t-body-s">{post.text}</p>
              </div>
            </div>

            <h2 className="t-heading-s">Hvem kan se det?</h2>
            <div className="modal-screen__full">
              <SegmentedControl
                label="Hvem kan se det?"
                options={shareVisibilities}
                value={visibility}
                onChange={setVisibility}
              />
            </div>
            <p className="t-caption modal-screen__muted">
              Opslaget vises på din profil med kredit til {first}. Det følger {possessive} valg om, hvem der kan se det.
            </p>
            <Button block onClick={close}>
              Del opslag
            </Button>
          </>
        )}
      </main>
    </div>
  );
}
