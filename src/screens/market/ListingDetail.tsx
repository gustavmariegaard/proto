import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { Chip } from '../../components/Chip';
import { Icon, type IconName } from '../../components/Icon';
import { IconButton } from '../../components/IconButton';
import { PageHeader } from '../../components/PageHeader';
import { Sheet } from '../../components/Sheet';
import { TextField } from '../../components/TextField';
import { formatPrice, listedText, quickReplies, type Listing } from '../../data/market';
import { handleOf } from '../../data/handles';
import { deleteListing, messageSeller, setPrice, setSold, toggleSaved, useListing, useSaved } from './store';
import './ListingDetail.css';

/** Billeder, man kan swipe igennem, med prikker og tæller. */
function Gallery({ images, title, sold }: { images: string[]; title: string; sold?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const count = images.length;

  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    setIndex(Math.min(count - 1, Math.max(0, Math.round(el.scrollLeft / el.clientWidth))));
  };
  const go = (i: number) => {
    const el = ref.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
  };

  return (
    <div className="gallery">
      <div
        ref={ref}
        className="gallery__track"
        onScroll={onScroll}
        tabIndex={count > 1 ? 0 : -1}
        role="region"
        aria-roledescription="karrusel"
        aria-label={`Billeder af ${title}`}
      >
        {images.map((src, i) => (
          <img
            key={`${i}-${src.slice(-24)}`}
            className="gallery__img"
            src={src}
            alt={`Billede ${i + 1} af ${count}`}
            draggable={false}
          />
        ))}
      </div>
      {sold && <span className="gallery__sold t-label">Solgt</span>}
      {count > 1 && (
        <>
          <span className="gallery__counter t-caption-strong" aria-live="polite">
            {index + 1}/{count}
          </span>
          <div className="gallery__dots" aria-hidden="true">
            {images.map((_, i) => (
              <span key={i} className={['gallery__dot', i === index && 'gallery__dot--on'].filter(Boolean).join(' ')} />
            ))}
          </div>
          {index > 0 && (
            <button type="button" className="gallery__nav gallery__nav--prev" aria-label="Forrige billede" onClick={() => go(index - 1)}>
              <Icon name="chevron-left" size={20} />
            </button>
          )}
          {index < count - 1 && (
            <button type="button" className="gallery__nav gallery__nav--next" aria-label="Næste billede" onClick={() => go(index + 1)}>
              <Icon name="chevron-right" size={20} />
            </button>
          )}
        </>
      )}
    </div>
  );
}

/** Rund knap med tekst under (Gem, Del, Giv et bud …) */
function Action({ icon, label, onClick, pressed, filled }: { icon: IconName; label: string; onClick: () => void; pressed?: boolean; filled?: boolean }) {
  return (
    <button type="button" className="ld-action" onClick={onClick} aria-pressed={pressed}>
      <span className={['ld-action__icon', filled && 'ld-action__icon--filled'].filter(Boolean).join(' ')}>
        <Icon name={icon} size={22} />
      </span>
      <span className="t-caption-strong">{label}</span>
    </button>
  );
}

/** Kort besked nederst, fx "Linket er kopieret" */
function useToast() {
  const [text, setText] = useState('');
  useEffect(() => {
    if (!text) return;
    const t = setTimeout(() => setText(''), 2200);
    return () => clearTimeout(t);
  }, [text]);
  const node = text ? (
    <p className="ld-toast t-caption-strong" role="status">
      {text}
    </p>
  ) : null;
  return [node, setText] as const;
}

function parseKr(value: string) {
  const n = Number(value.replace(/[^\d]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

/** Ark med et prisfelt (Giv et bud / Rediger pris) */
function PriceSheet({
  open,
  onClose,
  title,
  hint,
  initial,
  submitLabel,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  hint: string;
  initial: string;
  submitLabel: string;
  onSubmit: (kr: number) => void;
}) {
  const [value, setValue] = useState(initial);
  useEffect(() => {
    if (open) setValue(initial);
  }, [open, initial]);
  const kr = parseKr(value);
  return (
    <Sheet open={open} onClose={onClose} title={title} initialSize="auto" dim>
      <form
        className="ld-sheet"
        onSubmit={(e) => {
          e.preventDefault();
          if (kr > 0) onSubmit(kr);
        }}
      >
        <p className="t-body-s ld-muted">{hint}</p>
        <div className="ld-price-field">
          <TextField label="Beløb i kroner" inputMode="numeric" value={value} onChange={(e) => setValue(e.target.value.replace(/[^\d]/g, ''))} autoFocus />
          <span className="t-label ld-price-field__unit" aria-hidden="true">
            kr.
          </span>
        </div>
        <Button type="submit" block disabled={kr <= 0}>
          {submitLabel}
        </Button>
      </form>
    </Sheet>
  );
}

const reportReasons = ['Svindel eller snyd', 'Forbudt vare', 'Vildledende annonce', 'Allerede solgt', 'Andet'];

/** Annonce på Torvet (fuld skærm). Rute: /torvet/:id */
export function ListingDetail() {
  const { id = '' } = useParams();
  const listing = useListing(id);

  if (!listing) {
    return (
      <div className="ld-screen">
        <PageHeader title="Torvet" fallback="/torvet" />
        <main className="ld-content ld-content--padded">
          <p className="t-body-s ld-muted">Annoncen findes ikke længere.</p>
          <Link to="/torvet" className="ld-link t-label">
            Tilbage til Torvet
          </Link>
        </main>
      </div>
    );
  }
  return <ListingView listing={listing} />;
}

function ListingView({ listing }: { listing: Listing }) {
  const navigate = useNavigate();
  const saved = useSaved(listing.id);
  const [toast, showToast] = useToast();
  const [sheet, setSheet] = useState<null | 'bud' | 'mere' | 'pris' | 'slet' | 'rapporter'>(null);
  const [reason, setReason] = useState('');
  const [reported, setReported] = useState(false);
  const close = () => setSheet(null);

  const write = (text?: string) => navigate(messageSeller(listing, text));

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: listing.title, text: `${listing.title} – ${formatPrice(listing.price)} på Torvet`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      showToast('Linket er kopieret');
    } catch (e) {
      if ((e as Error)?.name !== 'AbortError') showToast('Linket kunne ikke deles');
    }
  };

  const facts: [string, string][] = [
    ['Stand', listing.condition],
    ['Kategori', listing.category],
    ['Afhentning', listing.location],
    ['Forsendelse', listing.shipping ? 'Kan sendes' : 'Kun afhentning'],
  ];

  return (
    <div className="ld-screen">
      <PageHeader title="Torvet" fallback="/torvet">
        <IconButton icon="send" label="Del annonce" onClick={share} />
        <IconButton icon="dots" label="Flere muligheder" onClick={() => setSheet('mere')} />
      </PageHeader>

      <main className="ld-content">
        <Gallery images={listing.images} title={listing.title} sold={listing.sold} />

        <div className="ld-body">
          <section className="ld-head">
            <h2 className="t-title-l">{listing.title}</h2>
            <p className="ld-price t-title-l">
              {formatPrice(listing.price)}
              {listing.sold && <span className="ld-badge t-caption-strong">Solgt</span>}
            </p>
            <p className="t-caption ld-muted">
              {listing.mine ? listing.location : `${listing.km} km væk · ${listing.location}`} · Sat til salg {listedText(listing).toLowerCase()}
            </p>
          </section>

          {listing.mine ? (
            <section className="ld-owner" aria-label="Din annonce">
              <p className="ld-note t-caption">
                {listing.sold ? 'Du har markeret annoncen som solgt. Den vises stadig på Torvet med "Solgt".' : 'Det er din annonce. Købere kan skrive til dig fra den.'}
              </p>
              <Button block onClick={() => { setSold(listing.id, !listing.sold); showToast(listing.sold ? 'Annoncen er til salg igen' : 'Markeret som solgt'); }}>
                <Icon name="check" size={20} />
                {listing.sold ? 'Sæt til salg igen' : 'Marker som solgt'}
              </Button>
              <div className="ld-owner__row">
                <Button variant="secondary" onClick={() => setSheet('pris')}>
                  <Icon name="edit" size={18} />
                  Rediger pris
                </Button>
                <Button variant="secondary" onClick={() => setSheet('slet')}>
                  <Icon name="close" size={18} />
                  Slet
                </Button>
              </div>
            </section>
          ) : (
            <>
              <div className="ld-actions">
                <Action icon="bookmark" label={saved ? 'Gemt' : 'Gem'} pressed={saved} filled={saved} onClick={() => { toggleSaved(listing.id); showToast(saved ? 'Fjernet fra Gemte' : 'Gemt – find den under Gemte'); }} />
                <Action icon="send" label="Del" onClick={share} />
                {!listing.sold && <Action icon="shop" label="Giv et bud" onClick={() => setSheet('bud')} />}
              </div>
              {!listing.sold && (
                <section className="ld-message" aria-labelledby="ld-message-title">
                  <h2 id="ld-message-title" className="t-heading-s ld-message__title">
                    Send en besked til sælgeren
                  </h2>
                  <ul className="ld-replies" aria-label="Hurtige svar">
                    {quickReplies.map((q) => (
                      <li key={q}>
                        <Chip onClick={() => write(q)} aria-pressed={undefined}>
                          {q}
                        </Chip>
                      </li>
                    ))}
                  </ul>
                  <Button block onClick={() => write()}>
                    <Icon name="chat" size={20} />
                    Skriv til sælger
                  </Button>
                </section>
              )}

            </>
          )}

          <section className="ld-section" aria-labelledby="ld-details">
            <h2 id="ld-details" className="t-heading-m">
              Detaljer
            </h2>
            <dl className="ld-facts">
              {facts.map(([k, v]) => (
                <div key={k} className="ld-facts__row">
                  <dt className="t-body-s ld-muted">{k}</dt>
                  <dd className="t-label">{v}</dd>
                </div>
              ))}
            </dl>
            {listing.description && <p className="t-body ld-desc">{listing.description}</p>}
          </section>

          <section className="ld-section" aria-labelledby="ld-seller">
            <h2 id="ld-seller" className="t-heading-m">
              Om sælgeren
            </h2>
            {listing.mine ? (
              <div className="ld-seller">
                <Avatar name={listing.seller.name} tone={listing.seller.tone} src={listing.seller.avatarSrc} />
                <span className="ld-seller__text">
                  <span className="t-heading-s">{listing.seller.name} (dig)</span>
                  <span className="t-caption ld-muted">Sælger på Torvet siden {listing.seller.since}</span>
                </span>
              </div>
            ) : (
              <Link to={`/bruger/${handleOf(listing.seller.name)}`} className="ld-seller ld-seller--link">
                <Avatar name={listing.seller.name} tone={listing.seller.tone} src={listing.seller.avatarSrc} />
                <span className="ld-seller__text">
                  <span className="t-heading-s">{listing.seller.name}</span>
                  <span className="t-caption ld-muted">Sælger på Torvet siden {listing.seller.since}</span>
                </span>
                <span className="t-caption-strong ld-seller__more">
                  Se profil
                  <Icon name="chevron-right" size={18} />
                </span>
              </Link>
            )}
          </section>
        </div>
      </main>

      {toast}

      <PriceSheet
        open={sheet === 'bud'}
        onClose={close}
        title="Giv et bud"
        hint={`Sælgeren beder om ${formatPrice(listing.price).replace(/\.$/, '')}. Dit bud sendes som en besked til sælgeren.`}
        initial=""
        submitLabel="Send bud"
        onSubmit={(kr) => {
          close();
          write(`Jeg byder ${formatPrice(kr)}`);
        }}
      />
      <PriceSheet
        open={sheet === 'pris'}
        onClose={close}
        title="Rediger pris"
        hint="Den nye pris vises med det samme i annoncen."
        initial={String(listing.price)}
        submitLabel="Gem pris"
        onSubmit={(kr) => {
          setPrice(listing.id, kr);
          close();
          showToast('Prisen er opdateret');
        }}
      />

      <Sheet open={sheet === 'slet'} onClose={close} title="Slet annoncen?" initialSize="auto" dim>
        <div className="ld-sheet">
          <p className="t-body-s ld-muted">Annoncen forsvinder fra Torvet. Det kan ikke fortrydes.</p>
          <Button
            block
            onClick={() => {
              deleteListing(listing.id);
              navigate('/torvet?vis=dine', { replace: true });
            }}
          >
            Slet annonce
          </Button>
          <Button block variant="secondary" onClick={close}>
            Annuller
          </Button>
        </div>
      </Sheet>

      <Sheet open={sheet === 'mere'} onClose={close} title="Annonce" initialSize="auto" dim>
        <ul className="ld-menu">
          {!listing.mine && (
            <li>
              <button type="button" className="ld-menu__item" onClick={() => { toggleSaved(listing.id); close(); showToast(saved ? 'Fjernet fra Gemte' : 'Gemt – find den under Gemte'); }}>
                <Icon name="bookmark" />
                <span className="t-label">{saved ? 'Fjern fra Gemte' : 'Gem annonce'}</span>
              </button>
            </li>
          )}
          <li>
            <button type="button" className="ld-menu__item" onClick={() => { close(); share(); }}>
              <Icon name="link" />
              <span className="t-label">Del eller kopiér link</span>
            </button>
          </li>
          {!listing.mine && (
            <li>
              <button type="button" className="ld-menu__item" onClick={() => { setReported(false); setReason(''); setSheet('rapporter'); }}>
                <Icon name="flag" />
                <span className="t-label">Rapportér annonce</span>
              </button>
            </li>
          )}
        </ul>
      </Sheet>

      <Sheet open={sheet === 'rapporter'} onClose={close} title="Rapportér annonce" initialSize="auto" dim>
        <div className="ld-sheet">
          {reported ? (
            <>
              <p className="t-body-s">Tak. Vi kigger på annoncen. Sælgeren får ikke at vide, at det er dig, der har rapporteret den.</p>
              <Button block onClick={close}>
                Færdig
              </Button>
            </>
          ) : (
            <>
              <p className="t-body-s ld-muted">Hvad er der galt med annoncen?</p>
              <div className="ld-replies" role="radiogroup" aria-label="Grund">
                {reportReasons.map((r) => (
                  <Chip key={r} role="radio" aria-checked={reason === r} aria-pressed={undefined} selected={reason === r} onClick={() => setReason(r)}>
                    {r}
                  </Chip>
                ))}
              </div>
              <Button block disabled={!reason} onClick={() => setReported(true)}>
                Send rapport
              </Button>
            </>
          )}
        </div>
      </Sheet>
    </div>
  );
}
