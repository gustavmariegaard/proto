import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chip } from '../../components/Chip';
import { Icon } from '../../components/Icon';
import { IconButton } from '../../components/IconButton';
import { contacts } from '../../data/messages';
import { matches, useKeyboardViewport, useSelection } from './hooks';
import { CloseHeader, PickRow } from './shared';
import { openConversation, sendMessage } from './store';
import './Messages.css';

/** Ny besked: vælg en eller flere personer, skriv evt. den første besked, og samtalen åbner. */
export function NewMessage() {
  const navigate = useNavigate();
  const screenRef = useRef<HTMLDivElement>(null);
  const [selected, toggle] = useSelection();
  const [query, setQuery] = useState('');
  const [text, setText] = useState('');
  useKeyboardViewport(screenRef);

  const suggestions = contacts.filter((c) => c.id !== 'pernille' && matches(c.name, query));

  const start = () => {
    if (!selected.length) return;
    const id = openConversation(selected);
    const t = text.trim();
    if (t) sendMessage(id, t);
    navigate(`/beskeder/${id}`, { replace: true });
  };

  return (
    <div ref={screenRef} className="msg-screen msg-screen--chat">
      <CloseHeader title="Ny besked" />

      <main className="msg-content">
        <div className="msg-card msg-to">
          <span className="t-caption-strong msg-muted">Til</span>
          {selected.map((id) => {
            const c = contacts.find((x) => x.id === id)!;
            return (
              <Chip key={id} selected onClick={() => toggle(id)} aria-label={`Fjern ${c.name}`}>
                {c.name}
              </Chip>
            );
          })}
          <input
            className="msg-to__input"
            placeholder="Søg efter navn"
            aria-label="Søg efter navn"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
          />
        </div>

        <h2 className="t-heading-s">Forslag</h2>
        <ul className="msg-list">
          {suggestions.map((c) => (
            <li key={c.id}>
              <PickRow contact={c} selected={selected.includes(c.id)} onToggle={() => toggle(c.id)} />
            </li>
          ))}
          <li>
            <button type="button" className="msg-card msg-thread" onClick={() => navigate('/beskeder/ny-cirkel')}>
              <span className="msg-tile" aria-hidden="true">
                <Icon name="circles" />
              </span>
              <span className="msg-card__text">
                <span className="t-heading-s">Ny cirkel</span>
                <span className="t-caption msg-muted">Opret en gruppe med flere personer</span>
              </span>
            </button>
          </li>
        </ul>
      </main>

      <form
        className="msg-composer"
        onSubmit={(e) => {
          e.preventDefault();
          start();
        }}
      >
        <input
          className="field msg-composer__field"
          placeholder="Skriv din første besked"
          aria-label="Skriv din første besked"
          value={text}
          onChange={(e) => setText(e.target.value)}
          enterKeyHint="send"
          autoComplete="off"
        />
        <IconButton type="submit" icon="send" label="Send" variant="filled" disabled={!selected.length} />
      </form>
    </div>
  );
}
