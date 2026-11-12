import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { BackButton } from '../../components/BackButton';
import { Button } from '../../components/Button';
import { IconTile } from '../../components/IconTile';
import { valuePointDetail, valuePoints } from '../../data/onboarding';
import { AuthPage } from '../../layout/AuthPage';
import './Info.css';

/** Om-side for ét af de fem punkter, fx "Data gemmes i EU". */
export function About() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const point = valuePoints.find((p) => p.slug === slug);
  if (!point) return <Navigate to="/saadan-fungerer" replace />;

  return (
    <AuthPage top={30} gap={14} footer={<Button block onClick={() => navigate('/konto/land')}>Opret konto</Button>}>
      <header className="info__header">
        <BackButton fallback="/saadan-fungerer" />
      </header>
      <article className="info__article">
        <div className="info__title-row">
          <IconTile icon={point.icon} size={48} />
          <h1 className="info__h1">{point.title}</h1>
        </div>
        <p className="t-body">{point.summary}</p>
        <h2 className="t-heading-m">Sådan fungerer det</h2>
        {valuePointDetail.how.map((t) => (
          <p key={t} className="t-body-s info__muted">{t}</p>
        ))}
        <h2 className="t-heading-m">Sådan kan du selv tjekke det</h2>
        <p className="t-body-s info__muted">{valuePointDetail.check}</p>
      </article>
    </AuthPage>
  );
}
