import type { LoginResponse } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE || '';
const TOKEN_KEY = 'astra-token';
const USER_KEY = 'astra-user';

export interface AuthenticatedUser {
  id: number;
  email: string;
  phone: string;
  nickname: string;
  avatarUrl: string;
  school: string;
  vipType: number;
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function getStoredUser(): AuthenticatedUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: AuthenticatedUser): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearStoredUser(): void {
  localStorage.removeItem(USER_KEY);
}

function buildHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json;charset=utf-8',
    Platform: 'web',
  };
  if (token) {
    headers['X-Token'] = token;
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function login(identifier: string, password: string): Promise<LoginResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(`${API_BASE}/api/v3/accounts/password-login`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({ email: identifier, password }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text();
      let message = '登录失败，请检查账号或密码';
      try {
        const data = JSON.parse(text);
        if (data?.message) message = data.message;
        else if (data?.error) message = data.error;
      } catch {}
      throw new Error(message);
    }

    const data: LoginResponse = await res.json();
    setToken(data.token);
    const user: AuthenticatedUser = {
      id: data.user.id,
      email: data.user.email,
      phone: data.user.phone,
      nickname: data.user.nickname,
      avatarUrl: data.user.avatarUrl,
      school: data.user.school,
      vipType: data.user.vipType,
    };
    setStoredUser(user);
    return data;
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('登录请求超时，请检查网络连接');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function logout(): void {
  clearToken();
  clearStoredUser();
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

export function getAuthHeaders(): Record<string, string> {
  const token = getToken();
  return buildHeaders(token ?? undefined);
}