import { useRef, useState } from 'react';
import { Avatar, initials } from '../../components/Avatar';
import { Icon } from '../../components/Icon';
import { Sheet } from '../../components/Sheet';
import { flickComments, type FlickComment } from '../../data/flicks';
import { useSession } from '../../state/session';
import './FlickCommentsSheet.css';

type Props = { open: boolean; onClose: () => void };

/**
 * Kommentarer over en flick (Figma: Flicks · Kommentarer og · Udvidet).
 * Starter i 560 px højde og kan trækkes op til næsten hele skærmen.
 */
export function FlickCommentsSheet({ open, onClose }: Props) {
  const { profile } = useSession();
  const [list, setList] = useState<FlickComment[]>(flickComments);
  const [liked, setLiked] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const me = profile.name || 'Du';

  const send = () => {
    const t = text.trim();
    if (!t) return;
    setList((l) => [...l, { id: `fc${Date.now()}`, author: me, tone: 'blue', time: 'Lige nu', text: t, likes: 0 }]);
    setText('');
  };

  const reply = (name: string) => {
    setText(`@${name.split(' ')[0]} `);
    inputRef.current?.focus();
  };

  const renderComment = (c: FlickComment, isReply = false) => {
    const isLiked = liked.includes(c.id);
    const count = c.likes + (isLiked ? 1 : 0);
    const open = expanded.includes(c.id);
    return (
      <li key={c.id} className={['fcomment', isReply && 'fcomment--reply'].filter(Boolean).join(' ')}>
        <div className="fcomment__row">
          <Avatar name={c.author} tone={c.tone} />
          <div className="fcomment__text">
            <p className="fcomment__name">
              <span className="t-heading-s">{c.author}</span>
              <span className="t-caption fcomment__muted">{c.time}</span>
            </p>
            <p className="t-body-s">{c.text}</p>
            <p className="fcomment__actions t-caption-strong">
              <button type="button" onClick={() => reply(c.author)}>
                Svar
              </button>
              {c.replies && c.replies.length > 0 && (
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => setExpanded((e) => (open ? e.filter((x) => x !== c.id) : [...e, c.id]))}
                >
                  {open ? 'Skjul svar' : `Se ${c.replies.length} svar`}
                </button>
              )}
            </p>
          </div>
          <button
            type="button"
            className={['fcomment__like', isLiked && 'fcomment__like--on'].filter(Boolean).join(' ')}
            aria-pressed={isLiked}
            aria-label={`Synes godt om${count ? `, ${count}` : ''}`}
            onClick={() => setLiked((l) => (isLiked ? l.filter((x) => x !== c.id) : [...l, c.id]))}
          >
            <Icon name={isLiked ? 'heart-filled' : 'heart'} size={20} />
            {count > 0 && <span className="t-caption">{count}</span>}
          </button>
        </div>
        {open && c.replies && <ul className="fcomments fcomments--replies">{c.replies.map((r) => renderComment(r, true))}</ul>}
      </li>
    );
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Kommentarer"
      dim
      footer={
        <form
          className="fcomments__composer"
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
            className="fcomments__field"
            placeholder="Tilføj en kommentar"
            aria-label="Tilføj en kommentar"
            value={text}
            onChange={(e) => setText(e.target.value)}
            enterKeyHint="send"
          />
        </form>
      }
    >
      <ul className="fcomments">{list.map((c) => renderComment(c))}</ul>
    </Sheet>
  );
}
