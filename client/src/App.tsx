import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useStore } from './store';
import Sidebar from './components/Sidebar';
import PlayerBar from './components/PlayerBar';
import KanbanPage from './pages/KanbanPage';
import FocusPage from './pages/FocusPage';
import StatsPage from './pages/StatsPage';
import LoginPage from './pages/LoginPage';
import { KeepAliveSlot } from './components/KeepAlive';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: 1,
    },
  },
});

function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useStore((s) => s.isAuthenticated);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

function PublicOnly({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useStore((s) => s.isAuthenticated);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

const ROUTE_KEYS = {
  kanban: '/',
  focus: '/focus',
  stats: '/stats',
} as const;

export default function App() {
  const status = useStore((s) => s.status);
  const tick = useStore((s) => s.tick);
  const initializeAuth = useStore((s) => s.initializeAuth);
  const location = useLocation();

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  useEffect(() => {
    if (status !== 'running') return;
    const interval = setInterval(() => tick(), 1000);
    return () => clearInterval(interval);
  }, [status, tick]);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-[color:var(--bg-primary)] text-[color:var(--text-primary)]">
        <Routes>
          <Route
            path="/login"
            element={
              <PublicOnly>
                <LoginPage />
              </PublicOnly>
            }
          />
          <Route
            path="*"
            element={
              <RequireAuth>
                <div className="flex min-h-screen">
                  <Sidebar />
                  <main className="ml-[16rem] flex-1 px-8 pb-32 pt-6">
                    <KeepAliveSlot routeKey={ROUTE_KEYS.kanban} activeKey={location.pathname}>
                      <KanbanPage />
                    </KeepAliveSlot>
                    <KeepAliveSlot routeKey={ROUTE_KEYS.focus} activeKey={location.pathname}>
                      <FocusPage />
                    </KeepAliveSlot>
                    <KeepAliveSlot routeKey={ROUTE_KEYS.stats} activeKey={location.pathname}>
                      <StatsPage />
                    </KeepAliveSlot>
                  </main>
                  <PlayerBar />
                </div>
              </RequireAuth>
            }
          />
        </Routes>
      </div>
    </QueryClientProvider>
  );
}
