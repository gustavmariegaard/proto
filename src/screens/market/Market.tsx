import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../../components/Button';
import { Chip } from '../../components/Chip';
import { Icon } from '../../components/Icon';
import { SegmentedControl } from '../../components/SegmentedControl';
import { TextField } from '../../components/TextField';
import {
  categories,
  formatPrice,
  initialRadius,
  listedText,
  maxRadius,
  minRadius,
  myCity,
  radiusPresets,
  type Category,
  type Listing,
} from '../../data/market';
import { useListings, useMarket } from './store';
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
    ref.current?.focus({ preventScroll: true });
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

/** Kort i gitteret: forsidebillede, pris, titel og afstand. */
function ListingCard({ listing, onOpen }: { listing: Listing; onOpen: () => void }) {
  const count = listing.images.length;
  const sub = listing.mine ? `Sat til salg ${listedText(listing).toLowerCase()}` : `${listing.km} km væk`;
  return (
    <button
      type="button"
      className={['listing', listing.sold && 'listing--sold'].filter(Boolean).join(' ')}
      onClick={onOpen}
      aria-label={`${listing.title}, ${formatPrice(listing.price)}${listing.sold ? ', solgt' : ''}`}
    >
      <span className="listing__media">
        <img className="listing__photo" src={listing.images[0]} alt="" />
        {listing.sold && <span className="listing__sold t-micro">Solgt</span>}
        {count > 1 && (
          <span className="listing__count t-micro" aria-hidden="true">
            <Icon name="image" size={12} />1/{count}
          </span>
        )}
      </span>
      <span className="listing__info" aria-hidden="true">
        <span className="t-heading-m">{formatPrice(listing.price)}</span>
        <span className="t-body-s listing__title">{listing.title}</span>
        <span className="t-caption listing__km">{sub}</span>
      </span>
    </button>
  );
}

type View = 'salg' | 'dine' | 'gemte';
const views: { value: View; label: string }[] = [
  { value: 'salg', label: 'Til salg' },
  { value: 'dine', label: 'Dine annoncer' },
  { value: 'gemte', label: 'Gemte' },
];

/** Torvet: køb og sælg i nærheden. */
export function Market() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const view: View = (views.find((v) => v.value === params.get('vis'))?.value ?? 'salg');
  const all = useListings();
  const { saved } = useMarket();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category>('Alle');
  const [radius, setRadius] = useState(initialRadius);
  const [radiusOpen, setRadiusOpen] = useState(false);
  const closeRadius = useCallback(() => setRadiusOpen(false), []);

  const q = query.trim().toLowerCase();
  const matches = (l: Listing) =>
    !q || l.title.toLowerCase().includes(q) || l.category.toLowerCase().includes(q) || l.description.toLowerCase().includes(q);

  let shown: Listing[];
  if (view === 'dine') shown = all.filter((l) => l.mine);
  else if (view === 'gemte') shown = saved.map((id) => all.find((l) => l.id === id)).filter((l): l is Listing => !!l);
  else
    shown = all
      .filter((l) => !l.mine && (category === 'Alle' || l.category === category) && l.km <= radius && matches(l))
      // Solgte til sidst
      .sort((a, b) => Number(!!a.sold) - Number(!!b.sold));

  const setView = (v: View) => setParams(v === 'salg' ? {} : { vis: v }, { replace: true });

  const empty =
    view === 'dine'
      ? 'Du har ingen annoncer endnu. Har du noget, du vil sælge?'
      : view === 'gemte'
        ? 'Du har ikke gemt nogen annoncer. Tryk på Gem på en annonce for at finde den her.'
        : 'Ingen annoncer matcher din søgning.';

  return (
    <div className="market">
      <div className="market__header">
        <h1 className="t-title-xl">Torvet</h1>
        <Button onClick={() => navigate('/torvet/saelg')} className="market__sell">
          <Icon name="plus" size={20} />
          Sælg noget
        </Button>
      </div>

      <SegmentedControl label="Vis annoncer" options={views} value={view} onChange={setView} />

      {view === 'salg' && (
        <>
          <TextField label="Søg på Torvet" type="search" value={query} onChange={(e) => setQuery(e.target.value)} />

          <div>
            <button
              type="button"
              className="market__radius"
              aria-haspopup="dialog"
              onClick={() => setRadiusOpen(true)}
            >
              <Icon name="pin" size={20} />
              <span className="t-label">Inden for {radius} km</span>
              <span className="t-caption market__muted">· {myCity}</span>
              <Icon name="chevron-right" className="market__chevron" />
            </button>
          </div>

          <ul className="market__chips market__chips--scroll" aria-label="Kategorier">
            {categories.map((c) => (
              <li key={c}>
                <Chip selected={category === c} onClick={() => setCategory(c)}>
                  {c}
                </Chip>
              </li>
            ))}
          </ul>
        </>
      )}

      <p className="visually-hidden" role="status" aria-live="polite">
        {shown.length === 1 ? '1 annonce' : `${shown.length} annoncer`}
      </p>

      {shown.length > 0 ? (
        <ul className="market__grid" aria-label="Annoncer">
          {shown.map((l) => (
            <li key={l.id}>
              <ListingCard listing={l} onOpen={() => navigate(`/torvet/${l.id}`)} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="market__empty">
          <p className="t-body-s market__muted">{empty}</p>
          {view === 'dine' && (
            <Button variant="secondary" onClick={() => navigate('/torvet/saelg')}>
              Sælg noget
            </Button>
          )}
        </div>
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
    </div>
  );
}
