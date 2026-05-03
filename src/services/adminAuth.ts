import { supabase } from '@/lib/supabase';

const AUTH_KEY = 'admin_authenticated';
const AUTH_TIMESTAMP_KEY = 'admin_auth_ts';
const SESSION_MAX_AGE = 24 * 60 * 60 * 1000;

const ADMIN_USER_IDS = [
  'bed2d6c8-f2ee-44fe-93c5-794e74e199ee',
  'fc722159-5a27-4127-875c-6bad30f656e2',
];

export interface AdminUser {
  id: string;
  email: string;
  username: string;
  isAuthenticated: boolean;
}

function isSessionExpired(): boolean {
  const ts = localStorage.getItem(AUTH_TIMESTAMP_KEY);
  if (!ts) return true;
  return Date.now() - parseInt(ts, 10) > SESSION_MAX_AGE;
}

function clearAuthState(): void {
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(AUTH_TIMESTAMP_KEY);
}

/**
 * 管理员登录 - 使用 Supabase Auth
 */
export async function loginAdmin(username: string, password: string): Promise<{ success: boolean; error?: string }> {
  try {
    const email = `${username}@office.local`;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data.user) {
      return { success: false, error: '用户数据为空' };
    }

    if (!ADMIN_USER_IDS.includes(data.user.id)) {
      await supabase.auth.signOut();
      return { success: false, error: '非管理员账户' };
    }

    localStorage.setItem(AUTH_KEY, 'true');
    localStorage.setItem(AUTH_TIMESTAMP_KEY, Date.now().toString());
    return { success: true };
  } catch (error) {
    return { success: false, error: '登录异常' };
  }
}

/**
 * 检查是否已登录
 */
export async function isAdminLoggedIn(): Promise<boolean> {
  try {
    if (isSessionExpired()) {
      clearAuthState();
      return false;
    }

    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return false;
    }

    if (!ADMIN_USER_IDS.includes(session.user.id)) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * 同步检查登录状态（用于组件渲染）
 */
export function isAdminLoggedInSync(): boolean {
  if (isSessionExpired()) {
    clearAuthState();
    return false;
  }
  return localStorage.getItem(AUTH_KEY) === 'true';
}

/**
 * 管理员登出
 */
export async function logoutAdmin(): Promise<void> {
  await supabase.auth.signOut();
  clearAuthState();
}

/**
 * 获取当前管理员信息
 */
export async function getCurrentAdmin(): Promise<AdminUser | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session || !ADMIN_USER_IDS.includes(session.user.id)) {
      return null;
    }

    return {
      id: session.user.id,
      email: session.user.email || '',
      username: session.user.user_metadata?.username || session.user.email?.split('@')[0] || '',
      isAuthenticated: true,
    };
  } catch {
    return null;
  }
}
