import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chip } from '../../components/Chip';
import { Icon } from '../../components/Icon';
import { useScrollFade } from '../../components/useScrollFade';
import { PostCard } from '../../components/PostCard';
import { discoverPosts } from '../../data/discover';
import { usePosts } from '../../state/posts';
import { useSession } from '../../state/session';
import { HIDE_AT, isBuried, scoreWith, useVotes } from '../../state/votes';
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

  const votes = useVotes();
  const [showBuried, setShowBuried] = useState(false);
  const topics = profile.interests;
  const active = topics.filter((t) => !off.includes(t));

  // Dine egne debatopslag (fra Opret) står øverst, uanset emne
  const mine = usePosts().filter((p) => p.feed === 'debat' && p.id.startsWith('mit-'));
  const inTopics = active.length
    ? discoverPosts.filter((p) => p.tags.some((t) => active.includes(t)))
    : discoverPosts;
  const all = [...mine, ...inTopics];

  // Opslag med for mange nedstemmer forsvinder fra emnerne
  const score = (p: { id: string; score?: number }) => scoreWith(p.score ?? 0, votes[p.id]);
  const shown = all.filter((p) => !isBuried(score(p)));
  const buried = all.filter((p) => isBuried(score(p)));

  return (
    <div className="discover">
      <h1 className="t-title-xl">Offentlig debat</h1>
      <p className="t-body-s discover__intro">
        Kun verificerede personer. Stem opslag op eller ned. Får et opslag for mange nedstemmer, forsvinder det fra emnet.
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
            onComment={() => navigate(`/opslag/${p.id}?kommentarer`)}
            onShare={() => navigate(`/opslag/${p.id}/del`)}
            onReport={() => navigate(`/opslag/${p.id}/rapporter`)}
          />
        ))}
        {shown.length === 0 && (
          <p className="t-body-s discover__intro">Ingen opslag om dine emner lige nu. Prøv at følge flere emner.</p>
        )}
      </div>

      {buried.length > 0 && (
        <section className="discover__buried" aria-label="Skjult af fællesskabet">
          <p className="t-caption discover__intro">
            {buried.length === 1 ? '1 opslag er skjult' : `${buried.length} opslag er skjult`} af fællesskabet, fordi det har
            fået for mange nedstemmer (score {HIDE_AT} eller lavere).
          </p>
          <button type="button" className="t-caption-strong discover__buried-toggle" onClick={() => setShowBuried((v) => !v)}>
            {showBuried ? 'Skjul igen' : 'Vis alligevel'}
          </button>
          {showBuried && (
            <div className="discover__posts discover__posts--buried">
              {buried.map((p) => (
                <PostCard
                  key={p.id}
                  post={p}
                  onComment={() => navigate(`/opslag/${p.id}?kommentarer`)}
                  onShare={() => navigate(`/opslag/${p.id}/del`)}
                  onReport={() => navigate(`/opslag/${p.id}/rapporter`)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      <TopicsSheet open={editing} onClose={() => setEditing(false)} />
    </div>
  );
}
