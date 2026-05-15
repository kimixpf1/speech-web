/**
 * GitHub Actions 工作流触发服务
 * 用于从前端触发后台搜索工作流
 */

import { supabase } from '@/lib/supabase';

const GITHUB_REPO = 'kimixpf1/speech-web';
const WORKFLOW_FILE = 'ai-auto-search.yml';

const GITHUB_TOKEN_KEY = 'github_workflow_token';

const BATCH_FILE_PATH = '.github/scripts/batches/pending_articles_batch.json';

function decodeBase64Utf8(base64: string): string {
  const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** 通过 GitHub API 读取 batch 文件中的文章数量（Supabase 暂停期间的临时 fallback，2026-05-20 后移除） */
async function getBatchArticleCount(): Promise<number> {
  const token = getGitHubToken();
  if (!token) return -1;
  try {
    const response = await fetchWithTimeout(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${BATCH_FILE_PATH}?ref=main`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      },
      15000
    );
    if (response.status === 404) return 0;
    if (!response.ok) return -1;
    const data = await response.json();
    const content = decodeBase64Utf8(data.content.replace(/\n/g, ''));
    const articles = JSON.parse(content);
    return Array.isArray(articles) ? articles.length : 0;
  } catch (err) {
    console.warn('getBatchArticleCount: 解码或解析失败', err);
    return -1;
  }
}

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
  runId?: number;
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
        runId: run.id,
      };
    }
    if (run.conclusion === 'failure') {
      return {
        status: 'failed',
        conclusion: run.conclusion,
        startedAt: run.created_at,
        completedAt: run.updated_at,
        htmlUrl: run.html_url,
        runId: run.id,
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
      runId: run.id,
    };
  } catch (error) {
    console.error('获取工作流状态失败:', error);
    return { status: 'unknown' };
  }
}

async function getWorkflowStatusById(runId: number): Promise<{
  status: 'running' | 'completed' | 'failed' | 'unknown';
  conclusion?: string;
  htmlUrl?: string;
  runId?: number;
}> {
  const token = getGitHubToken();
  if (!token) return { status: 'unknown' };
  try {
    const response = await fetchWithTimeout(
      `https://api.github.com/repos/${GITHUB_REPO}/actions/runs/${runId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      },
      15000
    );
    if (!response.ok) return { status: 'unknown' };
    const run = await response.json();
    if (run.status === 'completed') {
      return {
        status: run.conclusion === 'failure' ? 'failed' : 'completed',
        conclusion: run.conclusion,
        htmlUrl: run.html_url,
        runId: run.id,
      };
    }
    return {
      status: (run.status === 'in_progress' || run.status === 'queued' || run.status === 'waiting' || run.status === 'pending')
        ? 'running' : 'unknown',
      runId: run.id,
    };
  } catch {
    return { status: 'unknown' };
  }
}

/**
 * 获取失败 run 的 job 详情（失败步骤名称等）
 */
async function getFailedJobDetails(runHtmlUrl?: string): Promise<string> {
  const token = getGitHubToken();
  if (!token || !runHtmlUrl) return '';
  
  try {
    const runIdMatch = runHtmlUrl.match(/\/runs\/(\d+)/);
    if (!runIdMatch) return '';
    const runId = runIdMatch[1];

    const jobsResp = await fetchWithTimeout(
      `https://api.github.com/repos/${GITHUB_REPO}/actions/runs/${runId}/jobs`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      },
      15000
    );

    if (!jobsResp.ok) return '';
    const jobsData = await jobsResp.json();
    const jobs = jobsData.jobs || [];
    
    for (const job of jobs) {
      const failedSteps = (job.steps || []).filter((s: any) => s.conclusion === 'failure');
      if (failedSteps.length > 0) {
        const stepNames = failedSteps.map((s: any) => `"${s.name}"`).join(', ');
        return `失败步骤: ${stepNames}`;
      }
    }
    return '';
  } catch {
    return '';
  }
}

/**
 * 轮询等待工作流完成（最多等待 10 分钟）
 * 只关注触发之后创建的 run，避免把旧 failure 误判为本次结果
 *
 * 修复策略：
 * 1. 初始 30 秒等待让 GitHub API 创建 run 记录
 * 2. unknown 状态用 15 秒间隔减少 API 压力，超 2 分钟 unknown 给明确提示
 * 3. completed 后等 5 秒让 Supabase 同步
 * 4. 超时后查 Supabase 实际新增数，有新增则报成功
 */
export async function waitForWorkflowCompletion(
  onProgress?: (message: string) => void,
  maxWaitMs: number = 600000
): Promise<{ success: boolean; newCount: number; timedOut?: boolean; message?: string }> {
  const startTime = Date.now();
  const pollIntervalRunning = 10000;   // running 状态每 10 秒轮询
  const pollIntervalUnknown = 15000;   // unknown 状态每 15 秒轮询，减少 API 请求频率
  const unknownWarningMs = 120000;     // 连续 unknown 超 2 分钟给出明确提示
  // 提前 60 秒作为缓冲，避免时钟偏差或 GitHub 延迟导致 created_at < triggerTime 匹配不到
  const triggerTime = new Date(Date.now() - 60000).toISOString();

  const { count: beforeCount } = await supabase
    .from('pending_articles')
    .select('id', { count: 'exact', head: true });

  // 临时 fallback：记录触发前 batch 文件文章数量（2026-05-20 Supabase 恢复后移除）
  const beforeBatchCount = await getBatchArticleCount();

  // 初始等待 15 秒，让 GitHub API 有时间创建新的 run 记录
  onProgress?.('已触发工作流，等待 GitHub API 创建运行记录...');
  await new Promise(resolve => setTimeout(resolve, 15000));

  let hasSeenRun = false;       // 是否已经看到过非 unknown 的 run
  let unknownSinceStart = true; // 是否从开始到现在一直是 unknown
  let lockedRunId: number | null = null; // 锁定跟踪的 run ID
  onProgress?.('开始轮询工作流状态...');

  while (Date.now() - startTime < maxWaitMs) {
    const status = lockedRunId
      ? await getWorkflowStatusById(lockedRunId)
      : await getWorkflowStatus(triggerTime);

    // 如果按时间过滤没找到，但按 ID 跟踪到了，就用 ID 跟踪
    if (!lockedRunId && status.runId && status.status !== 'unknown') {
      lockedRunId = status.runId;
    }

    if (status.status === 'completed') {
      onProgress?.('搜索完成，正在获取结果...');

      // 等待 5 秒让 Supabase 数据库同步完成
      await new Promise(resolve => setTimeout(resolve, 5000));

      const { count: afterCount } = await supabase
        .from('pending_articles')
        .select('id', { count: 'exact', head: true });

      if (status.conclusion === 'success') {
        const supabaseNew = Math.max(0, (afterCount ?? 0) - (beforeCount ?? 0));
        // Supabase 有新增则直接返回
        if (supabaseNew > 0) {
          return { success: true, newCount: supabaseNew };
        }
        // Supabase 无新增，fallback 到 batch 文件（临时，2026-05-20 后移除）
        const afterBatchCount = await getBatchArticleCount();
        const batchNew = afterBatchCount >= 0 && beforeBatchCount >= 0
          ? Math.max(0, afterBatchCount - beforeBatchCount)
          : 0;
        if (batchNew > 0) {
          return {
            success: true,
            newCount: batchNew,
            message: `后台搜索完成！新增 ${batchNew} 篇文章（暂存于 GitHub batch 文件，Supabase 恢复后可管理）`,
          };
        }
        return { success: true, newCount: 0 };
      }

      const jobDetail = await getFailedJobDetails(status.htmlUrl);
      return {
        success: false,
        newCount: Math.max(0, (afterCount ?? 0) - (beforeCount ?? 0)),
        message: `工作流执行结束，结论: ${status.conclusion}${jobDetail ? '，' + jobDetail : ''}`,
      };
    }

    if (status.status === 'failed') {
      const jobDetail = await getFailedJobDetails(status.htmlUrl);
      return {
        success: false,
        newCount: 0,
        timedOut: false,
        message: `工作流执行失败${jobDetail ? '，' + jobDetail : ''}`,
      };
    }

    // 根据状态选择不同的轮询间隔
    const currentInterval = status.status === 'unknown'
      ? pollIntervalUnknown
      : pollIntervalRunning;

    // 检测到 run 已出现（非 unknown 状态）
    if (status.status !== 'unknown') {
      hasSeenRun = true;
      unknownSinceStart = false;
    }

    const elapsedSec = Math.floor((Date.now() - startTime) / 1000);

    // 如果前 2 分钟一直 unknown，给出明确提示
    if (unknownSinceStart && elapsedSec > unknownWarningMs / 1000) {
      onProgress?.(
        `已等待 ${elapsedSec} 秒仍未检测到工作流运行记录。` +
        '工作流可能尚未启动或 GitHub API 存在延迟，继续等待...'
      );
      // 只提示一次
      unknownSinceStart = false;
    } else {
      onProgress?.(`后台搜索进行中... (${elapsedSec}秒)`);
    }

    await new Promise(resolve => setTimeout(resolve, currentInterval));
  }

  // 超时后不要直接报失败，去 Supabase 查询实际新增文章数
  onProgress?.('轮询超时，正在检查实际结果...');
  const { count: afterCountTimeout } = await supabase
    .from('pending_articles')
    .select('id', { count: 'exact', head: true });

  const actualNewCount = Math.max(0, (afterCountTimeout ?? 0) - (beforeCount ?? 0));

  if (actualNewCount > 0) {
    return {
      success: true,
      newCount: actualNewCount,
      timedOut: true,
      message: `轮询超时但检测到 ${actualNewCount} 篇新增文章，工作流可能已成功完成`,
    };
  }

  // Supabase 无新增，fallback 到 batch 文件（临时，2026-05-20 后移除）
  const afterBatchCountTimeout = await getBatchArticleCount();
  const batchNewTimeout = afterBatchCountTimeout >= 0 && beforeBatchCount >= 0
    ? Math.max(0, afterBatchCountTimeout - beforeBatchCount)
    : 0;
  if (batchNewTimeout > 0) {
    return {
      success: true,
      newCount: batchNewTimeout,
      timedOut: true,
      message: `轮询超时但 batch 文件新增 ${batchNewTimeout} 篇文章（Supabase 恢复后可管理）`,
    };
  }

  return { success: false, newCount: 0, timedOut: true };
}

/**
 * 检查是否配置了 GitHub Token
 */
export function hasGitHubToken(): boolean {
  return !!getGitHubToken();
}
