import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../../components/Button';
import { Chip } from '../../components/Chip';
import { Icon } from '../../components/Icon';
import { SegmentedControl } from '../../components/SegmentedControl';
import { Sheet } from '../../components/Sheet';
import { TextField } from '../../components/TextField';
import { formatPrice, listedText, myCity, radiusText, type Listing } from '../../data/market';
import { relatedFirst, setRadius, useListings, useMarket, useRadius } from './store';
import { Toggle } from '../create/parts';
import './Market.css';

const MAX_KM = 100;

/** Torvet · Afstand: træk i linjen for at vælge, hvor langt væk annoncerne må være. */
function RadiusSheet({ open, value, onClose }: { open: boolean; value: number | null; onClose: () => void }) {
  const [draft, setDraft] = useState(value);
  const [wasOpen, setWasOpen] = useState(open);
  // Start forfra med den valgte afstand, hver gang arket åbnes
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setDraft(value);
  }
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Afstand"
      initialSize="auto"
      dim
      footer={
        <Button
          block
          onClick={() => {
            setRadius(draft);
            onClose();
          }}
        >
          Vis resultater
        </Button>
      }
    >
      <div className="market-radius">
        <p className="market-radius__value">
          <span className="t-title-l">{radiusText(draft)}</span>
          <span className="t-caption market-radius__muted">fra {myCity}</span>
        </p>
        <input
          type="range"
          className="market-radius__slider"
          min={1}
          max={MAX_KM}
          step={1}
          value={draft ?? MAX_KM}
          disabled={draft === null}
          aria-label={`Afstand fra ${myCity} i km`}
          style={{ '--fill': `${(((draft ?? MAX_KM) - 1) / (MAX_KM - 1)) * 100}%` } as React.CSSProperties}
          onChange={(e) => setDraft(Number(e.target.value))}
        />
        <div className="market-radius__scale t-caption market-radius__muted" aria-hidden="true">
          <span>1 km</span>
          <span>{MAX_KM} km</span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={draft === null}
          className="market-radius__all"
          onClick={() => setDraft(draft === null ? 25 : null)}
        >
          <span className="t-label">Hele landet</span>
          <Toggle on={draft === null} />
        </button>
      </div>
    </Sheet>
  );
}

/** Kort i gitteret: forsidebillede, pris, titel og afstand. */
function ListingCard({ listing, onOpen }: { listing: Listing; onOpen: () => void }) {
  const count = listing.images.length;
  const sub = listing.mine ? `Sat til salg ${listedText(listing).toLowerCase()}` : `${listing.km} km væk`;
  return (
    <button
      type="button"
      className="listing"
      onClick={onOpen}
      aria-label={`${listing.title}, ${formatPrice(listing.price)}`}
    >
      <span className="listing__media">
        <img className="listing__photo" src={listing.images[0]} alt="" />
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

/** Gitter med annoncekort */
function Grid({ items, label }: { items: Listing[]; label: string }) {
  const navigate = useNavigate();
  return (
    <ul className="market__grid" aria-label={label}>
      {items.map((l) => (
        <li key={l.id}>
          <ListingCard listing={l} onOpen={() => navigate(`/torvet/${l.id}`)} />
        </li>
      ))}
    </ul>
  );
}

/** Torvet: køb og sælg i nærheden. */
export function Market() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const view: View = views.find((v) => v.value === params.get('vis'))?.value ?? 'salg';
  const all = useListings();
  const { saved, recent } = useMarket();
  const radius = useRadius();
  const [query, setQuery] = useState('');
  const [radiusOpen, setRadiusOpen] = useState(false);

  const q = query.trim().toLowerCase();
  const matches = (l: Listing) =>
    !q || l.title.toLowerCase().includes(q) || l.category.toLowerCase().includes(q) || l.description.toLowerCase().includes(q);

  let shown: Listing[];
  if (view === 'dine') shown = all.filter((l) => l.mine);
  else if (view === 'gemte') shown = saved.map((id) => all.find((l) => l.id === id)).filter((l): l is Listing => !!l);
  else shown = all.filter((l) => !l.mine && (radius === null || l.km <= radius) && matches(l));

  // Uden søgning: annoncer i det, du senest har kigget på, først
  const { forYou, rest } = view === 'salg' && !q ? relatedFirst(shown, recent) : { forYou: [], rest: shown };

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
        <div className="market__filters">
          <TextField label="Søg på Torvet" type="search" value={query} onChange={(e) => setQuery(e.target.value)} />
          <Chip
            className="market__radius"
            aria-haspopup="dialog"
            aria-expanded={radiusOpen}
            aria-pressed={undefined}
            aria-label={`Afstand: ${radius === null ? 'hele landet' : `inden for ${radius} km`} fra ${myCity}. Skift`}
            onClick={() => setRadiusOpen(true)}
          >
            <Icon name="pin" size={18} />
            {radiusText(radius)}
            <Icon name="chevron-right" size={16} className="market__radius-chevron" />
          </Chip>
        </div>
      )}

      <p className="visually-hidden" role="status" aria-live="polite">
        {shown.length === 1 ? '1 annonce' : `${shown.length} annoncer`}
      </p>

      {shown.length === 0 ? (
        <div className="market__empty">
          <p className="t-body-s market__muted">{empty}</p>
          {view === 'dine' && (
            <Button variant="secondary" onClick={() => navigate('/torvet/saelg')}>
              Sælg noget
            </Button>
          )}
        </div>
      ) : forYou.length > 0 ? (
        <>
          <section className="market__section" aria-labelledby="market-for-you">
            <h2 id="market-for-you" className="t-heading-m">Til dig</h2>
            <Grid items={forYou} label="Til dig" />
          </section>
          {rest.length > 0 && (
            <section className="market__section" aria-labelledby="market-more">
              <h2 id="market-more" className="t-heading-m">Mere på Torvet</h2>
              <Grid items={rest} label="Mere på Torvet" />
            </section>
          )}
        </>
      ) : (
        <Grid items={rest} label="Annoncer" />
      )}

      <RadiusSheet open={radiusOpen} value={radius} onClose={() => setRadiusOpen(false)} />
    </div>
  );
}
