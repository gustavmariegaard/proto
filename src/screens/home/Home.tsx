import { useNavigate, useSearchParams } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { Chip } from '../../components/Chip';
import { MomentBubble } from '../../components/MomentBubble';
import { PostCard } from '../../components/PostCard';
import { SegmentedControl } from '../../components/SegmentedControl';
import { img, pageAccounts, people } from '../../data/sample';
import { usePosts } from '../../state/posts';
import { useMoments } from '../../state/moments';
import { useSession } from '../../state/session';
import './Home.css';

type Feed = 'venner' | 'interesser';

/** Hjem: feed fra venner eller fra dine interesser. */
export function Home() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const feed: Feed = params.get('feed') === 'interesser' ? 'interesser' : 'venner';
  const { seen } = useMoments();
  const { profile } = useSession();
  const posts = usePosts();
  const shown = posts.filter((p) => p.feed === feed);
  // Nye moments først, sete bagefter (som i Figma)
  const accounts = feed === 'interesser' ? pageAccounts : people;
  const order = Object.keys(accounts).sort((a, b) => Number(seen.includes(a)) - Number(seen.includes(b)));

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
        <div className="home__pages">
          <p className="t-caption home__muted">Nyt fra de sider, du følger</p>
          <Chip className="home__edit" onClick={() => navigate('/sider')}>
            <Icon name="layout-grid" size={18} />
            Dine sider
          </Chip>
        </div>
      )}

      {/* Venner: personers moments med "Dig" først. Interesser: moments fra sider, man følger. */}
      <ul className="home__moments" aria-label={feed === 'interesser' ? 'Moments fra sider' : 'Moments'}>
        {feed === 'venner' && (
          <li>
            <MomentBubble
              name="Dig"
              fullName={profile.name || 'Dig'}
              state="add"
              src={profile.avatar ?? img('mig.jpg')}
              onClick={() => navigate('/flicks/ny')}
            />
          </li>
        )}
        {order.map((id) => {
          const p = accounts[id]!;
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

    </div>
  );
}
