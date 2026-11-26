import { useVotes, vote } from '../state/votes';
import { Icon } from './Icon';
import './LikeButton.css';

type Props = {
  id: string;
  /** Antal hjerter fra andre (dit eget lægges til) */
  base: number;
  /** pill = opslag, stack = lodret på Flicks, row = vandret på Moments (de to sidste er hvide) */
  variant?: 'pill' | 'stack' | 'row';
};

const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace('.', ',')} t.` : String(n));

/** Synes godt om (hjerte). Alt uden for Offentlig debat bruger hjerter – også offentlige personer og sider. */
export function LikeButton({ id, base, variant = 'pill' }: Props) {
  const liked = useVotes()[id] === 1;
  const count = base + (liked ? 1 : 0);
  return (
    <button
      type="button"
      className={['like', `like--${variant}`, variant === 'pill' && 'post__act', liked && 'like--on'].filter(Boolean).join(' ')}
      aria-pressed={liked}
      aria-label={`Synes godt om${count ? `: ${count}` : ''}`}
      onClick={() => vote(id, 1)}
    >
      <Icon name={liked ? 'heart-filled' : 'heart'} size={variant === 'stack' ? 28 : variant === 'row' ? 24 : 20} />
      {count > 0 && <span className={['t-caption-strong', variant === 'pill' && 'post__count'].filter(Boolean).join(' ')}>{fmt(count)}</span>}
    </button>
  );
}
