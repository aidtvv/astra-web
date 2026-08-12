import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutGrid, Clock, BarChart3, LogOut } from 'lucide-react';
import { useStore } from '../store';
import SyncStatusButton from './SyncStatusButton';

const NAV_ITEMS = [
  {
    to: '/',
    label: '看板',
    icon: LayoutGrid,
  },
  {
    to: '/focus',
    label: '专注',
    icon: Clock,
  },
  {
    to: '/stats',
    label: '统计',
    icon: BarChart3,
  },
];

export default function Sidebar() {
  const user = useStore((s) => s.user);
  const logout = useStore((s) => s.logout);
  const navigate = useNavigate();

  const initial = user?.nickname?.[0]?.toUpperCase() ?? 'U';
  const displayName = user?.nickname ?? '未登录';

  return (
    <aside className="fixed left-4 top-4 bottom-4 z-50 flex w-60 flex-col overflow-hidden rounded-3xl bg-[#F5F5F7] shadow-lg shadow-black/5">
      <div className="flex flex-1 flex-col p-4">
        {/* Brand Section */}
        <div className="flex items-center gap-2.5 px-2 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900 text-sm font-bold text-white">
            A
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-neutral-900">Astra</span>
        </div>

        {/* Navigation Section */}
        <nav className="mt-4 flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-full px-3.5 py-2.5 text-[14px] transition-all duration-200 ${
                  isActive
                    ? 'bg-neutral-200/80 font-semibold text-primary'
                    : 'font-medium text-neutral-700 hover:bg-neutral-200/60 hover:text-neutral-900'
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

        {/* Bottom Section */}
        <div className="mt-4 flex flex-col gap-2">
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
                className="flex w-full items-center gap-3 rounded-full px-3.5 py-2.5 text-[13px] font-medium text-neutral-600 transition-colors hover:bg-neutral-200/60 hover:text-neutral-900"
              >
                <LogOut size={16} strokeWidth={1.75} />
                <span>退出登录</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-full px-2.5 py-2.5 transition-colors hover:bg-neutral-200/60">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-500 text-sm font-semibold text-white shadow-sm">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-semibold text-neutral-900">{displayName}</div>
              <div className="truncate text-[11px] text-neutral-500">
                {user ? (user.email || user.phone) : '点击登录'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
