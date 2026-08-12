import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutGrid, Clock, BarChart3, LogOut } from 'lucide-react';
import { useStore } from '../store';
import SyncStatusButton from './SyncStatusButton';
import { ThemeSwitcher } from './ThemeSwitcher';

const NAV_ITEMS = [
  { to: '/', label: '看板', icon: LayoutGrid },
  { to: '/focus', label: '专注', icon: Clock },
  { to: '/stats', label: '统计', icon: BarChart3 },
];

export default function Sidebar() {
  const user = useStore((s) => s.user);
  const logout = useStore((s) => s.logout);
  const navigate = useNavigate();

  const initial = user?.nickname?.[0]?.toUpperCase() ?? 'U';
  const displayName = user?.nickname ?? '未登录';

  return (
    <aside className="fixed left-4 top-4 bottom-4 z-50 flex w-60 flex-col overflow-hidden rounded-3xl border border-[color:var(--border-color)] bg-[color:var(--bg-secondary)] shadow-lg">
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center justify-between px-2 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[color:var(--text-primary)] text-sm font-bold text-[color:var(--bg-primary)]">
              A
            </div>
            <span className="text-[15px] font-semibold tracking-tight text-[color:var(--text-primary)]">Astra</span>
          </div>
        </div>

        <nav className="mt-4 flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-full px-3.5 py-2.5 text-[14px] transition-all duration-200 ${
                  isActive
                    ? 'bg-[color:var(--accent-muted)] font-semibold text-[color:var(--accent-color)]'
                    : 'font-medium text-[color:var(--text-secondary)] hover:bg-[color:var(--hover-bg)] hover:text-[color:var(--text-primary)]'
                }`
              }
            >
              <span className="flex h-5 w-5 items-center justify-center">
                <item.icon size={18} strokeWidth={1.75} />
              </span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-2">
          <div className="flex justify-center">
            <ThemeSwitcher />
          </div>

          <div className="flex items-center gap-2">
            <SyncStatusButton />
            <div className="min-w-0 flex-1">
              <button
                onClick={() => {
                  if (confirm('确定要退出登录吗？')) {
                    logout();
                    navigate('/login');
                  }
                }}
                className="flex w-full items-center gap-3 rounded-full px-3.5 py-2.5 text-[13px] font-medium text-[color:var(--text-secondary)] transition-colors hover:bg-[color:var(--hover-bg)] hover:text-[color:var(--text-primary)]"
              >
                <LogOut size={16} strokeWidth={1.75} />
                <span>退出登录</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-full px-2.5 py-2.5 transition-colors hover:bg-[color:var(--hover-bg)]">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[color:var(--accent-color)] text-sm font-semibold text-white shadow-sm">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-semibold text-[color:var(--text-primary)]">{displayName}</div>
              <div className="truncate text-[11px] text-[color:var(--text-muted)]">
                {user ? (user.email || user.phone) : '点击登录'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
