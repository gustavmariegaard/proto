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

/**
 * Moment som bobbel (74 px). Grøn ring = nyt, grå ring = set.
 * "Tilføj" viser dit eget profilbillede med et plus nederst til højre.
 */
export function MomentBubble({ name, fullName, state = 'new', tone, src, onClick }: MomentBubbleProps) {
  const label =
    state === 'add' ? 'Tilføj moment' : state === 'new' ? `Se moment fra ${name}, nyt` : `Se moment fra ${name}`;
  return (
    <button type="button" className="moment" onClick={onClick} aria-label={label}>
      <span className="moment__wrap">
        <span className={`moment__ring moment__ring--${state}`}>
          {state === 'add' && !src ? (
            <Icon name="plus" />
          ) : (
            <Avatar name={fullName ?? name} tone={tone} size="XL" src={src} />
          )}
        </span>
        {state === 'add' && src && (
          <span className="moment__plus" aria-hidden="true">
            <Icon name="plus" size={16} />
          </span>
        )}
      </span>
      <span className="moment__name" aria-hidden="true">{name}</span>
    </button>
  );
}
