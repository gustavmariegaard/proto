import { useRef, useState } from 'react';
import { Avatar, initials } from '../../components/Avatar';
import { Icon } from '../../components/Icon';
import { Sheet } from '../../components/Sheet';
import { comments as sampleComments, type Comment } from '../../data/sample';
import { useSession } from '../../state/session';
import './CommentsSheet.css';

type Props = { open: boolean; onClose: () => void };

/** Kommentarer som ark: halv højde fra start, kan trækkes op. */
export function CommentsSheet({ open, onClose }: Props) {
  const { profile } = useSession();
  const [list, setList] = useState<Comment[]>(sampleComments);
  const [liked, setLiked] = useState<string[]>([]);
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const me = profile.name || 'Du';

  const send = () => {
    const t = text.trim();
    if (!t) return;
    setList((l) => [...l, { id: `c${Date.now()}`, author: me, tone: 'blue', time: 'nu', text: t, likes: 0 }]);
    setText('');
  };

  const reply = (name: string) => {
    setText(`@${name.split(' ')[0]} `);
    inputRef.current?.focus({ preventScroll: true });
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Kommentarer"
      footer={
        <form
          className="comments__composer"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          {profile.avatar ? (
            <Avatar name={me} src={profile.avatar} />
          ) : (
            <span className="avatar avatar--M avatar--blue" aria-hidden="true">
              {profile.name ? initials(profile.name) : 'DU'}
            </span>
          )}
          <input
            ref={inputRef}
            className="comments__field"
            placeholder="Tilføj en kommentar"
            aria-label="Tilføj en kommentar"
            value={text}
            onChange={(e) => setText(e.target.value)}
            enterKeyHint="send"
          />
        </form>
      }
    >
      <ul className="comments">
        {list.map((c) => {
          const isLiked = liked.includes(c.id);
          const count = c.likes + (isLiked ? 1 : 0);
          return (
            <li key={c.id} className={['comment', c.isReply && 'comment--reply'].filter(Boolean).join(' ')}>
              <Avatar name={c.author} tone={c.tone} src={c.avatarSrc} />
              <div className="comment__text">
                <p className="comment__name">
                  <span className="t-heading-s">{c.author}</span>
                  <span className="t-caption comment__muted">{c.time}</span>
                  {c.isAuthor && <span className="t-caption-strong comment__muted">Forfatter</span>}
                </p>
                <p className="t-body-s">{c.text}</p>
                <p className="comment__actions t-caption-strong">
                  <button type="button" onClick={() => reply(c.author)}>Svar</button>
                  {c.translatedFrom && <span>Oversat fra {c.translatedFrom} · Vis original</span>}
                </p>
              </div>
              <button
                type="button"
                className={['comment__like', isLiked && 'comment__like--on'].filter(Boolean).join(' ')}
                aria-pressed={isLiked}
                aria-label={`Synes godt om${count ? `, ${count}` : ''}`}
                onClick={() => setLiked((l) => (isLiked ? l.filter((x) => x !== c.id) : [...l, c.id]))}
              >
                <Icon name={isLiked ? 'heart-filled' : 'heart'} size={20} />
                {count > 0 && <span className="t-caption">{count}</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}
