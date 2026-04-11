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

## 2026-04-11 第一批构建体积优化

### 本次目标
- 执行14项优化方案中的第一批（构建体积优化），减少首屏加载体积

### 实际改动
- **优化 #1 TTS/ONNX/Piper**：已确认本就是动态 import（`await import('@mintplex-labs/piper-tts-web')`），无需额外改动
- **优化 #2 recharts 移除**：
  - 删除 `src/components/ui/chart.tsx`（无任何文件引用的 recharts 封装死代码）
  - 从 `package.json` 移除 `recharts` 依赖，`npm uninstall` 减少37个npm包
- **优化 #3 docx + file-saver 动态加载**：
  - `DetailPage.tsx` 中 docx 和 file-saver 从顶部静态 import 改为 `handleExportWord` 内 `await import()` 动态加载
  - DetailPage chunk 从 **380.5 KB → 48.5 KB**（减少 87%）
  - docx 库被 Vite 自动拆分为独立 lazy chunk（~645KB），仅在用户点击"导出Word"时加载
  - file-saver 被拆分为独立 lazy chunk（~2.9KB）
- **优化 #4 html2canvas**：确认不存在于代码库中，跳过

### 构建产物对比
| 文件 | 优化前 | 优化后 |
|------|--------|--------|
| DetailPage.js | 380.5 KB | 48.5 KB |
| FileSaver.min.js | (内联) | 2.9 KB (lazy) |
| recharts | 有 | 完全消除 |

### 影响文件
- src/components/ui/chart.tsx（已删除）
- src/components/DetailPage.tsx（import 改为动态）
- package.json（移除 recharts 依赖）
- package-lock.json（自动更新）

### 验证结果
- ✅ `npx vite build` 成功
- ✅ TypeScript 零错误（DetailPage.tsx diagnostics = []）
- ✅ 代码逻辑复核通过：所有 docx/file-saver 变量引用均在 handleExportWord 函数作用域内

### 提交记录
- `d0bf2c4` perf: 第一批构建体积优化 - 移除recharts死代码 + docx动态加载

### 遗留事项
- 需用户手动 `git push origin main`（沙箱环境无法弹出凭据窗口）
- 后续第二批优化待启动：CSS/UI 优化（暗色模式清理、Tailwind 未使用类清除、组件级 CSS 拆分）

## 2026-04-11 第二批优化 #5 暗色模式 CSS 清理

### 本次目标
- 移除项目中从未启用的暗色模式（dark mode）死代码，减少 CSS 产物体积

### 根因分析
- tailwind.config.js 配置了 `darkMode: ["class"]`，但整个应用从未在 `<html>` 上切换 `.dark` class
- index.css 中有完整的 `.dark { ... }` CSS 变量块（约 60 行），从未被激活
- 18 个 ui/ 组件中共有 42 处 `dark:` 变体 Tailwind 类，全部为死代码

### 实际改动
- **index.css**：移除 `.dark { ... }` CSS 变量块
- **tailwind.config.js**：移除 `darkMode: ["class"]` 配置
- **18 个 ui/ 组件**：逐一移除所有 `dark:` 变体类（共 42 处）
  - button.tsx（5处）、badge.tsx（3处）、input.tsx（2处）、input-otp.tsx（2处）
  - input-group.tsx（4处）、select.tsx（修复语法错误 + 清理）、checkbox.tsx（3处）
  - switch.tsx（3处）、toggle.tsx（1处）、textarea.tsx（2处）、tabs.tsx（4处）
  - radio-group.tsx（2处）、menubar.tsx（1处）、kbd.tsx（1处）、field.tsx（1处）
  - dropdown-menu.tsx（1处）、context-menu.tsx（1处）、calendar.tsx（1处）

### 构建产物对比
| 指标 | 优化前 | 优化后 |
|------|--------|--------|
| CSS 文件 | 103.46 KB | **98.26 KB**（-5.2 KB / -5.0%） |
| dark: 残留 | 42 处 | **0 处** |

### 验证结果
- ✅ TypeScript 零错误
- ✅ 生产构建成功（exit code 0）
- ✅ `dark:` 全项目搜索 0 匹配
- ✅ 修复了 select.tsx 中上一轮遗留的语法错误（字符串断行）

### 影响文件
- src/index.css、tailwind.config.js
- src/components/ui/ 下 18 个组件文件

### 遗留事项
- 待推送部署
- 后续 #6：Tailwind 未使用类清除 + 删除未使用的 ui/ 组件（约 20+ 个从未被引用的组件）
- 后续 #7：组件级 CSS 拆分
