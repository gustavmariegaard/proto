import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chip } from '../../components/Chip';
import { Icon } from '../../components/Icon';
import { PostCard } from '../../components/PostCard';
import { discoverPosts } from '../../data/discover';
import { usePosts } from '../../state/posts';
import { inTopics, useTopics } from '../../state/topics';
import { muteDebate, unmuteDebate, useRelations } from '../../state/blocks';
import { handleOf } from '../../data/handles';
import { TopicsSheet } from './TopicsSheet';
import './Discover.css';

/**
 * Opdag: Offentlig debat. Dine emner er filtre (✕ fjerner, + viser igen).
 * "Rediger emner" åbner søgning, "Trender lige nu" og forslag.
 */
export function Discover() {
  const navigate = useNavigate();
  // Samme emner og samme filter som i Flicks
  const { topics, active, isOn, toggle } = useTopics();
  const [editing, setEditing] = useState(false);
  const rowRef = useRef<HTMLUListElement>(null);

  // Afsendere, du har skjult i debatten eller blokeret, vises ikke
  const { mutedDebate, blocked } = useRelations();
  const [justMuted, setJustMuted] = useState<{ handle: string; name: string } | null>(null);

  // Dine egne debatopslag (fra Opret) står øverst, uanset emne
  const mine = usePosts().filter((p) => p.feed === 'debat' && p.id.startsWith('mit-'));
  const shown = [...mine, ...discoverPosts.filter((p) => inTopics(p.tags, active))].filter((p) => {
    const h = p.username || handleOf(p.author);
    return !mutedDebate.includes(h) && !blocked.includes(h);
  });

  const mute = (p: { author: string; username?: string }) => {
    const handle = p.username || handleOf(p.author);
    muteDebate(handle);
    setJustMuted({ handle, name: p.author });
  };

  return (
    <div className="discover">
      <h1 className="t-title-xl">Offentlig debat</h1>

      <ul ref={rowRef} className="discover__row" aria-label="Filtrér efter dine interesser">
        {/* Rediger emner står først og ruller med væk, når man bladrer i emnerne */}
        <li>
          <Chip className="discover__edit" onClick={() => setEditing(true)}>
            <Icon name="sliders" size={18} />
            Rediger interesser
          </Chip>
        </li>
        {topics.map((t) => {
          const on = isOn(t);
          return (
            <li key={t}>
              <Chip
                selected={on}
                className="discover__topic"
                aria-label={on ? `${t}, vises. Tryk for at fjerne` : `${t}, skjult. Tryk for at vise`}
                onClick={() => toggle(t)}
              >
                {t}
                <Icon name={on ? 'close' : 'plus'} size={16} />
              </Chip>
            </li>
          );
        })}
      </ul>

      {justMuted && mutedDebate.includes(justMuted.handle) && (
        <div className="discover__muted" role="status">
          <p className="t-body-s">Du ser ikke længere opslag fra {justMuted.name} i debatten.</p>
          <button type="button" className="t-caption-strong discover__undo" onClick={() => unmuteDebate(justMuted.handle)}>
            Fortryd
          </button>
        </div>
      )}

      <div className="discover__posts">
        {shown.map((p) => (
          <PostCard
            key={p.id}
            post={p}
            onComment={() => navigate(`/opslag/${p.id}?kommentarer`)}
            onShare={() => navigate(`/opslag/${p.id}/del`)}
            onReport={() => navigate(`/opslag/${p.id}/rapporter`)}
            onMute={() => mute(p)}
          />
        ))}
        {shown.length === 0 && (
          <p className="t-body-s discover__intro">Ingen opslag om dine interesser lige nu. Prøv at følge flere.</p>
        )}
      </div>

      <TopicsSheet open={editing} onClose={() => setEditing(false)} />
    </div>
  );
}
