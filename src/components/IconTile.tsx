import { Icon, type IconName } from './Icon';
import './IconTile.css';

/** Mint felt med et ikon. 40, 44 eller 48 px. */
export function IconTile({ icon, size = 44 }: { icon: IconName; size?: 40 | 44 | 48 }) {
  return (
    <span className="icon-tile" style={{ width: size, height: size }} aria-hidden="true">
      <Icon name={icon} />
    </span>
  );
}
