/**
 * GitHub Actions 触发服务
 * 用于手动触发文章搜索workflow
 */

const GITHUB_REPO = 'kimixpf1/speech-web';
const WORKFLOW_FILE = 'fetch-articles.yml';

export interface TriggerResult {
  success: boolean;
  message: string;
  workflowUrl?: string;
  runId?: number;
}

export interface WorkflowRun {
  id: number;
  name: string;
  status: 'queued' | 'in_progress' | 'completed' | 'waiting' | 'requested' | 'pending';
  conclusion: 'success' | 'failure' | 'neutral' | 'cancelled' | 'skipped' | 'timed_out' | 'action_required' | null;
  created_at: string;
  updated_at: string;
  html_url: string;
  display_title: string;
}

export interface SearchStatus {
  stage: 'idle' | 'triggering' | 'queued' | 'running' | 'completed' | 'failed';
  message: string;
  runId?: number;
  workflowUrl?: string;
  startTime?: Date;
  endTime?: Date;
}

/**
 * 保存GitHub Token到localStorage
 */
export function saveGitHubToken(token: string): void {
  localStorage.setItem('github_token', token);
}

/**
 * 获取保存的GitHub Token
 */
export function getGitHubToken(): string | null {
  return localStorage.getItem('github_token');
}

/**
 * 清除GitHub Token
 */
export function clearGitHubToken(): void {
  localStorage.removeItem('github_token');
}

/**
 * 触发GitHub Actions workflow来搜索新文章
 */
export async function triggerFetchArticles(): Promise<TriggerResult> {
  const token = getGitHubToken();
  
  if (!token) {
    return {
      success: false,
      message: '请先配置GitHub Personal Access Token'
    };
  }

  try {
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/${WORKFLOW_FILE}/dispatches`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ref: 'main'
        })
      }
    );

    if (response.status === 204) {
      // 等待几秒后获取最新的run
      await new Promise(resolve => setTimeout(resolve, 3000));
      const { runs } = await getWorkflowRuns();
      const latestRun = runs[0];
      
      return {
        success: true,
        message: '搜索任务已触发，正在获取最新文章...',
        workflowUrl: `https://github.com/${GITHUB_REPO}/actions`,
        runId: latestRun?.id
      };
    } else if (response.status === 401) {
      clearGitHubToken();
      return {
        success: false,
        message: 'GitHub Token无效或已过期，请重新配置'
      };
    } else if (response.status === 403) {
      return {
        success: false,
        message: '没有权限触发此workflow，请确保Token有repo权限'
      };
    } else {
      const error = await response.text();
      console.error('Trigger workflow error:', error);
      return {
        success: false,
        message: `触发失败: ${response.status} ${response.statusText}`
      };
    }
  } catch (error) {
    console.error('Trigger workflow error:', error);
    return {
      success: false,
      message: `网络错误: ${error instanceof Error ? error.message : '未知错误'}`
    };
  }
}

/**
 * 验证GitHub Token是否有效
 */
export async function validateGitHubToken(token: string): Promise<{ valid: boolean; username?: string; error?: string }> {
  try {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      }
    });

    if (response.ok) {
      const user = await response.json();
      return { valid: true, username: user.login };
    } else if (response.status === 401) {
      return { valid: false, error: 'Token无效或已过期' };
    } else {
      return { valid: false, error: `验证失败: ${response.status}` };
    }
  } catch (error) {
    return { valid: false, error: `网络错误: ${error instanceof Error ? error.message : '未知错误'}` };
  }
}

/**
 * 获取workflow运行状态
 */
export async function getWorkflowRuns(): Promise<{ runs: WorkflowRun[]; error?: string }> {
  const token = getGitHubToken();
  
  if (!token) {
    return { runs: [], error: '请先配置GitHub Token' };
  }

  try {
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/${WORKFLOW_FILE}/runs?per_page=5`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        }
      }
    );

    if (response.ok) {
      const data = await response.json();
      return { runs: data.workflow_runs || [] };
    } else {
      return { runs: [], error: `获取失败: ${response.status}` };
    }
  } catch (error) {
    return { runs: [], error: `网络错误: ${error instanceof Error ? error.message : '未知错误'}` };
  }
}

/**
 * 获取特定workflow run的状态
 */
export async function getWorkflowRunStatus(runId: number): Promise<{ run: WorkflowRun | null; error?: string }> {
  const token = getGitHubToken();
  
  if (!token) {
    return { run: null, error: '请先配置GitHub Token' };
  }

  try {
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/actions/runs/${runId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        }
      }
    );

    if (response.ok) {
      const run = await response.json();
      return { run };
    } else {
      return { run: null, error: `获取失败: ${response.status}` };
    }
  } catch (error) {
    return { run: null, error: `网络错误: ${error instanceof Error ? error.message : '未知错误'}` };
  }
}

/**
 * 获取workflow run的日志
 */
export async function getWorkflowRunLogs(runId: number): Promise<{ logs: string; error?: string }> {
  const token = getGitHubToken();
  
  if (!token) {
    return { logs: '', error: '请先配置GitHub Token' };
  }

  try {
    // 首先获取jobs
    const jobsResponse = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/actions/runs/${runId}/jobs`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        }
      }
    );

    if (jobsResponse.ok) {
      const jobsData = await jobsResponse.json();
      const jobs = jobsData.jobs || [];
      
      // 提取关键日志信息
      let logSummary = '';
      for (const job of jobs) {
        const steps = job.steps || [];
        for (const step of steps) {
          if (step.name.includes('Fetch') || step.name.includes('文章')) {
            logSummary += `${step.name}: ${step.conclusion || step.status}\n`;
          }
        }
      }
      
      return { logs: logSummary || '日志获取中...' };
    } else {
      return { logs: '', error: `获取日志失败: ${jobsResponse.status}` };
    }
  } catch (error) {
    return { logs: '', error: `网络错误: ${error instanceof Error ? error.message : '未知错误'}` };
  }
}

/**
 * 格式化运行时间为可读格式
 */
export function formatRunTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  if (diff < 60000) {
    return '刚刚';
  } else if (diff < 3600000) {
    return `${Math.floor(diff / 60000)}分钟前`;
  } else if (diff < 86400000) {
    return `${Math.floor(diff / 3600000)}小时前`;
  } else {
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  }
}

/**
 * 获取状态对应的中文描述
 */
export function getStatusText(status: WorkflowRun['status'], conclusion: WorkflowRun['conclusion']): string {
  if (status === 'queued' || status === 'waiting' || status === 'pending') {
    return '等待运行';
  } else if (status === 'in_progress' || status === 'requested') {
    return '正在运行';
  } else if (status === 'completed') {
    if (conclusion === 'success') {
      return '运行成功';
    } else if (conclusion === 'failure') {
      return '运行失败';
    } else if (conclusion === 'cancelled') {
      return '已取消';
    } else if (conclusion === 'timed_out') {
      return '超时';
    } else {
      return '已完成';
    }
  }
  return '未知状态';
}

/**
 * 获取状态对应的颜色类
 */
export function getStatusColor(status: WorkflowRun['status'], conclusion: WorkflowRun['conclusion']): string {
  if (status === 'queued' || status === 'waiting' || status === 'pending') {
    return 'text-yellow-600';
  } else if (status === 'in_progress' || status === 'requested') {
    return 'text-blue-600';
  } else if (status === 'completed') {
    if (conclusion === 'success') {
      return 'text-green-600';
    } else if (conclusion === 'failure' || conclusion === 'timed_out') {
      return 'text-red-600';
    } else if (conclusion === 'cancelled') {
      return 'text-gray-600';
    }
  }
  return 'text-gray-600';
}