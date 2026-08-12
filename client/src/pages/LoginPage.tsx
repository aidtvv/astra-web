import { useState } from 'react';
import { useStore } from '../store';

export default function LoginPage() {
  const login = useStore((s) => s.login);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      setError('请输入账号和密码');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(identifier.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[color:var(--bg-primary)]">
      <div className="w-full max-w-md px-6">
        <div className="rounded-3xl bg-[color:var(--surface-color)] border border-[color:var(--border-color)] p-10 shadow-xl">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[color:var(--accent-color)] text-2xl font-bold text-white">
              A
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[color:var(--text-primary)]">欢迎回到 Astra</h1>
            <p className="mt-2 text-sm text-[color:var(--text-muted)]">使用你的账号登录以继续</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[color:var(--text-secondary)]">账号</label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="手机号 / 邮箱 / 用户ID"
                className="w-full rounded-xl border border-[color:var(--border-color)] bg-[color:var(--surface-elevated)] px-4 py-3 text-sm text-[color:var(--text-primary)] outline-none transition placeholder:text-[color:var(--text-muted)] focus:border-[color:var(--accent-color)] focus:bg-[color:var(--surface-color)] focus:ring-2 focus:ring-[color:var(--accent-color)]/20"
                autoComplete="username"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[color:var(--text-secondary)]">密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                className="w-full rounded-xl border border-[color:var(--border-color)] bg-[color:var(--surface-elevated)] px-4 py-3 text-sm text-[color:var(--text-primary)] outline-none transition placeholder:text-[color:var(--text-muted)] focus:border-[color:var(--accent-color)] focus:bg-[color:var(--surface-color)] focus:ring-2 focus:ring-[color:var(--accent-color)]/20"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="rounded-xl bg-[color:var(--tag-red)]/10 px-4 py-3 text-sm text-[color:var(--tag-red)]">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[color:var(--accent-color)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--accent-hover)] active:scale-[0.98] disabled:opacity-60"
            >
              {loading ? '登录中...' : '登录'}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-[color:var(--text-muted)]">
            账号可以是手机号、邮箱或用户ID
          </div>
        </div>
      </div>
    </div>
  );
}
