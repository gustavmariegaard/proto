import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { AppShell } from './layout/AppShell';
import { About } from './screens/auth/About';
import { Country } from './screens/auth/Country';
import { Eid } from './screens/auth/Eid';
import { HowItWorks } from './screens/auth/HowItWorks';
import { Legal } from './screens/auth/Legal';
import { LogIn } from './screens/auth/LogIn';
import { ProfileSetup } from './screens/auth/ProfileSetup';
import { Welcome } from './screens/auth/Welcome';
import { Welcomed } from './screens/auth/Welcomed';
import { Placeholder } from './screens/Placeholder';
import { Showcase } from './screens/Showcase';
import { Home } from './screens/home/Home';
import { MomentViewer } from './screens/home/MomentViewer';
import { PostDetail } from './screens/home/PostDetail';
import { MomentsProvider } from './state/moments';
import { SessionProvider, useSession } from './state/session';

/** Sender folk, der ikke er logget ind, til velkomstskærmen. */
function RequireLogin() {
  const { loggedIn } = useSession();
  return loggedIn ? <Outlet /> : <Navigate to="/velkommen" replace />;
}

/** Er man allerede logget ind, springer man velkomsten over. */
function GuestOnly() {
  const { loggedIn } = useSession();
  return loggedIn ? <Navigate to="/" replace /> : <Outlet />;
}

export default function App() {
  return (
    <SessionProvider>
      <MomentsProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Routes>
          {/* Trin 2: velkomst, log ind og oprettelse */}
          <Route element={<GuestOnly />}>
            <Route path="velkommen" element={<Welcome />} />
            <Route path="log-ind" element={<LogIn />} />
            <Route path="konto/land" element={<Country />} />
            <Route path="konto/eid" element={<Eid />} />
            <Route path="konto/profil" element={<ProfileSetup />} />
          </Route>
          <Route path="konto/velkommen" element={<Welcomed />} />
          <Route path="saadan-fungerer" element={<HowItWorks />} />
          <Route path="om/:slug" element={<About />} />
          <Route path="vilkaar" element={<Legal kind="vilkaar" />} />
          <Route path="privatliv" element={<Legal kind="privatliv" />} />

          {/* Selve appen med topbar og bundmenu */}
          <Route element={<RequireLogin />}>
            {/* Trin 3: fuldskærm uden bundmenu */}
            <Route path="moment/:personId" element={<MomentViewer />} />
            <Route path="opslag/:id" element={<PostDetail />} />
            <Route element={<AppShell />}>
              <Route index element={<Home />} />
              <Route path="komponenter" element={<Showcase />} />
              <Route path="flicks" element={<Placeholder title="Flicks" />} />
              <Route path="opret" element={<Placeholder title="Opret" />} />
              <Route path="opdag" element={<Placeholder title="Opdag" />} />
              <Route path="mere" element={<Placeholder title="Mere" showLogOut />} />
              <Route path="find-folk" element={<Placeholder title="Find folk" />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      </MomentsProvider>
    </SessionProvider>
  );
}
