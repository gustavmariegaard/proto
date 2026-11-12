import { Link, useNavigate } from 'react-router-dom';
import { IconButton } from './IconButton';
import { Wordmark } from './Wordmark';
import './TopBar.css';

type TopBarProps = {
  unreadMessages?: boolean;
  unreadNotifications?: boolean;
};

/**
 * Topbar: wordmark til venstre. Søg, beskeder og notifikationer til højre
 * uden cirkel, så de sidder integreret i siden. Mint prik = ulæst.
 */
export function TopBar({ unreadMessages = true, unreadNotifications = true }: TopBarProps) {
  const navigate = useNavigate();
  return (
    <header className="topbar">
      <Link to="/" className="topbar__home" aria-label="ciircle, gå til Hjem">
        <Wordmark />
      </Link>
      <div className="topbar__actions">
        <IconButton icon="search" label="Søg" />
        <IconButton icon="chat" label="Beskeder" dot={unreadMessages} onClick={() => navigate('/beskeder')} />
        <IconButton icon="bell" label="Notifikationer" dot={unreadNotifications} />
      </div>
    </header>
  );
}
