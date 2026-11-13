import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/Button';
import { Chip } from '../../components/Chip';
import { Icon, type IconName } from '../../components/Icon';
import {
  audiences,
  createKinds,
  photoFormats,
  photoSettings,
  postSettings,
  type Audience,
  type CreateKind,
  type PhotoFormat,
} from '../../data/create';
import { groupStore } from '../more/store';
import type { Community } from '../../data/more';
import { img } from '../../data/sample';
import { addPost } from '../../state/posts';
import { useSession } from '../../state/session';
import { CloseHeader, ToggleList, useClose } from './parts';
import './Create.css';

type Media = { url: string; type: 'image' | 'video' };

const initialValues = (rows: { id: string; on: boolean }[]) =>
  Object.fromEntries(rows.map((r) => [r.id, r.on])) as Record<string, boolean>;

/**
 * Opret: skriv et opslag, vælg hvem der kan se det, og tilføj evt. et billede.
 * Når et billede er valgt, skifter skærmen til "Nyt billede" (Opret · Billede).
 */
export function Create() {
  const navigate = useNavigate();
  const close = useClose('/');
  const [kind, setKind] = useState<CreateKind>('opslag');
  const [text, setText] = useState('');
  const [audience, setAudience] = useState<Audience>('venner');
  const [groupId, setGroupId] = useState<string | null>(null);
  const groups = groupStore.use();
  const group = groups.find((g) => g.id === groupId) ?? null;
  const { profile } = useSession();
  const [busy, setBusy] = useState(false);
  const [more, setMore] = useState(false);
  const [settings, setSettings] = useState(() => initialValues(postSettings));
  const [place, setPlace] = useState(false);
  const [media, setMedia] = useState<Media | null>(null);
  const [format, setFormat] = useState<PhotoFormat>('portraet');
  const [photoValues, setPhotoValues] = useState(() => initialValues(photoSettings));
  const photoRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  // Ryd op i det lokale billede, når det skiftes ud eller skærmen lukkes.
  useEffect(() => () => { if (media) URL.revokeObjectURL(media.url); }, [media]);

  const pick = (file: File | undefined, type: Media['type']) => {
    if (!file) return;
    setMedia({ url: URL.createObjectURL(file), type });
  };

  const publish = async () => {
    if (!media && !text.trim()) {
      textRef.current?.focus({ preventScroll: true });
      return;
    }
    if (audience === 'gruppe' && !group) {
      document.getElementById('create-audience')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setBusy(true);
    const image = media?.type === 'image' ? await shrink(media.url) : undefined;
    addPost({
      feed: 'venner',
      author: profile.name || 'Dig',
      avatarSrc: profile.avatar ?? img('mig.jpg'),
      tone: 'blue',
      meta: audience === 'gruppe' ? 'lige nu' : `${audience === 'offentlig' ? 'Offentligt' : 'Til Venner'} · lige nu`,
      text: text.trim(),
      image,
      group: audience === 'gruppe' && group
        ? { name: group.name, initials: group.initials, tone: group.tone, avatarSrc: group.avatarSrc }
        : undefined,
    });
    navigate('/', { replace: true });
  };

  const hint =
    audience === 'gruppe' && group
      ? `Kun medlemmer af ${group.name} kan se opslaget.`
      : audiences.find((a) => a.value === audience)!.hint;

  const audiencePicker = (
    <AudiencePicker
      audience={audience}
      onAudience={setAudience}
      groups={groups}
      groupId={groupId}
      onGroup={setGroupId}
      hint={hint}
    />
  );

  /* ---------- Opret · Billede ---------- */
  if (media) {
    return (
      <div className="modal-screen create">
        <CloseHeader
          title={media.type === 'image' ? 'Nyt billede' : 'Ny video'}
          closeLabel={media.type === 'image' ? 'Fjern billede' : 'Fjern video'}
          onClose={() => setMedia(null)}
        >
          <Button onClick={publish} disabled={busy}>Del</Button>
        </CloseHeader>
        <main className="modal-screen__content">
          <div className="create__preview-wrap">
            <div className={`create__preview create__preview--${format}`}>
              {media.type === 'image' ? (
                <img src={media.url} alt="Det valgte billede" />
              ) : (
                <video src={media.url} muted playsInline autoPlay loop aria-label="Den valgte video" />
              )}
            </div>
          </div>

          <h2 className="t-heading-s">Format</h2>
          <div className="create__chips" role="radiogroup" aria-label="Format">
            {photoFormats.map((f) => (
              <Chip
                key={f.value}
                role="radio"
                aria-checked={format === f.value}
                aria-pressed={undefined}
                selected={format === f.value}
                onClick={() => setFormat(f.value)}
              >
                {f.label}
              </Chip>
            ))}
          </div>
          <p className="t-caption modal-screen__muted">
            Formatet bestemmer, hvordan billedet vises i dit gitter. Du kan altid ændre det senere.
          </p>

          <textarea
            className="create__field create__field--caption"
            aria-label="Skriv en tekst (valgfri)"
            placeholder="Skriv en tekst (valgfri)"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />

          {audiencePicker}

          <ToggleList
            rows={photoSettings}
            values={photoValues}
            onToggle={(id) => setPhotoValues((v) => ({ ...v, [id]: !v[id] }))}
          />
        </main>
      </div>
    );
  }

  /* ---------- Opret ---------- */
  const addButtons: { label: string; icon: IconName; onClick: () => void; pressed?: boolean }[] = [
    { label: 'Foto', icon: 'image', onClick: () => photoRef.current?.click() },
    { label: 'Video', icon: 'clip', onClick: () => videoRef.current?.click() },
    { label: 'Sted', icon: 'pin', onClick: () => setPlace((p) => !p), pressed: place },
  ];

  return (
    <div className="modal-screen create">
      <CloseHeader title="Opret" onClose={close}>
        <Button onClick={publish} disabled={busy}>Publicér</Button>
      </CloseHeader>
      <main className="modal-screen__content create__content">
        <div className="create__tabs" role="tablist" aria-label="Hvad vil du oprette?">
          {createKinds.map((k) => (
            <button
              key={k.value}
              type="button"
              role="tab"
              aria-selected={kind === k.value}
              className={['create__tab', kind === k.value && 'create__tab--on'].filter(Boolean).join(' ')}
              onClick={() => {
                // Flick og Moment åbner kameraet
                if (k.value === 'flick' || k.value === 'moment') navigate('/flicks/ny');
                else setKind(k.value);
              }}
            >
              {k.label}
            </button>
          ))}
        </div>

        <textarea
          ref={textRef}
          className="create__field create__field--post"
          aria-label="Hvad har du på hjerte?"
          placeholder="Hvad har du på hjerte?"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        <div className="create__add">
          {addButtons.map((b) => (
            <button
              key={b.label}
              type="button"
              className={['create__add-btn', b.pressed && 'create__add-btn--on'].filter(Boolean).join(' ')}
              aria-pressed={b.pressed === undefined ? undefined : b.pressed}
              onClick={b.onClick}
            >
              <Icon name={b.icon} size={20} />
              {b.label}
            </button>
          ))}
          <input ref={photoRef} type="file" accept="image/*" hidden onChange={(e) => { pick(e.target.files?.[0], 'image'); e.target.value = ''; }} />
          <input ref={videoRef} type="file" accept="video/*" hidden onChange={(e) => { pick(e.target.files?.[0], 'video'); e.target.value = ''; }} />
        </div>

        {audiencePicker}

        <button
          type="button"
          className="create__more"
          aria-expanded={more}
          aria-controls="create-settings"
          onClick={() => setMore((m) => !m)}
        >
          Flere indstillinger
          <Icon name="chevron-right" className={['create__chevron', more && 'create__chevron--up'].filter(Boolean).join(' ')} />
        </button>

        {more && (
          <div id="create-settings" className="modal-screen__full">
            <ToggleList
              rows={postSettings}
              values={settings}
              onToggle={(id) => setSettings((v) => ({ ...v, [id]: !v[id] }))}
            />
          </div>
        )}
      </main>
    </div>
  );
}

/** Gør billedet mindre (højst 1080 px bredt), så det kan huskes i fanen. */
function shrink(url: string): Promise<string | undefined> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, 1080 / image.naturalWidth);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(image.naturalWidth * scale);
      canvas.height = Math.round(image.naturalHeight * scale);
      canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
      try {
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      } catch {
        resolve(url);
      }
    };
    image.onerror = () => resolve(undefined);
    image.src = url;
  });
}

type AudiencePickerProps = {
  audience: Audience;
  onAudience: (a: Audience) => void;
  groups: Community[];
  groupId: string | null;
  onGroup: (id: string) => void;
  hint: string;
};

/** Vises for: Venner, Offentligt eller en af dine grupper */
function AudiencePicker({ audience, onAudience, groups, groupId, onGroup, hint }: AudiencePickerProps) {
  return (
    <section className="create__audience" aria-labelledby="create-audience">
      <h2 id="create-audience" className="t-heading-s">Vises for</h2>
      <div className="create__seg" role="radiogroup" aria-labelledby="create-audience">
        {audiences.map((a) => (
          <button
            key={a.value}
            type="button"
            role="radio"
            aria-checked={audience === a.value}
            className={['create__seg-item', audience === a.value && 'create__seg-item--on'].filter(Boolean).join(' ')}
            onClick={() => onAudience(a.value)}
          >
            {a.label}
          </button>
        ))}
      </div>
      <p className="t-caption modal-screen__muted" aria-live="polite">{hint}</p>

      {audience === 'gruppe' && (
        <ul className="create__groups" role="radiogroup" aria-label="Vælg gruppe">
          {groups.map((g) => {
            const on = g.id === groupId;
            return (
              <li key={g.id}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={on}
                  className={['create__group', on && 'create__group--on'].filter(Boolean).join(' ')}
                  onClick={() => onGroup(g.id)}
                >
                  <span className={`create__group-pic avatar--${g.tone}`} aria-hidden="true">
                    {g.avatarSrc ? <img src={g.avatarSrc} alt="" /> : g.initials}
                  </span>
                  <span className="t-label create__group-name">{g.name}</span>
                  <span className="create__group-check" aria-hidden="true">
                    {on && <Icon name="check" size={16} />}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
