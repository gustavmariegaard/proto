import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { Chip } from '../../components/Chip';
import { MomentBubble } from '../../components/MomentBubble';
import { PostCard } from '../../components/PostCard';
import { SegmentedControl } from '../../components/SegmentedControl';
import { img, people } from '../../data/sample';
import { usePosts } from '../../state/posts';
import { useMoments } from '../../state/moments';
import { useSession } from '../../state/session';
import { InterestsSheet } from './InterestsSheet';
import './Home.css';

type Feed = 'venner' | 'interesser';

/** Hjem: feed fra venner eller fra dine interesser. */
export function Home() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const feed: Feed = params.get('feed') === 'interesser' ? 'interesser' : 'venner';
  const { seen } = useMoments();
  const { profile } = useSession();
  const [off, setOff] = useState<string[]>([]);
  const [editing, setEditing] = useState(false);

  const active = profile.interests.filter((i) => !off.includes(i));
  const posts = usePosts();
  const shown = posts.filter((p) => p.feed === feed && (feed === 'venner' || !p.topic || active.includes(p.topic)));
  // Nye moments først, sete bagefter (som i Figma)
  const order = Object.keys(people).sort((a, b) => Number(seen.includes(a)) - Number(seen.includes(b)));

  return (
    <div className="home">
      <SegmentedControl
        label="Vis opslag fra"
        value={feed}
        onChange={(v) => setParams(v === 'venner' ? {} : { feed: v }, { replace: true })}
        options={[
          { value: 'venner', label: 'Venner' },
          { value: 'interesser', label: 'Interesser' },
        ]}
      />

      {feed === 'interesser' && (
        <ul className="home__chips" aria-label="Filtrér efter dine interesser">
          {/* Rediger emner står først og ruller med væk, når man bladrer i emnerne */}
          <li>
            <Chip className="home__edit" onClick={() => setEditing(true)}>
              <Icon name="sliders" size={18} />
              Rediger emner
            </Chip>
          </li>
          {profile.interests.map((i) => {
            const on = !off.includes(i);
            return (
              <li key={i}>
                <Chip
                  selected={on}
                  className="home__topic"
                  aria-label={on ? `${i}, vises. Tryk for at fjerne` : `${i}, skjult. Tryk for at vise`}
                  onClick={() => setOff((o) => (on ? [...o, i] : o.filter((x) => x !== i)))}
                >
                  {i}
                  <Icon name={on ? 'close' : 'plus'} size={16} />
                </Chip>
              </li>
            );
          })}
        </ul>
      )}

      <ul className="home__moments" aria-label="Moments">
        <li>
          <MomentBubble
            name="Dig"
            fullName={profile.name || 'Dig'}
            state="add"
            src={profile.avatar ?? img('mig.jpg')}
            onClick={() => navigate('/flicks/ny')}
          />
        </li>
        {order.map((id) => {
          const p = people[id]!;
          return (
            <li key={id}>
              <MomentBubble
                name={p.name}
                fullName={p.fullName}
                tone={p.tone}
                src={p.avatarSrc}
                state={seen.includes(id) ? 'seen' : 'new'}
                onClick={() => navigate(`/moment/${id}`)}
              />
            </li>
          );
        })}
      </ul>

      <div className="home__posts">
        {shown.map((p) => (
          <PostCard key={p.id} post={p} onComment={() => navigate(`/opslag/${p.id}?kommentarer`)}
            onShare={() => navigate(`/opslag/${p.id}/del`)}
            onReport={() => navigate(`/opslag/${p.id}/rapporter`)}
          />
        ))}
      </div>

      <InterestsSheet open={editing} onClose={() => setEditing(false)} />
    </div>
  );
}
