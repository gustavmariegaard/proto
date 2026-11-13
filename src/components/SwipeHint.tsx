import { useEffect, useState, type RefObject } from 'react';
import './SwipeHint.css';

/**
 * Viser, at en vandret række kan swipes: en tynd bjælke under rækken,
 * der viser, hvor man er, og hvor meget der er mere. Skjules, hvis alt kan ses.
 */
export function SwipeHint({ target }: { target: RefObject<HTMLElement | null> }) {
  const [state, setState] = useState({ show: false, size: 1, pos: 0 });

  useEffect(() => {
    const el = target.current;
    if (!el) return;
    const update = () => {
      const max = el.scrollWidth - el.clientWidth;
      const size = el.scrollWidth ? el.clientWidth / el.scrollWidth : 1;
      setState({ show: max > 4, size, pos: max > 0 ? el.scrollLeft / max : 0 });
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    Array.from(el.children).forEach((c) => ro.observe(c));
    return () => {
      el.removeEventListener('scroll', update);
      ro.disconnect();
    };
  }, [target]);

  if (!state.show) return null;
  const width = Math.max(state.size * 100, 12);
  return (
    <div className="swipe-hint" aria-hidden="true">
      <span className="swipe-hint__thumb" style={{ width: `${width}%`, left: `${state.pos * (100 - width)}%` }} />
    </div>
  );
}
