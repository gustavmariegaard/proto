import { useCallback } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { StoryViewer } from '../../components/StoryViewer';
import { collectionPhotos, useCollection } from './store';
import './Screens.css';

/**
 * Samling · Visning: afspiller samlingen som en story highlight.
 * Tryk til højre for næste, til venstre for forrige. Hold fingeren nede for at pause.
 */
export function CollectionViewer() {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const collection = useCollection(id);
  const list = collection ? collectionPhotos(collection) : [];

  const close = useCallback(() => {
    if (window.history.state && window.history.state.idx > 0) navigate(-1);
    else navigate('/profil', { replace: true });
  }, [navigate]);

  if (!collection || list.length === 0) return <Navigate to="/profil" replace />;

  return (
    <StoryViewer
      items={list.map((p) => p.src)}
      title={collection.title}
      startAt={Number(params.get('start')) || 0}
      onClose={close}
      actions={
        // "Se alle" åbner samlingen, hvor man også kan redigere den
        <button type="button" className="pf-viewer__action" onClick={() => navigate(`/profil/samling/${id}/rediger`, { replace: true })}>
          <Icon name="layout-grid" size={20} />
          Se alle
        </button>
      }
    />
  );
}
