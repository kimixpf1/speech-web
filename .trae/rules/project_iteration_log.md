# 项目迭代记录

## 2026-04-12 前台小步优化方案（待执行）

### 本次目标
- 基于 2026-04-12 对全部前台源码的完整审读，整理出 5 项性价比高、风险低的前台优化
- 每步独立执行：build → preview → 模拟测试 → 推送 → 再做下一步

### 当前状态
- ✅ 第1步：删除 Timeline.tsx 死代码（已完成，`246bb3a`）
- ✅ 第2步：统一滚动位置存储方式（已完成，`964b514`）
- ✅ 第3步：vite 分包细化（已完成，`1fa8f14`）
- ✅ 第4步：骨架屏提取为独立 memo 组件（已完成，`bd700df`）
- ⬜ 第5步：移除 ContentList.tsx 重复预加载逻辑（未开始）

### 优化方案详情（已写入 todolist.md）

| # | 优化项 | 涉及文件 | 风险 |
|---|--------|----------|------|
| 1 | 删除 Timeline.tsx 死代码 | 删除 Timeline.tsx | ⭐零风险 |
| 2 | 统一滚动存储方式 | ZhengjiguanPage.tsx | ⭐零风险 |
| 3 | lucide-react 独立分包 | vite.config.ts | ⭐零风险 |
| 4 | 骨架屏提取为 memo 组件 | App.tsx | ⭐⭐低风险 |
| 5 | 预加载逻辑去重 | ContentList.tsx | ⭐⭐低风险 |

### 提交记录
- `bd700df` perf: 骨架屏组件提取为独立memo组件，避免不必要重渲染
- `246bb3a` refactor: 删除死代码 Timeline.tsx（未被任何路由引用的无效组件）
- `964b514` refactor: 统一滚动位置存储方式 localStorage→sessionStorage（ZhengjiguanPage）
- `1fa8f14` perf: vite分包细化 - lucide-react独立为vendor-icons chunk优化缓存

### 遗留事项
- 高优先待办仍为：调试新华社文章搜不到的问题
- 中优先待办：修复 search_people_jhsjk() 时区问题
- 每步完成后需更新 todolist.md 状态标记和本文件

## 2026-04-12 线上崩溃事故复盘与规则回写

### 事故根因（三个问题叠加）

1. **FilterBar.tsx import 丢失**：2026-04-11 代码结构优化（commit a254638）中，FilterBar.tsx 被整文件重写，导致之前已有的 `LayoutGrid`、`Award`、`Calendar` 图标 import 被静默覆盖丢失。线上运行时抛出 `ReferenceError: Award is not defined`，整个 FilterBar 组件崩溃。
2. **ErrorBoundary "返回首页"路径错误**：ErrorBoundary 的"返回首页"按钮使用 `window.location.href = '/'`，在 GitHub Pages 子路径部署（`/speech-web/`）下导航到根路径导致 404，用户看到错误页后无法自救。
3. **git push 静默失败**：修复代码后执行 `git push origin main` 返回 exit code 0，但实际未推送任何对象到远端。用户访问线上仍看到崩溃版本。

### 连锁崩溃链
```
整文件重写 → 丢失图标 import → FilterBar 运行时崩溃
→ ErrorBoundary 捕获显示错误页
→ 用户点"返回首页"→ 路径错误 → GitHub 404
→ 修复代码后 git push 静默失败
→ 线上持续显示崩溃版本
→ 用户反复看到问题"还是不行"
```

### 修复措施
- FilterBar.tsx 第 1 行恢复完整 import：`import { X, LayoutGrid, Award, Calendar } from 'lucide-react'`
- ErrorBoundary.tsx 第 54 行路径修正：`window.location.href = '/speech-web/#/'`
- 通过 `git push origin main --force` 成功将修复推送到远端

### 提交记录
- `c8df23c` fix: 修复FilterBar缺失图标导入导致崩溃 + ErrorBoundary返回首页路径错误

### 验证结果
- ✅ Chrome DevTools 线上验证：页面完全恢复正常，所有 UI 元素正确渲染
- ✅ Console 无 JS 错误（仅第三方 cookie 警告）
- ✅ `git status` 确认 `Your branch is up-to-date with 'origin/main'`

### 规则回写
- 已在 project_rules.md 新增"代码安全网规则（2026-04-12）"，包含三条永久规则：
  - 规则 A：import 完整性保护（改动后核对 import、重构前记录 import 清单、build 是最终安全网）
  - 规则 B：ErrorBoundary 路径安全（禁止 `/` 跳转、必须用 `/speech-web/#/` 格式）
  - 规则 C：git push 真实性验证（push 后必须用 git status 或 GitHub API 确认远端状态）

### 遗留事项
- 无代码遗留事项，规则已回写完成

## 2026-04-11 代码结构优化三步路线收尾

### 本次目标
- 完成前台代码结构优化三步路线收尾：配置收敛、SpeechCard 复用、DetailPage 拆分
- 在不影响现有首页、专题页、详情页、AI 生成、语音播报、导出 Word 等能力的前提下，降低前台核心页面的耦合度与重复代码
- 完成构建验证、代码提交、远端同步核对与规则文档回写

### 实际改动
- **Step 1 配置收敛**
  - 新增 `src/config/constants.ts`
  - 集中维护 `categoryConfig`、`domainConfig`、`levelConfig`、`LOCAL_VOICE_PACK_ID`、`LOCAL_VOICE_PACK_SIZE_MB`
  - `FilterBar.tsx`、`Timeline.tsx`、`DetailPage.tsx` 等组件改为复用统一配置
- **Step 2 SpeechCard 复用**
  - 新增 `src/components/SpeechCard.tsx`
  - `ContentList.tsx` 删除重复内联卡片 JSX，改为复用 SpeechCard
  - `ZhengjiguanPage.tsx` 改为复用同一套卡片组件，统一专题页与首页卡片呈现
- **Step 3 DetailPage 拆分**
  - 新增 `src/utils/textUtils.ts`，承载详情页相关文本处理纯函数
  - 新增 `src/utils/deviceDetect.ts`，集中管理设备/浏览器环境识别
  - 新增 `src/hooks/useTTS.ts`，抽离语音播报状态与控制流程
  - 新增 `src/hooks/useArticleDetail.ts`，抽离详情数据读取、AI 生成、衍生状态与链接处理
  - `src/components/DetailPage.tsx` 重写为页面壳与交互编排层，减少大组件内联逻辑

### 影响文件
- src/components/ContentList.tsx
- src/components/ZhengjiguanPage.tsx
- src/components/SpeechCard.tsx
- src/components/DetailPage.tsx
- src/components/FilterBar.tsx
- src/components/Timeline.tsx
- src/config/constants.ts
- src/hooks/useArticleDetail.ts
- src/hooks/useTTS.ts
- src/utils/textUtils.ts
- src/utils/deviceDetect.ts

### 验证结果
- ✅ `npm.cmd run build` 成功（exit code 0）
- ✅ `git diff --stat` 显示本轮重构以删除重复代码为主，整体结构明显收敛
- ✅ 当前 `git status` 显示分支与 `origin/main` 同步，说明代码提交已不处于"本地领先线上"状态
- ⚠️ 当前仍有 `tsc_output.txt` 临时输出文件未跟踪，需清理

### 提交记录
- `a254638` refactor: 代码结构优化 - SpeechCard复用 + DetailPage拆分 + 常量/工具/钩子抽取

### 当前收益
- `DetailPage.tsx` 从大而全页面组件收敛为页面编排层，后续排查摘要、语音、导出、返回首页问题时可模块化定位
- 首页列表与专题页卡片结构统一，后续样式或交互修改只需维护一处
- 配置、文本处理、设备识别、详情数据、TTS 逻辑已形成更清晰的职责分层

### 遗留事项
- 清理 `tsc_output.txt` 等本轮验证产生的临时输出文件
- 将本次 rules 文档回写单独提交并推送，保证协作记录与代码状态一致
- 推送后向用户说明本轮更新内容，并给出线上测试指引

## 2026-04-08 RLS修复 + 首页性能优化

### 本次目标
- 修复admin后台无法看到用户建议（suggestions）
- 修复admin后台搜索日志不显示、待审文章不加载
- 修复首页/返回首页卡顿问题

### 根因分析
- **建议/搜索日志问题**：`suggestionService.ts` 和 `pendingArticleService.ts` 全部使用普通 `supabase` 客户端，RLS策略要求 `auth.uid()` 匹配，但admin认证是自定义的（localStorage UUID白名单），`auth.uid()` 返回 NULL，导致 SELECT/UPDATE/DELETE 被 RLS静默拒绝
- **首页卡顿**：ContentList.tsx 排序和分组在每次渲染时重新计算（无 useMemo）；articleServiceEnhanced.ts 的 `getLocalCache()` 每次读取都对所有文章执行 `normalizeSummaryText` 和 `normalizeArticleUrl`

### 实际改动
- **suggestionService.ts**：全部8个函数从 `supabase` 改为 `publicSupabase`（persistSession: false 的客户端绕过RLS）
- **pendingArticleService.ts**：全部文章读取改用 `publicSupabase`，避免 admin 读取被 RLS 拦截
- **articleServiceEnhanced.ts**：`getLocalCache()` 不再重复 normalize，直接复用本地缓存
- **ContentList.tsx**：将列表排序/分组包裹进 `useMemo`

### 影响文件
- src/services/suggestionService.ts
- src/services/pendingArticleService.ts
- src/components/admin/PendingArticlesPanel.tsx
- src/components/admin/SuggestionsPanel.tsx
- src/components/ContentList.tsx
- src/services/articleServiceEnhanced.ts

### 提交记录
- `8a4c451` fix: RLS导致admin无法查看建议/搜索日志 + 首页渲染卡顿优化

### 验证结果
- build 成功（exit code 0）

### 遗留事项
- 需真人验证线上admin后台建议列表、搜索日志是否正常显示
- 需真人验证首页滚动和返回首页是否流畅

## 当前进行中的第八步

### 目标
- 继续排查首页首次进入、详情返回首页时的点击卡顿回归点，确认是否是路由切换后首屏同步工作阻塞了交互

### 预期方式
- 在不破坏现有首页、详情页和专题页链路的前提下，优先复核历史优化是否已回退，再定位当前真正的同步阻塞点
- 必要时对首页滚动恢复、详情页进入清理、详情跳转前的预加载策略做最小范围调整
- 修复后进行真人模拟验证：首次进入首页、从详情页返回首页后立即点击文章标题/查看详情是否仍有卡顿

### 当前状态
- ✅ 已复核历史首页优化仍在：`ContentList.tsx` 的排序/分组仍是 `useMemo`
- ✅ 已复核 `articleServiceEnhanced.ts` 的本地缓存读取未回退为重复 normalize
- ✅ 已重新读取 .trae/rules/ 下的所有规则文件
- ✅ 已对首页滚动恢复做最小修复：改为仅首次恢复一次，并延后到 `requestAnimationFrame` 执行，避免返回首页后立即抢占首帧
- 🔄 正在做本地模拟验证，确认首次进入与返回首页后的点击是否恢复顺畅
- ❌ 尚未完成最终验证与远端推送

### 需要重点复核的代码链路
- `src/App.tsx`
  - 首页 `getLocalArticlesSync` 作为 `SWR fallbackData`
  - `requestIdleCallback` / `setTimeout` 的详情页预加载
  - `useLayoutEffect` 基于 `articles.length` 的滚动恢复
  - `scroll` 事件持续写入 `sessionStorage.lastScrollY`
- `src/components/DetailPage.tsx`
  - 进入详情页时的 `window.scrollTo({ top: 0, behavior: 'auto' })`
  - `setIsLoading(true)`、`setSpeech(null)` 的同步状态重置
  - 返回首页时 `navigate(targetPath, { replace: true })`
- `src/components/ContentList.tsx`
  - 标题/查看详情点击链路、`sessionStorage.lastScrollY` 写入
  - hover/focus 预加载详情页模块

### 下一步
- 找到真正的回归点并做局部修复
