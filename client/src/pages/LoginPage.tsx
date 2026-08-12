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
    <div className="flex min-h-screen items-center justify-center bg-appbg">
      <div className="w-full max-w-md px-6">
        <div className="rounded-3xl bg-white p-10 shadow-xl shadow-black/5">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-2xl font-bold text-white">
              A
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900">欢迎回到 Astra</h1>
            <p className="mt-2 text-sm text-neutral-500">使用你的账号登录以继续</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700">账号</label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="手机号 / 邮箱 / 用户ID"
                className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
                autoComplete="username"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700">密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover active:scale-[0.98] disabled:opacity-60"
            >
              {loading ? '登录中...' : '登录'}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-neutral-400">
            账号可以是手机号、邮箱或用户ID
          </div>
        </div>
      </div>
    </div>
  );
}