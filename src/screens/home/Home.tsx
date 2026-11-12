import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Chip } from '../../components/Chip';
import { MomentBubble } from '../../components/MomentBubble';
import { PostCard } from '../../components/PostCard';
import { SegmentedControl } from '../../components/SegmentedControl';
import { people, posts } from '../../data/sample';
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
        <ul className="home__chips" aria-label="Dine interesser">
          {profile.interests.map((i) => (
            <li key={i}>
              <Chip
                selected={!off.includes(i)}
                onClick={() => setOff((o) => (o.includes(i) ? o.filter((x) => x !== i) : [...o, i]))}
              >
                {i}
              </Chip>
            </li>
          ))}
          <li>
            <Chip onClick={() => setEditing(true)}>Rediger emner</Chip>
          </li>
        </ul>
      )}

      <h2 className="t-heading-s">Moments</h2>
      <ul className="home__moments" aria-label="Moments">
        <li>
          <MomentBubble name="Dig" state="add" onClick={() => navigate('/opret')} />
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
