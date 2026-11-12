import { useNavigate } from 'react-router-dom';
import { BackButton } from '../../components/BackButton';
import { Button } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { LanguageButton } from '../../components/LanguageButton';
import { AuthPage, AuthTop } from '../../layout/AuthPage';
import './Eid.css';

const points = [
  'Din alder bekræftes automatisk. Du skal ikke skrive den.',
  'Bekræftelsen sker hos din egen eID-udbyder.',
  'Vi gemmer kun det, der er nødvendigt.',
  'Dit personnummer deles aldrig med andre.',
];

/** Opret konto · eID. I prototypen springer "Åbn eID" direkte videre. */
export function Eid() {
  const navigate = useNavigate();
  return (
    <AuthPage footer={<Button block onClick={() => navigate('/konto/profil')}>Åbn eID</Button>}>
      <AuthTop>
        <BackButton />
        <LanguageButton />
      </AuthTop>
      <h1>Bekræft, at du er dig</h1>
      <p className="auth__lead">
        Du bekræfter dig med dit nationale eID, fx MitID i Danmark. Det bruges til at bekræfte din profil.
      </p>
      <ul className="eid__box">
        {points.map((p) => (
          <li key={p}>
            <Icon name="check" />
            <span className="t-body-s">{p}</span>
          </li>
        ))}
      </ul>
    </AuthPage>
  );
}
