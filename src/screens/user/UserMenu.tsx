import { useState } from 'react';
import { Button } from '../../components/Button';
import { Chip } from '../../components/Chip';
import { Icon } from '../../components/Icon';
import { Sheet } from '../../components/Sheet';
import { reportReasons } from '../../data/create';
import '../../components/PostCard.css';

type Step = 'menu' | 'bloker' | 'anmeld' | 'anmeldt' | 'fjern';

type Props = {
  open: boolean;
  onClose: () => void;
  /** Fornavn, fx "Jonas" */
  name: string;
  blocked: boolean;
  /** Personen følger dig (og er ikke fjernet) */
  followsMe: boolean;
  onBlock: () => void;
  onUnblock: () => void;
  onRemoveFollower: () => void;
};

/* Ikoner, som ikke findes i ikon-sættet */
const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
const BanIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="9" {...S} />
    <path d="M5.7 5.7L18.3 18.3" {...S} />
  </svg>
);
const UserMinusIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="10" cy="8" r="4" {...S} />
    <path d="M3 20C3 16.7 6.1 14 10 14C11.6 14 13 14.4 14.2 15.1M16 18H22" {...S} />
  </svg>
);

/** Menuen bag ⋯ på en andens profil: Bloker, Anmeld og Fjern følger. */
export function UserMenu({ open, onClose, name, blocked, followsMe, onBlock, onUnblock, onRemoveFollower }: Props) {
  const [step, setStep] = useState<Step>('menu');
  const [reason, setReason] = useState<string | null>(null);

  const close = () => {
    onClose();
    setStep('menu');
    setReason(null);
  };

  const title =
    step === 'bloker'
      ? `Bloker ${name}?`
      : step === 'fjern'
        ? `Fjern ${name} som følger?`
        : step === 'anmeld'
          ? `Anmeld ${name}`
          : step === 'anmeldt'
            ? 'Tak for din anmeldelse'
            : name;

  return (
    <Sheet open={open} onClose={close} title={title} initialSize="auto" dim>
      {step === 'menu' && (
        <ul className="post-menu">
          <li>
            {blocked ? (
              <button type="button" className="post-menu__item" onClick={() => { onUnblock(); close(); }}>
                <BanIcon />
                Fjern blokering
              </button>
            ) : (
              <button type="button" className="post-menu__item post-menu__item--danger" onClick={() => setStep('bloker')}>
                <BanIcon />
                Bloker
              </button>
            )}
          </li>
          <li>
            <button type="button" className="post-menu__item post-menu__item--danger" onClick={() => setStep('anmeld')}>
              <Icon name="flag" />
              Anmeld
            </button>
          </li>
          {followsMe && !blocked && (
            <li>
              <button type="button" className="post-menu__item" onClick={() => setStep('fjern')}>
                <UserMinusIcon />
                Fjern følger
              </button>
            </li>
          )}
        </ul>
      )}

      {step === 'bloker' && (
        <div className="umenu">
          <p className="t-body-s umenu__muted">{name} kan ikke se din profil eller skrive til dig. {name} får ikke besked.</p>
          <Button block onClick={() => { onBlock(); close(); }}>
            Bloker
          </Button>
          <Button block variant="secondary" onClick={() => setStep('menu')}>
            Annuller
          </Button>
        </div>
      )}

      {step === 'fjern' && (
        <div className="umenu">
          <p className="t-body-s umenu__muted">{name} får ikke besked.</p>
          <Button block onClick={() => { onRemoveFollower(); close(); }}>
            Fjern følger
          </Button>
          <Button block variant="secondary" onClick={() => setStep('menu')}>
            Annuller
          </Button>
        </div>
      )}

      {step === 'anmeld' && (
        <div className="umenu">
          <div className="umenu__reasons" role="radiogroup" aria-label="Grund">
            {reportReasons.map((r) => (
              <Chip key={r.id} role="radio" aria-checked={reason === r.id} aria-pressed={undefined} selected={reason === r.id} onClick={() => setReason(r.id)}>
                {r.title}
              </Chip>
            ))}
          </div>
          <Button block disabled={!reason} onClick={() => setStep('anmeldt')}>
            Send anmeldelse
          </Button>
          <Button block variant="secondary" onClick={() => setStep('menu')}>
            Annuller
          </Button>
        </div>
      )}

      {step === 'anmeldt' && (
        <div className="umenu">
          <p className="t-body-s umenu__muted">Vi kigger på profilen. Din anmeldelse er anonym.</p>
          {!blocked && (
            <Button block variant="secondary" onClick={() => { onBlock(); close(); }}>
              Bloker {name}
            </Button>
          )}
          <Button block onClick={close}>
            Færdig
          </Button>
        </div>
      )}
    </Sheet>
  );
}
