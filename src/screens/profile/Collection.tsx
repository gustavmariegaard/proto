import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Button } from '../../components/Button';
import { PageHeader } from '../../components/PageHeader';
import { Tag } from '../../components/Tag';
import { photoHeights } from '../../data/profile';
import { Masonry } from './shared';
import { collectionPhotos, useCollection } from './store';
import './Profile.css';
import './Screens.css';

/** Samling (fx Sommer). Tryk på et billede for at afspille samlingen. */
export function Collection() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const collection = useCollection(id);
  if (!collection) return <Navigate to="/profil" replace />;
  const list = collectionPhotos(collection);

  return (
    <div className="pf-screen">
      <PageHeader title={collection.title} fallback="/profil">
        <Button variant="ghost" onClick={() => navigate(`/profil/samling/${id}/rediger`)}>
          Rediger
        </Button>
      </PageHeader>
      <main className="pf-screen__content">
        <p className="t-caption pf-muted pf-full">Tryk på et billede for at se samlingen.</p>
        <Masonry
          label={`Billeder i ${collection.title}`}
          tiles={list.map((p, i) => ({
            key: p.id,
            height: photoHeights[i % photoHeights.length]!,
            render: () => (
              <Link
                to={`/profil/samling/${id}/vis?start=${i}`}
                className="pf-photo"
                aria-label={`Afspil samlingen fra billede ${i + 1}`}
              >
                <img src={p.src} alt="" />
                {p.id === collection.cover && (
                  <span className="pf-cover-tag">
                    <Tag>Forside</Tag>
                  </span>
                )}
              </Link>
            ),
          }))}
        />
      </main>
    </div>
  );
}
