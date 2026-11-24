import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { Icon, type IconName } from '../../components/Icon';
import { PageHeader } from '../../components/PageHeader';
import { SegmentedControl } from '../../components/SegmentedControl';
import { SaveBar, SavedToast } from '../../components/SaveBar';
import { Sheet } from '../../components/Sheet';
import { TextField } from '../../components/TextField';
import { europeanLanguages, languageByCode, translationExample as ex, translationToggles } from '../../data/settings';
import { keep, save } from '../../state/keep';
import { useSession } from '../../state/session';
import { ToggleList } from '../create/parts';
import { useChildren } from '../parental/store';
import { usePublicFigure } from './publicFigure';
import './account.css';

/* Små indstillinger, der huskes i fanen */
function useSetting<T>(key: string, initial: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => keep(`indstilling.${key}`, initial));
  return [
    value,
    (v: T) => {
      setValue(v);
      save(`indstilling.${key}`, v);
    },
  ];
}

/**
 * Kladde: ændringer gemmes først, når man trykker "Gem ændringer".
 * Indtil da kan man fortryde, og intet træder i kraft.
 */
function useDraft<T>(saved: T) {
  const [draft, setDraft] = useState<T>(saved);
  const [toast, setToast] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(false), 1800);
    return () => window.clearTimeout(t);
  }, [toast]);
  return {
    draft,
    patch: (p: Partial<T>) => setDraft((d) => ({ ...d, ...p })),
    dirty,
    reset: () => setDraft(saved),
    saved: () => setToast(true),
    toast,
  };
}

function Row({ to, icon, title, hint }: { to: string; icon: IconName; title: string; hint: string }) {
  return (
    <li>
      <Link to={to} className="acc-card set-row">
        <span className="set-row__icon" aria-hidden="true">
          <Icon name={icon} size={20} />
        </span>
        <span className="acc-card__text">
          <span className="t-heading-s">{title}</span>
          <span className="t-caption acc-muted">{hint}</span>
        </span>
        <Icon name="chevron-right" />
      </Link>
    </li>
  );
}

const publicFigureHint = {
  ingen: 'Ansøg om globus ved dit navn',
  behandles: 'Ansøgning under behandling',
  godkendt: 'Godkendt · globus ved dit navn',
  afvist: 'Ansøgning afvist · du kan søge igen',
};

/** Indstillinger: én oversigt, åbnes fra tandhjulet på din profil. */
export function Settings() {
  const navigate = useNavigate();
  const { profile, logOut } = useSession();
  const children = useChildren();
  const [languageCode] = useSetting('sprog-kode', 'da');
  const publicFigure = usePublicFigure();

  return (
    <div className="acc-screen">
      <PageHeader title="Indstillinger" fallback="/profil" />
      <main className="acc-content">
        <h2 className="t-heading-s acc-muted set-group">Konto</h2>
        <ul className="acc-list set-list">
          <Row
            to="/indstillinger/privatliv"
            icon="lock"
            title="Privatliv og data"
            hint={`${profile.private ? 'Privat' : 'Offentlig'} profil · aktivitet, blokerede`}
          />
          <Row to="/indstillinger/offentlig-person" icon="globe" title="Offentlig person" hint={publicFigureHint[publicFigure.status]} />
        </ul>

        <h2 className="t-heading-s acc-muted set-group">Sprog</h2>
        <ul className="acc-list set-list">
          <Row
            to="/indstillinger/sprog"
            icon="chat"
            title="Sprog og oversættelse"
            hint={`${languageByCode(languageCode).native} · oversæt opslag og beskeder`}
          />
        </ul>

        <h2 className="t-heading-s acc-muted set-group">Familie</h2>
        <ul className="acc-list set-list">
          <Row
            to="/indstillinger/foraeldrekontrol"
            icon="user"
            title="Forældrekontrol"
            hint={children.length ? `${children.map((c) => c.name).join(' og ')} er tilknyttet` : 'Tilknyt dine børn, og bestem hvad de kan se'}
          />
        </ul>

        <h2 className="t-heading-s acc-muted set-group">Om og jura</h2>
        <ul className="acc-list set-list">
          <Row to="/indstillinger/privatlivspolitik" icon="info" title="Privatlivspolitik" hint="Hvilke data vi behandler, og dine rettigheder" />
          <Row to="/indstillinger/databehandleraftale" icon="info" title="Databehandleraftale" hint="For sider, grupper og virksomheder" />
        </ul>

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

/** Privatliv og data: offentlig/privat profil, aktivitet, blokerede og sletning */
export function PrivacySettings() {
  const { profile, setProfile } = useSession();
  const [hidden, setHidden] = useSetting('skjul-aktiv', false);
  const d = useDraft({ private: Boolean(profile.private), hidden });
  const save = () => {
    setProfile({ ...profile, private: d.draft.private });
    setHidden(d.draft.hidden);
    d.saved();
  };
  const visibilityChanged = d.draft.private !== Boolean(profile.private);
  const [deleting, setDeleting] = useState(false);

  return (
    <div className="acc-screen">
      <PageHeader title="Privatliv og data" fallback="/indstillinger" />
      <main className="acc-content">
        <h2 className="t-heading-m">Hvem kan se din profil?</h2>
        <SegmentedControl
          label="Hvem kan se din profil?"
          value={d.draft.private ? 'privat' : 'offentlig'}
          onChange={(v) => d.patch({ private: v === 'privat' })}
          options={[
            { value: 'offentlig', label: 'Offentlig' },
            { value: 'privat', label: 'Privat' },
          ]}
        />

        <ToggleList
          rows={[{ id: 'aktiv', title: 'Skjul hvornår jeg er aktiv', hint: 'Andre kan ikke se, om du er online.' }]}
          values={{ aktiv: d.draft.hidden }}
          onToggle={() => d.patch({ hidden: !d.draft.hidden })}
        />

        <h2 className="t-heading-m">Blokerede</h2>
        <div className="acc-panel">
          <p className="t-body-s acc-muted">
            Du har ikke blokeret nogen. Du blokerer en profil ved at trykke på ⋯ inde på selve profilen.
          </p>
        </div>

        <div className="age-note">
          <p className="t-heading-s">Verificeret med MitID</p>
          <p className="t-caption">Din alder og identitet er bekræftet med MitID. Andre kan ikke se dit CPR-nummer.</p>
        </div>

        {deleting ? (
          <div className="acc-panel">
            <p className="t-body-s">
              Slet din konto? Alt, du har delt, slettes efter 30 dage. Logger du ind igen inden da, fortrydes sletningen.
            </p>
            <div className="set-buttons">
              <Button variant="secondary" onClick={() => setDeleting(false)}>
                Annuller
              </Button>
              <Button onClick={() => setDeleting(false)}>Slet konto</Button>
            </div>
          </div>
        ) : (
          <Button variant="ghost" className="set-danger" onClick={() => setDeleting(true)}>
            Slet konto
          </Button>
        )}
      </main>
      <SaveBar
        dirty={d.dirty}
        onSave={save}
        onReset={d.reset}
        note={
          visibilityChanged
            ? d.draft.private
              ? 'Din profil bliver privat. Kun dine følgere kan se dit indhold.'
              : 'Din profil bliver offentlig. Alle kan se dit indhold.'
            : undefined
        }
      />
      <SavedToast show={d.toast} />
    </div>
  );
}

/** Europas sprog, Dansk først og resten efter dansk navn */
const sortedLanguages = [...europeanLanguages].sort((a, b) =>
  a.code === 'da' ? -1 : b.code === 'da' ? 1 : a.da.localeCompare(b.da, 'da'),
);

/** Sprog og oversættelse */
export function LanguageSettings() {
  const [language, setLanguage] = useSetting('sprog-kode', 'da');
  const [toggles, setToggles] = useSetting<Record<string, boolean>>('oversaet', { 'oversaet-opslag': true, 'oversaet-beskeder': true });
  const d = useDraft({ language, toggles });
  const [picking, setPicking] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const chosen = languageByCode(d.draft.language);

  return (
    <div className="acc-screen">
      <PageHeader title="Sprog og oversættelse" fallback="/indstillinger" />
      <main className="acc-content">
        <h2 className="t-heading-m">Standardsprog for indhold</h2>
        <button type="button" className="acc-card set-row lang-current" onClick={() => setPicking(true)}>
          <span className="set-row__icon lang-current__code" aria-hidden="true">
            {chosen.code.toUpperCase()}
          </span>
          <span className="acc-card__text">
            <span className="t-heading-s" lang={chosen.code}>
              {chosen.native}
            </span>
            <span className="t-caption acc-muted">Opslag, kommentarer og beskeder vises på {chosen.da.toLowerCase()}</span>
          </span>
          <span className="t-label lang-current__change">Skift</span>
        </button>

        <ToggleList
          rows={translationToggles}
          values={d.draft.toggles}
          onToggle={(id) => d.patch({ toggles: { ...d.draft.toggles, [id]: !d.draft.toggles[id] } })}
        />

        <h2 className="t-heading-s acc-muted">Sådan ser et oversat opslag ud</h2>
        <article className="tx-post">
          <header className="tx-post__head">
            <Avatar name={ex.name} tone="sand" size="S" src={ex.avatarSrc} />
            <span className="tx-post__who">
              <span className="t-heading-s">{ex.name}</span>
              <span className="t-caption acc-muted">{ex.meta}</span>
            </span>
          </header>
          <p className="t-body" lang={showOriginal ? ex.from.code : 'da'}>
            {showOriginal ? ex.original : ex.translated}
          </p>
          <button type="button" className="tx-post__toggle t-caption" onClick={() => setShowOriginal((v) => !v)} aria-pressed={showOriginal}>
            <Icon name="chat" size={14} />
            {showOriginal ? (
              <span>
                Vist på {ex.from.da} · <strong>Se oversættelse</strong>
              </span>
            ) : (
              <span>
                Oversat fra {ex.from.da} · <strong>Se original</strong>
              </span>
            )}
          </button>
          <img className="tx-post__img" src={ex.image} alt="" />
        </article>
      </main>
      <SaveBar
        dirty={d.dirty}
        onSave={() => {
          setLanguage(d.draft.language);
          setToggles(d.draft.toggles);
          d.saved();
        }}
        onReset={d.reset}
      />
      <SavedToast show={d.toast} />
      <LanguagePicker
        open={picking}
        value={d.draft.language}
        onClose={() => setPicking(false)}
        onPick={(code) => {
          d.patch({ language: code });
          setPicking(false);
        }}
      />
    </div>
  );
}

/** Søgbar liste over Europas sprog */
function LanguagePicker({ open, value, onClose, onPick }: { open: boolean; value: string; onClose: () => void; onPick: (code: string) => void }) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const list = q
    ? sortedLanguages.filter((l) => l.native.toLowerCase().includes(q) || l.da.toLowerCase().includes(q))
    : sortedLanguages;
  const close = () => {
    setQuery('');
    onClose();
  };

  return (
    <Sheet open={open} onClose={close} title="Standardsprog for indhold" dim initialSize="full">
      <div className="lang-search">
        <TextField
          label="Søg efter sprog"
          type="search"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <ul className="lang-list" role="listbox" aria-label="Sprog">
        {list.map((l) => {
          const selected = l.code === value;
          return (
            <li key={l.code} role="option" aria-selected={selected}>
              <button
                type="button"
                className={['lang-list__row', selected && 'lang-list__row--on'].filter(Boolean).join(' ')}
                onClick={() => {
                  setQuery('');
                  onPick(l.code);
                }}
              >
                <span className="acc-card__text">
                  <span className="t-heading-s" lang={l.code}>
                    {l.native}
                  </span>
                  {l.native !== l.da && <span className="t-caption acc-muted">{l.da}</span>}
                </span>
                {selected && <Icon name="check" size={20} />}
              </button>
            </li>
          );
        })}
        {list.length === 0 && <li className="t-body-s acc-muted lang-list__empty">Intet sprog matcher “{query}”.</li>}
      </ul>
    </Sheet>
  );
}
