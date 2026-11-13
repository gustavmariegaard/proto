import { useRef, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { IconButton } from '../../components/IconButton';
import { PageHeader } from '../../components/PageHeader';
import { photoById } from '../../data/profile';
import { useMe } from './shared';
import './Profile.css';
import './Screens.css';

/** Billede: ét af dine billeder i fuld skærm (Figma "Billede"). */
export function PhotoView() {
  const { id = '' } = useParams();
  const photo = photoById(id);
  const me = useMe();
  const [liked, setLiked] = useState(false);
  const [commenting, setCommenting] = useState(false);
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState<string[]>([]);
  const field = useRef<HTMLInputElement>(null);

  if (!photo) return <Navigate to="/profil?fane=billeder" replace />;

  const [copied, setCopied] = useState(false);
  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ url });
      else {
        await navigator.clipboard?.writeText(url);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      /* Afbrudt af brugeren */
    }
  };

  return (
    <div className="pf-screen">
      <PageHeader title="Billede" fallback="/profil?fane=billeder" />
      <main className="pf-screen__content">
        <div className="pf-photo pf-detail__photo">
          <img src={photo.src} alt="" />
        </div>

        <div className="pf-author">
          <span className="pf-author__avatar" aria-hidden="true">
            <img src={me.avatar} alt="" />
          </span>
          <div className="pf-author__text">
            <span className="t-heading-s">{me.name}</span>
            <span className="t-caption pf-muted">{[photo.time, photo.album].filter(Boolean).join(' · ')}</span>
          </div>
        </div>

        {photo.caption && <p className="t-body">{photo.caption}</p>}

        <div className="pf-actions">
          <IconButton
            icon={liked ? 'heart-filled' : 'heart'}
            label="Synes godt om"
            aria-pressed={liked}
            onClick={() => setLiked((v) => !v)}
          />
          <IconButton
            icon="chat"
            label="Kommenter"
            aria-expanded={commenting}
            onClick={() => {
              setCommenting(true);
              setTimeout(() => field.current?.focus({ preventScroll: true }), 0);
            }}
          />
          <IconButton icon="send" label="Del" onClick={share} />
          {copied && <span className="t-caption pf-muted" role="status">Link kopieret</span>}
        </div>

        {comments.length > 0 && (
          <ul className="pf-comments">
            {comments.map((c, i) => (
              <li key={i} className="t-body-s">
                <strong>{me.name}</strong> {c}
              </li>
            ))}
          </ul>
        )}

        {commenting && (
          <form
            className="pf-comment-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (!comment.trim()) return;
              setComments((l) => [...l, comment.trim()]);
              setComment('');
            }}
          >
            <input
              ref={field}
              className="pf-comment-form__field"
              placeholder="Skriv en kommentar"
              aria-label="Skriv en kommentar"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              enterKeyHint="send"
            />
            <IconButton icon="send" label="Send kommentar" type="submit" variant="filled" />
          </form>
        )}
      </main>
    </div>
  );
}
