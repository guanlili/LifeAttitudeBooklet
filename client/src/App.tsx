import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import TabBar from './components/TabBar';
import PageAtmosphere from './components/decor/PageAtmosphere';
import { ApiError } from './api/client';
import { setStoredUser, useSession, useToasts } from './store/session';
import Login from './pages/Login';
import Home from './pages/Home';
import Guide from './pages/Guide';
import Booklet from './pages/Booklet';
import BookletEntry from './pages/BookletEntry';
import Discover from './pages/Discover';
import MatchProfile from './pages/MatchProfile';
import Chat from './pages/Chat';
import Messages from './pages/Messages';
import Reconnect from './pages/Reconnect';
import Shake from './pages/Shake';
import Publish from './pages/Publish';
import Prechat from './pages/Prechat';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname]);
  return null;
}

function AuthErrorCatcher() {
  const navigate = useNavigate();
  useEffect(() => {
    const handler = (event: CustomEvent<ApiError>) => {
      if (event.detail && event.detail.status === 401) {
        setStoredUser(null);
        navigate('/login', { replace: true });
      }
    };
    window.addEventListener('apierror', handler as EventListener);
    return () => window.removeEventListener('apierror', handler as EventListener);
  }, [navigate]);
  return null;
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const location = useLocation();
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}

/** 带底部 TabBar 的布局（首页/发现/消息/册子） */
function TabLayout() {
  return (
    <div className="mx-auto min-h-dvh max-w-md" style={{ paddingBottom: '62px' }}>
      <Outlet />
      <TabBar />
    </div>
  );
}

/** 无 TabBar 的沉浸式布局 */
function PlainLayout() {
  return (
    <div className="mx-auto min-h-dvh max-w-md">
      <Outlet />
    </div>
  );
}

function ToastHost() {
  const toasts = useToasts();
  if (toasts.length === 0) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="animate-rise-in rounded-btn bg-ink/90 px-4 py-2.5 text-sm text-cream shadow-card"
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}

export default function App() {
  return (
    <>
      <PageAtmosphere />
      <ScrollToTop />
      <AuthErrorCatcher />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          element={
            <RequireAuth>
              <TabLayout />
            </RequireAuth>
          }
        >
          <Route path="/" element={<Home />} />
          <Route path="/discover" element={<Discover />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/booklet" element={<Booklet />} />
        </Route>
        <Route
          element={
            <RequireAuth>
              <PlainLayout />
            </RequireAuth>
          }
        >
          <Route path="/guide" element={<Guide />} />
          <Route path="/shake" element={<Shake />} />
          <Route path="/publish" element={<Publish />} />
          <Route path="/prechat/:userId" element={<Prechat />} />
          <Route path="/booklet/:id" element={<BookletEntry />} />
          <Route path="/profile/:userId" element={<MatchProfile />} />
          <Route path="/chat/:matchId" element={<Chat />} />
          <Route path="/reconnect" element={<Reconnect />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastHost />
    </>
  );
}
