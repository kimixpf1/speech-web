# 项目迭代记录

## 2026-05-21 Supabase恢复 — 移除所有应急fallback代码 + 安全修复

### 本次目标
- Supabase 5月21日配额重置恢复，移除所有带宽耗尽期间的临时应急代码
- 处理安全审查发现的问题（service_role key 泄露、article_details RLS 未启用）
- 将 outage 期间累积的 23 篇文章导入 Supabase

### 实际改动

#### 1. 恢复 7 个文件的应急代码（commit `dc22d36`）
- `adminAuth.ts`: 移除本地 SHA-256 验证绕过，恢复纯 Supabase Auth
- `ai-auto-search.yml`: 移除 batch commit 步骤和 permissions:write
- `App.tsx`: 恢复 initAnalytics() 调用
- `githubActionsTrigger.ts`: 移除 batch fallback，恢复纯 Supabase count
- `pendingArticleService.ts`: 移除 getBatchArticles/isBatchArticle/batch fallback + 清理未用导入
- `AdminPendingTab.tsx`: 移除 batch 文章 amber 标记和禁用按钮
- `ai_search.py`: 移除 SUPABASE_AVAILABLE 探测和本地 JSON 存储 fallback（4个函数全部恢复为纯 Supabase 操作）

#### 2. 安全修复 + 清理（commit `de8da63`）
- `git rm scripts/_local_service_role.txt`（CRITICAL: service_role key 从 git 移除）
- `.gitignore` 新增敏感文件模式（*_service_role*, *_secret*, *_private_key*, batches/）
- 删除 `.github/scripts/batches/` 目录（3个文件，含 24 篇 outage 期间文章数据）
- 新增 `supabase/migrations/009_enable_article_details_rls.sql`（HIGH: article_details 启用 RLS + 5 条基于角色策略）

#### 3. 数据恢复
- 从 git 历史读取 batch 文件，23 篇文章成功导入 Supabase pending_articles 表

### 当前状态
- ✅ TypeScript 类型检查通过
- ✅ 生产构建成功（26.63s）
- ✅ Python 语法检查通过
- ✅ Code-reviewer 审查通过（APPROVED，无 CRITICAL/HIGH）
- ✅ 推送成功（`dc22d36` + `de8da63`）

### 提交记录
- `dc22d36` fix: 恢复Supabase直连，移除所有带宽耗尽应急fallback代码
- `de8da63` fix: 安全修复+清理 - 移除泄露密钥+删除batch文件+article_details RLS

### 遗留事项
- **需用户操作**: 在 Supabase Dashboard 轮换 service_role key（已在 git 历史中泄露）
- **需用户操作**: 在 Supabase SQL Editor 执行 migration 009（article_details RLS）
- `scripts/audit_articles.py` 硬编码密钥仍待修复为环境变量

## 2026-05-15 Supabase暂停期间搜索结果fallback到GitHub batch文件

### 本次目标
- Supabase 暂停（5月20日恢复），AI搜索工作流结果写入本地batch文件但前端查Supabase count永远显示"暂无新文章"

### 实际改动
1. `githubActionsTrigger.ts`: 新增 `getBatchArticleCount()` 通过 GitHub Contents API 读取 batch 文件文章数量
2. `githubActionsTrigger.ts`: 新增 `decodeBase64Utf8()` 处理中文 base64 解码
3. `githubActionsTrigger.ts`: `waitForWorkflowCompletion` 增加 batch fallback：Supabase count 无变化时检查 batch 文件差值
4. 修复 base64 换行符导致 `atob` 解码失败的问题

### 当前状态
- ✅ TypeScript 检查通过
- ✅ 构建通过
- ✅ 推送成功（`07035ad`）

### 提交记录
- `07035ad` fix: Supabase暂停期间搜索结果通过GitHub batch文件判断新增

### 遗留事项
- **5月20日 Supabase 恢复后必须移除** batch fallback 相关代码，恢复为纯 Supabase count 判断
- batch 文件当前为空，说明工作流可能未运行或未搜到文章，需确认 GitHub Actions 运行记录

## 2026-05-13 v2026.5.21 Supabase封禁 — 管理员后台本地验证

### 本次目标
- 管理员后台 Supabase Auth 不可用，添加临时本地 SHA-256 验证登录绕过

### 实际改动
1. `adminAuth.ts` `loginAdmin()`: catch Supabase 异常 → 本地 SHA-256 密码验证 → 设 localStorage
2. `adminAuth.ts` `isAdminLoggedIn()`: catch Supabase 异常 → 回退 `isAdminLoggedInSync()`
3. `adminAuth.ts` `getCurrentAdmin()`: catch Supabase 异常 → 返回本地构造管理员对象
4. `adminAuth.ts` `logoutAdmin()`: catch Supabase 异常 → 静默忽略
5. `package.json`: 版本号 → 2026.5.21

### 当前状态
- ✅ TypeScript 检查通过
- ✅ 构建通过
- ✅ 推送成功（2fa53f4）

### 提交记录
- `2fa53f4` fix: v2026.5.21 - Supabase封禁期间管理员本地验证登录

### 遗留事项
- 5月20日恢复后需移除 `LOCAL_AUTH_HASHES`、`sha256()` 等临时代码

## 2026-05-13 v2026.5.20 Supabase带宽耗尽应急 - AI搜索本地化

### 本次目标
- Supabase 5月13-20日带宽耗尽封禁，ai_search.py 改为本地JSON存储以维持搜索管道运行

### 实际改动
1. `ai_search.py`: 新增 `check_supabase_available()` 探测 + `SUPABASE_AVAILABLE` 全局标志
2. `save_articles()`: Supabase不可用时写入 `batches/pending_articles_batch.json`（含批内去重）
3. `save_log()`: Supabase写入失败时回退到 `batches/search_logs_batch.json`
4. `get_existing_articles()`: 同时加载 Supabase + 本地批处理文件用于去重
5. `check_window_already_ran()`: 同时检查 Supabase + 本地日志防重复运行
6. `ai-auto-search.yml`: 新增步骤 git commit & push 批处理文件以持久化跨 run
7. 还原 `scripts/audit_articles.py` 未提交改动（硬编码管理员密码，安全隐患）

### 当前状态
- ✅ 构建通过
- ✅ Python 语法检查通过
- ✅ Code-reviewer 审查通过（1 HIGH 已修复）
- ✅ Security-reviewer 审查通过
- ✅ 推送成功（6c45af1）

### 提交记录
- `6c45af1` fix: Supabase带宽耗尽应急 - AI搜索改为本地JSON存储

### 5月20日恢复待办
- 恢复 `ai_search.py` 直写 Supabase，将 outage 期间累积文章批量导入
- 恢复 `ai-auto-search.yml` 移除 commit batch 步骤
- `scripts/audit_articles.py` 硬编码密钥需修复

## 2026-05-10 v2026.5.16 规则迁移+记住密码+搜索修复

### 本次目标
- 把项目规则从 `.trae/rules/` 迁移到 `.claude/rules/`
- 新增「会话结束必须写todo+框架+迭代日志」强制规则
- AdminLogin 增加记住密码自动登录功能
- 修复 githubActionsService 手动搜索触发指向错误
- 建立 `.claude/rules/` 与 `.trae/rules/` 双目录同步机制

### 实际改动
1. 创建 `.claude/rules/` 目录，迁移全部 5 个规则文件
2. 所有文件中 `.trae/rules/` 引用替换为 `.claude/rules/`
3. `project_rules.md` 新增：
   - 「会话结束强制收尾」规则（todo+框架+迭代日志+用量报告）
   - 「规则目录双同步」规则（.claude/rules 主版本，会话开始/结束自动同步）
4. `project_rules.md` 精简：去掉与全局规则重复的内容（智能体编排、代码安全网等），全局规则为最高优先级
5. `project_rules.md` 中 Trae 的 Task/Skill 调用方式适配为 Claude Code 的 Agent/Skill
6. `src/services/adminAuth.ts`：新增凭据Base64存储、自动登录、网络异常容错、输入校验
7. `src/components/AdminLogin.tsx`：新增记住密码勾选框 + 自动登录 loading 态
8. `src/services/githubActionsService.ts`：WORKFLOW_FILE 改为 ai-auto-search.yml
9. `package.json`：版本号升至 2026.5.16
10. 用量报告格式永久记忆（简洁一行，具体模型名，带 tokens/calls）

### 当前状态
- ✅ 构建通过
- ✅ 规则迁移完成
- ✅ 两边目录已同步
- ✅ 推送成功（635b32d）
- ✅ 线上 v2026.5.16 已生效（用户已确认）

### 提交记录
- `635b32d` fix: v2026.5.16 - 记住密码自动登录 + 修复手动搜索触发指向

### 遗留事项
- lint 123 个问题待清理
- 规则目录双同步能否在 Trae 中自动生效有待验证

## 2026-05-06 v2026.5.15 全面巡检+修复+安全扫描

### 本次目标
- 全面线上巡检：首页、详情页、管理员入口、搜索、PWA
- 本地代码质量扫描：构建、lint、安全
- 发现问题并修复

### 实际改动

#### 1. 全面线上巡检
- 首页正常加载，32 篇文章可见
- 详情页正常加载，摘要和解读展示正常
- 线上版本 6930b32 已生效

#### 2. 本地代码质量扫描
- 构建成功（24 个文件，~18.6MB）
- 分包配置完全匹配，所有关键文件存在
- Lint 发现 123 个问题（主要是未用变量和 any 类型）

#### 3. 安全扫描
- 无高危密钥泄露
- 无 XSS 风险（未使用 dangerouslySetInnerHTML）
- 无 SQL 注入风险
- ErrorBoundary 路由格式正确（/speech-web/#/）
- 中低风险：Supabase anon key fallback 硬编码（2处）、GoatCounter 占位符

#### 4. ContentList.tsx Hooks 违规修复（严重）
- 根因：`if (speeches.length === 0) return ...` 在 useMemo/useEffect/useCallback 之前，违反 React Hooks 规则
- 修复：将所有 Hooks 调用移到条件判断之前，空列表判断移到 Hooks 之后
- 影响：消除潜在的运行时状态异常

#### 5. 版本号更新
- v2026.5.14 -> v2026.5.15

### 当前状态
- 构建通过
- 推送成功（17fa5ca）
- 线上首页验证通过

### 提交记录
- 17fa5ca fix: v2026.5.15 - ContentList Hooks fix + inspection

### 遗留事项
- lint 有 123 个问题待后续清理（主要是未用变量）
- Supabase anon key fallback 硬编码（2处）建议移除
- pending_articles SELECT 策略待执行

## 2026-05-05 ECC 二次全面审读 + 全局规则再强化

### 本次目标
- 再全面审读 ECC，找出尚未沉淀到 Trae 全局规则的高价值能力
- 把真正适合跨项目复用的能力固化到 `universal_template.md` 与 `project_rules.md`
- 强化智能体团队的默认协作方式，让后续所有项目都默认受益

### 实际改动

#### 1. 再次审读当前规则基线
- 通读了 `.claude/rules/` 下全部规则文件
- 重新确认了项目规则、项目框架、待办分工与通用模板边界
- 明确本轮重点不是改业务代码，而是继续强化全局协作层

#### 2. 二次挖掘 ECC 可迁移能力
- 结合 ECC 的 commands / rules / workflow 方法论，重新识别出此前尚未硬化的高价值能力
- 本轮确认最值得沉淀的能力包括：
  - 研究优先：先搜仓库现有实现、官方文档、生态方案，再写代码
  - 显式质量门禁：格式、lint/类型、相关测试、安全复核不过不算完成
  - 构建失败最小修复：一次只修一类问题，每修一次立即复验
  - 会话交接：长任务、跨天任务、上下文长任务必须写清目标、已确认结论、失败方案、阻塞点、下一步
  - 检查点机制：长链路任务分阶段可恢复、可回退、可对比
  - 并行调度：安全/性能/结构等独立分析任务优先并行
  - 权限边界：自动放权只能用于目标清晰、风险可控任务
  - 日志脱敏与权限真相源规则

#### 3. 强化 `universal_template.md`
- 在跨项目通用原则中新增并强化了 15 项左右的可复用规则，覆盖：
  - 会话交接
  - 检查点
  - 研究优先
  - 最小修复
  - 并行调度
  - 规则归位
  - 显式质量门禁
  - 高置信评审
  - 发布后最小线上巡检
  - 外部内容/AI 内容按不可信输入处理
  - 可访问性同步检查
  - 自动化权限边界
  - 认证状态不等于真实权限
  - 日志脱敏
  - 文档基于代码事实更新

#### 4. 强化 `project_rules.md`
- 新增本项目特有长期规则：
  - GitHub Pages + PWA 发布后必须核对版本号、Service Worker、manifest、缓存刷新与 HashRouter 路径
  - 涉及 Supabase 表、RLS、认证态、pending/articles/details 链路时必须同时核对前后台身份差异、读写权限和旧数据兼容
- 强化每轮执行边界：
  - 长链路改动必须先设检查点，分阶段验证
  - 涉及部署必须补做线上巡检：版本号、首页、详情页、管理员入口、关键数据链路、PWA 缓存状态
- 强化智能体自动编排规则：
  - 长会话/跨轮任务自动做阶段交接
  - 独立审查项优先并行调度
  - 产出规则/经验时先判断写入位置，避免通用规则与项目规则混淆

### 当前状态
- ✅ 已完成规则基线重读
- ✅ 已完成 ECC 二次高价值能力挖掘
- ✅ 已完成 `universal_template.md` 再强化
- ✅ 已完成 `project_rules.md` 再强化
- ✅ 已完成 `todolist.md` 更新
- ✅ 本轮为规则层与文档层强化，无业务代码改动

### 提交记录
- 无（本轮未进行 git commit / push）

### 遗留事项
- 后续需在真实开发任务中观察新增规则是否真正被执行，而不是只停留在文档层
- 可继续把“发布后线上巡检模板”“Supabase 权限核验模板”“PWA 缓存核验模板”进一步沉淀为稳定流程
- 当前业务代码文件 `pendingArticleService.ts` / `useArticleFilter.ts` 仍未进入本轮改动范围

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
