import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { PageHeader } from '../../components/PageHeader';
import { photos } from '../../data/profile';
import { createCollection } from './store';
import './Screens.css';
import './NewHighlight.css';

/**
 * Ny highlight: giv den et navn, og vælg moments fra dit arkiv.
 * Det første valgte bliver forside. Rute: /profil/samling/ny
 */
export function NewHighlight() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const canCreate = title.trim().length > 0 && picked.length > 0;

  const toggle = (id: string) => setPicked((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));

  return (
    <div className="pf-screen">
      <PageHeader title="Ny highlight" fallback="/profil">
        <Button
          variant="ghost"
          disabled={!canCreate}
          onClick={() => {
            createCollection(title.trim(), picked);
            navigate('/profil', { replace: true });
          }}
        >
          Opret
        </Button>
      </PageHeader>
      <main className="pf-screen__content nh">
        <label className="nh__name">
          <span className="t-label">Navn</span>
          <input
            className="field"
            placeholder="Fx Sommer eller Rejser"
            value={title}
            maxLength={24}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
        </label>

        <div className="nh__head">
          <h2 className="t-heading-s">Vælg fra dine moments</h2>
          <span className="t-caption pf-muted" aria-live="polite">
            {picked.length ? `${picked.length} valgt · det første er forside` : 'Tryk for at vælge'}
          </span>
        </div>

        <ul className="nh__grid">
          {photos.map((p) => {
            const n = picked.indexOf(p.id);
            const on = n >= 0;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  className={['nh__tile', on && 'nh__tile--on'].filter(Boolean).join(' ')}
                  aria-pressed={on}
                  aria-label={`Moment ${p.time}${on ? `, valgt som nummer ${n + 1}` : ''}`}
                  onClick={() => toggle(p.id)}
                >
                  <img src={p.src} alt="" />
                  <span className="t-caption nh__time">{p.time}</span>
                  <span className="nh__check" aria-hidden="true">
                    {on ? n + 1 : <Icon name="plus" size={14} />}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}
