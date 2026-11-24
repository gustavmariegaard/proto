import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Icon, type IconName } from './Icon';
import './TabBar.css';

const tabs: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: 'Hjem', icon: 'home' },
  { to: '/opdag', label: 'Offentlig debat', icon: 'compass' },
  { to: '/opret', label: 'Opret', icon: 'plus' },
  { to: '/flicks', label: 'Flicks', icon: 'clip' },
  { to: '/mere', label: 'Mere', icon: 'more' },
];

/**
 * Flydende bundmenu: en afrundet bar med skygge, der svæver over indholdet.
 * Kun ikoner; navnet læses op af skærmlæsere.
 */
export function TabBar() {
  const hidden = useHideOnScroll();
  return (
    <nav className={['tabbar', hidden && 'tabbar--hidden'].filter(Boolean).join(' ')} aria-label="Hovedmenu">
      <ul className="tabbar__pill">
        {tabs.map((tab) => (
          <li key={tab.to}>
            <NavLink
              to={tab.to}
              end={tab.to === '/'}
              // Faner lægges ikke i historikken, så et swipe tilbage/frem ikke skifter fane (fx åbner Mere)
              replace
              className="tabbar__tab"
              aria-label={tab.label}
            >
              <span className="tabbar__holder">
                <Icon name={tab.icon} />
              </span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * Som på Facebook: menuen glider væk, når man ruller ned, og kommer igen, når man ruller op.
 * Lytter på alle rullende flader i appen (scroll bobler ikke, så vi lytter i capture-fasen).
 */
function useHideOnScroll() {
  const [hidden, setHidden] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => setHidden(false), [pathname]);
  useEffect(() => {
    const last = new WeakMap<EventTarget, number>();
    const onScroll = (e: Event) => {
      const el = e.target;
      if (!(el instanceof HTMLElement)) return;
      // Kun lodret rulning af hele sider (ikke vandrette rækker)
      if (el.scrollHeight - el.clientHeight < 40) return;
      const top = el.scrollTop;
      const prev = last.get(el) ?? 0;
      const delta = top - prev;
      if (Math.abs(delta) < 6) return;
      last.set(el, top);
      setHidden(delta > 0 && top > 80);
    };
    document.addEventListener('scroll', onScroll, { capture: true, passive: true });
    return () => document.removeEventListener('scroll', onScroll, { capture: true });
  }, []);
  return hidden;
}
