import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { StoryViewer } from '../../components/StoryViewer';
import { findAccount } from '../../data/directory';
import { extrasFor } from '../../data/profileExtras';

/** En andens samling, afspillet som story highlight. Rute: /bruger/:handle/samling/:id */
export function UserCollection() {
  const { handle = '', id = '' } = useParams();
  const navigate = useNavigate();
  const account = findAccount(handle);
  const collection = extrasFor(handle).collections.find((c) => c.id === id);
  if (!account || !collection) return <Navigate to={`/bruger/${handle}`} replace />;

  const close = () => {
    if (window.history.state && window.history.state.idx > 0) navigate(-1);
    else navigate(`/bruger/${handle}`, { replace: true });
  };

  return <StoryViewer items={collection.photos} title={collection.title} onClose={close} />;
}
