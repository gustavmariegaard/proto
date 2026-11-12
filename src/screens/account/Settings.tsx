import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { Chip } from '../../components/Chip';
import { PageHeader } from '../../components/PageHeader';
import { TextField } from '../../components/TextField';
import {
  familyToggles,
  languages,
  networkToggles,
  screenTimeOptions,
  settingsToggleDefaults,
  translationExample as ex,
  translationToggles,
} from '../../data/account';
import { useSession } from '../../state/session';
import { ToggleList } from '../create/parts';
import './account.css';

/** Indstillinger: oversættelse, åbne netværk, børn og forældre. */
export function Settings() {
  const navigate = useNavigate();
  const { logOut } = useSession();
  const [language, setLanguage] = useState('Dansk');
  const [showOriginal, setShowOriginal] = useState(false);
  const [toggles, setToggles] = useState(settingsToggleDefaults);
  const [handle, setHandle] = useState('');
  const [screenTime, setScreenTime] = useState('Ingen grænse');

  const flip = (id: string) => setToggles((v) => ({ ...v, [id]: !v[id] }));

  return (
    <div className="acc-screen">
      <PageHeader title="Indstillinger" fallback="/" />

      <main className="acc-content">
        <h2 className="t-heading-m">Oversættelse</h2>
        <p className="t-caption acc-muted">Læs opslag og beskeder fra hele Europa på dit eget sprog.</p>
        <div className="acc-chips" role="group" aria-label="Dit sprog">
          {languages.map((l) => (
            <Chip key={l} selected={l === language} onClick={() => setLanguage(l)} lang={langCode(l)}>
              {l}
            </Chip>
          ))}
        </div>

        <div className="translation-example">
          <div className="translation-example__who">
            <Avatar name={ex.name} tone="sand" size="S" src={ex.avatarSrc} />
            <span className="t-heading-s">{ex.name}</span>
            <span className="t-caption acc-muted">{ex.language}</span>
          </div>
          <p className="t-body" lang={showOriginal ? 'sv' : undefined}>
            {showOriginal ? ex.original : ex.translated}
          </p>
          <Button variant="ghost" onClick={() => setShowOriginal((v) => !v)}>
            {showOriginal ? 'Vis oversættelse' : 'Vis original'}
          </Button>
        </div>

        <ToggleList rows={translationToggles} values={toggles} onToggle={flip} />

        <h2 className="t-heading-m">Åbne netværk</h2>
        <p className="t-caption acc-muted">Følg folk på andre netværk, og lad dem følge dig, uden at skifte app.</p>
        <ToggleList rows={networkToggles} values={toggles} onToggle={flip} />
        <TextField
          label="[@navn@netværk.eu]"
          type="text"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
        />

        <h2 className="t-heading-m">Børn og forældre</h2>
        <p className="t-caption acc-muted">Indbyggede værn for unge brugere og værktøjer til forældre.</p>
        <ToggleList rows={familyToggles} values={toggles} onToggle={flip} />

        <h3 className="t-heading-s">Daglig skærmtid</h3>
        <div className="acc-chips" role="group" aria-label="Daglig skærmtid">
          {screenTimeOptions.map((o) => (
            <Chip key={o} selected={o === screenTime} onClick={() => setScreenTime(o)}>
              {o}
            </Chip>
          ))}
        </div>

        <div className="age-note">
          <p className="t-heading-s">Aldersverificering</p>
          <p className="t-caption">
            Verificeret med dit nationale eID. Under 16 år får automatisk et beskyttet miljø uden offentlige beskeder fra
            fremmede.
          </p>
        </div>

        {/* Ikke i Figma: så testere kan prøve velkomst og oprettelse igen */}
        <Button
          variant="secondary"
          className="acc-logout"
          onClick={() => {
            logOut();
            navigate('/velkommen', { replace: true });
          }}
        >
          Log ud
        </Button>
      </main>
    </div>
  );
}

function langCode(l: string) {
  return { Dansk: 'da', English: 'en', Deutsch: 'de', Français: 'fr', Español: 'es' }[l];
}
