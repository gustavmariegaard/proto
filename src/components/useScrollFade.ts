import { useEffect, type RefObject } from 'react';

/**
 * Sætter data-fade="left" | "right" | "both" på en vandret række,
 * så CSS kan tone kanten ud, hvor der er mere at swipe til.
 */
export function useScrollFade(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const max = el.scrollWidth - el.clientWidth;
      const left = el.scrollLeft > 4;
      const right = el.scrollLeft < max - 4;
      const fade = left && right ? 'both' : left ? 'left' : right ? 'right' : '';
      if (fade) el.dataset.fade = fade;
      else delete el.dataset.fade;
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    const mo = new MutationObserver(update);
    mo.observe(el, { childList: true });
    return () => {
      el.removeEventListener('scroll', update);
      ro.disconnect();
      mo.disconnect();
    };
  }, [ref]);
}
