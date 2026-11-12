import { Avatar, type AvatarTone } from './Avatar';
import { Icon } from './Icon';
import './MomentBubble.css';

type MomentBubbleProps = {
  name: string;
  /** Fulde navn til initialerne, fx "Mette Lund" → ML */
  fullName?: string;
  state?: 'new' | 'seen' | 'add';
  tone?: AvatarTone;
  src?: string;
  onClick?: () => void;
};

/** Moment som bobbel (74 px). Grøn ring = nyt, grå ring = set, stiplet = tilføj. */
export function MomentBubble({ name, fullName, state = 'new', tone, src, onClick }: MomentBubbleProps) {
  const label =
    state === 'add' ? 'Tilføj moment' : state === 'new' ? `Se moment fra ${name}, nyt` : `Se moment fra ${name}`;
  return (
    <button type="button" className="moment" onClick={onClick} aria-label={label}>
      <span className={`moment__ring moment__ring--${state}`}>
        {state === 'add' ? <Icon name="plus" /> : <Avatar name={fullName ?? name} tone={tone} size="XL" src={src} />}
      </span>
      <span className="moment__name" aria-hidden="true">{name}</span>
    </button>
  );
}
