import { supabase } from '@/lib/supabase';

const AUTH_KEY = 'admin_authenticated';
const AUTH_TIMESTAMP_KEY = 'admin_auth_ts';
const REMEMBER_KEY = 'admin_remember';
const CRED_KEY = 'admin_cred';
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

function setLocalAuthState(): void {
  localStorage.setItem(AUTH_KEY, 'true');
  localStorage.setItem(AUTH_TIMESTAMP_KEY, Date.now().toString());
}

// 凭据以 Base64 编码存储于 localStorage。
// 安全边界：这不是加密，仅防随手翻看。XSS 或物理访问可解码。
// 本方案用于纯前端 Jamstack 站点（无服务端 session），Supabase Auth 自身已做 session 持久化。

function encodeCred(username: string, password: string): string {
  return btoa(`${username}:${password}`);
}

function decodeCred(encoded: string): { username: string; password: string } | null {
  try {
    const decoded = atob(encoded);
    const colonIdx = decoded.indexOf(':');
    if (colonIdx <= 0) return null;
    return {
      username: decoded.substring(0, colonIdx),
      password: decoded.substring(colonIdx + 1),
    };
  } catch {
    return null;
  }
}

function saveCredentials(username: string, password: string): void {
  localStorage.setItem(REMEMBER_KEY, 'true');
  localStorage.setItem(CRED_KEY, encodeCred(username, password));
}

function getSavedCredentials(): { username: string; password: string } | null {
  if (localStorage.getItem(REMEMBER_KEY) !== 'true') return null;
  const encoded = localStorage.getItem(CRED_KEY);
  if (!encoded) return null;
  return decodeCred(encoded);
}

function clearSavedCredentials(): void {
  localStorage.removeItem(REMEMBER_KEY);
  localStorage.removeItem(CRED_KEY);
}

export function isRemembered(): boolean {
  return localStorage.getItem(REMEMBER_KEY) === 'true';
}

export async function loginAdmin(
  username: string,
  password: string,
  rememberMe = false,
): Promise<{ success: boolean; error?: string; isNetworkError?: boolean }> {
  try {
    if (!username?.trim() || !password?.trim()) {
      return { success: false, error: '用户名和密码不能为空' };
    }

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

    setLocalAuthState();

    if (rememberMe) {
      saveCredentials(username, password);
    }

    return { success: true };
  } catch (err) {
    console.error('[adminAuth] loginAdmin failed:', err);
    return { success: false, error: '服务不可用', isNetworkError: true };
  }
}

export async function tryAutoLogin(): Promise<boolean> {
  const cred = getSavedCredentials();
  if (!cred) return false;

  const result = await loginAdmin(cred.username, cred.password, true);
  if (!result.success) {
    if (!result.isNetworkError) {
      clearSavedCredentials();
    }
    return false;
  }
  return true;
}

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
  } catch (err) {
    console.error('[adminAuth] isAdminLoggedIn failed:', err);
    return false;
  }
}

export function isAdminLoggedInSync(): boolean {
  if (isSessionExpired()) {
    clearAuthState();
    return false;
  }
  return localStorage.getItem(AUTH_KEY) === 'true';
}

export async function logoutAdmin(forgetMe = false): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch {
    // ignore
  }
  clearAuthState();
  if (forgetMe) {
    clearSavedCredentials();
  }
}

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
  } catch (err) {
    console.error('[adminAuth] getCurrentAdmin failed:', err);
    return null;
  }
}
