import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BackButton } from '../../components/BackButton';
import { Button } from '../../components/Button';
import { LanguageButton } from '../../components/LanguageButton';
import { TextField } from '../../components/TextField';
import { AuthPage, AuthTop } from '../../layout/AuthPage';
import { useSession } from '../../state/session';

/** Log ind. I prototypen logger begge knapper ind med det samme. */
export function LogIn() {
  const navigate = useNavigate();
  const { logIn } = useSession();
  const [email, setEmail] = useState('');

  const enter = () => {
    logIn();
    navigate('/', { replace: true });
  };

  return (
    <AuthPage
      footer={
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Button variant="ghost" onClick={() => navigate('/konto/land')}>Ny her? Opret konto</Button>
        </div>
      }
    >
      <AuthTop>
        <BackButton />
        <LanguageButton />
      </AuthTop>
      <h1>Log ind</h1>
      <p className="auth__lead">Velkommen tilbage. Brug dit eID, så ved vi, at det er dig.</p>
      <Button block onClick={enter}>Fortsæt med eID</Button>
      <p className="t-caption" style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>eller</p>
      <form
        style={{ display: 'contents' }}
        onSubmit={(e) => {
          e.preventDefault();
          enter();
        }}
      >
        <TextField
          label="E-mail"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Button block variant="secondary" type="submit">Send mig et login-link</Button>
      </form>
    </AuthPage>
  );
}
