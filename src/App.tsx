import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppShell } from './layout/AppShell';
import { Placeholder } from './screens/Placeholder';
import { Showcase } from './screens/Showcase';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Showcase />} />
          <Route path="flicks" element={<Placeholder title="Flicks" />} />
          <Route path="opret" element={<Placeholder title="Opret" />} />
          <Route path="opdag" element={<Placeholder title="Opdag" />} />
          <Route path="mere" element={<Placeholder title="Mere" />} />
          <Route path="*" element={<Showcase />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
