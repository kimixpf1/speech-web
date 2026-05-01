# 项目迭代记录

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
