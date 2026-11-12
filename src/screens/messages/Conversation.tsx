import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { Avatar } from '../../components/Avatar';
import { BackButton } from '../../components/BackButton';
import { Icon } from '../../components/Icon';
import { IconButton } from '../../components/IconButton';
import { Tag } from '../../components/Tag';
import '../../components/PageHeader.css';
import { contacts, type ChatMessage } from '../../data/messages';
import { img } from '../../data/sample';
import type { AvatarTone } from '../../components/Avatar';
import { useSession } from '../../state/session';
import { useKeyboardViewport } from './hooks';
import { markRead, sendMessage, useThread } from './store';
import './Messages.css';

/** Samtale (1:1) eller cirkel. Skrivefeltet ligger nederst, listen starter ved den nyeste besked. */
export function Conversation() {
  const { id } = useParams();
  const thread = useThread(id);
  const { profile } = useSession();
  const [text, setText] = useState('');
  const screenRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToEnd = useCallback(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  useKeyboardViewport(screenRef, scrollToEnd);
  useLayoutEffect(scrollToEnd, [scrollToEnd, thread?.messages.length]);
  useEffect(() => {
    if (id) markRead(id);
  }, [id]);

  if (!thread) return <Navigate to="/beskeder" replace />;

  const isCircle = thread.kind === 'circle';
  const hasText = text.trim().length > 0;

  const send = () => {
    const t = text.trim();
    if (!t) return;
    sendMessage(thread.id, t);
    setText('');
    inputRef.current?.focus({ preventScroll: true });
  };

  /** Hvem sendte beskeden? Bruges til profilbilledet ud for hver besked. */
  const senderOf = (from: string): Sender => {
    if (from === 'me') return { name: profile.name || 'Dig', tone: 'blue', src: profile.avatar ?? img('mig.jpg') };
    const contact = contacts.find((c) => c.name === from || c.name.split(' ')[0] === from);
    if (contact) return { name: contact.name, tone: contact.tone, src: contact.avatarSrc };
    if (!isCircle) return { name: thread.name, tone: thread.tone, src: thread.avatarSrc };
    return { name: from, tone: knownFaces[from] ? 'sage' : 'sand', src: knownFaces[from] };
  };

  return (
    <div ref={screenRef} className="msg-screen msg-screen--chat">
      <header className="page-header">
        <BackButton fallback="/beskeder" />
        <Avatar name={thread.name} tone={thread.tone} src={thread.avatarSrc} />
        <div className="msg-chat__title">
          <h1 className="t-heading-m msg-ellipsis">{thread.name}</h1>
          {isCircle && thread.members && <p className="t-caption msg-muted msg-ellipsis">{thread.members}</p>}
        </div>
        {!isCircle && (
          <>
            <IconButton icon="phone" label="Ring op" variant="outline" />
            <IconButton icon="video" label="Videoopkald" variant="outline" />
          </>
        )}
      </header>

      <div
        ref={listRef}
        className={['msg-chat__list', isCircle && 'msg-chat__list--circle'].filter(Boolean).join(' ')}
        role="log"
        aria-label={`Beskeder med ${thread.name}`}
      >
        {/* Som i WhatsApp: krypteringen står øverst i hver samtale */}
        <div className="msg-center-row">
          <p className="msg-e2e t-caption">
            <Icon name="lock" size={14} />
            End-to-end-krypteret
          </p>
        </div>
        {isCircle && thread.disappearing && (
          <div className="msg-center-row">
            <Tag>Beskeder forsvinder efter 24 timer</Tag>
          </div>
        )}
        {thread.messages.map((m) => (
          <Message key={m.id} message={m} showSender sender={senderOf(m.from)} />
        ))}
      </div>

      <form
        className="msg-composer"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <IconButton icon="image" label="Send billede" />
        <input
          ref={inputRef}
          className="field msg-composer__field"
          placeholder={isCircle ? 'Skriv til cirklen' : 'Skriv en besked'}
          aria-label={isCircle ? 'Skriv til cirklen' : 'Skriv en besked'}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={() => setTimeout(scrollToEnd, 300)}
          enterKeyHint="send"
          autoComplete="off"
        />
        {isCircle || hasText ? (
          <IconButton
            type="submit"
            icon="send"
            label="Send"
            variant="filled"
            // Hold tastaturet fremme, når man trykker send
            onMouseDown={(e) => e.preventDefault()}
          />
        ) : (
          <IconButton icon="mic" label="Optag stemmebesked" variant="filled" />
        )}
      </form>
    </div>
  );
}

type Sender = { name: string; tone: AvatarTone; src?: string };

/** Personer i cirklerne, der ikke er i kontaktlisten, men har et billede */
const knownFaces: Record<string, string> = { Mor: img('person-b.jpg') };

function Message({ message, showSender, sender }: { message: ChatMessage; showSender: boolean; sender: Sender }) {
  const out = message.from === 'me';
  return (
    <div className={['msg-line', out && 'msg-line--out'].filter(Boolean).join(' ')}>
      <Avatar name={sender.name} tone={sender.tone} src={sender.src} size="S" />
      <MessageBody message={message} showSender={showSender} out={out} />
    </div>
  );
}

function MessageBody({ message, showSender, out }: { message: ChatMessage; showSender: boolean; out: boolean }) {
  return (
    <div className={['msg-row', out && 'msg-row--out'].filter(Boolean).join(' ')}>
      {showSender && <p className="t-micro msg-muted">{out ? 'Dig' : message.from}</p>}
      {message.kind === 'text' && <p className={`t-body-s msg-bubble msg-bubble--${out ? 'out' : 'in'}`}>{message.text}</p>}
      {message.kind === 'image' && (message.src ? <img className="msg-photo" src={message.src} alt="Billede" /> : <div className="msg-photo" role="img" aria-label="Billede" />)}
      {message.kind === 'voice' && (
        <div className="msg-voice">
          <span className="msg-voice__play" aria-hidden="true">
            <Icon name="mic" />
          </span>
          <span className="t-caption-strong">Stemmebesked</span>
          <span className="t-caption msg-muted">{message.duration}</span>
        </div>
      )}
    </div>
  );
}
