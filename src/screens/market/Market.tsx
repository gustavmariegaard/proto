import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { Chip } from '../../components/Chip';
import { Icon } from '../../components/Icon';
import { Sheet } from '../../components/Sheet';
import { TextField } from '../../components/TextField';
import {
  categories,
  initialRadius,
  listings,
  maxRadius,
  minRadius,
  myCity,
  radiusPresets,
  type Category,
  type Listing,
} from '../../data/market';
import './Market.css';

/*
 * Skyderen er ikke lineær: i Figma står 25 km ved 40 % af banen.
 * Punkterne herunder (km → position 0–1) giver en jævn fornemmelse fra 1 til 100 km.
 */
const STOPS: [number, number][] = [
  [minRadius, 0],
  [5, 0.1],
  [10, 0.2],
  [25, 0.4],
  [50, 0.7],
  [maxRadius, 1],
];
const STEPS = 1000;

function kmToPos(km: number) {
  for (let i = 1; i < STOPS.length; i++) {
    const [k0, p0] = STOPS[i - 1]!;
    const [k1, p1] = STOPS[i]!;
    if (km <= k1) return p0 + ((km - k0) / (k1 - k0)) * (p1 - p0);
  }
  return 1;
}

function posToKm(pos: number) {
  for (let i = 1; i < STOPS.length; i++) {
    const [k0, p0] = STOPS[i - 1]!;
    const [k1, p1] = STOPS[i]!;
    if (pos <= p1) return Math.round(k0 + ((pos - p0) / (p1 - p0)) * (k1 - k0));
  }
  return maxRadius;
}

type RadiusSheetProps = { open: boolean; value: number; onClose: () => void; onApply: (km: number) => void };

/** Torvet · Radius: vælg, hvor langt væk annoncerne må være. */
function RadiusSheet({ open, value, onClose, onApply }: RadiusSheetProps) {
  const titleId = useId();
  const ref = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (!open) return;
    setDraft(value);
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, [open, value, onClose]);

  if (!open) return null;
  const pos = kmToPos(draft);
  const host = document.getElementById('root') ?? document.body;

  return createPortal(
    <div className="radius-layer">
      <button type="button" className="radius-layer__scrim" aria-label="Luk" tabIndex={-1} onClick={onClose} />
      <div ref={ref} className="radius" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <button type="button" className="radius__handle" aria-label="Luk" onClick={onClose}>
          <span className="radius__bar" />
        </button>
        <h2 id={titleId} className="t-title-l">
          Søg i nærheden
        </h2>
        <p className="radius__place t-body-s">
          <Icon name="pin" size={18} />
          Ud fra din placering: {myCity}
        </p>
        <p className="radius__value t-title-xl" aria-hidden="true">
          {draft} km
        </p>
        <input
          type="range"
          className="radius__slider"
          min={0}
          max={STEPS}
          step={1}
          value={Math.round(pos * STEPS)}
          onChange={(e) => setDraft(Math.max(minRadius, posToKm(Number(e.target.value) / STEPS)))}
          aria-label="Afstand"
          aria-valuetext={`${draft} km`}
          style={{ '--fill': `${pos * 100}%` } as React.CSSProperties}
        />
        <div className="radius__scale t-caption" aria-hidden="true">
          <span>{minRadius} km</span>
          <span>{maxRadius} km</span>
        </div>
        <ul className="market__chips" aria-label="Hurtigvalg">
          {radiusPresets.map((km) => (
            <li key={km}>
              <Chip selected={draft === km} onClick={() => setDraft(km)}>
                {km} km
              </Chip>
            </li>
          ))}
        </ul>
        <Button block onClick={() => onApply(draft)}>
          Vis annoncer
        </Button>
      </div>
    </div>,
    host,
  );
}

/** Ark med en annonce og en knap til at skrive til sælgeren. */
function ListingSheet({ listing, onClose }: { listing: Listing | null; onClose: () => void }) {
  const navigate = useNavigate();
  return (
    <Sheet open={listing !== null} onClose={onClose} title={listing?.title ?? ''} dim>
      {listing && (
        <div className="listing-detail">
          <img className="listing-detail__photo" src={listing.image} alt="" />
          <div>
            <p className="t-title-l">{listing.price}</p>
            <p className="t-caption listing__km">{listing.km} km væk</p>
          </div>
          <p className="t-body">{listing.description}</p>
          <div className="listing-detail__seller">
            <Avatar name={listing.seller.name} tone={listing.seller.tone} src={listing.seller.avatarSrc} />
            <div>
              <p className="t-heading-s">{listing.seller.name}</p>
              <p className="t-caption listing__km">Sælger</p>
            </div>
          </div>
          <Button block onClick={() => navigate(listing.threadId ? `/beskeder/${listing.threadId}` : '/beskeder')}>
            Skriv til sælger
          </Button>
        </div>
      )}
    </Sheet>
  );
}

/** Torvet: køb og sælg i nærheden. */
export function Market() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category>('Alle');
  const [radius, setRadius] = useState(initialRadius);
  const [radiusOpen, setRadiusOpen] = useState(false);
  const [selected, setSelected] = useState<Listing | null>(null);
  const closeRadius = useCallback(() => setRadiusOpen(false), []);
  const closeListing = useCallback(() => setSelected(null), []);

  const q = query.trim().toLowerCase();
  const shown = listings.filter(
    (l) =>
      (category === 'Alle' || l.category === category) &&
      l.km <= radius &&
      (!q || l.title.toLowerCase().includes(q) || l.category.toLowerCase().includes(q)),
  );

  return (
    <div className="market">
      <div className="market__header">
        <h1 className="t-title-xl">Torvet</h1>
        <Button onClick={() => navigate('/opret')}>Sælg noget</Button>
      </div>

      <TextField label="Søg på torvet" type="search" value={query} onChange={(e) => setQuery(e.target.value)} />

      <div>
        <button
          type="button"
          className="market__radius"
          aria-haspopup="dialog"
          onClick={() => setRadiusOpen(true)}
        >
          <Icon name="pin" size={20} />
          <span className="t-label">Inden for {radius} km</span>
          <span className="t-caption market__muted">· ud fra din placering</span>
          <Icon name="chevron-right" className="market__chevron" />
        </button>
      </div>

      <ul className="market__chips" aria-label="Kategorier">
        {categories.map((c) => (
          <li key={c}>
            <Chip selected={category === c} onClick={() => setCategory(c)}>
              {c}
            </Chip>
          </li>
        ))}
      </ul>

      <p className="market__info t-caption">Både købere og sælgere er verificerede.</p>

      <p className="visually-hidden" role="status" aria-live="polite">
        {shown.length === 1 ? '1 annonce' : `${shown.length} annoncer`}
      </p>

      {shown.length > 0 ? (
        <ul className="market__grid" aria-label="Annoncer">
          {shown.map((l) => (
            <li key={l.id}>
              <button type="button" className="listing" onClick={() => setSelected(l)}>
                <img className="listing__photo" src={l.image} alt="" />
                <span className="listing__info">
                  <span className="t-heading-m">{l.price}</span>
                  <span className="t-body-s">{l.title}</span>
                  <span className="t-caption listing__km">{l.km} km væk</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="t-body-s market__muted">Ingen annoncer matcher din søgning.</p>
      )}

      <RadiusSheet
        open={radiusOpen}
        value={radius}
        onClose={closeRadius}
        onApply={(km) => {
          setRadius(km);
          setRadiusOpen(false);
        }}
      />
      <ListingSheet listing={selected} onClose={closeListing} />
    </div>
  );
}
