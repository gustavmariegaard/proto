import { BrowserRouter, Navigate, Outlet, Route, Routes, useNavigate } from 'react-router-dom';
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
import { Showcase } from './screens/Showcase';
import { Home } from './screens/home/Home';
import { MomentViewer } from './screens/home/MomentViewer';
import { PostDetail } from './screens/home/PostDetail';
import { MomentsProvider } from './state/moments';
import { Create } from './screens/create/Create';
import { Share } from './screens/share/Share';
import { Report } from './screens/share/Report';
import { Messages } from './screens/messages/Messages';
import { Conversation } from './screens/messages/Conversation';
import { NewMessage } from './screens/messages/NewMessage';
import { NewCircle } from './screens/messages/NewCircle';
import { Flicks } from './screens/flicks/Flicks';
import { NewFlick } from './screens/flicks/NewFlick';
import { SessionProvider, useSession } from './state/session';
import { useThemeColor } from './state/useThemeColor';
import { Discover } from './screens/discover/Discover';
import { Market } from './screens/market/Market';
import { Events } from './screens/events/Events';
import { EventDetail } from './screens/events/EventDetail';
import { NewEvent } from './screens/events/NewEvent';
import { Search } from './screens/account/Search';
import { Notifications } from './screens/account/Notifications';
import { Saved } from './screens/account/Saved';
import { Creator } from './screens/account/Creator';
import { Settings } from './screens/account/Settings';
import { MoreSheet } from './screens/more/MoreSheet';
import { FindFolk } from './screens/more/FindFolk';
import { Groups, GroupActivity } from './screens/more/Groups';
import { Pages } from './screens/more/Pages';
import { NewGroup, NewPage } from './screens/more/Create';
import { Profile } from './screens/profile/Profile';
import { PhotoView } from './screens/profile/PhotoView';
import { Collection } from './screens/profile/Collection';
import { CollectionViewer } from './screens/profile/CollectionViewer';
import { CollectionEdit } from './screens/profile/CollectionEdit';
import { Interests } from './screens/profile/Interests';

/** Mørk statuslinje og baggrund på de mørke skærme */
function ThemeColor() {
  useThemeColor();
  return null;
}

/** Mere-fanen: Hjem bagved med Mere-arket ovenpå. */
function MoreRoute() {
  const navigate = useNavigate();
  return (
    <>
      <Home />
      <MoreSheet open onClose={() => navigate('/')} />
    </>
  );
}

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
        <ThemeColor />
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
            {/* Trin 4: Opret, Del, Rapportér og Beskeder */}
            <Route path="opret" element={<Create />} />
            <Route path="opslag/:id/del" element={<Share />} />
            <Route path="opslag/:id/rapporter" element={<Report />} />
            <Route path="flicks" element={<Flicks />} />
            <Route path="flicks/ny" element={<NewFlick />} />
            <Route path="beskeder" element={<Messages />} />
            <Route path="beskeder/ny" element={<NewMessage />} />
            <Route path="beskeder/ny-cirkel" element={<NewCircle />} />
            <Route path="beskeder/:id" element={<Conversation />} />
            {/* Trin 5: Mere, begivenheder, søg og konto */}
            <Route path="begivenheder/ny" element={<NewEvent />} />
            <Route path="begivenheder/:id" element={<EventDetail />} />
            <Route path="soeg" element={<Search />} />
            <Route path="notifikationer" element={<Notifications />} />
            <Route path="gemt" element={<Saved />} />
            <Route path="skaber" element={<Creator />} />
            <Route path="indstillinger" element={<Settings />} />
            <Route path="find-folk" element={<FindFolk />} />
            <Route path="grupper" element={<Groups />} />
            <Route path="grupper/aktivitet" element={<GroupActivity />} />
            <Route path="grupper/ny" element={<NewGroup />} />
            <Route path="sider" element={<Pages />} />
            <Route path="sider/ny" element={<NewPage />} />
            <Route path="profil/billede/:id" element={<PhotoView />} />
            <Route path="profil/samling/:id" element={<Collection />} />
            <Route path="profil/samling/:id/vis" element={<CollectionViewer />} />
            <Route path="profil/samling/:id/rediger" element={<CollectionEdit />} />
            <Route path="profil/interesser" element={<Interests />} />
            <Route element={<AppShell />}>
              <Route index element={<Home />} />
              <Route path="komponenter" element={<Showcase />} />
              <Route path="opdag" element={<Discover />} />
              <Route path="torvet" element={<Market />} />
              <Route path="begivenheder" element={<Events />} />
              <Route path="mere" element={<MoreRoute />} />
              <Route path="profil" element={<Profile />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      </MomentsProvider>
    </SessionProvider>
  );
}
