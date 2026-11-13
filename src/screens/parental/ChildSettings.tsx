import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { Chip } from '../../components/Chip';
import { Icon } from '../../components/Icon';
import { PageHeader } from '../../components/PageHeader';
import { SegmentedControl } from '../../components/SegmentedControl';
import { screenTimeOptions } from '../../data/account';
import { allTopics } from '../../data/interests';
import { ToggleList } from '../create/parts';
import { SaveBar, SavedToast } from '../../components/SaveBar';
import { areas, removeChild, updateChild, useChildren, type Child, type ChildSettings as ChildSettingsT, type Contact } from './store';
import '../account/account.css';
import '../create/parts.css';
import './Parental.css';

/** Eksempel på ugens forbrug (minutter pr. dag) */
const week = [
  { day: 'Man', min: 42 },
  { day: 'Tir', min: 35 },
  { day: 'Ons', min: 58 },
  { day: 'Tor', min: 30 },
  { day: 'Fre', min: 61 },
  { day: 'Lør', min: 74 },
  { day: 'Søn', min: 40 },
];

/** Ét barns indstillinger. Rute: /indstillinger/foraeldrekontrol/:id */
export function ChildSettingsScreen() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const child = useChildren().find((c) => c.id === id);
  if (!child) return <Navigate to="/indstillinger/foraeldrekontrol" replace />;

  return <Editor key={child.id} child={child} onRemove={() => {
    removeChild(child.id);
    navigate('/indstillinger/foraeldrekontrol', { replace: true });
  }} />;
}

/** Ændringer er en kladde, indtil man trykker "Gem ændringer" */
function Editor({ child, onRemove }: { child: Child; onRemove: () => void }) {
  const [topic, setTopic] = useState('');
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [s, setDraft] = useState<ChildSettingsT>(child.settings);
  const [toast, setToast] = useState(false);
  const dirty = JSON.stringify(s) !== JSON.stringify(child.settings);
  const set = (patch: Partial<ChildSettingsT>) => setDraft((d) => ({ ...d, ...patch }));
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(false), 1800);
    return () => window.clearTimeout(t);
  }, [toast]);
  const total = week.reduce((n, d) => n + d.min, 0);
  const max = Math.max(...week.map((d) => d.min));
  const q = topic.trim().toLowerCase();
  const suggestions = q ? allTopics.filter((t) => t.toLowerCase().includes(q) && !s.blockedTopics.includes(t)).slice(0, 6) : [];

  return (
    <div className="acc-screen">
      <PageHeader title={child.name} fallback="/indstillinger/foraeldrekontrol" />
      <main className="acc-content">
        <div className="pc-child">
          <Avatar name={child.name} tone={child.tone} size="L" />
          <div>
            <p className="t-heading-m">
              {child.name}, {child.age} år
            </p>
            <p className="t-caption acc-muted">{child.handle ? `@${child.handle}` : 'Børneprofil'} · Tilknyttet med MitID</p>
          </div>
        </div>

        {/* ---------- Tid ---------- */}
        <section className="acc-panel">
          <div className="acc-row-between pc-full">
            <h2 className="t-heading-s">Denne uge</h2>
            <span className="t-caption acc-muted">
              {Math.floor(total / 60)} t {total % 60} min i alt
            </span>
          </div>
          <div className="pc-week" role="img" aria-label={`Tid brugt pr. dag: ${week.map((d) => `${d.day} ${d.min} minutter`).join(', ')}`}>
            {week.map((d) => (
              <div key={d.day} className="pc-week__day">
                <span className="pc-week__bar" style={{ height: `${(d.min / max) * 100}%` }} />
                <span className="t-caption acc-muted">{d.day}</span>
              </div>
            ))}
          </div>
          <p className="t-caption acc-muted">Mest tid på Flicks og Beskeder. Du kan ikke se indholdet af beskeder.</p>
        </section>

        <h2 className="t-heading-m">Daglig skærmtid</h2>
        <div className="acc-chips" role="radiogroup" aria-label="Daglig skærmtid">
          {screenTimeOptions.map((o) => (
            <Chip key={o} role="radio" aria-pressed={undefined} aria-checked={s.screenTime === o} selected={s.screenTime === o} onClick={() => set({ screenTime: o })}>
              {o}
            </Chip>
          ))}
        </div>
        <ToggleList
          rows={[{ id: 'bedtime', title: 'Ro om natten', hint: 'Appen er lukket fra klokken 21 til 7.' }]}
          values={{ bedtime: s.bedtime }}
          onToggle={() => set({ bedtime: !s.bedtime })}
        />

        {/* ---------- Indhold ---------- */}
        <h2 className="t-heading-m">Hvad må {child.name} bruge?</h2>
        <ToggleList rows={areas} values={s.areas} onToggle={(a) => set({ areas: { ...s.areas, [a]: !s.areas[a] } })} />
        <p className="t-caption acc-muted">Beskeder med familie og opslag fra folk, {child.name} følger, er altid slået til.</p>

        <ToggleList
          rows={[{ id: 'sensitive', title: 'Skjul følsomt indhold', hint: 'Vold, skræmmende billeder og indhold for voksne.' }]}
          values={{ sensitive: s.sensitive }}
          onToggle={() => set({ sensitive: !s.sensitive })}
        />

        <h3 className="t-heading-s">Blokerede emner</h3>
        <p className="t-caption acc-muted">Opslag om disse emner vises ikke for {child.name}.</p>
        <ul className="acc-chips pc-topics">
          {s.blockedTopics.map((t) => (
            <li key={t}>
              <Chip selected className="pc-topic" aria-label={`${t}, blokeret. Tryk for at fjerne`} onClick={() => set({ blockedTopics: s.blockedTopics.filter((x) => x !== t) })}>
                {t}
                <Icon name="close" size={16} />
              </Chip>
            </li>
          ))}
        </ul>
        <input
          className="field"
          type="search"
          placeholder="Bloker et emne"
          aria-label="Bloker et emne"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        />
        {suggestions.length > 0 && (
          <div className="acc-chips">
            {suggestions.map((t) => (
              <Chip
                key={t}
                className="pc-topic"
                onClick={() => {
                  set({ blockedTopics: [...s.blockedTopics, t] });
                  setTopic('');
                }}
              >
                {t}
                <Icon name="plus" size={16} />
              </Chip>
            ))}
          </div>
        )}

        {/* ---------- Kontakt ---------- */}
        <h2 className="t-heading-m">Hvem må skrive til {child.name}?</h2>
        <SegmentedControl<Contact>
          label={`Hvem må skrive til ${child.name}?`}
          value={s.contact}
          onChange={(v) => set({ contact: v })}
          options={[
            { value: 'godkendte', label: 'Godkendte' },
            { value: 'foelger', label: 'Følger' },
            { value: 'alle', label: 'Alle' },
          ]}
        />
        <p className="t-caption acc-muted" aria-live="polite">
          {s.contact === 'godkendte'
            ? `Kun kontakter, du har godkendt. Du får besked, når nogen vil skrive til ${child.name}.`
            : s.contact === 'foelger'
              ? `Kun folk, ${child.name} følger, og som følger ${child.name} igen.`
              : 'Alle verificerede brugere. Ikke anbefalet for børn under 16 år.'}
        </p>
        <ToggleList
          rows={[{ id: 'approve', title: 'Godkend nye følgere', hint: `Du skal godkende, før nogen kan følge ${child.name}.` }]}
          values={{ approve: s.approveFollowers }}
          onToggle={() => set({ approveFollowers: !s.approveFollowers })}
        />

        {/* ---------- Fjern ---------- */}
        {confirmRemove ? (
          <div className="acc-panel">
            <p className="t-body-s">
              Fjern tilknytningen til {child.name}? Indstillingerne slettes, og {child.name} får besked.
            </p>
            <div className="pc-buttons">
              <Button variant="secondary" onClick={() => setConfirmRemove(false)}>
                Annuller
              </Button>
              <Button
                onClick={onRemove}
              >
                Fjern
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="ghost" className="pc-remove" onClick={() => setConfirmRemove(true)}>
            Fjern tilknytning
          </Button>
        )}
      </main>
      <SaveBar
        dirty={dirty}
        onSave={() => {
          updateChild(child.id, s);
          setToast(true);
        }}
        onReset={() => setDraft(child.settings)}
        note={`Ændringerne gælder først for ${child.name}, når du gemmer.`}
      />
      <SavedToast show={toast} />
    </div>
  );
}
