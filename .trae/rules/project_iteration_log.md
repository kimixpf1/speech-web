# 项目迭代记录

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
- 完成本地模拟验证后，再补充本轮结果与遗留事项

## 2026-04-10 首页点击卡顿修复验证通过

### 本次目标
- 验证之前在 App.tsx 中实施的首页点击卡顿修复是否生效

### 修复回顾
- 在 App.tsx 的 `HomePage` 组件中增加 `hasRestoredScrollRef` 一次性滚动恢复守卫
- 将滚动恢复延迟到 `requestAnimationFrame` 执行，避免返回首页后立即抢占首帧渲染
- 详情页返回首页使用 `navigate(targetPath, { replace: true })` 减少路由栈开销

### 验证结果
- ✅ 首页点击文章标题 → 详情页 → 返回首页：全链路流畅
- ✅ 用户真人验证确认"不卡了"
- ✅ build 成功

### 影响文件
- src/App.tsx（滚动恢复逻辑）

### 遗留事项
- 无，首页点击卡顿问题已关闭
