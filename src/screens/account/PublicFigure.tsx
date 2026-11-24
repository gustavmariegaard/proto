import { useState } from 'react';
import { Button } from '../../components/Button';
import { Chip } from '../../components/Chip';
import { Icon } from '../../components/Icon';
import { PageHeader } from '../../components/PageHeader';
import { TextField } from '../../components/TextField';
import { evidenceHints, publicCategories, publicCriteria } from '../../data/settings';
import { isEvidenceDone, publicFigure, usePublicFigure, type Evidence } from './publicFigure';
import './account.css';

/** Ansøg om at blive registreret som offentlig person (globus ved navnet). */
export function PublicFigureSettings() {
  const app = usePublicFigure();
  return (
    <div className="acc-screen">
      <PageHeader title="Offentlig person" fallback="/indstillinger" />
      <main className="acc-content">{app.status === 'ingen' ? <ApplicationForm /> : <StatusView />}</main>
    </div>
  );
}

function ApplicationForm() {
  const app = usePublicFigure();
  const [category, setCategory] = useState(app.category);
  const [evidence, setEvidence] = useState<Evidence[]>(app.evidence);
  const done = evidence.filter(isEvidenceDone).length;
  const ready = Boolean(category) && done === 3;
  const patch = (i: number, p: Partial<Evidence>) => setEvidence((list) => list.map((e, j) => (j === i ? { ...e, ...p } : e)));

  return (
    <>
      <div className="pf-hero">
        <span className="pf-globe" aria-hidden="true">
          <Icon name="globe" size={22} />
        </span>
        <div className="acc-card__text">
          <p className="t-heading-s">Globus ved dit navn</p>
          <p className="t-caption acc-muted">Kræver godkendelse. Vi gennemgår hver ansøgning manuelt.</p>
        </div>
      </div>

      <h2 className="t-heading-m">Kriterier</h2>
      <ul className="pf-criteria t-body-s">
        {publicCriteria.map((c) => (
          <li key={c}>
            <Icon name="check" size={16} />
            <span>{c}</span>
          </li>
        ))}
      </ul>

      <h2 className="t-heading-m">Område</h2>
      <div className="acc-chips pf-chips" role="group" aria-label="Område">
        {publicCategories.map((c) => (
          <Chip key={c} selected={c === category} onClick={() => setCategory(c)}>
            {c}
          </Chip>
        ))}
      </div>

      <div className="pf-heading">
        <h2 className="t-heading-m">Dokumentation</h2>
        <span className="t-caption-strong acc-muted" aria-live="polite">
          {done} af 3
        </span>
      </div>
      <ol className="pf-evidence">
        {evidence.map((e, i) => (
          <li key={i} className={['acc-panel pf-proof', isEvidenceDone(e) && 'pf-proof--done'].filter(Boolean).join(' ')}>
            <div className="pf-proof__top">
              <span className="pf-proof__num" aria-hidden="true">
                {isEvidenceDone(e) ? <Icon name="check" size={14} /> : i + 1}
              </span>
              <span className="t-heading-s">Bilag {i + 1}</span>
              <span className="t-caption acc-muted">Påkrævet</span>
            </div>
            <TextField
              label={`Link til bilag ${i + 1}`}
              placeholder={evidenceHints[i]}
              type="url"
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={e.link}
              onChange={(ev) => patch(i, { link: ev.target.value })}
            />
            {e.file ? (
              <div className="pf-file">
                <Icon name="check" size={16} />
                <span className="t-body-s pf-file__name">{e.file}</span>
                <button type="button" className="pf-file__remove" aria-label={`Fjern ${e.file}`} onClick={() => patch(i, { file: undefined })}>
                  <Icon name="close" size={16} />
                </button>
              </div>
            ) : (
              <Button variant="ghost" className="pf-attach" onClick={() => patch(i, { file: `dokumentation-${i + 1}.pdf` })}>
                <Icon name="plus" size={16} /> Vedhæft fil
              </Button>
            )}
          </li>
        ))}
      </ol>

      <Button block disabled={!ready} onClick={() => publicFigure.submit(category, evidence)}>
        Send ansøgning
      </Button>
    </>
  );
}

const steps = [
  { id: 'sendt', label: 'Ansøgning sendt' },
  { id: 'behandles', label: 'Under behandling' },
  { id: 'afgoerelse', label: 'Afgørelse' },
];

function StatusView() {
  const app = usePublicFigure();
  const decided = app.status === 'godkendt' || app.status === 'afvist';
  const current = decided ? 3 : 1;

  return (
    <>
      {app.status === 'behandles' && (
        <div className="acc-panel pf-status">
          <span className="pf-badge pf-badge--wait">Under behandling</span>
          <p className="t-heading-m">Vi gennemgår din ansøgning</p>
          <p className="t-body-s acc-muted">Du får en notifikation, når der er en afgørelse. Det tager normalt op til 14 dage.</p>
        </div>
      )}
      {app.status === 'godkendt' && (
        <div className="acc-panel pf-status pf-status--ok">
          <span className="pf-badge pf-badge--ok">Godkendt</span>
          <div className="pf-approved">
            <span className="pf-globe" aria-hidden="true">
              <Icon name="globe" size={22} />
            </span>
            <p className="t-heading-m">Du er registreret som offentlig person</p>
          </div>
          <p className="t-body-s acc-muted">Globussen vises nu ved dit navn på din profil, dine opslag og i søgning.</p>
        </div>
      )}
      {app.status === 'afvist' && (
        <div className="acc-panel pf-status">
          <span className="pf-badge pf-badge--no">Afvist</span>
          <p className="t-heading-m">Ansøgningen blev ikke godkendt</p>
          <p className="t-body-s acc-muted">Dokumentationen viste ikke en bred offentlig rolle. Du kan søge igen med nye bilag.</p>
          <Button variant="secondary" onClick={publicFigure.edit}>
            Søg igen
          </Button>
        </div>
      )}

      <ol className="pf-steps" aria-label="Forløb">
        {steps.map((s, i) => {
          const state = i < current ? 'done' : i === current ? 'now' : 'next';
          const label = i === 2 && decided ? (app.status === 'godkendt' ? 'Godkendt' : 'Afvist') : s.label;
          return (
            <li key={s.id} className={`pf-step pf-step--${state}`} aria-current={state === 'now' ? 'step' : undefined}>
              <span className="pf-step__dot" aria-hidden="true">
                {state === 'done' && <Icon name={i === 2 && app.status === 'afvist' ? 'close' : 'check'} size={12} />}
              </span>
              <span className="t-body-s">{label}</span>
              {i === 0 && app.sentAt && <span className="t-caption acc-muted pf-step__meta">{app.sentAt}</span>}
            </li>
          );
        })}
      </ol>

      <h2 className="t-heading-s">Dine bilag · {app.category}</h2>
      <ul className="acc-list set-list">
        {app.evidence.map((e, i) => (
          <li key={i} className="acc-card pf-sent">
            <Icon name={e.link ? 'link' : 'check'} size={18} />
            <span className="acc-card__text">
              <span className="t-body-s pf-file__name">{e.link || e.file}</span>
              {e.link && e.file && <span className="t-caption acc-muted">+ {e.file}</span>}
            </span>
          </li>
        ))}
      </ul>

      {app.status === 'behandles' && (
        <>
          {/* Kun i prototypen: se begge udfald */}
          <div className="pf-proto">
            <p className="t-caption-strong acc-muted">Prototype: vælg udfald</p>
            <div className="set-buttons">
              <Button variant="secondary" onClick={() => publicFigure.decide('afvist')}>
                Afvis
              </Button>
              <Button variant="secondary" onClick={() => publicFigure.decide('godkendt')}>
                Godkend
              </Button>
            </div>
          </div>
          <Button variant="ghost" className="set-danger" onClick={publicFigure.edit}>
            Træk ansøgningen tilbage
          </Button>
        </>
      )}
      {decided && (
        <Button variant="ghost" className="pf-reset" onClick={publicFigure.reset}>
          Nulstil (prototype)
        </Button>
      )}
    </>
  );
}
