import { useEffect, useRef, useState, type RefObject } from 'react';
import { useNavigate } from 'react-router-dom';

/** Går ét skridt tilbage, eller til `fallback`, hvis siden er åbnet direkte. */
export function useGoBack(fallback: string) {
  const navigate = useNavigate();
  return () => {
    if (window.history.state && window.history.state.idx > 0) navigate(-1);
    else navigate(fallback, { replace: true });
  };
}

/**
 * Holder skærmen på højde med det synlige område, så skrivefeltet
 * ligger lige over tastaturet på telefonen. Sætter data-keyboard,
 * når tastaturet er fremme.
 */
export function useKeyboardViewport(ref: RefObject<HTMLElement | null>, onResize?: () => void) {
  const cb = useRef(onResize);
  useEffect(() => {
    cb.current = onResize;
  });

  useEffect(() => {
    const vv = window.visualViewport;
    const el = ref.current;
    if (!vv || !el) return;
    const update = () => {
      const open = window.innerHeight - vv.height > 120;
      el.style.height = open ? `${vv.height}px` : '';
      el.style.transform = open && vv.offsetTop ? `translateY(${vv.offsetTop}px)` : '';
      el.toggleAttribute('data-keyboard', open);
      cb.current?.();
    };
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, [ref]);
}

/** Lille hjælper til en liste af valgte id'er. */
export function useSelection(initial: string[] = []) {
  const [ids, setIds] = useState<string[]>(initial);
  const toggle = (id: string) => setIds((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));
  return [ids, toggle] as const;
}

export function matches(name: string, query: string) {
  return name.toLocaleLowerCase('da').includes(query.trim().toLocaleLowerCase('da'));
}
