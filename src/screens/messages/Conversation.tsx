import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { Avatar } from '../../components/Avatar';
import { BackButton } from '../../components/BackButton';
import { Icon } from '../../components/Icon';
import { IconButton } from '../../components/IconButton';
import { Tag } from '../../components/Tag';
import '../../components/PageHeader.css';
import type { ChatMessage } from '../../data/messages';
import { useKeyboardViewport } from './hooks';
import { markRead, sendMessage, useThread } from './store';
import './Messages.css';

/** Samtale (1:1) eller cirkel. Skrivefeltet ligger nederst, listen starter ved den nyeste besked. */
export function Conversation() {
  const { id } = useParams();
  const thread = useThread(id);
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
    inputRef.current?.focus();
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
        {isCircle && thread.disappearing && (
          <div className="msg-center-row">
            <Tag>Beskeder forsvinder efter 24 timer</Tag>
          </div>
        )}
        {thread.messages.map((m) => (
          <Message key={m.id} message={m} showSender={isCircle} />
        ))}
        {isCircle && <p className="t-caption msg-muted msg-center">End-to-end-krypteret</p>}
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

function Message({ message, showSender }: { message: ChatMessage; showSender: boolean }) {
  const out = message.from === 'me';
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
