import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { Chip } from '../../components/Chip';
import { Icon, type IconName } from '../../components/Icon';
import { PageHeader } from '../../components/PageHeader';
import { SegmentedControl } from '../../components/SegmentedControl';
import { TextField } from '../../components/TextField';
import { languages, networkToggles, translationExample as ex, translationToggles } from '../../data/account';
import { keep, save } from '../../state/keep';
import { useSession } from '../../state/session';
import { ToggleList } from '../create/parts';
import { useChildren } from '../parental/store';
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

/** Indstillinger: én oversigt, åbnes fra tandhjulet på din profil. */
export function Settings() {
  const navigate = useNavigate();
  const { profile, logOut } = useSession();
  const children = useChildren();
  const [language] = useSetting('sprog', 'Dansk');

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
            hint={`${profile.private ? 'Privat' : 'Offentlig'} profil · beskeder, blokerede, dine data`}
          />
        </ul>

        <h2 className="t-heading-s acc-muted set-group">Sprog og netværk</h2>
        <ul className="acc-list set-list">
          <Row to="/indstillinger/sprog" icon="chat" title="Sprog og oversættelse" hint={`${language} · oversæt opslag og beskeder`} />
          <Row to="/indstillinger/netvaerk" icon="link" title="Åbne netværk" hint="Følg folk på fx Mastodon og Bluesky" />
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

/** Privatliv og data: offentlig/privat profil, beskeder, blokerede og dine data */
export function PrivacySettings() {
  const { profile, setProfile } = useSession();
  const [messages, setMessages] = useSetting<'foelger' | 'gensidigt'>('beskeder', 'foelger');
  const [hidden, setHidden] = useSetting('skjul-aktiv', false);
  const [deleting, setDeleting] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  return (
    <div className="acc-screen">
      <PageHeader title="Privatliv og data" fallback="/indstillinger" />
      <main className="acc-content">
        <h2 className="t-heading-m">Hvem kan se din profil?</h2>
        <SegmentedControl
          label="Hvem kan se din profil?"
          value={profile.private ? 'privat' : 'offentlig'}
          onChange={(v) => setProfile({ ...profile, private: v === 'privat' })}
          options={[
            { value: 'offentlig', label: 'Offentlig' },
            { value: 'privat', label: 'Privat' },
          ]}
        />
        <p className="t-caption acc-muted" aria-live="polite">
          {profile.private
            ? 'Kun dine følgere kan se dine opslag, moments og flicks. Nye følgere skal godkendes af dig. Opslag i grupper ses stadig af gruppens medlemmer.'
            : 'Alle kan se dine opslag, moments og flicks. Opslag i grupper ses kun af gruppens medlemmer.'}
        </p>

        <h2 className="t-heading-m">Hvem kan skrive til dig?</h2>
        <SegmentedControl
          label="Hvem kan skrive til dig?"
          value={messages}
          onChange={setMessages}
          options={[
            { value: 'foelger', label: 'Dem, jeg følger' },
            { value: 'gensidigt', label: 'Kun gensidigt' },
          ]}
        />
        <p className="t-caption acc-muted" aria-live="polite">
          {messages === 'foelger'
            ? 'Folk, du følger, kan skrive til dig. Andre sender en anmodning først.'
            : 'Kun folk, hvor I følger hinanden, kan skrive til dig.'}
        </p>

        <ToggleList
          rows={[{ id: 'aktiv', title: 'Skjul hvornår jeg er aktiv', hint: 'Andre kan ikke se, om du er online.' }]}
          values={{ aktiv: hidden }}
          onToggle={() => setHidden(!hidden)}
        />

        <h2 className="t-heading-m">Blokerede</h2>
        <div className="acc-panel">
          <p className="t-body-s acc-muted">Du har ikke blokeret nogen. Du kan blokere fra en profil eller fra ⋯ på et opslag.</p>
        </div>

        <h2 className="t-heading-m">Dine data</h2>
        <div className="acc-panel">
          <p className="t-body-s">Hent en kopi af alt, du har delt: opslag, billeder, beskeder og indstillinger.</p>
          <Button variant="secondary" onClick={() => setDownloaded(true)} disabled={downloaded}>
            <Icon name="download" size={18} /> {downloaded ? 'Du får en mail, når den er klar' : 'Hent mine data'}
          </Button>
        </div>
        <div className="age-note">
          <p className="t-heading-s">Verificeret med MitID</p>
          <p className="t-caption">
            Din alder og identitet er bekræftet med MitID. Andre kan ikke se dit CPR-nummer. Under 16 år får automatisk et
            beskyttet miljø uden beskeder fra fremmede.
          </p>
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
    </div>
  );
}

/** Sprog og oversættelse */
export function LanguageSettings() {
  const [language, setLanguage] = useSetting('sprog', 'Dansk');
  const [toggles, setToggles] = useSetting<Record<string, boolean>>('oversaet', { 'oversaet-opslag': true, 'oversaet-beskeder': true });
  const [showOriginal, setShowOriginal] = useState(false);

  return (
    <div className="acc-screen">
      <PageHeader title="Sprog og oversættelse" fallback="/indstillinger" />
      <main className="acc-content">
        <p className="t-caption acc-muted">Læs opslag og beskeder fra hele Europa på dit eget sprog.</p>
        <h2 className="t-heading-m">Dit sprog</h2>
        <div className="acc-chips" role="group" aria-label="Dit sprog">
          {languages.map((l) => (
            <Chip key={l} selected={l === language} onClick={() => setLanguage(l)} lang={langCode(l)}>
              {l}
            </Chip>
          ))}
        </div>

        <ToggleList rows={translationToggles} values={toggles} onToggle={(id) => setToggles({ ...toggles, [id]: !toggles[id] })} />

        <h2 className="t-heading-s">Sådan ser det ud</h2>
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
      </main>
    </div>
  );
}

/** Åbne netværk */
export function NetworkSettings() {
  const [toggles, setToggles] = useSetting<Record<string, boolean>>('netvaerk', { 'foelg-andre': true, 'del-offentlige': false });
  const [handle, setHandle] = useState('');

  return (
    <div className="acc-screen">
      <PageHeader title="Åbne netværk" fallback="/indstillinger" />
      <main className="acc-content">
        <p className="t-caption acc-muted">Følg folk på andre netværk, og lad dem følge dig, uden at skifte app.</p>
        <ToggleList rows={networkToggles} values={toggles} onToggle={(id) => setToggles({ ...toggles, [id]: !toggles[id] })} />
        <TextField
          label="Følg en profil, fx @navn@netværk.eu"
          type="text"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
        />
      </main>
    </div>
  );
}

function langCode(l: string) {
  return { Dansk: 'da', English: 'en', Deutsch: 'de', Français: 'fr', Español: 'es' }[l];
}
