import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Avatar } from '../../components/Avatar';
import { authorAvatar, myAvatar } from '../../data/create';
import { handleOf } from '../../data/handles';
import { usePost } from '../../state/posts';
import { useSession } from '../../state/session';
import { useClose } from '../create/parts';
import { MomentComposer } from './MomentComposer';
import './Share.css';

/** Del et opslag som moment – fuld skærm. Rute: /opslag/:id/del/moment */
export function ShareMoment() {
  const { id } = useParams();
  const navigate = useNavigate();
  const close = useClose(id ? `/opslag/${id}/del` : '/');
  const { profile } = useSession();
  const post = usePost(id);
  if (!post) return <Navigate to="/" replace />;

  const myName = profile.name || 'Dig';
  const card = (
    <div className="share__quote">
      <div className="share__quote-head">
        <Avatar name={post.author} tone={post.tone} src={authorAvatar(post.author, post.avatarSrc)} size="S" />
        <span className="share__quote-name">
          <span className="t-heading-s">{post.author}</span>
          <span className="t-caption modal-screen__muted">@{post.username || handleOf(post.author)}</span>
        </span>
      </div>
      <p className="t-body-s">{post.text}</p>
      {typeof post.image === 'string' && <img className="share__quote-img" src={post.image} alt="" />}
    </div>
  );

  return (
    <MomentComposer
      card={card}
      image={typeof post.image === 'string' ? post.image : undefined}
      me={{
        name: myName,
        handle: profile.username.trim().replace(/^@/, '') || handleOf(myName),
        avatar: profile.avatar ?? myAvatar,
      }}
      onClose={close}
      onShare={() => navigate('/', { replace: true })}
    />
  );
}
