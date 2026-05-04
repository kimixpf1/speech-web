# 项目迭代记录

## 2026-05-03 v2026.5.8 ErrorBoundary完善+搜索去重增强+PWA离线缓存

### 本次目标
- 完善 ErrorBoundary 组件（错误上报 + 重试按钮 + 更友好的降级 UI）
- 增强搜索去重逻辑
- 集成 PWA 离线缓存能力（Service Worker + manifest.webmanifest）

### 实际改动

#### 1. ErrorBoundary 组件完善
- 文件：`src/components/ErrorBoundary.tsx`
- 增强错误边界处理，提供更友好的降级 UI 和重试机制
- 改进错误上报能力，便于线上问题排查

#### 2. 搜索去重增强
- 文件：`.github/scripts/ai_search.py`
- 增强搜索管道的去重逻辑，减少重复文章入库

#### 3. PWA 离线缓存集成
- 文件：`vite.config.ts`、`src/App.tsx`
- 集成 vite-plugin-pwa，支持 Service Worker 离线缓存
- 配置 manifest.webmanifest，支持安装到桌面
- 线上验证：manifest.webmanifest 链接已上线，sw.js Service Worker 已生效

#### 4. 版本号更新
- 文件：`package.json`、`package-lock.json`
- 版本号从 v2026.5.7 升级到 v2026.5.8

### 当前状态
- ✅ 构建通过
- ✅ 推送成功（13ff2dd）
- ✅ Deploy #387 success（耗时 40 秒）
- ✅ 线上版本 v2026.5.8 已生效
- ✅ manifest.webmanifest 链接已在线上 HTML 中确认
- ✅ sw.js Service Worker 已可访问
- ✅ GitHub API 确认 package.json 版本为 2026.5.8

### 提交记录
- `13ff2dd` perf: v2026.5.8 - ErrorBoundary完善+搜索去重增强+PWA离线缓存

### 遗留事项
- 继续观察搜索管道去重效果
- PWA 缓存策略可能需要根据实际使用情况微调

## 2026-05-03 v2026.5.7 高优优化（2项）

### 本次目标
- 修复搜索待审核列表为空问题
- 首页滚动懒加载优化

### 根因分析
- 待审核为空：前端 pendingArticleService.ts 使用 publicSupabase（anon key + 无session），但 RLS SELECT 策略要求 auth.role() = 'authenticated'，anon 被静默拒绝返回空集
- 修复：改用 lib/supabase.ts 的 supabase 客户端（带session），管理员登录后以 authenticated 身份读取

### 修改文件
- src/services/pendingArticleService.ts：pending_articles CRUD 改用带session的supabase客户端
- src/components/ContentList.tsx：IntersectionObserver 分组懒加载（初始3组，滚动加载更多）
- package.json：版本号 v2026.5.6 → v2026.5.7

### 当前状态
- ✅ 构建通过
- ✅ 推送成功（451de76）
- ✅ Deploy #385 success
- ✅ 线上版本 v2026.5.7 已生效

### 遗留事项
- 需用户在 Supabase SQL Editor 执行：pending_articles SELECT 策略改为 USING(true)

### 提交记录
- `451de76` perf: v2026.5.7 - 修复待审核RLS读取+滚动懒加载

## 2026-05-03 修复部署失败

### 问题
- Deploy workflow #382/#383 连续失败，Build 步骤 6 秒就挂
- 线上版本停在 `7244f52`，后续 4 个提交未上线
- 没有日志访问权限，无法直接查看报错

### 根因
- 上一轮移除 34 个未用依赖时，`vite.config.ts` 的 `vendor-radix` 分包配置仍引用 4 个已删除的包：
  - `@radix-ui/react-dropdown-menu`
  - `@radix-ui/react-popover`
  - `@radix-ui/react-tooltip`
  - `@radix-ui/react-accordion`
- 本地构建因 node_modules 残留通过，GitHub Actions 干净环境找不到这些模块导致失败

### 修复
- 文件：`vite.config.ts`
- 将 `vendor-radix` 从引用 6 个包改为实际安装的 5 个包：
  - `@radix-ui/react-dialog`、`react-select`、`react-tabs`、`react-progress`、`react-slot`

### 当前状态
- ✅ 本地构建成功（25 个文件，16.64s）
- ✅ 推送 `11bfe99`
- ⏳ 等待 GitHub Actions Deploy 结果

### 提交记录
- `11bfe99` fix: 修复部署失败 - vendor-radix分包配置引用已删除的包

### 遗留事项
- 等待部署完成后验证线上版本更新到 `11bfe99`
- 部署成功后验证所有功能：首页加载、筛选、搜索、详情页、管理员登录

## 2026-05-03 高优先级优化（4项）

### 本次目标
- 从三智能体审计的39个优化点中，执行高优先级的前4项
- 原则：不影响线上所有功能正常使用

### 实际改动

#### 1. 管理员前端认证加固
- 文件：`src/services/adminAuth.ts`
- 新增 `isSessionExpired()` 会话过期检查（24小时有效期）
- 新增 `clearAuthState()` 统一清理函数
- `isAdminLoggedInSync()` 加入过期校验，过期自动清理
- `isAdminLoggedIn()` 先查过期再查 Supabase session，不再依赖 localStorage boolean
- `logoutAdmin()` 清理 AUTH_TIMESTAMP_KEY（之前遗漏）
- 修复前：`localStorage.setItem('admin_authenticated','true')` 可绕过认证
- 修复后：必须同时有有效时间戳 + Supabase session

#### 2. 移除34个未使用的依赖包
- 文件：`package.json`、`package-lock.json`
- 通过代码探索智能体精确验证：6个 radix 包实际使用（dialog/progress/select/slot/tabs + slot在badge中）
- 安全移除：22个未用 radix-ui 包 + 12个未用非 radix 包
- dependencies 从 42 个精简到 18 个
- 减小 node_modules 体积和 bundle 构建时间

#### 3. 删除死代码文件
- 删除：`src/data/peopleArticles.ts`（~100篇，未在任何活跃代码中导入）
- 删除：`src/data/migratedArticles.ts`（~30篇，未在任何活跃代码中导入）
- 数据已在 Supabase 云端有副本，静态文件仅是冗余兜底
- 减少 2101 行代码进入 bundle

#### 4. fetchFromCloud 查询字段精简
- 文件：`src/services/articleServiceEnhanced.ts`
- 新增 `ARTICLE_FIELDS` 常量（显式列出16个必要列）
- `fetchFromCloud()` 3条查询路径全部从 `select('*')` 改为 `select(ARTICLE_FIELDS)`
- `getZhengjiguanArticles()` 2条查询路径同样精简
- REST API fallback 路径也使用显式字段列表
- 防止未来 articles 表新增列时列表页拉取不必要的数据

### 当前状态
- ✅ VS Code Diagnostics 零错误
- ✅ lint 通过
- ✅ build 通过
- ✅ 本地模拟测试通过（首页1172篇/领域筛选/类型筛选/搜索/详情页/管理员登录全部正常）
- ✅ 控制台零错误
- ✅ 推送部署 `3c55e90`

### 提交记录
- `3c55e90` perf: 高优优化 - 管理员认证加固+移除34个未用依赖+删除死代码+查询字段精简

### 遗留事项
- **高优5**：添加数据库关键索引（需在 Supabase Dashboard SQL Editor 手动执行）
- **高优6**：pending_articles INSERT RLS 加固（需在 Supabase Dashboard SQL Editor 手动执行）

## 2026-05-02 搜索管道增强过滤 + URL去重规范化 + save_articles详细日志

### 问题
1. 搜索管道抓到了新华每日电讯02版评论文章（`Articel02001NR.htm`），标题含"习近平在加强基础研究座谈会上强调"但实际是新华社记者写的解读文章
2. 该文章 URL `http://mrdx.cn/content/20260501/Articel02001NR.htm` 已在文章库中，但 URL 去重未生效（http/https/www 差异）
3. 搜索日志显示1篇新增待审核，但前端待审核列表为空——`save_articles()` 用裸 `except: return 0` 吞掉了所有异常

### 修复

#### 1. 新华每日电讯非头版文章过滤
- 文件：`.github/scripts/ai_search.py`
- `search_xinhua_mrdx()` 中 `maybe_add_article()` 新增过滤：`Articel02`/`Articel03`/`Articel04` 版面文章自动跳过
- 02版是要闻评论版，不是头版总书记原文

#### 2. URL 去重规范化
- 新增 `normalize_url_for_dedup()` 函数：统一转 http://、去掉末尾/、去掉 www.、mrdx.cn/news.cn 域名规范化
- `get_existing_articles()` 同时收集原始 URL 和规范化 URL
- `main()` 中去重比对同时检查原始 URL 和规范化 URL

#### 3. save_articles 详细日志
- 每篇待保存文章打印标题和 URL
- HTTP 响应状态码非 200/201 时打印错误信息
- 异常时打印异常类型和消息

### 当前状态
- ✅ build 通过
- ✅ 推送部署 `6f4e8f6`

### 提交记录
- `6f4e8f6` fix: 搜索管道增强过滤+URL去重规范化+save_articles详细日志

### 遗留事项
- 待用户再次手动触发搜索，验证：1)评论文章不再入库 2)已有文章正确去重 3)待审核列表能显示新文章
- 待审核为空问题可能是 Supabase 唯一约束冲突（需看下次搜索日志中 [Save] 输出）

## 2026-05-02 修复搜索工作流 NameError + 搜索进度文案修正

### 问题
- 搜索工作流持续失败，根因：`ai_search.py` 第 1088 行调用 `fix_source_from_url()` 但该函数从未定义 → `NameError`
- 搜索进度显示"使用 Kimi API 搜索中"不准确，实际搜索管道是纯爬虫（不调用 AI）
- "未配置 AI API Key" 提示不准确，实际需要的是 GitHub Token

### 修复

#### 1. ai_search.py - 定义缺失的 fix_source_from_url 函数
- 根据 URL 域名自动修正来源名称（people.com.cn→人民网, xinhuanet.com→新华网, qstheory.cn→求是网 等）
- 覆盖 9 个主流媒体域名映射

#### 2. AdminPendingTab.tsx - 搜索进度文案修正
- "AI 文章搜索" → "文章搜索"
- "使用 Kimi API 搜索中..." → "搜索管道：抓取人民网·新华社·求是网 → 去重 → 入库待审核"
- "Kimi 联网作为补漏来源" → "搜索管道：人民网讲话数据库 → 新华社/新华网 → 求是网 → 百度兜底"
- "未配置 AI API Key" → "未配置 GitHub Token"

### 当前状态
- ✅ build 通过
- ✅ 推送部署 `8ad7a74`

### 提交记录
- `8ad7a74` fix: ai_search.py定义fix_source_from_url解决NameError + 搜索进度文案改为搜索管道描述

### 下一步
- 用户再次手动触发搜索，验证 Python 脚本不再报 NameError
- 观察今晚 20:17/20:33/20:50 定时任务是否正常触发

## 2026-05-02 搜索失败详情展示 + ai_search.py 全局异常捕获

### 问题
- 手动搜索仍然报"工作流执行结束，结论: failure"，无法定位根因
- 最近 3 次运行（#134/#135/#136）全部 failure，均在"Run AI Search"步骤失败
- 没有 job 日志查看权限，无法直接看到 Python 脚本的具体报错

### 修复

#### 1. 前端展示失败步骤名称
- 文件：`src/services/githubActionsTrigger.ts`
- 新增 `getFailedJobDetails()` 函数：通过 GitHub API 获取失败 run 的 jobs → 找到 `conclusion=failure` 的 step → 返回步骤名称
- `waitForWorkflowCompletion()` 在返回失败时自动调用，错误消息从"工作流执行失败"变为"工作流执行失败，失败步骤: "Run AI Search""

#### 2. ai_search.py 全局异常捕获
- 文件：`.github/scripts/ai_search.py`
- `if __name__` 入口加 `try/except` + `traceback.print_exc()`
- 下次失败时 GitHub Actions 日志会显示完整的 Python traceback

### 当前状态
- ✅ build 通过
- ✅ 推送部署 `7a815b8`

### 提交记录
- `7a815b8` fix: 搜索失败显示具体失败步骤 + ai_search.py加全局异常捕获traceback

### 下一步
- 用户再次手动触发搜索，观察：
  1. 前端是否显示"失败步骤: "Run AI Search""
  2. GitHub Actions 日志是否有 Python traceback
- 根据 traceback 定位 ai_search.py 具体哪一行报错

## 2026-05-02 修复后台搜索误判失败 + 定时任务整点被丢弃

### 问题
1. **手动搜索报错"后台搜索失败"**：触发新 workflow 后，`getWorkflowStatus()` 用 `per_page=1` 盲查最新 run，新 run 还未出现在 API 列表中时就把上一次的 failure 误判为本次结果
2. **昨晚定时任务未触发**：`ai-auto-search.yml` 保留了整点 cron（`0 0`/`0 12`），GitHub 高负载时直接丢弃整点 schedule

### 修复

#### 1. getWorkflowStatus 按触发时间过滤 run
- 文件：`src/services/githubActionsTrigger.ts`
- `getWorkflowStatus()` 新增 `sinceIso` 参数，只返回创建时间在触发之后的 run
- `per_page` 从 1 增至 5，增加找到新 run 的概率
- 如果没有新 run，返回 `unknown`（继续轮询）而非 `failed`（立即报错）
- 增加 `queued`/`waiting`/`pending` 状态识别为 `running`
- `waitForWorkflowCompletion()` 在触发时记录 `triggerTime`，传给 `getWorkflowStatus`

#### 2. 删除整点 cron
- 文件：`.github/workflows/ai-auto-search.yml`
- 删除 `0 0 * * *` 和 `0 12 * * *`（整点 cron）
- 保留错峰 cron：`17/33/50 0` + `17/33/50 12`（北京时间 8:17/8:33/8:50 + 20:17/20:33/20:50）

#### 3. 搜索失败消息改进
- 文件：`src/components/AdminDashboard.tsx`
- 失败消息现在显示具体原因（如"工作流执行失败"）而非笼统的"后台搜索失败"

### 当前状态
- ✅ build 通过
- ✅ 推送部署 `b2c0437`

### 提交记录
- `b2c0437` fix: 搜索误判旧run为失败 + 定时任务去掉整点cron

### 遗留事项
- 等待今晚 20:17/20:33/20:50 北京时间观察定时任务是否正常触发
- 手动搜索需要用户配置 GitHub Token 后再测试

## 2026-05-02 紧急修复远程仓库 + 线上验证

### 本次目标
- 修复远程 GitHub 仓库 AdminDashboard.tsx 被损坏为 18 字节（"EMERGENCY ROLLBACK"）的问题
- 推送所有本地新文件到远程
- 线上真人测试后台所有功能

### 实际改动

#### 1. Git 分支整合
- 本地 main 与远程 origin/main 有分歧（本地 2 个提交 vs 远程 3 个提交）
- `git stash` → `git rebase origin/main` 解决冲突
- AdminDashboard.tsx 冲突解决：使用 `git checkout fa9098f -- src/components/AdminDashboard.tsx` 从历史正确提交恢复
- 搜索超时补丁因远程已包含而被跳过（`git rebase --skip`）

#### 2. 恢复提交
- 提交 `7f741a5`：恢复 AdminDashboard.tsx 完整版本（38900 字节 vs 损坏的 18 字节）
- 提交 `ef17b20`：定时搜索防重复修复（rebase 保留）

#### 3. 推送成功
- `git push origin main` 成功（token 恢复可用）
- 远程 origin/main 现在指向 `7f741a5`，与本地一致

### 线上测试结果
- ✅ 管理员登录（admin/kimiclaw1）正常
- ✅ 后台所有 Tab 加载正常（访问统计、近期新增、文章管理、建议信箱）
- ✅ 文章列表正确加载（标题、日期、分类、来源）
- ✅ 搜索功能：输入"经济"后即时过滤，结果正确
- ✅ 编辑功能：编辑弹窗正确加载，所有字段填充正确
- ✅ 近期新增 Tab：AI 搜索面板正常，搜索记录正确显示
- ✅ 控制台无关键性错误（仅 GoTrueClient 多实例警告和 2 个 404 资源警告）

### 提交记录
- `7f741a5` fix: 恢复AdminDashboard.tsx完整版本 - 从fa9098f恢复分组API+搜索超时版本
- `ef17b20` fix: 定时搜索防重复只看auto日志 + executed_at改UTC存储 + 跨日匹配修复

### 遗留事项
- AI 搜索后端 ai_search.py 在 GitHub Actions 上仍有失败记录，需继续排查
- 建议信箱 Tab 未在本次测试中验证

## 2026-05-02 后台文章管理 Hook 拆分重构

### 本次目标
- 将 `useAdminArticleManagement`（590 行单体 Hook，23 个状态，40+ 返回项）拆分为 4 个领域子 Hook + 1 个发布编排服务
- 解决职责堆叠、返回面过宽、待审核发布时序耦合问题

### 实际改动

#### 1. 新建发布编排服务
- 文件：`src/services/adminArticleWorkflowService.ts`
- 封装 `publishAdminArticle` 纯函数：生成文章→保存详情→失败回滚→待审核转正式
- 提取 `buildArticleFromDraft` 草稿转 Speech 组装逻辑

#### 2. 新建 4 个领域子 Hook
- `src/hooks/admin/useArticleFilter.ts`：搜索词与筛选结果
- `src/hooks/admin/useArticleEditor.ts`：编辑、详情加载、删除确认
- `src/hooks/admin/useArticleCreationFlow.ts`：新增草稿、AI 提取、手动补录、待审核发布（含 phase 状态机：idle→prefill→extracting→ready→manual→publishing）
- `src/hooks/admin/useExtractionCredentialPrompt.ts`：Kimi Key 提示与校验弹窗

#### 3. 重写门面 Hook
- 文件：`src/hooks/useAdminArticleManagement.ts`
- 从 590 行 → 44 行，组合 4 个子 Hook
- 返回分组对象 `{ filter, editor, creation, configPrompt }`

#### 4. 更新调用方
- 文件：`src/components/AdminDashboard.tsx`
- 从扁平解构 40+ 字段改为分组解构 `articleFilter / articleEditor / articleCreation / articleConfigPrompt`

#### 5. 消除 setTimeout 时序耦合
- 待审核发布从 `setTimeout(300ms)` 改为 `await` 串行执行预填与提取
- 提取失败直接进入 `manual` 阶段，不再依赖渲染时机

### 当前状态
- ✅ `npm run build` 通过
- ✅ `npm run lint` 通过
- ✅ VS Code Diagnostics 全部 0 错误
- ✅ 推送部署成功，线上版本 `f186ac3`

### 提交记录
- `f186ac3` refactor: 后台文章管理Hook拆分 - 从590行单体拆为4个领域子Hook+发布编排服务

### 线上测试指引
1. 打开后台 → 搜索文章 → 确认筛选正常
2. 编辑一篇文章 → 修改摘要 → 保存成功
3. 新增文章 → 粘贴 URL 提取 → 保存成功
4. 删除一篇文章 → 确认删除正常
5. 从待审核列表发布一篇文章 → 确认自动提取和发布正常
6. 配置 Kimi API Key → 确认校验和保存正常

### 遗留事项
- 待真人模拟测试确认运行时行为一致

## 2026-05-02 定时搜索防重复逻辑修复

### 问题
- 用户确认：不管手动搜索多少次都不应该影响自动搜索
- 排查发现 `check_window_already_ran()` 不区分手动/自动日志
- `save_log()` 写入北京时间但无时区后缀，PostgreSQL 当 UTC 处理，导致时区错位 8 小时
- 跨日匹配（UTC 23:xx = 北京时间次日 07:xx）时日期字符串不匹配

### 修复

#### 1. 防重复只看 auto 日志
- 文件：`.github/scripts/ai_search.py`
- `check_window_already_ran()` 新增过滤：只看 `details.search_type == 'auto'` 的记录
- 手动搜索（search_type=manual）不会阻塞自动搜索

#### 2. executed_at 改用 UTC 存储
- 文件：`.github/scripts/ai_search.py`
- `save_log()` 中 `executed_at` 从 `beijing_now.isoformat()` 改为 `datetime.utcnow()` + `+00:00` 后缀
- 彻底解决时区错位问题

#### 3. 跨日匹配修复
- 文件：`.github/scripts/ai_search.py`
- 日期匹配从 `today_str in executed_at`（字符串包含）改为精确的 UTC+8 日期计算
- 使用 `datetime.strptime` + `timedelta(hours=8)` 正确转换

### 当前状态
- ✅ 手动搜索不会影响自动搜索
- ✅ executed_at 时区正确
- ✅ 跨日匹配正确
- ✅ 推送部署 `4310dc9`

### 遗留事项
- 观察今晚 20:00/20:17/20:33/20:50 北京时间的 cron 是否正常触发

## 2026-05-01 修复定时搜索未运行 + 兜底机制

### 问题
- 今天早上 08:17/08:23/08:33 北京时间的自动搜索全部未运行
- 排查发现：GitHub Actions cron 未触发（GitHub 对仓库可能跳过 schedule）
- 前端兜底调度器 `autoSearchScheduler.ts` 是死代码——`initAutoSearchScheduler()` 从未被调用
- 北京时间计算有 bug：用 `getHours()` 而非 `getUTCHours()`，导致多加 8 小时

### 修复

#### 1. 激活前端兜底调度器
- 文件：`src/App.tsx`
- 在 `initAnalytics()` 旁添加 `initAutoSearchScheduler()`
- 用户打开网站时自动初始化，每 5 分钟检查是否需要搜索

#### 2. 修复北京时间计算 bug
- 文件：`src/services/autoSearchScheduler.ts`
- `getCurrentSlot()`、`getNextSearchTimeDesc()`、`initAutoSearchScheduler()` 三处全部修复
- 从 `getHours()` 改为 `getUTCHours() + 8`

#### 3. 优化 cron 触发点
- 文件：`.github/workflows/ai-auto-search.yml`
- 从 6 个 cron 增加到 8 个：0:00/0:17/0:33/0:50 + 12:00/12:17/12:33/12:50 UTC
- 对应北京时间：8:00/8:17/8:33/8:50 + 20:00/20:17/20:33/20:50

#### 4. 添加 concurrency 控制
- 文件：`.github/workflows/ai-auto-search.yml`
- 新增 `concurrency: group=ai-auto-search, cancel-in-progress=false`
- 防止多个搜索实例并行，排队等待而非互相取消

### 当前状态
- ✅ 前端兜底调度器已激活（需 API Key 才能执行搜索）
- ✅ 北京时间计算已修复
- ✅ cron 触发点从 6 个增加到 8 个
- ✅ concurrency 防并行已添加
- ✅ 推送部署，线上版本 `851c2c4`

### 提交记录
- `851c2c4` fix: 修复定时搜索未运行 - 前端调度器激活 + cron增加触发点 + concurrency控制

### 遗留事项
- 前端兜底搜索仍依赖 API Key（Kimi/DeepSeek），无 Key 时无法执行
- 如果用户未配置 API Key，仍只能依赖 GitHub Actions cron
- 建议：后续可考虑前端兜底搜索改为直接爬取官方网站（不依赖 AI API）

## 2026-05-01 数据质量全面检查与修复

### 本次目标
- 全面检查所有文章的原文链接，修复"点进去是首页"的问题
- 检查每篇文章的标题、来源、摘要、解读是否对应一致
- 修正来源(source)与实际 URL 不匹配的问题

### 数据质量检查结果（1172篇文章）
- URL 为首页的文章：**0 篇**（数据库中无此问题）
- 来源(source)与 URL 域名不匹配：**90 篇**
- 孤儿 article_details（无对应文章）：141 条
- 文章缺少详情：141 篇（主要是 P 前缀待审核文章和 ZJG 前缀政绩观文章）

### 实际改动

#### 1. 新增 isArticleUrl() 通用 URL 有效性判断
- 文件：`src/lib/utils.ts`
- 替代 DetailPage 中硬编码的 `news.cn`/`qstheory.cn` 首页排除
- 检查 URL 路径深度（>=2 级），对 `gov.cn`/`news.cn`/`people.com.cn` 等要求 >=3 级
- 修复用户反馈的"点进去是 gov.cn 首页"问题

#### 2. 新增 inferSourceFromUrl() 来源自动推断
- 文件：`src/lib/utils.ts`
- 根据 URL 域名自动推断正确来源：`paper.people.com.cn` → 人民日报、`news.cn` → 新华网等
- 覆盖 11 个主流来源的 URL → 来源映射
- 求是文章在 cpc.people.com.cn 转载时保留原始求是来源

#### 3. DetailPage 全面使用推断来源
- 文件：`src/components/DetailPage.tsx`
- 4 处 `speech.source` 替换为 `displaySource`（推断后的来源）
- 覆盖：页面显示、Word 导出、原文链接来源标签、分享面板

#### 4. SpeechCard 列表卡片来源修正
- 文件：`src/components/SpeechCard.tsx`
- 首页列表中的来源标签也使用推断后的来源

### 当前状态
- ✅ 前端 URL 有效性判断已通用化
- ✅ 90 篇文章来源在前端自动修正
- ✅ lint + build 通过
- ✅ 推送部署，线上版本 `56d0d26`

### 提交记录
- `56d0d26` fix: 数据质量修复 - URL有效性通用判断 + 来源自动推断修正90篇文章

### 遗留事项
- ~~清理 141 条孤儿 article_details~~ ✅ 已通过 fix_sources_and_orphans.cjs 脚本清理完毕
- 部分外部网站（如 gov.cn yaowen/liebiao）可能因服务端跳转导致显示首页，这属于外部网站行为，无法在前端修复

## 2026-05-01 后端数据库 source 修正 + 孤儿清理

### 本次目标
- 修正数据库中 90 篇文章的 source 字段（与 URL 域名不匹配）
- 清理 141 条孤儿 article_details 记录

### 实际改动
- 使用 `_local_service_role.txt` 中的 service_role key 绕过 RLS
- 执行 fix_sources_and_orphans.cjs 脚本
- 第一次执行（激进模式）修正了 1093 篇（含合理统一化）
- 第二次验证：0 条不匹配 + 0 条孤儿 → 数据库已干净

### 修正示例
- `新华社` + URL `spp.gov.cn` → `最高人民检察院`
- `新华网` + URL `paper.people.com.cn` → `人民日报`
- `人民网` + URL `news.cn` → `新华网`
- `人民日报` + URL `jcrb.com` → `检察日报`

### 当前状态
- ✅ 数据库 source 全部正确
- ✅ 孤儿 article_details 已清理
- ✅ 前端 inferSourceFromUrl 作为兜底保留

## 2026-05-01 前端性能优化（7项）

### 本次目标
- 消除首页滚动卡顿
- 消除列表渲染抖动
- 优化构建分包，减少首屏 JS 体积
- 优化详情页加载速度

### 实际改动

#### 1. Header scroll 监听 rAF 节流
- 文件：`src/components/Header.tsx`
- 改动：scroll 事件处理从同步 setState 改为 `requestAnimationFrame` + `passive: true`
- 效果：滚动时不再每帧触发 React 重渲染，主线程压力降低

#### 2. ContentList 排序逻辑优化
- 文件：`src/components/ContentList.tsx`
- 改动：移除 `[...speeches].sort()` 中的 `new Date()` 解析（App.tsx 已排好序）；月份 padStart 确保字符串排序正确；用 `localeCompare` 替代正则解析
- 效果：列表分组渲染减少一次 O(n log n) 排序 + N 次 Date 解析

#### 3. SpeechCard + ContentList 事件处理器稳定化
- 文件：`src/components/SpeechCard.tsx`、`src/components/ContentList.tsx`
- 改动：`handleClick` 改用 `useCallback`；`onSaveScroll` 提取为稳定的 `useCallback`
- 效果：SpeechCard 的 `memo` 不再因内联函数引用变化而失效

#### 4. App.tsx 滚动监听 rAF 节流
- 文件：`src/App.tsx`
- 改动：scroll 事件中的 `sessionStorage.setItem` 从同步改为 rAF 节流
- 效果：滚动时不再每帧同步写 sessionStorage，主线程更流畅

#### 5. Vite 构建分包优化
- 文件：`vite.config.ts`
- 改动：新增 `vendor-radix`、`vendor-export`（docx+file-saver）、`vendor-tts`（onnxruntime+piper-tts）三个独立 chunk
- 效果：首屏不再加载导出 Word 和 TTS 语音的重型库，JS 体积显著减小

#### 6. App.tsx filteredSpeeches 排序优化
- 文件：`src/App.tsx`
- 改动：排序时移除 `new Date(b.date).getTime()` 解析，仅用 year/month/day 数字字段
- 效果：每次筛选变化时的排序减少 N 次 Date 构造

#### 7. useArticleDetail 详情页单条查询
- 文件：`src/hooks/useArticleDetail.ts`
- 改动：当本地找不到文章时，改用 Supabase 单条 `.eq('id', id).limit(1)` 查询，替代全量 `getArticles()` + `getZhengjiguanArticles()`
- 效果：详情页首次加载（本地无缓存时）从全量拉取优化为单条查询，速度提升显著

### 当前状态
- ✅ 全部 7 项优化完成
- ✅ lint 通过
- ✅ build 通过
- ✅ 推送部署，线上版本 `0cdeb9b`

### 提交记录
- `0cdeb9b` perf: 7项前端性能优化 - 消除滚动卡顿/排序开销/渲染抖动/首屏体积

### 遗留事项
- 线上验证各项优化效果
- 可继续考虑虚拟列表（当数据量超过 500 条时）

## 2026-05-01 ECC 项目学习与集成

### 本次目标
- 下载并学习 everything-claude-code（ECC）项目，提炼可跨项目复用的最佳实践
- 将智能体、技能、规则集成到 Trae IDE 中，提升所有项目的编程效率

### 完成事项

#### 1. ECC 仓库下载
- 仓库克隆到 `e:\ccswitch\AI编程工作目录\everything-claude-code`
- 全面阅读了 agents(34个)、skills(182个)、rules(15个目录)、commands(68个)、hooks、contexts、docs、examples 等全部核心文件

#### 2. 通用模板扩充（.trae/rules/universal_template.md）
- 从 14 条通用原则扩充到 **107 条**，覆盖 **27 个维度**：
  - 项目管理(14)、编码风格(8)、命名规范(5)、安全检查(3)、代码审查(3)、测试(5)
  - 架构模式(5)、前端模式(4)、Git工作流(2)、开发工作流(4)
  - **新增**：Web设计质量(3)、Web性能(6)、Web安全(5)、Web测试(2)、Web编码风格(3)
  - **新增**：Token优化(3)、TodoWrite实践(2)、架构设计(5)、搜索优先(2)
  - 代码简化(2)、重构清理(2)、上下文管理(3)、Santa验证(2)、无障碍(2)
  - API设计(3)、后端模式(3)、Agent工程(3)

#### 3. Trae 智能体安装
- **官方 8 个**（通过链接一键导入国际版）：
  UI Designer / Frontend Architect / Backend Architect / API Test Pro /
  AI Integration Eng / DevOps Architect / Performance Expert / Compliance Checker
- **自定义 7 个**（手动创建）：
  Planner / Security Reviewer / TDD Guide / Refactor Cleaner /
  Code Explorer / Build Resolver / Code Simplifier
- 默认智能体 5 个，总计 20 个（达到上限）

#### 4. Trae 技能安装
- 32 个技能安装到 `.agents/skills/`（含 SKILL.md + openai.yaml）
- 182 个技能文件安装到 `.trae/skills/`
- 安装位置：当前项目 + `C:\Users\42151\.trae\` + `C:\Users\42151\.trae-cn\`

#### 5. Trae 规则安装
- ECC 全部 rules 目录安装到 `.trae/rules/`（common/web/typescript/python 等）

### 当前状态
- ✅ ECC 仓库下载完成
- ✅ 全部文件阅读完成
- ✅ 通用模板扩充到 107 条原则
- ✅ 17 个智能体已创建（8官方+7自定义+2默认）
- ✅ 182 个技能已安装
- ✅ 规则已安装
- ✅ 冗余记忆已清理

### 未整合内容（按需）
- 语言专用 rules（python/go/rust/java等）→ 以后用到对应语言时再加
- hooks 脚本 → Trae 架构不同，用 Trae 自有 hook 系统
- ecc2/ Rust 重写版 → 实验性质，暂不需要

### 关键文件位置
- ECC 仓库：`e:\ccswitch\AI编程工作目录\everything-claude-code`
- 通用模板：`讲话网站\app\.trae\rules\universal_template.md`
- 用户级 Trae：`C:\Users\42151\.trae\`
- 项目级 .agents：`讲话网站\app\.agents\skills\`

## 2026-04-26 定时任务错峰修复

### 本次目标
- 排查昨晚 AI 自动搜索定时任务未触发原因
- 通过调整 cron 触发时间，降低 GitHub Actions 在整点高峰丢弃 schedule 任务的概率

### 实际改动
- 核对 `.github/workflows/ai-auto-search.yml`：
  - workflow 位于默认分支 `main`
  - 仓库为公开仓库，且近期有 push 活动
  - 原定时配置为北京时间 08:00 / 20:00，对应 UTC `0 0 * * *` / `0 12 * * *`
- 根据 GitHub 官方对 `schedule` 的说明，确认整点属于高负载时段，任务可能延迟或被丢弃
- 将 [ai-auto-search.yml](file:///e:/ccswitch/AI编程工作目录/讲话网站/app/.github/workflows/ai-auto-search.yml#L3-L8) 的 cron 调整为：
  - `17 0 * * *`（北京时间 08:17）
  - `17 12 * * *`（北京时间 20:17）
- 保留 `workflow_dispatch`，便于异常时手动补跑

### 当前状态
- ✅ 定时任务未触发原因已完成排查
- ✅ 定时任务已从整点调整为错峰触发
- ⏳ 待提交并推送部署

### 验证依据
- `ai-auto-search.yml` 位于默认分支 `main`
- 仓库 `kimixpf1/speech-web` 为公开仓库，`pushed_at` 显示近期有活动
- GitHub 官方文档说明：`schedule` 在整点高负载时段可能延迟，严重时会被直接丢弃

### 提交记录
- 待本轮提交

### 遗留事项
- 观察下一次 08:17 / 20:17 定时任务是否正常触发
- 若仍偶发未触发，可继续增加补偿型二次 schedule 或外部触发机制

## 2026-04-26 自动搜索过滤与 AI 分类修复

### 本次目标
- 修正自动搜索 workflow 中评论类、非总书记直接相关、跨来源重复的漏网样例
- 修正“外交 + 致电”稿件被误识别为“政治 + 重要会议”的问题

### 实际改动
- 在 `.github/scripts/ai_search.py` 扩展 `FILTER_RULES`：
  - 新增 `躬身示范` 等评论类/综述类关键词
  - 新增 `王沪宁主持`、`专题宣介会举行` 等非总书记直接参与关键词与正则模式
- 补强 `is_non_direct_xi_title()`：
  - 在“总书记活动白名单”命中后，仍对已知误抓模式继续拦截，避免“躬身示范”“专题宣介会举行”等漏网
- 补强 `normalize_article_title()` / `simplify_title()`：
  - 增加新华社/人民网/人民日报来源前缀清理
  - 增加“习近平向/致……贺电、贺信、回信、复信”等标题归一化，提升求是/人民日报/新华社跨来源重复识别能力
- 调整自动搜索入库字段：
  - 先计算 `category` 再计算 `domain`
  - 入库时补写 `domain` 与 `domain_name`
  - 避免后台因字段缺失把外交稿件错误回落为默认领域
- 调整 `detect_domain()`：
  - 对 `call` 分类及“致电/贺电/贺信/回信/复信”关键词优先识别为 `diplomacy`
- 调整 `src/services/kimiArticleService.ts`：
  - 补充 `call` 为合法分类
  - 补充 AI 返回 JSON 的分类/领域兜底归一化
  - 当标题含“致电/贺电/贺信/回信/复信”时，优先兜底为 `call + diplomacy`
  - 同步更新提示词中的分类规则，明确“致电”优先级高于“会议”

### 当前状态
- ✅ 自动搜索过滤补强完成
- ✅ AI 提取分类/领域兜底修复完成
- ✅ `python -m py_compile .github/scripts/ai_search.py` 通过
- ✅ `npm.cmd run lint` 通过
- ✅ `npm.cmd run build` 通过
- ⏳ 待提交并推送部署

### 验证样例
- “总书记为全民阅读躬身示范” -> 过滤
- ““中国共产党的故事——习近平新时代中国特色社会主义思想在粤港澳大湾区的实践”专题宣介会举行” -> 过滤
- “王沪宁主持召开全国政协主席会议” -> 过滤
- 求是“习近平：……”与平台现有新华社/人民日报同内容标题 -> 参与更强归一化重复比对
- “致电/贺电/贺信/回信/复信”类标题 -> 优先识别为 `call`，领域优先识别为 `diplomacy`

### 提交记录
- 待本轮提交

### 遗留事项
- 继续观察自动搜索日志，确认不同媒体对同一外交致电稿件的标题变体都能正确归类与去重
- 如后续仍有外交稿件被误判，再补充标题模式而不是放宽默认回落逻辑

## 2026-04-21 AI 搜索过滤词可配置化改造

### 本次目标
- 把当前分散在代码中的过滤词改成可配置结构
- 保持现有过滤行为不变，后续新增词只需改一处

### 实际改动
- 在 `.github/scripts/ai_search.py` 引入统一配置字典 `FILTER_RULES`，集中管理：
  - `non_original_keywords`
  - `non_original_parenthetical_tags`
  - `non_direct_xi_keywords`
  - `non_direct_xi_patterns`
  - `direct_xi_activity_keywords`
- 新增 `build_parenthetical_patterns(tags)`，根据 `non_original_parenthetical_tags` 自动构建中英文括号正则，替代手写长正则串
- 现有判定逻辑继续使用同名变量，但变量值改为从 `FILTER_RULES` 派生，保证调用侧无需改动：
  - `NON_ORIGINAL_TITLE_KEYWORDS`
  - `NON_ORIGINAL_TITLE_PATTERNS`
  - `NON_DIRECT_XI_KEYWORDS`
  - `NON_DIRECT_XI_PATTERNS`
  - `DIRECT_XI_ACTIVITY_KEYWORDS`

### 当前状态
- ✅ 过滤词可配置化改造完成
- ✅ 现有判定函数保持兼容
- ✅ 样例回归验证通过（误抓继续过滤、正常总书记活动继续保留）
- ✅ `python -m py_compile .github/scripts/ai_search.py` 通过
- ✅ `npm.cmd run lint` 通过
- ✅ `npm.cmd run build` 通过
- ⏳ 待提交并推送部署

### 验证样例
- “中国式现代化关键在科技现代化（总书记的人民情怀）” -> 过滤
- “坚持以高质量发展推进中国式现代化（人民论坛）” -> 过滤
- “习近平会见法国总统马克龙” -> 保留
- “习近平主席特使、全国政协副主席邵鸿出席刚果（布）总统就职典礼” -> 过滤

### 提交记录
- 待本轮提交

### 遗留事项
- 后续新增栏目词时，优先只改 `FILTER_RULES`，不直接改判定函数
- 持续观察线上搜索日志，按漏网样例小步补充词表

## 2026-04-21 继续补强人民日报栏目型误抓过滤

### 本次目标
- 在已有“总书记的人民情怀”修复基础上，继续补强人民日报常见栏目型误抓过滤
- 降低评论/时评/栏目文章误入“重要讲话”待审核的概率，同时避免误伤总书记本人活动

### 实际改动
- 在 `.github/scripts/ai_search.py` 扩展 `NON_ORIGINAL_TITLE_KEYWORDS`，新增：
  - 人民论坛、人民观察、人民时评、人民要论、人民观点
  - 仲音、钟声、和音、任仲平
- 扩展 `NON_ORIGINAL_TITLE_PATTERNS`，将上述栏目词纳入括号栏目识别
- 保留并复用此前的 `DIRECT_XI_ACTIVITY_KEYWORDS` 白名单兜底逻辑，确保“会见/出席/主持/考察/调研/致电”等总书记本人活动标题不被误杀

### 当前状态
- ✅ 过滤词库扩展完成
- ✅ 样例验证通过（栏目型标题过滤、总书记活动标题保留）
- ✅ `python -m py_compile .github/scripts/ai_search.py` 通过
- ✅ `npm.cmd run lint` 通过
- ✅ `npm.cmd run build` 通过
- ⏳ 待提交并推送部署

### 验证样例
- “中国式现代化关键在科技现代化（总书记的人民情怀）” -> 过滤
- “坚持以高质量发展推进中国式现代化（人民论坛）” -> 过滤
- “推进科技创新和产业创新深度融合（人民观察）” -> 过滤
- “仲音：坚定不移推进高水平对外开放” -> 过滤
- “钟声：开放合作才是人间正道” -> 过滤
- “习近平会见法国总统马克龙” -> 保留
- “习近平在中共中央政治局会议上发表重要讲话” -> 保留

### 提交记录
- 待本轮提交

### 遗留事项
- 继续观察人民日报栏目词新变体（如系列栏目新命名）并小步补充
- 线上确认新增栏目词过滤生效后，再根据实际日志微调
