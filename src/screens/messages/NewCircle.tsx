import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/Button';
import { Chip } from '../../components/Chip';
import { TextField } from '../../components/TextField';
import { contacts } from '../../data/messages';
import { matches, useSelection } from './hooks';
import { CloseHeader, PickRow } from './shared';
import { createCircle } from './store';
import './Messages.css';

/** Ny cirkel: navn, medlemmer og om beskeder forsvinder. Opret åbner cirklen. */
export function NewCircle() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [query, setQuery] = useState('');
  const [selected, toggle] = useSelection();
  const [disappearing, setDisappearing] = useState(false);

  const friends = contacts.filter((c) => c.friend);
  const shown = friends.filter((c) => matches(c.name, query));
  const canCreate = name.trim().length > 0 && selected.length > 0;

  const create = () => {
    if (!canCreate) return;
    const id = createCircle(name.trim(), selected, disappearing);
    navigate(`/beskeder/${id}`, { replace: true });
  };

  return (
    <div className="msg-screen">
      <CloseHeader title="Ny cirkel" />

      <main className="msg-content">
        <p className="t-body-s msg-muted">
          En cirkel er en privat gruppe med chat, billeder og begivenheder. Kun dem, du inviterer, kan se den.
        </p>
        <TextField label="Navn på cirklen" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />

        <h2 className="t-heading-s">Tilføj medlemmer</h2>
        {selected.length > 0 && (
          <div className="msg-chips">
            {selected.map((id) => {
              const c = contacts.find((x) => x.id === id)!;
              return (
                <Chip key={id} selected onClick={() => toggle(id)} aria-label={`Fjern ${c.name}`}>
                  {c.name}
                </Chip>
              );
            })}
          </div>
        )}
        <TextField label="Søg efter venner" value={query} onChange={(e) => setQuery(e.target.value)} autoComplete="off" />
        <p className="t-caption msg-muted">Skriv et navn for at finde en ven. Viser kun dine venner.</p>

        <ul className="msg-list">
          {shown.map((c) => (
            <li key={c.id}>
              <PickRow contact={c} selected={selected.includes(c.id)} onToggle={() => toggle(c.id)} />
            </li>
          ))}
        </ul>

        <label className="msg-toggle-row">
          <span className="msg-card__text">
            <span className="t-label">Beskeder forsvinder efter 24 timer</span>
            <span className="t-caption msg-muted">Du kan altid ændre det senere.</span>
          </span>
          <input
            type="checkbox"
            role="switch"
            className="msg-toggle"
            checked={disappearing}
            onChange={(e) => setDisappearing(e.target.checked)}
          />
        </label>

        <Button block disabled={!canCreate} onClick={create}>
          Opret cirkel
        </Button>
      </main>
    </div>
  );
}
