import { useState } from 'react';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { friendRequests, suggestions } from '../../data/more';
import { MoreHeader } from './parts';
import './More.css';

/** Udvid cirkel (Figma "Find folk"): venneanmodninger og forslag. Fuld skærm. */
export function FindFolk() {
  const [requests, setRequests] = useState(friendRequests.map((r) => ({ ...r, accepted: false })));
  const [sent, setSent] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(suggestions.map((s) => [s.id, s.sent])),
  );
  const [contactsChosen, setContactsChosen] = useState(false);

  return (
    <div className="more-screen">
      <MoreHeader title="Udvid cirkel" />
      <main className="more-content more-content--tight">
        <h2 className="t-heading-m">Venneanmodninger</h2>
        {requests.length === 0 && <p className="t-caption more-muted">Ingen nye anmodninger.</p>}
        {requests.map((r) => (
          <section key={r.id} className="more-card" aria-label={r.name}>
            <div className="more-card__row">
              <Avatar name={r.name} tone={r.tone} src={r.avatarSrc} size="L" />
              <div className="more-card__text">
                <span className="t-heading-s more-ellipsis">{r.name}</span>
                <span className="t-caption more-muted more-ellipsis">{r.context}</span>
              </div>
            </div>
            <div className="more-card__buttons" aria-live="polite">
              {r.accepted ? (
                <Button variant="secondary" disabled>I er venner nu</Button>
              ) : (
                <>
                  <Button onClick={() => setRequests((l) => l.map((x) => (x.id === r.id ? { ...x, accepted: true } : x)))}>
                    Accepter
                  </Button>
                  <Button variant="secondary" onClick={() => setRequests((l) => l.filter((x) => x.id !== r.id))}>
                    Slet
                  </Button>
                </>
              )}
            </div>
          </section>
        ))}

        <h2 className="t-heading-m">Folk du måske kender</h2>
        <p className="t-caption more-muted">
          Forslag bygger kun på fælles cirkler og grupper. Vi bruger ikke din adfærd andre steder.
        </p>
        {suggestions.map((s) => {
          const isSent = sent[s.id];
          return (
            <div key={s.id} className="more-suggest">
              <Avatar name={s.name} tone={s.tone} src={s.avatarSrc} size="L" />
              <div className="more-card__text">
                <span className="t-heading-s more-ellipsis">{s.name}</span>
                <span className="t-caption more-muted more-ellipsis">{s.context}</span>
              </div>
              <Button
                variant={isSent ? 'secondary' : 'primary'}
                aria-pressed={isSent}
                aria-label={isSent ? `Anmodning sendt til ${s.name}. Tryk for at fortryde` : `Tilføj ${s.name}`}
                onClick={() => setSent((m) => ({ ...m, [s.id]: !m[s.id] }))}
              >
                {isSent ? 'Sendt' : 'Tilføj'}
              </Button>
            </div>
          );
        })}

        <div className="more-note">
          <span className="t-heading-s">Find venner via dine kontakter</span>
          <span className="t-caption">
            Det sker kun, hvis du selv vælger det. Kontakterne bruges til at finde matches og bliver ikke gemt bagefter.
          </span>
          <Button
            variant={contactsChosen ? 'secondary' : 'primary'}
            aria-pressed={contactsChosen}
            onClick={() => setContactsChosen((v) => !v)}
          >
            {contactsChosen ? 'Kontakter valgt' : 'Vælg kontakter'}
          </Button>
        </div>
      </main>
    </div>
  );
}
