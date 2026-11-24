import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/Button';
import { Chip } from '../../components/Chip';
import { Icon } from '../../components/Icon';
import { TextField } from '../../components/TextField';
import { conditions, guessCategory, maxPhotos, myCity, type Condition } from '../../data/market';
import { img } from '../../data/sample';
import { useSession } from '../../state/session';
import { CloseHeader, Toggle, useClose } from '../create/parts';
import { addListing } from './store';
import './SellListing.css';

const MAX_WIDTH = 1080;
const MAX_HEIGHT = 1440;

/** Gør et billede fra telefonen mindre (højst 1080 px bredt) og laver det om til en JPEG-data-URL. */
function shrink(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, MAX_WIDTH / image.naturalWidth, MAX_HEIGHT / image.naturalHeight);
      const w = Math.max(1, Math.round(image.naturalWidth * scale));
      const h = Math.max(1, Math.round(image.naturalHeight * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      URL.revokeObjectURL(url);
      if (!ctx) return reject(new Error('canvas'));
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(image, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('image'));
    };
    image.src = url;
  });
}

type Errors = Partial<Record<'photos' | 'title' | 'price', string>>;

/** Sælg noget på Torvet (fuld skærm). Rute: /torvet/saelg */
export function SellListing() {
  const navigate = useNavigate();
  const close = useClose('/torvet');
  const { profile } = useSession();
  const fileRef = useRef<HTMLInputElement>(null);

  const [photos, setPhotos] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState('');
  const [price, setPriceText] = useState('');
  const [condition, setCondition] = useState<Condition>('God');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState(myCity);
  const [shipping, setShipping] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [photoNote, setPhotoNote] = useState('');

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const room = maxPhotos - photos.length;
    const picked = Array.from(files).filter((f) => f.type.startsWith('image/'));
    const take = picked.slice(0, Math.max(0, room));
    setPhotoNote(picked.length > room ? `Du kan højst have ${maxPhotos} billeder. Nogle blev ikke tilføjet.` : '');
    if (!take.length) return;
    setBusy(true);
    const results = await Promise.allSettled(take.map(shrink));
    const ok = results.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []));
    if (ok.length < take.length) setPhotoNote('Et eller flere billeder kunne ikke læses.');
    setPhotos((p) => [...p, ...ok].slice(0, maxPhotos));
    setErrors((e) => ({ ...e, photos: undefined }));
    setBusy(false);
  };

  const removePhoto = (i: number) => setPhotos((p) => p.filter((_, j) => j !== i));
  const makeCover = (i: number) => setPhotos((p) => [p[i]!, ...p.filter((_, j) => j !== i)]);

  const kr = Number(price);

  const submit = () => {
    const next: Errors = {};
    if (!photos.length) next.photos = 'Tilføj mindst ét billede.';
    if (!title.trim()) next.title = 'Skriv en titel.';
    if (!price || !Number.isFinite(kr)) next.price = 'Skriv en pris (0 kr. hvis den er gratis).';
    setErrors(next);
    if (Object.keys(next).length) {
      const first = next.photos ? 'sell-photos-add' : next.title ? 'sell-title' : 'sell-price';
      document.getElementById(first)?.focus();
      return;
    }
    const id = addListing({
      title: title.trim(),
      price: Math.round(kr),
      category: guessCategory(`${title} ${description}`),
      condition,
      description: description.trim(),
      location: location.trim() || myCity,
      shipping,
      images: photos,
      seller: { name: profile.name.trim() || 'Dig', tone: 'sand', avatarSrc: profile.avatar ?? img('mig.jpg'), since: new Date().getFullYear() },
    });
    navigate(`/torvet/${id}`, { replace: true });
  };

  return (
    <div className="sell-screen">
      <CloseHeader title="Sælg noget" onClose={close} closeLabel="Annuller" />
      <form
        className="sell-screen__content"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <section className="sell__group" aria-labelledby="sell-photos-title">
          <div className="sell__label-row">
            <h2 id="sell-photos-title" className="t-heading-s">
              Billeder
            </h2>
            <span className="t-caption sell__muted">
              {photos.length}/{maxPhotos} · Det første er forsidebilledet
            </span>
          </div>
          <ul className="sell-photos" aria-label="Valgte billeder">
            {photos.length < maxPhotos && (
              <li>
                <button
                  id="sell-photos-add"
                  type="button"
                  className={['sell-photos__add', errors.photos && 'sell-photos__add--error'].filter(Boolean).join(' ')}
                  onClick={() => fileRef.current?.click()}
                  aria-describedby={errors.photos ? 'sell-photos-error' : undefined}
                  disabled={busy}
                >
                  <Icon name="camera" size={26} />
                  <span className="t-caption-strong">{busy ? 'Henter …' : photos.length ? 'Tilføj flere' : 'Tilføj billeder'}</span>
                </button>
              </li>
            )}
            {photos.map((src, i) => (
              <li key={`${i}-${src.slice(-16)}`} className="sell-photos__item">
                <button
                  type="button"
                  className="sell-photos__thumb"
                  onClick={() => i > 0 && makeCover(i)}
                  aria-label={i === 0 ? `Billede 1, forsidebillede` : `Billede ${i + 1}. Tryk for at gøre det til forsidebillede`}
                >
                  <img src={src} alt="" />
                  {i === 0 && <span className="sell-photos__cover t-micro">Forside</span>}
                </button>
                <button type="button" className="sell-photos__remove" aria-label={`Fjern billede ${i + 1}`} onClick={() => removePhoto(i)}>
                  <span className="sell-photos__x">
                    <Icon name="close" size={14} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = '';
            }}
          />
          {errors.photos && (
            <p id="sell-photos-error" className="sell__error t-caption-strong">
              {errors.photos}
            </p>
          )}
          {photoNote && <p className="t-caption sell__muted" role="status">{photoNote}</p>}
        </section>

        <div className="sell__group">
          <TextField
            id="sell-title"
            label="Titel, fx Spisebord i eg"
            value={title}
            maxLength={70}
            onChange={(e) => {
              setTitle(e.target.value);
              if (errors.title) setErrors((x) => ({ ...x, title: undefined }));
            }}
            aria-invalid={!!errors.title}
            aria-describedby={errors.title ? 'sell-title-error' : undefined}
          />
          {errors.title && (
            <p id="sell-title-error" className="sell__error t-caption-strong">
              {errors.title}
            </p>
          )}
        </div>

        <div className="sell__group">
          <div className="sell__price">
            <TextField
              id="sell-price"
              label="Pris"
              inputMode="numeric"
              value={price}
              onChange={(e) => {
                setPriceText(e.target.value.replace(/[^\d]/g, '').slice(0, 7));
                if (errors.price) setErrors((x) => ({ ...x, price: undefined }));
              }}
              aria-invalid={!!errors.price}
              aria-describedby={errors.price ? 'sell-price-error' : undefined}
            />
            <span className="sell__unit t-label" aria-hidden="true">
              kr.
            </span>
          </div>
          {errors.price && (
            <p id="sell-price-error" className="sell__error t-caption-strong">
              {errors.price}
            </p>
          )}
        </div>

        <section className="sell__group" aria-labelledby="sell-condition">
          <h2 id="sell-condition" className="t-heading-s">
            Stand
          </h2>
          <div className="sell__chips" role="radiogroup" aria-labelledby="sell-condition">
            {conditions.map((c) => (
              <Chip key={c} role="radio" aria-checked={condition === c} aria-pressed={undefined} selected={condition === c} onClick={() => setCondition(c)}>
                {c}
              </Chip>
            ))}
          </div>
        </section>

        <textarea
          className="sell__desc"
          aria-label="Beskrivelse"
          placeholder="Beskrivelse – fx mål, alder og eventuelle fejl"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <section className="sell__group" aria-labelledby="sell-pickup">
          <h2 id="sell-pickup" className="t-heading-s">
            Afhentning
          </h2>
          <div className="sell__place">
            <TextField label="Sted for afhentning" value={location} onChange={(e) => setLocation(e.target.value)} />
            <span className="sell__place-icon" aria-hidden="true">
              <Icon name="pin" size={20} />
            </span>
          </div>
          <button type="button" role="switch" aria-checked={shipping} className="sell__switch" onClick={() => setShipping((v) => !v)}>
            <span className="sell__switch-text">
              <span className="t-label">Kan sendes</span>
              <span className="t-caption sell__muted">Køberen kan få varen sendt med posten.</span>
            </span>
            <Toggle on={shipping} />
          </button>
        </section>

        <Button type="submit" block disabled={busy}>
          Sæt til salg
        </Button>
      </form>
    </div>
  );
}
