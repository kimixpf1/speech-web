/**
 * GitHub Actions 工作流触发服务
 * 用于从前端触发后台搜索工作流
 */

import { supabase } from '@/lib/supabase';

const GITHUB_REPO = 'kimixpf1/speech-web';
const WORKFLOW_FILE = 'ai-auto-search.yml';

const GITHUB_TOKEN_KEY = 'github_workflow_token';

function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

export interface WorkflowTriggerResult {
  success: boolean;
  message: string;
  runId?: number;
}

/**
 * 保存 GitHub Token（需要 repo 和 workflow 权限）
 */
export function saveGitHubToken(token: string): void {
  localStorage.setItem(GITHUB_TOKEN_KEY, token);
}

/**
 * 获取 GitHub Token
 */
export function getGitHubToken(): string | null {
  return localStorage.getItem(GITHUB_TOKEN_KEY);
}

/**
 * 清除 GitHub Token
 */
export function clearGitHubToken(): void {
  localStorage.removeItem(GITHUB_TOKEN_KEY);
}

/**
 * 验证 GitHub Token 是否有效
 */
export async function validateGitHubToken(token: string): Promise<{ valid: boolean; username?: string; error?: string }> {
  try {
    const response = await fetchWithTimeout('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    }, 15000);

    if (response.ok) {
      const user = await response.json();
      console.log('GitHub Token 验证成功，用户:', user.login);
      return { valid: true, username: user.login };
    } else {
      const error = await response.json();
      return { valid: false, error: error.message || 'Token 无效' };
    }
  } catch (error) {
    return { valid: false, error: '网络错误' };
  }
}

/**
 * 触发 GitHub Actions 工作流
 */
export async function triggerSearchWorkflow(): Promise<WorkflowTriggerResult> {
  const token = getGitHubToken();
  
  if (!token) {
    return {
      success: false,
      message: '请先配置 GitHub Token（需要 repo 和 workflow 权限）',
    };
  }

  try {
    console.log('触发 GitHub Actions 工作流...');
    
    const response = await fetchWithTimeout(
      `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/${WORKFLOW_FILE}/dispatches`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ref: 'main',
          inputs: {
            triggered_from: 'frontend',
          },
        }),
      },
      15000
    );

    if (response.status === 204) {
      console.log('工作流触发成功');
      return {
        success: true,
        message: '后台搜索已启动，预计 1-2 分钟完成',
      };
    } else if (response.status === 401) {
      return {
        success: false,
        message: 'GitHub Token 无效或已过期，请重新配置',
      };
    } else if (response.status === 403) {
      return {
        success: false,
        message: 'Token 权限不足，需要 repo 和 workflow 权限',
      };
    } else if (response.status === 404) {
      return {
        success: false,
        message: '工作流文件不存在，请检查仓库配置',
      };
    } else if (response.status === 422) {
      const error = await response.text();
      console.error('触发工作流422错误(参数错误):', error);
      return {
        success: false,
        message: `触发失败: 工作流参数错误(422) - ${error}`,
      };
    } else {
      const error = await response.text();
      console.error('触发工作流失败:', response.status, error);
      return {
        success: false,
        message: `触发失败: ${response.status} - ${error}`,
      };
    }
  } catch (error) {
    console.error('触发工作流异常:', error);
    return {
      success: false,
      message: '网络错误，请重试',
    };
  }
}

/**
 * 获取最近的工作流运行状态
 * @param sinceIso 只返回创建时间在此之后的 run（ISO 字符串），避免误判旧 run
 */
export async function getWorkflowStatus(sinceIso?: string): Promise<{
  status: 'running' | 'completed' | 'failed' | 'unknown';
  conclusion?: string;
  startedAt?: string;
  completedAt?: string;
  htmlUrl?: string;
}> {
  const token = getGitHubToken();
  
  try {
    const response = await fetchWithTimeout(
      `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/${WORKFLOW_FILE}/runs?per_page=5`,
      {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Accept': 'application/vnd.github.v3+json',
        },
      },
      15000
    );

    if (!response.ok) {
      return { status: 'unknown' };
    }

    const data = await response.json();
    const runs = data.workflow_runs || [];
    
    let run = runs[0];
    if (sinceIso && runs.length > 0) {
      const newerRuns = runs.filter((r: any) => r.created_at > sinceIso);
      if (newerRuns.length > 0) {
        run = newerRuns[0];
      } else {
        return { status: 'unknown' };
      }
    }
    
    if (!run) {
      return { status: 'unknown' };
    }

    if (run.status === 'completed') {
      return {
        status: 'completed',
        conclusion: run.conclusion,
        startedAt: run.created_at,
        completedAt: run.updated_at,
        htmlUrl: run.html_url,
      };
    }
    if (run.conclusion === 'failure') {
      return {
        status: 'failed',
        conclusion: run.conclusion,
        startedAt: run.created_at,
        completedAt: run.updated_at,
        htmlUrl: run.html_url,
      };
    }
    return {
      status: run.status === 'in_progress' || run.status === 'queued' || run.status === 'waiting' || run.status === 'pending'
        ? 'running'
        : 'unknown',
      conclusion: run.conclusion,
      startedAt: run.created_at,
      completedAt: run.updated_at,
      htmlUrl: run.html_url,
    };
  } catch (error) {
    console.error('获取工作流状态失败:', error);
    return { status: 'unknown' };
  }
}

/**
 * 轮询等待工作流完成（最多等待 8 分钟）
 * 只关注触发之后创建的 run，避免把旧 failure 误判为本次结果
 */
export async function waitForWorkflowCompletion(
  onProgress?: (message: string) => void,
  maxWaitMs: number = 480000
): Promise<{ success: boolean; newCount: number; timedOut?: boolean; message?: string }> {
  const startTime = Date.now();
  const pollInterval = 10000;
  const triggerTime = new Date().toISOString();

  const { count: beforeCount } = await supabase
    .from('pending_articles')
    .select('id', { count: 'exact', head: true });

  onProgress?.('等待后台搜索完成...');

  while (Date.now() - startTime < maxWaitMs) {
    const status = await getWorkflowStatus(triggerTime);

    if (status.status === 'completed') {
      onProgress?.('搜索完成，正在获取结果...');

      await new Promise(resolve => setTimeout(resolve, 2000));

      const { count: afterCount } = await supabase
        .from('pending_articles')
        .select('id', { count: 'exact', head: true });

      return {
        success: status.conclusion === 'success',
        newCount: Math.max(0, (afterCount ?? 0) - (beforeCount ?? 0)),
        message: status.conclusion === 'success'
          ? undefined
          : `工作流执行结束，结论: ${status.conclusion}`,
      };
    }

    if (status.status === 'failed') {
      return { success: false, newCount: 0, timedOut: false, message: '工作流执行失败' };
    }

    await new Promise(resolve => setTimeout(resolve, pollInterval));
    onProgress?.(`后台搜索进行中... (${Math.floor((Date.now() - startTime) / 1000)}秒)`);
  }

  return { success: false, newCount: 0, timedOut: true };
}

/**
 * 检查是否配置了 GitHub Token
 */
export function hasGitHubToken(): boolean {
  return !!getGitHubToken();
}
