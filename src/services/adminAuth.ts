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

// === 临时本地验证（Supabase Auth 不可用时的应急方案，2026-05-20 后恢复） ===
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// 已知管理员密码的 SHA-256 哈希（防明文存储）
const LOCAL_AUTH_HASHES: Record<string, string> = {
  admin: '818d5814c42c89e0e7c330f72935464ee0e5621cad01768cc7e617683c9482d6',
};

async function verifyLocalCredential(username: string, password: string): Promise<boolean> {
  const expectedHash = LOCAL_AUTH_HASHES[username];
  if (!expectedHash) return false;
  try {
    const inputHash = await sha256(password);
    return inputHash === expectedHash;
  } catch {
    return false;
  }
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

/**
 * 管理员登录 - 使用 Supabase Auth；不可用时回退本地验证（应急方案，2026-05-20后恢复）
 */
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
      // 临时本地验证（Supabase Auth 不可用时的应急方案，2026-05-20后恢复）
      console.warn('[adminAuth] Supabase Auth 错误，尝试本地验证:', error.message);
      const ok = await verifyLocalCredential(username, password);
      if (ok) {
        setLocalAuthState();
        if (rememberMe) {
          saveCredentials(username, password);
        }
        return { success: true };
      }
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
    // 临时本地验证（Supabase 不可用时的应急方案，2026-05-20后恢复）
    const ok = await verifyLocalCredential(username, password);
    if (ok) {
      setLocalAuthState();
      if (rememberMe) {
        saveCredentials(username, password);
      }
      return { success: true };
    }
    return { success: false, error: '服务不可用，且凭据验证失败', isNetworkError: true };
  }
}

/**
 * 尝试用记住的凭据自动登录
 * 成功返回 true，失败清除凭据返回 false
 */
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

/**
 * 检查是否已登录
 * Supabase 不可用时回退到本地 localStorage 检查（应急方案，2026-05-20后恢复）
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
  } catch (err) {
    console.error('[adminAuth] isAdminLoggedIn failed, 回退本地验证:', err);
    // Supabase 不可用时回退本地 localStorage 检查
    return isAdminLoggedInSync();
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
 * @param forgetMe 是否同时清除记住的凭据
 */
export async function logoutAdmin(forgetMe = false): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch {
    // Supabase 不可用时忽略
  }
  clearAuthState();
  if (forgetMe) {
    clearSavedCredentials();
  }
}

/**
 * 获取当前管理员信息
 * Supabase 不可用时从 localStorage 构造（应急方案，2026-05-20后恢复）
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
  } catch (err) {
    console.error('[adminAuth] getCurrentAdmin failed, 回退本地:', err);
    // Supabase 不可用时从 localStorage 构造
    if (isAdminLoggedInSync()) {
      return {
        id: 'local-bypass',
        email: 'admin@office.local',
        username: 'admin',
        isAuthenticated: true,
      };
    }
    return null;
  }
}
