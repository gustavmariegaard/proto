import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { IconButton } from '../../components/IconButton';
import './MomentComposer.css';

/** Baggrunde i ciircles farver. "Fra billedet" bruger opslagets billede sløret. */
const backgrounds = [
  { id: 'ink', label: 'Sort', css: '#171717', light: false },
  { id: 'skov', label: 'Mørkegrøn', css: '#05392a', light: false },
  { id: 'mint', label: 'Mint', css: '#21f1a8', light: true },
  { id: 'lys', label: 'Lysegrøn', css: '#e8fef6', light: true },
  { id: 'nat', label: 'Nat', css: 'linear-gradient(160deg, #171717 0%, #05392a 100%)', light: false },
  { id: 'frisk', label: 'Frisk', css: 'linear-gradient(160deg, #21f1a8 0%, #0b7a57 100%)', light: false },
] as const;

type Props = {
  /** Kortet med opslaget */
  card: ReactNode;
  image?: string;
  me: { name: string; handle: string; avatar?: string };
  onClose: () => void;
  onShare: () => void;
};

const MIN = 0.5;
const MAX = 1.6;
const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));

/**
 * Del som moment i fuld skærm (som at dele til en story på Instagram).
 * - Knib med to fingre for at skalere, træk for at flytte (scroll med musen skalerer også)
 * - Tryk på baggrunden for at skifte farve, eller vælg en farve nederst
 * - Dobbelttryk eller "Nulstil" sætter opslaget tilbage i midten
 */
export function MomentComposer({ card, image, me, onClose, onShare }: Props) {
  const [bg, setBg] = useState<string>(image ? 'billede' : 'ink');
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [tip, setTip] = useState(true);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ dist: number; scale: number; mid: { x: number; y: number }; pos: { x: number; y: number }; moved: boolean } | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setTip(false), 3500);
    return () => window.clearTimeout(t);
  }, []);

  const options = image
    ? [{ id: 'billede', label: 'Fra billedet', css: '', light: false }, ...backgrounds]
    : [...backgrounds];
  const current = options.find((o) => o.id === bg) ?? options[0]!;
  const next = () => setBg(options[(options.indexOf(current) + 1) % options.length]!.id);

  const midOf = (pts: { x: number; y: number }[]) =>
    pts.reduce((m, p) => ({ x: m.x + p.x / pts.length, y: m.y + p.y / pts.length }), { x: 0, y: 0 });

  const snapshot = () => {
    const pts = [...pointers.current.values()];
    const dist = pts.length > 1 ? Math.hypot(pts[0]!.x - pts[1]!.x, pts[0]!.y - pts[1]!.y) : 0;
    gesture.current = { dist, scale, mid: midOf(pts), pos, moved: gesture.current?.moved ?? false };
  };

  const onDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button, input')) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) gesture.current = null;
    snapshot();
    setTip(false);
  };

  const onMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId) || !gesture.current) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.current.values()];
    const g = gesture.current;
    const mid = midOf(pts);
    const dx = mid.x - g.mid.x;
    const dy = mid.y - g.mid.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) g.moved = true;
    const w = window.innerWidth / 2;
    const h = window.innerHeight / 2;
    setPos({ x: clamp(g.pos.x + dx, -w, w), y: clamp(g.pos.y + dy, -h, h) });
    if (pts.length > 1 && g.dist) {
      g.moved = true;
      const dist = Math.hypot(pts[0]!.x - pts[1]!.x, pts[0]!.y - pts[1]!.y);
      setScale(clamp((g.scale * dist) / g.dist, MIN, MAX));
    }
  };

  const onUp = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    const wasTap = pointers.current.size === 1 && gesture.current && !gesture.current.moved;
    pointers.current.delete(e.pointerId);
    // Et kort tryk på baggrunden (ikke på opslaget) skifter farve
    if (wasTap && !(e.target as HTMLElement).closest('.mcomp__card')) next();
    if (pointers.current.size) snapshot();
    else gesture.current = null;
  };

  const reset = () => {
    setScale(1);
    setPos({ x: 0, y: 0 });
  };

  return (
    <div
      className={['smoment', current.light && 'smoment--light'].filter(Boolean).join(' ')}
      role="dialog"
      aria-label="Del som moment"
    >
      <div
        className="mcomp__stage"
        style={current.id === 'billede' ? undefined : { background: current.css }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onDoubleClick={reset}
        onWheel={(e) => setScale((s) => clamp(s - e.deltaY / 600, MIN, MAX))}
      >
        {current.id === 'billede' && image && (
          <span className="mcomp__photo" style={{ backgroundImage: `url(${image})` }} aria-hidden="true" />
        )}
        <div className="mcomp__card" style={{ transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})` }}>
          {card}
        </div>
      </div>

      <header className="smoment__top">
        <IconButton icon="close" label="Tilbage" className="smoment__btn" onClick={onClose} />
        <span className="smoment__who">
          <Avatar name={me.name} src={me.avatar} size="S" />
          <span className="t-caption-strong">@{me.handle}</span>
        </span>
        <button type="button" className="smoment__pill t-caption-strong" onClick={reset}>
          Nulstil
        </button>
      </header>

      {tip && (
        <p className="smoment__tip t-caption" aria-live="polite">
          Knib for at skalere, træk for at flytte. Tryk på baggrunden for at skifte farve.
        </p>
      )}

      <footer className="smoment__bottom">
        <div className="mcomp__swatches" role="radiogroup" aria-label="Baggrund">
          {options.map((o) => (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={o.id === current.id}
              aria-label={o.label}
              className={['mcomp__swatch', o.id === current.id && 'mcomp__swatch--on'].filter(Boolean).join(' ')}
              style={{ '--sw': o.id === 'billede' ? `url(${image})` : o.css } as React.CSSProperties}
              onClick={() => setBg(o.id)}
            />
          ))}
        </div>
        <input
          className="visually-hidden"
          type="range"
          min={MIN * 100}
          max={MAX * 100}
          value={Math.round(scale * 100)}
          onChange={(e) => setScale(Number(e.target.value) / 100)}
          aria-label="Størrelse"
          aria-valuetext={`${Math.round(scale * 100)} procent`}
        />
        <Button variant="highlight" block onClick={onShare}>
          Del som moment
        </Button>
      </footer>
    </div>
  );
}
