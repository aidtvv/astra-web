import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useStore } from './store';
import Sidebar from './components/Sidebar';
import PlayerBar from './components/PlayerBar';
import KanbanPage from './pages/KanbanPage';
import FocusPage from './pages/FocusPage';
import StatsPage from './pages/StatsPage';

export default function App() {
  const status = useStore((s) => s.status);
  const tick = useStore((s) => s.tick);
  useEffect(() => {
    if (status !== 'running') return;
    const interval = setInterval(() => tick(), 1000);
    return () => clearInterval(interval);
  }, [status, tick]);

  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="ml-60 min-h-screen px-8 pb-32 pt-6">
        <Routes>
          <Route path="/" element={<KanbanPage />} />
          <Route path="/focus" element={<FocusPage />} />
          <Route path="/stats" element={<StatsPage />} />
        </Routes>
      </main>
      <PlayerBar />
    </div>
  );
}
