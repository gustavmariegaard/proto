import { useNavigate } from 'react-router-dom';
import { BackButton } from '../../components/BackButton';
import { Button } from '../../components/Button';
import { IconTile } from '../../components/IconTile';
import { valuePoints } from '../../data/onboarding';
import { AuthPage } from '../../layout/AuthPage';
import './Info.css';

/** Sådan fungerer ciircle: de fem punkter med en kort forklaring. */
export function HowItWorks() {
  const navigate = useNavigate();
  return (
    <AuthPage top={30} gap={14} footer={<Button block onClick={() => navigate('/konto/land')}>Opret konto</Button>}>
      <header className="info__header">
        <BackButton />
        <h1 className="info__h1">Sådan fungerer ciircle</h1>
      </header>
      <div className="info__list">
        <p className="t-body-s info__muted">Sådan er ciircle bygget, og sådan fungerer det.</p>
        {valuePoints.map((p) => (
          <section key={p.slug} className="info__card" aria-labelledby={`vp-${p.slug}`}>
            <div className="info__card-title">
              <IconTile icon={p.icon} size={40} />
              <h2 id={`vp-${p.slug}`} className="t-heading-s">{p.title}</h2>
            </div>
            <p className="t-body-s">{p.summary}</p>
            <p className="t-caption-strong info__muted">Sådan fungerer det</p>
            <p className="t-caption info__muted info__fade">{p.howShort}</p>
            <div>
              <Button variant="ghost" className="info__more" onClick={() => navigate(`/om/${p.slug}`)}>
                Læs mere
              </Button>
            </div>
          </section>
        ))}
      </div>
    </AuthPage>
  );
}
