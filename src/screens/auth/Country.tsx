import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BackButton } from '../../components/BackButton';
import { Button } from '../../components/Button';
import { LanguageButton } from '../../components/LanguageButton';
import { TextField } from '../../components/TextField';
import { countries } from '../../data/onboarding';
import { AuthPage, AuthTop } from '../../layout/AuthPage';
import { useSession } from '../../state/session';
import './Country.css';

/** Opret konto · Land: vælg, hvor du bor. */
export function Country() {
  const navigate = useNavigate();
  const { country, setCountry } = useSession();
  const [query, setQuery] = useState('');
  const shown = countries.filter((c) => c.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <AuthPage footer={<Button block onClick={() => navigate('/konto/eid')}>Fortsæt</Button>}>
      <AuthTop>
        <BackButton />
        <LanguageButton />
      </AuthTop>
      <h1>Hvor bor du?</h1>
      <p className="auth__lead">
        Vi bruger dit land til at vise det rigtige eID og de rigtige regler. Søg, eller rul i listen.
      </p>
      <TextField label="Søg efter land" type="search" value={query} onChange={(e) => setQuery(e.target.value)} />
      <div className="country__wrap">
        <ul className="country__list" role="radiogroup" aria-label="Land">
          {shown.map((c) => {
            const selected = c === country;
            return (
              <li key={c}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className={['country__row', selected && 'country__row--on'].filter(Boolean).join(' ')}
                  onClick={() => setCountry(c)}
                >
                  <span className="t-label">{c}</span>
                  <span className="country__radio" aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </AuthPage>
  );
}
