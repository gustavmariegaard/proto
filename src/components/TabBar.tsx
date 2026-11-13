import { NavLink } from 'react-router-dom';
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
  return (
    <nav className="tabbar" aria-label="Hovedmenu">
      <ul className="tabbar__pill">
        {tabs.map((tab) => (
          <li key={tab.to}>
            <NavLink to={tab.to} end={tab.to === '/'} className="tabbar__tab" aria-label={tab.label}>
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
