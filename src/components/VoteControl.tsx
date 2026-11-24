import { scoreWith, useVotes, vote } from '../state/votes';
import { Icon } from './Icon';
import './VoteControl.css';

type Props = {
  id: string;
  base: number;
  /** Offentlige profiler, sider og Offentlig debat: også nedstemme. Almindelige brugere: kun op. */
  allowDown: boolean;
  /** pill = opslag, stack = lodret på Flicks, row = vandret på Moments (de to sidste er hvide) */
  variant?: 'pill' | 'stack' | 'row';
};

const fmt = (n: number) => (Math.abs(n) >= 1000 ? `${(n / 1000).toFixed(1).replace('.', ',')} t.` : String(n));

/** Stem op / ned. Samme stemme igen fjerner den. Pilen fyldes sort (hvid på mørke skærme). */
export function VoteControl({ id, base, allowDown, variant = 'pill' }: Props) {
  const mine = useVotes()[id];
  const score = scoreWith(base, mine);
  return (
    <div
      className={['vote', `vote--${variant}`, post(variant), mine === 1 && 'vote--up', mine === -1 && 'vote--down'].filter(Boolean).join(' ')}
      role="group"
      aria-label={`Score ${score}`}
    >
      <button type="button" className="vote__btn vote__btn--up post__vote-btn" aria-label="Stem op" aria-pressed={mine === 1} onClick={() => vote(id, 1)}>
        <Icon name="vote-up" size={variant === 'stack' ? 26 : 20} />
      </button>
      <span className={['t-caption-strong vote__score post__score', !allowDown && 'vote__score--end post__score--end'].filter(Boolean).join(' ')} aria-live="polite">
        {fmt(score)}
      </span>
      {allowDown && (
        <button type="button" className="vote__btn vote__btn--down post__vote-btn" aria-label="Stem ned" aria-pressed={mine === -1} onClick={() => vote(id, -1)}>
          <Icon name="vote-down" size={variant === 'stack' ? 26 : 20} />
        </button>
      )}
    </div>
  );
}

/* Pillen på opslag bruger de eksisterende post__vote-klasser */
const post = (variant: string) => (variant === 'pill' ? 'post__vote' : '');
