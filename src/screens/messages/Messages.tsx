import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { Chip } from '../../components/Chip';
import { IconButton } from '../../components/IconButton';
import { PageHeader } from '../../components/PageHeader';
import { Tag } from '../../components/Tag';
import { TextField } from '../../components/TextField';
import type { Thread } from '../../data/messages';
import { matches } from './hooks';
import { useThreads } from './store';
import './Messages.css';

type Tab = 'alle' | 'personer' | 'cirkler';

const tabs: { value: Tab; label: string }[] = [
  { value: 'alle', label: 'Alle' },
  { value: 'personer', label: 'Personer' },
  { value: 'cirkler', label: 'Cirkler' },
];

/** Beskeder: alle samtaler, filtreret med fanerne Alle / Personer / Cirkler. */
export function Messages() {
  const threads = useThreads();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = (tabs.find((t) => t.value === params.get('vis'))?.value ?? 'alle') as Tab;
  const [query, setQuery] = useState('');

  const shown = threads.filter(
    (t) =>
      (tab === 'alle' || (tab === 'personer' ? t.kind === 'person' : t.kind === 'circle')) &&
      (!query.trim() || matches(t.name, query) || matches(t.preview, query)),
  );

  return (
    <div className="msg-screen">
      <PageHeader title="Beskeder" fallback="/">
        <IconButton icon="edit" label="Ny besked" variant="filled" onClick={() => navigate('/beskeder/ny')} />
      </PageHeader>

      <main className="msg-content">
        <TextField label="Søg i beskeder" type="search" value={query} onChange={(e) => setQuery(e.target.value)} />

        <div className="msg-tabs" role="group" aria-label="Vis beskeder fra">
          {tabs.map((t) => (
            <Chip
              key={t.value}
              selected={t.value === tab}
              onClick={() => setParams(t.value === 'alle' ? {} : { vis: t.value }, { replace: true })}
            >
              {t.label}
            </Chip>
          ))}
        </div>

        {tab === 'cirkler' && (
          <p className="t-body-s msg-muted">
            Cirkler er private grupper med chat, billeder og begivenheder. Kun medlemmer kan se dem.
          </p>
        )}

        {shown.length > 0 ? (
          <ul className="msg-list">
            {shown.map((t) => (
              <li key={t.id}>
                <ThreadRow thread={t} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="t-body-s msg-muted msg-center">Ingen beskeder fundet</p>
        )}

        {tab === 'cirkler' && (
          <Button block onClick={() => navigate('/beskeder/ny-cirkel')}>
            Ny cirkel
          </Button>
        )}

        <p className="t-caption msg-muted msg-center">Alle beskeder er end-to-end-krypterede</p>
      </main>
    </div>
  );
}

function ThreadRow({ thread }: { thread: Thread }) {
  return (
    <Link to={`/beskeder/${thread.id}`} className="msg-card msg-thread">
      <Avatar name={thread.name} tone={thread.tone} size="L" src={thread.avatarSrc} />
      <span className={['msg-card__text', thread.kind === 'circle' && 'msg-card__text--circle'].filter(Boolean).join(' ')}>
        <span className="t-heading-s msg-ellipsis">{thread.name}</span>
        {thread.preview && <span className="t-caption msg-muted msg-ellipsis">{thread.preview}</span>}
        {thread.disappearing && <Tag>Forsvinder efter 24 timer</Tag>}
      </span>
      <span className="msg-thread__meta">
        <span className="t-caption msg-muted">{thread.time}</span>
        <span className={['msg-thread__dot', thread.unread && 'msg-thread__dot--on'].filter(Boolean).join(' ')}>
          {thread.unread && <span className="visually-hidden">Ulæst</span>}
        </span>
      </span>
    </Link>
  );
}
