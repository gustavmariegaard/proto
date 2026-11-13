import { useRef, useState, type ReactNode } from 'react';
import { Avatar } from '../../components/Avatar';
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
};

const MIN = 0.6;
const MAX = 1.5;
const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));

/**
 * Del som moment: vælg baggrund og placér opslaget som på Instagram.
 * - Knib med to fingre for at skalere, træk for at flytte
 * - Tryk på baggrunden for at skifte farve, eller vælg nedenfor
 * - Skyderen skalerer også (og virker uden touch)
 */
export function MomentComposer({ card, image, me }: Props) {
  const [bg, setBg] = useState<string>(image ? 'billede' : 'ink');
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ dist: number; scale: number; mid: { x: number; y: number }; pos: { x: number; y: number }; moved: boolean } | null>(null);

  const options = image
    ? [{ id: 'billede', label: 'Fra billedet', css: '', light: false }, ...backgrounds]
    : [...backgrounds];
  const current = options.find((o) => o.id === bg) ?? options[0]!;
  const next = () => setBg(options[(options.indexOf(current) + 1) % options.length]!.id);

  const snapshot = () => {
    const pts = [...pointers.current.values()];
    const mid = pts.reduce((m, p) => ({ x: m.x + p.x / pts.length, y: m.y + p.y / pts.length }), { x: 0, y: 0 });
    const dist = pts.length > 1 ? Math.hypot(pts[0]!.x - pts[1]!.x, pts[0]!.y - pts[1]!.y) : 0;
    gesture.current = { dist, scale, mid, pos, moved: gesture.current?.moved ?? false };
  };

  const onDown = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) gesture.current = null;
    snapshot();
  };

  const onMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId) || !gesture.current) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.current.values()];
    const g = gesture.current;
    const mid = pts.reduce((m, p) => ({ x: m.x + p.x / pts.length, y: m.y + p.y / pts.length }), { x: 0, y: 0 });
    const dx = mid.x - g.mid.x;
    const dy = mid.y - g.mid.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) g.moved = true;
    setPos({ x: clamp(g.pos.x + dx, -90, 90), y: clamp(g.pos.y + dy, -160, 160) });
    if (pts.length > 1 && g.dist) {
      g.moved = true;
      const dist = Math.hypot(pts[0]!.x - pts[1]!.x, pts[0]!.y - pts[1]!.y);
      setScale(clamp((g.scale * dist) / g.dist, MIN, MAX));
    }
  };

  const onUp = (e: React.PointerEvent) => {
    const wasTap = pointers.current.size === 1 && gesture.current && !gesture.current.moved;
    pointers.current.delete(e.pointerId);
    // Et kort tryk på baggrunden (ikke på kortet) skifter farve
    if (wasTap && !(e.target as HTMLElement).closest('.mcomp__card')) next();
    if (pointers.current.size) snapshot();
    else gesture.current = null;
  };

  const reset = () => {
    setScale(1);
    setPos({ x: 0, y: 0 });
  };

  return (
    <div className="mcomp">
      <div
        className={['mcomp__stage', current.light && 'mcomp__stage--light'].filter(Boolean).join(' ')}
        style={current.id === 'billede' ? undefined : { background: current.css }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onDoubleClick={reset}
        aria-label="Sådan ser dit moment ud. Knib for at skalere, træk for at flytte, tryk på baggrunden for at skifte farve."
        role="img"
      >
        {current.id === 'billede' && image && (
          <span className="mcomp__photo" style={{ backgroundImage: `url(${image})` }} aria-hidden="true" />
        )}
        <span className="mcomp__who">
          <Avatar name={me.name} src={me.avatar} size="S" />
          <span className="t-caption-strong">@{me.handle}</span>
        </span>
        <div
          className="mcomp__card"
          style={{ transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})` }}
        >
          {card}
        </div>
      </div>

      <p className="t-caption mcomp__tip">Knib for at skalere og træk for at flytte. Tryk på baggrunden for at skifte farve.</p>

      <div className="mcomp__swatches" role="radiogroup" aria-label="Baggrund">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={o.id === current.id}
            aria-label={o.label}
            className={['mcomp__swatch', o.id === current.id && 'mcomp__swatch--on'].filter(Boolean).join(' ')}
            style={o.id === 'billede' ? { backgroundImage: `url(${image})` } : { background: o.css }}
            onClick={() => setBg(o.id)}
          />
        ))}
      </div>

      <label className="mcomp__size">
        <span className="t-label">Størrelse</span>
        <input
          type="range"
          min={MIN * 100}
          max={MAX * 100}
          step={1}
          value={Math.round(scale * 100)}
          onChange={(e) => setScale(Number(e.target.value) / 100)}
          aria-valuetext={`${Math.round(scale * 100)} procent`}
        />
        <button type="button" className="t-caption-strong mcomp__reset" onClick={reset}>
          Nulstil
        </button>
      </label>
    </div>
  );
}
