import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { PageHeader } from '../../components/PageHeader';
import { Sheet } from '../../components/Sheet';
import { addChild, mitidChildren, setChildHandle, useChildren } from './store';
import '../account/account.css';
import './Parental.css';

type Step = 'mitid' | 'vaelg' | 'opret';

/**
 * Forældrekontrol: dine tilknyttede børn. Tilknyt et barn med MitID
 * (MitID kender dine børn via CPR), og vælg derefter, hvad hvert barn må.
 */
export function ParentalControl() {
  const children = useChildren();
  const [step, setStep] = useState<Step | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [newHandle, setNewHandle] = useState('');
  const available = mitidChildren.filter((c) => !children.some((x) => x.id === c.id));
  const withoutProfile = mitidChildren.filter((c) => picked.includes(c.id) && !c.handle);

  const close = () => {
    setStep(null);
    setPicked([]);
    setNewHandle('');
  };

  const link = () => {
    mitidChildren.filter((c) => picked.includes(c.id)).forEach((c) => addChild(c));
    if (withoutProfile.length) setStep('opret');
    else close();
  };

  return (
    <div className="acc-screen">
      <PageHeader title="Forældrekontrol" fallback="/indstillinger" />
      <main className="acc-content">
        <p className="t-body-s acc-muted">
          Tilknyt dine børns profiler, og bestem selv, hvad de kan se og bruge, hvem der kan skrive til dem, og hvor længe
          de må være på.
        </p>

        <h2 className="t-heading-m">Dine børn</h2>
        {children.length === 0 ? (
          <div className="acc-panel">
            <p className="t-body-s">Du har ikke tilknyttet nogen børn endnu.</p>
          </div>
        ) : (
          <ul className="acc-list">
            {children.map((c) => (
              <li key={c.id}>
                <Link to={`/indstillinger/foraeldrekontrol/${c.id}`} className="acc-card">
                  <Avatar name={c.name} tone={c.tone} />
                  <span className="acc-card__text">
                    <span className="t-heading-s">
                      {c.name}, {c.age} år
                    </span>
                    <span className="t-caption acc-muted">
                      {c.handle ? `@${c.handle}` : 'Profil oprettet'} · {summary(c.settings.areas)}
                    </span>
                  </span>
                  <Icon name="chevron-right" />
                </Link>
              </li>
            ))}
          </ul>
        )}

        <Button block onClick={() => setStep('mitid')} disabled={available.length === 0}>
          Tilknyt et barn
        </Button>
        {available.length === 0 && children.length > 0 && (
          <p className="t-caption acc-muted acc-center">Alle dine børn er tilknyttet.</p>
        )}

        <div className="pc-note">
          <Icon name="lock" size={18} />
          <p className="t-caption">
            Du kan aldrig læse dit barns beskeder. Du kan se, hvem de skriver med, og hvor meget tid de bruger. Børn under
            16 år kan ikke selv slå forældrekontrol fra.
          </p>
        </div>
      </main>

      <Sheet open={step !== null} onClose={close} title="Tilknyt et barn" dim>
        <div className="pc-sheet">
          {step === 'mitid' && (
            <>
              <p className="t-body-s">
                Bekræft med MitID, at du er forælder. Så finder vi dine børn under 18 år automatisk via CPR-registret.
              </p>
              <button type="button" className="pc-mitid" onClick={() => setStep('vaelg')}>
                Fortsæt med MitID
              </button>
              <Button variant="ghost" block onClick={close}>
                Annuller
              </Button>
            </>
          )}

          {step === 'vaelg' && (
            <>
              <p className="t-body-s">Vi fandt disse børn. Vælg dem, du vil tilknytte.</p>
              <ul className="acc-list">
                {available.map((c) => {
                  const on = picked.includes(c.id);
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={on}
                        className={['acc-card', 'pc-pick', on && 'pc-pick--on'].filter(Boolean).join(' ')}
                        onClick={() => setPicked((p) => (on ? p.filter((x) => x !== c.id) : [...p, c.id]))}
                      >
                        <Avatar name={c.name} tone={c.tone} />
                        <span className="acc-card__text">
                          <span className="t-heading-s">
                            {c.name}, {c.age} år
                          </span>
                          <span className="t-caption acc-muted">
                            {c.handle ? `Har profilen @${c.handle}` : 'Har ikke en profil endnu'}
                          </span>
                        </span>
                        <span className="pc-check" aria-hidden="true">
                          {on && <Icon name="check" size={16} />}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <Button block disabled={picked.length === 0} onClick={link}>
                Tilknyt {picked.length > 1 ? `${picked.length} børn` : ''}
              </Button>
              <Button variant="ghost" block onClick={() => setStep('mitid')}>
                Tilbage
              </Button>
            </>
          )}

          {step === 'opret' && withoutProfile[0] && (
            <>
              <p className="t-body-s">
                {withoutProfile[0].name} har ikke en profil endnu. Vælg et brugernavn, så opretter vi en børneprofil, som
                er lukket fra start.
              </p>
              <label className="pc-field">
                <span className="t-label">Brugernavn</span>
                <input
                  className="field"
                  value={newHandle}
                  placeholder={`${withoutProfile[0].name.toLowerCase()}.lund`}
                  autoCapitalize="none"
                  onChange={(e) => setNewHandle(e.target.value.replace(/\s/g, '').toLowerCase())}
                />
              </label>
              <Button
                block
                onClick={() => {
                  setChildHandle(withoutProfile[0]!.id, newHandle.trim() || `${withoutProfile[0]!.name.toLowerCase()}.lund`);
                  close();
                }}
              >
                Opret børneprofil
              </Button>
              <Button variant="ghost" block onClick={close}>
                Gør det senere
              </Button>
            </>
          )}
        </div>
      </Sheet>
    </div>
  );
}

/** Fx "4 af 7 områder slået til" */
function summary(a: Record<string, boolean>) {
  const on = Object.values(a).filter(Boolean).length;
  return `${on} af ${Object.keys(a).length} områder slået til`;
}
