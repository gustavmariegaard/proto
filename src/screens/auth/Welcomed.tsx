import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/Button';
import { Wordmark } from '../../components/Wordmark';
import { AuthPage } from '../../layout/AuthPage';
import { useSession } from '../../state/session';

/** Velkommen ind: sidste skærm, når kontoen er oprettet. */
export function Welcomed() {
  const navigate = useNavigate();
  const { logIn } = useSession();
  // Kontoen er oprettet: nu er man logget ind.
  useEffect(() => logIn(), [logIn]);
  return (
    <AuthPage
      footer={
        <>
          <Button block onClick={() => navigate('/find-folk', { replace: true })}>Udvid cirkel</Button>
          <Button block variant="secondary" onClick={() => navigate('/', { replace: true })}>
            Gå til forsiden
          </Button>
        </>
      }
    >
      <div style={{ flex: 1 }} />
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <Wordmark size={60} />
      </div>
      <h1 style={{ textAlign: 'center' }}>Du er med.</h1>
      <p className="auth__lead" style={{ textAlign: 'center' }}>
        Start med at udvide din cirkel. Find de mennesker, du allerede kender.
      </p>
      <div style={{ flex: 1 }} />
    </AuthPage>
  );
}
