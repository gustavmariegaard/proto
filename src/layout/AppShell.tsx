import { Outlet } from 'react-router-dom';
import { TabBar } from '../components/TabBar';
import { TopBar } from '../components/TopBar';
import './AppShell.css';

/**
 * Rammen om alle faner: fast topbar, rullende indhold og
 * den flydende bundmenu ovenpå. Kun indholdet ruller.
 */
export function AppShell() {
  return (
    <div className="shell">
      <TopBar />
      <main className="shell__content" id="indhold">
        <Outlet />
      </main>
      <TabBar />
    </div>
  );
}
