import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useStore } from './store';
import Sidebar from './components/Sidebar';
import PlayerBar from './components/PlayerBar';
import KanbanPage from './pages/KanbanPage';
import FocusPage from './pages/FocusPage';
import StatsPage from './pages/StatsPage';
import LoginPage from './pages/LoginPage';

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

export default function App() {
  const status = useStore((s) => s.status);
  const tick = useStore((s) => s.tick);
  const initializeAuth = useStore((s) => s.initializeAuth);
  const loadAll = useStore((s) => s.loadAll);
  const loadFocusStats = useStore((s) => s.loadFocusStats);
  const isAuthenticated = useStore((s) => s.isAuthenticated);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  useEffect(() => {
    if (isAuthenticated) {
      loadAll();
      loadFocusStats();
    }
  }, [isAuthenticated, loadAll, loadFocusStats]);

  useEffect(() => {
    if (status !== 'running') return;
    const interval = setInterval(() => tick(), 1000);
    return () => clearInterval(interval);
  }, [status, tick]);

  return (
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
                <main className="ml-[18rem] flex-1 px-8 pb-32 pt-6">
                  <Routes>
                    <Route path="/" element={<KanbanPage />} />
                    <Route path="/focus" element={<FocusPage />} />
                    <Route path="/stats" element={<StatsPage />} />
                  </Routes>
                </main>
                <PlayerBar />
              </div>
            </RequireAuth>
          }
        />
      </Routes>
    </div>
  );
}