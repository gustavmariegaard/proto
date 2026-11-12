import { Link, useNavigate } from 'react-router-dom';
import netvaerk from '../../assets/europa-netvaerk.svg';
import { Button } from '../../components/Button';
import { IconTile } from '../../components/IconTile';
import { LanguageButton } from '../../components/LanguageButton';
import { Wordmark } from '../../components/Wordmark';
import { valuePoints } from '../../data/onboarding';
import { AuthPage, AuthTop } from '../../layout/AuthPage';
import './Welcome.css';

/** Velkommen: første skærm, man ser. */
export function Welcome() {
  const navigate = useNavigate();
  return (
    <AuthPage
      top={26}
      gap={10}
      className="welcome"
      footer={
        <>
          <Button block onClick={() => navigate('/konto/land')}>Opret konto</Button>
          <Button block variant="secondary" onClick={() => navigate('/log-ind')}>Log ind</Button>
          <p className="welcome__terms">
            Når du fortsætter, accepterer du <Link to="/vilkaar">vilkår</Link> og{' '}
            <Link to="/privatliv">privatlivspolitik</Link>.
          </p>
        </>
      }
    >
      <img className="welcome__bg" src={netvaerk} alt="" aria-hidden="true" />
      <AuthTop>
        <h1 className="welcome__logo">
          <Wordmark size={60} />
        </h1>
        <LanguageButton />
      </AuthTop>
      <p className="welcome__title">Et socialt netværk for dem, du kender.</p>
      <p className="auth__lead">Et netværk for rigtige mennesker i Europa.</p>
      <ul className="welcome__points">
        {valuePoints.map((p) => (
          <li key={p.slug}>
            <Link to={`/om/${p.slug}`} className="welcome__point">
              <IconTile icon={p.icon} />
              <span className="t-heading-s">{p.title}</span>
            </Link>
          </li>
        ))}
      </ul>
      <div>
        <Button variant="ghost" onClick={() => navigate('/saadan-fungerer')} className="welcome__how">
          Sådan fungerer ciircle
        </Button>
      </div>
    </AuthPage>
  );
}
