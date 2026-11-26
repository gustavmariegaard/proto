import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import type { AvatarTone } from '../../components/Avatar';
import { groupStore, initialsOf } from '../more/store';
import { useEvents } from '../events/store';
import { img } from '../../data/sample';
import { handleOf } from '../../data/handles';
import { addPost } from '../../state/posts';
import { TagInput } from '../../components/TagInput';
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
  /*
   * Hvor man deler, bestemmes af, hvor man starter:
   * - Plus-knappen: normale opslag (Din profil eller Offentlig debat) med tags
   * - "Skriv i gruppen" / "Skriv i begivenheden": låst til stedet, uden tags
   */
  const [params] = useSearchParams();
  const placeKind: PlaceKind | null = params.get('gruppe') ? 'gruppe' : params.get('begivenhed') ? 'begivenhed' : null;
  const [placeId, setPlaceId] = useState<string | null>(params.get('gruppe') ?? params.get('begivenhed'));
  const [audience, setAudience] = useState<Audience>(params.get('sted') === 'debat' ? 'debat' : 'offentlig');
  const [tags, setTags] = useState<string[]>([]);
  const [tagError, setTagError] = useState(false);
  const groups = groupStore.use();
  const events = useEvents();
  const places: Place[] =
    placeKind === 'gruppe'
      ? groups.map((g) => ({ id: g.id, name: g.name, initials: g.initials, tone: g.tone, avatarSrc: g.avatarSrc, meta: g.meta }))
      : placeKind === 'begivenhed'
        ? events.map((e) => ({ id: e.id, name: e.title, initials: initialsOf(e.title), tone: 'sand' as const, avatarSrc: e.image, meta: e.place }))
        : [];
  const place = places.find((p) => p.id === placeId) ?? null;
  const { profile } = useSession();
  const [busy, setBusy] = useState(false);
  const [more, setMore] = useState(false);
  const [settings, setSettings] = useState(() => initialValues(postSettings));
  const [location, setLocation] = useState(false);
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
    if (!placeKind && audience === 'debat' && tags.length === 0) {
      setTagError(true);
      document.getElementById('create-tags')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (placeKind && !place) {
      document.getElementById('create-audience')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    const debat = !placeKind && audience === 'debat';
    setBusy(true);
    const image = media?.type === 'image' ? await shrink(media.url) : undefined;
    addPost({
      feed: debat ? 'debat' : 'venner',
      topic: debat ? tags[0] : undefined,
      // Tags kun i Offentlig debat
      tags: debat && tags.length ? tags : undefined,
      // score markerer opslaget som debat (enig/uenig i stedet for hjerter)
      score: debat ? 0 : undefined,
      author: profile.name || 'Dig',
      username: profile.username.trim().replace(/^@/, '') || handleOf(profile.name) || 'dit.navn',
      avatarSrc: profile.avatar ?? img('mig.jpg'),
      tone: 'blue',
      meta: 'lige nu',
      text: text.trim(),
      image,
      group: place && placeKind
        ? { name: place.name, initials: place.initials, tone: place.tone, avatarSrc: place.avatarSrc, kind: placeKind }
        : undefined,
    });
    if (debat) {
      navigate('/opdag', { replace: true });
    } else if (place && placeKind) navigate(placeKind === 'gruppe' ? `/grupper/${place.id}` : `/begivenheder/${place.id}`, { replace: true });
    else navigate('/', { replace: true });
  };

  // Kun en ekstra linje, når den siger noget nyt (kortene forklarer resten)
  const hint =
    audience === 'offentlig' && profile.private
        ? 'Din profil er privat, så kun dine følgere kan se opslaget. Det kan du ændre på din profil.'
        : '';

  const audiencePicker = placeKind ? (
    <PlacePicker kind={placeKind} places={places} place={place} onPlace={setPlaceId} />
  ) : (
    <AudiencePicker
      audience={audience}
      onAudience={setAudience}
      hint={hint}
      tags={tags}
      onTags={(t) => {
        setTags(t);
        setTagError(false);
      }}
      tagError={tagError}
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
    { label: 'Sted', icon: 'pin', onClick: () => setLocation((p) => !p), pressed: location },
  ];

  return (
    <div className="modal-screen create">
      <CloseHeader title="Opret" onClose={close}>
        <Button onClick={publish} disabled={busy}>Publicér</Button>
      </CloseHeader>
      <main className="modal-screen__content create__content">
        {!placeKind && (
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
                if (k.value === 'flick' || k.value === 'moment') navigate(`/flicks/ny?som=${k.value}`);
                else setKind(k.value);
              }}
            >
              {k.label}
            </button>
          ))}
        </div>
        )}

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
  hint: string;
  tags: string[];
  onTags: (t: string[]) => void;
  tagError: boolean;
};

/** Plus-knappen: Din profil eller Offentlig debat, med tags */
function AudiencePicker({ audience, onAudience, hint, tags, onTags, tagError }: AudiencePickerProps) {
  return (
    <section className="create__audience" aria-labelledby="create-audience">
      <h2 id="create-audience" className="t-heading-s">Hvor skal det deles?</h2>
      {/* Tre tydelige kort i stedet for tre ens knapper: ikon, navn og hvem der ser det */}
      <div className="create__dest" role="radiogroup" aria-labelledby="create-audience">
        {audiences.map((a) => {
          const on = audience === a.value;
          return (
            <button
              key={a.value}
              type="button"
              role="radio"
              aria-checked={on}
              className={['create__dest-item', on && 'create__dest-item--on'].filter(Boolean).join(' ')}
              onClick={() => onAudience(a.value)}
            >
              <span className="create__dest-icon" aria-hidden="true">
                <Icon name={a.icon} size={20} />
              </span>
              <span className="create__dest-text">
                <span className="t-label">{a.label}</span>
                <span className="t-caption create__dest-hint">{a.hint}</span>
              </span>
              <span className="create__dest-check" aria-hidden="true">
                {on && <Icon name="check" size={14} />}
              </span>
            </button>
          );
        })}
      </div>
      {hint && <p className="t-caption modal-screen__muted" aria-live="polite">{hint}</p>}

      {/* Tags kun i Offentlig debat (mindst ét). Opslag på din profil har ingen tags. */}
      {audience === 'debat' && <TagInput tags={tags} onTags={onTags} error={tagError} required />}

    </section>
  );
}


type PlaceKind = 'gruppe' | 'begivenhed';
type Place = { id: string; name: string; initials: string; tone: AvatarTone; avatarSrc?: string; meta: string };

/**
 * Opslag i en gruppe eller begivenhed: stedet er valgt på forhånd (man kommer fra det).
 * "Skift" åbner en søgning, fordi man kan være med i mange grupper.
 */
function PlacePicker({ kind, places, place, onPlace }: { kind: PlaceKind; places: Place[]; place: Place | null; onPlace: (id: string) => void }) {
  const [searching, setSearching] = useState(!place);
  const [q, setQ] = useState('');
  const noun = kind === 'gruppe' ? 'gruppe' : 'begivenhed';
  const query = q.trim().toLowerCase();
  const hits = query ? places.filter((p) => p.name.toLowerCase().includes(query)).slice(0, 6) : [];

  return (
    <section className="create__audience" aria-labelledby="create-audience">
      <h2 id="create-audience" className="t-heading-s">
        Deles i {kind === 'gruppe' ? 'gruppen' : 'begivenheden'}
      </h2>
      {place && (
        <div className="create__place">
          <span className={`create__group-pic avatar--${place.tone}`} aria-hidden="true">
            {place.avatarSrc ? <img src={place.avatarSrc} alt="" /> : place.initials}
          </span>
          <span className="create__dest-text">
            <span className="t-label">{place.name}</span>
            <span className="t-caption create__dest-hint">
              {kind === 'gruppe' ? 'Kun gruppens medlemmer kan se det.' : 'Kun dem, der er med i begivenheden, kan se det.'}
            </span>
          </span>
          <button type="button" className="t-caption-strong create__place-change" onClick={() => setSearching((v) => !v)}>
            {searching ? 'Luk' : 'Skift'}
          </button>
        </div>
      )}
      {searching && (
        <>
          <input
            className="field"
            type="search"
            placeholder={`Søg efter ${noun}`}
            aria-label={`Søg efter ${noun}`}
            value={q}
            autoFocus={!place}
            onChange={(e) => setQ(e.target.value)}
          />
          {query && hits.length === 0 && <p className="t-caption modal-screen__muted">Ingen {noun === 'gruppe' ? 'grupper' : 'begivenheder'} matcher “{q.trim()}”.</p>}
          {hits.length > 0 && (
            <ul className="create__groups" aria-label="Resultater">
              {hits.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className="create__group"
                    onClick={() => {
                      onPlace(p.id);
                      setSearching(false);
                      setQ('');
                    }}
                  >
                    <span className={`create__group-pic avatar--${p.tone}`} aria-hidden="true">
                      {p.avatarSrc ? <img src={p.avatarSrc} alt="" /> : p.initials}
                    </span>
                    <span className="create__dest-text">
                      <span className="t-label create__group-name">{p.name}</span>
                      <span className="t-caption create__dest-hint">{p.meta}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
