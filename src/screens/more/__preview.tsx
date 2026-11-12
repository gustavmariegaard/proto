import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import '../../styles/global.css';
import '../../styles/preview.css';
import { SessionProvider } from '../../state/session';
import { AppShell } from '../../layout/AppShell';
import { Routes, Route } from 'react-router-dom';
import { MoreSheet } from './MoreSheet';
import { FindFolk } from './FindFolk';
import { Groups, GroupActivity } from './Groups';
import { Pages } from './Pages';
import { NewGroup } from './Create';
const r = new URLSearchParams(location.search).get('r') ?? '/mere';
createRoot(document.getElementById('root')!).render(
  <SessionProvider><MemoryRouter initialEntries={[r]}><Routes>
    <Route element={<AppShell />}><Route path="mere" element={<><div style={{padding:20}}>Hjem</div><MoreSheet open onClose={() => {}} /></>} /></Route>
    <Route path="find-folk" element={<FindFolk />} />
    <Route path="grupper" element={<Groups />} />
    <Route path="grupper/aktivitet" element={<GroupActivity />} />
    <Route path="grupper/ny" element={<NewGroup />} />
    <Route path="sider" element={<Pages />} />
  </Routes></MemoryRouter></SessionProvider>);
