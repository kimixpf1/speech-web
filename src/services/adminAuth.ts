// 管理员认证服务 - 使用 Supabase Auth
import { supabase } from '@/lib/supabase';

const AUTH_KEY = 'admin_authenticated';

// 管理员用户ID白名单（只有这些用户可以登录管理后台）
const ADMIN_USER_IDS = [
  'bed2d6c8-f2ee-44fe-93c5-794e74e199ee',  // xpf
  'fc722159-5a27-4127-875c-6bad30f656e2',  // 备用管理员
];

export interface AdminUser {
  id: string;
  email: string;
  username: string;
  isAuthenticated: boolean;
}

/**
 * 管理员登录 - 使用 Supabase Auth
 */
export async function loginAdmin(username: string, password: string): Promise<{ success: boolean; error?: string }> {
  try {
    // 用户名转换为邮箱格式
    const email = `${username}@office.local`;
    console.log('尝试登录:', email);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('登录失败:', error.message);
      return { success: false, error: error.message };
    }

    if (!data.user) {
      return { success: false, error: '用户数据为空' };
    }

    console.log('登录成功, 用户ID:', data.user.id);

    // 检查是否在管理员白名单中
    if (!ADMIN_USER_IDS.includes(data.user.id)) {
      console.error('非管理员用户, ID:', data.user.id);
      await supabase.auth.signOut();
      return { success: false, error: '非管理员账户' };
    }

    localStorage.setItem(AUTH_KEY, 'true');
    return { success: true };
  } catch (error) {
    console.error('登录异常:', error);
    return { success: false, error: '登录异常' };
  }
}

/**
 * 检查是否已登录
 */
export async function isAdminLoggedIn(): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return false;
    }

    // 检查是否在管理员白名单中
    if (!ADMIN_USER_IDS.includes(session.user.id)) {
      return false;
    }

    return localStorage.getItem(AUTH_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * 同步检查登录状态（用于组件渲染）
 */
export function isAdminLoggedInSync(): boolean {
  return localStorage.getItem(AUTH_KEY) === 'true';
}

/**
 * 管理员登出
 */
export async function logoutAdmin(): Promise<void> {
  await supabase.auth.signOut();
  localStorage.removeItem(AUTH_KEY);
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
