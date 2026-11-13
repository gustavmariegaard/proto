import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chip } from '../../components/Chip';
import { Icon } from '../../components/Icon';
import { useScrollFade } from '../../components/useScrollFade';
import { PostCard } from '../../components/PostCard';
import { discoverPosts } from '../../data/discover';
import { useSession } from '../../state/session';
import { TopicsSheet } from './TopicsSheet';
import './Discover.css';

/**
 * Opdag: Offentlig debat. Dine emner er filtre (✕ fjerner, + viser igen).
 * "Rediger emner" åbner søgning, "Trender lige nu" og forslag.
 */
export function Discover() {
  const navigate = useNavigate();
  const { profile } = useSession();
  const [off, setOff] = useState<string[]>([]);
  const [editing, setEditing] = useState(false);
  const rowRef = useRef<HTMLUListElement>(null);
  useScrollFade(rowRef);

  const topics = profile.interests;
  const active = topics.filter((t) => !off.includes(t));
  const shown = active.length
    ? discoverPosts.filter((p) => active.includes(p.topic) || p.trends.some((t) => active.includes(t)))
    : discoverPosts;

  return (
    <div className="discover">
      <h1 className="t-title-xl">Offentlig debat</h1>
      <p className="t-body-s discover__intro">
        Kun verificerede personer. Vælg de emner, du vil følge, og slå dem til og fra herunder.
      </p>

      <ul ref={rowRef} className="discover__row" aria-label="Filtrér efter dine emner">
        {/* Rediger emner står først og ruller med væk, når man bladrer i emnerne */}
        <li>
          <Chip className="discover__edit" onClick={() => setEditing(true)}>
            <Icon name="sliders" size={18} />
            Rediger emner
          </Chip>
        </li>
        {topics.map((t) => {
          const on = !off.includes(t);
          return (
            <li key={t}>
              <Chip
                selected={on}
                className="discover__topic"
                aria-label={on ? `${t}, vises. Tryk for at fjerne` : `${t}, skjult. Tryk for at vise`}
                onClick={() => setOff((o) => (on ? [...o, t] : o.filter((x) => x !== t)))}
              >
                {t}
                <Icon name={on ? 'close' : 'plus'} size={16} />
              </Chip>
            </li>
          );
        })}
      </ul>

      <div className="discover__posts">
        {shown.map((p) => (
          <PostCard
            key={p.id}
            post={p}
            onComment={p.linkable ? () => navigate(`/opslag/${p.id}?kommentarer`) : undefined}
            onShare={p.linkable ? () => navigate(`/opslag/${p.id}/del`) : undefined}
            onReport={() => navigate(`/opslag/${p.id}/rapporter`)}
          />
        ))}
        {shown.length === 0 && (
          <p className="t-body-s discover__intro">Ingen opslag om dine emner lige nu. Prøv at følge flere emner.</p>
        )}
      </div>

      <TopicsSheet open={editing} onClose={() => setEditing(false)} />
    </div>
  );
}
