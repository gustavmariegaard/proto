import { useState } from 'react';
import { Button } from '../../components/Button';
import { PageHeader } from '../../components/PageHeader';
import { SegmentedControl } from '../../components/SegmentedControl';
import { TextField } from '../../components/TextField';
import {
  creatorToggleDefaults,
  creatorToggles,
  profileTypeHints,
  profileTypes,
  type ProfileType,
} from '../../data/account';
import { ToggleList } from '../create/parts';
import './account.css';

/** Skaber og virksomhed: profiltype, publikum, indtægter og annoncer. */
export function Creator() {
  const [type, setType] = useState<ProfileType>('skaber');
  const [toggles, setToggles] = useState(creatorToggleDefaults);
  const [topic, setTopic] = useState('');
  const [budget, setBudget] = useState('');
  const [created, setCreated] = useState(false);

  return (
    <div className="acc-screen">
      <PageHeader title="Skaber og virksomhed" fallback="/" />

      <main className="acc-content">
        <h2 className="t-heading-s">Din profiltype</h2>
        <SegmentedControl label="Din profiltype" options={profileTypes} value={type} onChange={setType} />
        <p className="t-caption acc-muted">{profileTypeHints[type]}</p>

        <section className="acc-panel" aria-labelledby="creator-audience">
          <h2 id="creator-audience" className="t-heading-m">
            Dit publikum
          </h2>
          <p className="t-caption acc-muted">Du ser kun samlede tal. Vi viser aldrig, hvem enkeltpersoner er.</p>
          <div className="stats">
            {['Visninger', 'Følgere', 'Svar'].map((label) => (
              <div key={label} className="stat">
                <span className="t-heading-m" aria-hidden="true">
                  —
                </span>
                <span className="t-caption acc-muted">
                  {label}
                  <span className="visually-hidden">: ingen tal endnu</span>
                </span>
              </div>
            ))}
          </div>
        </section>

        <ToggleList rows={creatorToggles} values={toggles} onToggle={(id) => setToggles((v) => ({ ...v, [id]: !v[id] }))} />

        <section className="acc-panel" aria-labelledby="creator-ads">
          <h2 id="creator-ads" className="t-heading-m">
            Annoncér i ciircle
          </h2>
          <p className="t-caption acc-muted">Vælg emner og område. Kun virksomheder i EU kan annoncere.</p>
          <TextField
            label="[Emne, fx Cykler]"
            value={topic}
            onChange={(e) => {
              setTopic(e.target.value);
              setCreated(false);
            }}
          />
          <TextField
            label="[Budget i kr.]"
            inputMode="numeric"
            value={budget}
            onChange={(e) => {
              setBudget(e.target.value.replace(/[^\d]/g, ''));
              setCreated(false);
            }}
          />
          <Button disabled={!topic.trim() || !budget} onClick={() => setCreated(true)}>
            Opret annonce
          </Button>
          <p className="t-caption acc-muted" role="status">
            {created ? `Din annonce om ${topic.trim()} er oprettet med et budget på ${budget} kr.` : ''}
          </p>
        </section>
      </main>
    </div>
  );
}
