import { useState } from 'react';
import { Icon } from './Icon';
import { Sheet } from './Sheet';
import './PostCard.css';

type Props = {
  open: boolean;
  onClose: () => void;
  /** Forklaringen bag "Hvorfor ser jeg …?" */
  why: string;
  /** Eget indhold: kun "Hvorfor" */
  mine?: boolean;
  onHide: () => void;
  onReport?: () => void;
  /** Opslag eller flick (bruges i teksterne) */
  noun?: 'opslag' | 'flick';
};

/** Menuen bag ⋯ på opslag og flicks: Hvorfor ser jeg dette?, Ikke interesseret og Rapportér. */
export function PostMenu({ open, onClose, why, mine = false, onHide, onReport, noun = 'opslag' }: Props) {
  const [step, setStep] = useState<'menu' | 'why'>('menu');
  const close = () => {
    setStep('menu');
    onClose();
  };
  return (
    <Sheet open={open} onClose={close} title={step === 'why' ? `Hvorfor ser jeg ${noun === 'flick' ? 'denne flick' : 'dette opslag'}?` : noun === 'flick' ? 'Flick' : 'Opslag'} dim initialSize="auto">
      {step === 'why' ? (
        <div className="post-menu__why">
          <p className="t-body">{why}</p>
          <p className="t-caption post-menu__muted">
            ciircle viser kun opslag fra dem, du følger, dine grupper, sider og de emner, du selv har valgt. Vi bruger ikke din adfærd andre steder.
          </p>
          {/* Man skal altid kunne komme tilbage */}
          <div className="post-menu__buttons">
            <button type="button" className="post-menu__back" onClick={() => setStep('menu')}>
              <Icon name="chevron-left" size={20} />
              Tilbage
            </button>
            <button type="button" className="post-menu__ok" onClick={() => close()}>
              OK
            </button>
          </div>
        </div>
      ) : (
        <ul className="post-menu">
          <li>
            <button type="button" className="post-menu__item" onClick={() => setStep('why')}>
              <Icon name="info" />
              {`Hvorfor ser jeg ${noun === 'flick' ? 'denne flick' : 'dette opslag'}?`}
            </button>
          </li>
          {!mine && (
            <li>
              <button
                type="button"
                className="post-menu__item"
                onClick={() => {
                  close();
                  onHide();
                }}
              >
                <Icon name="eye-off" />
                Ikke interesseret
              </button>
            </li>
          )}
          {!mine && onReport && (
            <li>
              <button
                type="button"
                className="post-menu__item post-menu__item--danger"
                onClick={() => {
                  close();
                  onReport();
                }}
              >
                <Icon name="flag" />
                Rapportér
              </button>
            </li>
          )}
          <li className="post-menu__cancel">
            <button type="button" className="post-menu__item" onClick={() => close()}>
              <Icon name="close" />
              Luk
            </button>
          </li>
        </ul>
      )}
    </Sheet>
  );
}
