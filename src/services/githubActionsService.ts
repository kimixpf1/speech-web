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
      return {
        success: true,
        message: '搜索任务已触发，请稍后在"待审核文章"中查看结果',
        workflowUrl: `https://github.com/${GITHUB_REPO}/actions`
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
export async function getWorkflowRuns(): Promise<{ runs: any[]; error?: string }> {
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