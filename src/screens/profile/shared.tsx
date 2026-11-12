import { useNavigate } from 'react-router-dom';
import { fallbackAvatar } from '../../data/profile';
import { useSession } from '../../state/session';
import { twoColumns } from './store';

/** Den indloggede bruger, med pladsholdere som i Figma, hvis noget mangler. */
export function useMe() {
  const { profile } = useSession();
  const name = profile.name.trim() || 'Dit navn';
  const handle = profile.username.trim().replace(/^@/, '') || 'dit-navn';
  return { name, username: `@${handle}`, avatar: profile.avatar || fallbackAvatar, interests: profile.interests };
}

/** Går ét skridt tilbage, eller til `fallback`, hvis siden er åbnet direkte. */
export function useGoBack(fallback: string) {
  const navigate = useNavigate();
  return () => {
    if (window.history.state && window.history.state.idx > 0) navigate(-1);
    else navigate(fallback, { replace: true });
  };
}

export type Tile = { key: string; height: number; render: () => React.ReactNode };

/** To kolonner med 8 px mellemrum (Figmas "Masonry"). */
export function Masonry({ tiles, label }: { tiles: Tile[]; label?: string }) {
  const cols = twoColumns(tiles);
  return (
    <div className="pf-masonry" role={label ? 'list' : undefined} aria-label={label}>
      {cols.map((col, i) => (
        <div key={i} className="pf-masonry__col">
          {col.map((t) => (
            <div key={t.key} role={label ? 'listitem' : undefined} className="pf-masonry__cell" style={{ height: t.height }}>
              {t.render()}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
