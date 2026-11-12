import './Avatar.css';

export type AvatarTone = 'sand' | 'blue' | 'sage' | 'rose';
export type AvatarSize = 'S' | 'M' | 'L' | 'XL';

type AvatarProps = {
  name: string;
  tone?: AvatarTone;
  size?: AvatarSize;
  /** Billede fra public/img, fx "/img/mette.jpg". Uden billede vises initialer. */
  src?: string;
};

export function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');
}

/** Rund avatar. S = 36, M = 44, L = 56 px (XL = 70 px, bruges i Moments). */
export function Avatar({ name, tone = 'blue', size = 'M', src }: AvatarProps) {
  return (
    <span className={`avatar avatar--${size} avatar--${tone}`} aria-hidden="true">
      {src ? <img src={src} alt="" /> : initials(name)}
    </span>
  );
}
