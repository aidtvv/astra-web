import { NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/', label: '看板', icon: '🗂️' },
  { to: '/focus', label: '专注', icon: '⏱️' },
  { to: '/stats', label: '统计', icon: '📊' },
];

export default function Sidebar() {
  const today = new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' });

  return (
    <aside className="fixed left-0 top-0 flex h-screen w-60 flex-col bg-sidebar p-4 text-white">
      <div className="flex items-center gap-2 px-2 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-lg font-bold text-white">A</div>
        <span className="text-xl font-bold tracking-tight">Astra</span>
      </div>

      <nav className="mt-4 flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition active:scale-95 ${
                isActive ? 'bg-white/10 font-semibold text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'
              }`
            }
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="rounded-2xl bg-white/5 p-4 text-sm text-white/70">
        <p className="font-semibold text-white/90">你好，欢迎回来 👋</p>
        <p className="mt-1 text-xs text-white/50">{today}</p>
      </div>
    </aside>
  );
}
