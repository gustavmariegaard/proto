import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Button } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { PageHeader } from '../../components/PageHeader';
import { Sheet } from '../../components/Sheet';
import { Tag } from '../../components/Tag';
import { photoById, photoHeights, photos } from '../../data/profile';
import { Masonry } from './shared';
import { updateCollection, useCollection } from './store';
import './Profile.css';
import './Screens.css';

/**
 * Rediger samling. Tryk på et billede for at tage det med eller fjerne det.
 * "Vælg forside" skifter til en tilstand, hvor et tryk vælger forsiden.
 * Ændringer gemmes, når man trykker Færdig.
 */
export function CollectionEdit() {
  const { id = '' } = useParams();
  const collection = useCollection(id);
  if (!collection) return <Navigate to="/profil" replace />;
  return <Editor key={id} id={id} title={collection.title} initialIds={collection.photoIds} initialCover={collection.cover} />;
}

function Editor({ id, title, initialIds, initialCover }: { id: string; title: string; initialIds: string[]; initialCover: string }) {
  const navigate = useNavigate();
  // Alle billeder, der vises (også dem, der er fravalgt), og hvilke der er med
  const [shown, setShown] = useState<string[]>(initialIds);
  const [included, setIncluded] = useState<string[]>(initialIds);
  const [cover, setCover] = useState(initialCover);
  const [choosingCover, setChoosingCover] = useState(false);
  const [adding, setAdding] = useState(false);

  const others = photos.filter((p) => !shown.includes(p.id));

  const done = () => {
    const photoIds = shown.filter((p) => included.includes(p));
    const nextCover = photoIds.includes(cover) ? cover : (photoIds[0] ?? cover);
    updateCollection(id, { photoIds, cover: nextCover });
    if (window.history.state && window.history.state.idx > 0) navigate(-1);
    else navigate(`/profil/samling/${id}`, { replace: true });
  };

  const tap = (photoId: string) => {
    if (choosingCover) {
      setCover(photoId);
      setIncluded((l) => (l.includes(photoId) ? l : [...l, photoId]));
      setChoosingCover(false);
      return;
    }
    setIncluded((l) => (l.includes(photoId) ? l.filter((x) => x !== photoId) : [...l, photoId]));
  };

  const add = (photoId: string) => {
    setShown((l) => [...l, photoId]);
    setIncluded((l) => [...l, photoId]);
  };

  return (
    <div className="pf-screen">
      <PageHeader title={title} fallback="/profil">
        <Button variant="ghost" onClick={done}>
          Færdig
        </Button>
      </PageHeader>
      <main className="pf-screen__content">
        <p className="t-caption pf-muted pf-full" aria-live="polite">
          {choosingCover ? 'Tryk på det billede, der skal være forside.' : 'Tryk for at tilføje eller fjerne billeder. De markerede er med i samlingen.'}
        </p>
        <Masonry
          label={`Billeder i ${title}`}
          tiles={shown.map((photoId, i) => {
            const photo = photoById(photoId)!;
            const on = included.includes(photoId);
            return {
              key: photoId,
              height: photoHeights[i % photoHeights.length]!,
              render: () => (
                <button
                  type="button"
                  className={['pf-photo pf-pick', !on && 'pf-pick--off'].filter(Boolean).join(' ')}
                  aria-pressed={choosingCover ? photoId === cover : on}
                  aria-label={choosingCover ? `Vælg billede ${i + 1} som forside` : `Billede ${i + 1}`}
                  onClick={() => tap(photoId)}
                >
                  <img src={photo.src} alt="" />
                  {photoId === cover && (
                    <span className="pf-cover-tag">
                      <Tag>Forside</Tag>
                    </span>
                  )}
                  {!choosingCover && (
                    <span className={['pf-check', on && 'pf-check--on'].filter(Boolean).join(' ')} aria-hidden="true">
                      {on && <Icon name="check" size={16} />}
                    </span>
                  )}
                </button>
              ),
            };
          })}
        />
        <Button variant="secondary" block aria-pressed={choosingCover} onClick={() => setChoosingCover((v) => !v)}>
          Vælg forside
        </Button>
        <Button variant="secondary" block onClick={() => setAdding(true)}>
          Tilføj fra dine billeder
        </Button>
      </main>

      <Sheet open={adding} onClose={() => setAdding(false)} title="Tilføj fra dine billeder" dim>
        {others.length === 0 ? (
          <p className="t-body-s pf-muted">Alle dine billeder er allerede med.</p>
        ) : (
          <ul className="pf-add-grid">
            {others.map((p) => (
              <li key={p.id}>
                <button type="button" className="pf-photo pf-add-grid__item" aria-label="Tilføj billede" onClick={() => add(p.id)}>
                  <img src={p.src} alt="" />
                  <span className="pf-check" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Sheet>
    </div>
  );
}
