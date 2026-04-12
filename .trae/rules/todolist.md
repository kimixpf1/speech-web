# todolist

## 使用规则
- 每次动手前先补充“本轮目标 / 待办 / 风险点”
- 每次改动后回写“已完成 / 验证结果 / 下一步”
- 如果项目结构或关键链路发生变化，同时更新 .trae/rules/project_framework.md

## 当前长期待办
- 持续保证新增文章、AI 提取、摘要/解读展示、删除链路完整可用
- 持续保持 DeepSeek 与 Kimi 的解读格式一致
- 持续保持 article_details 不产生孤儿记录
- 每轮结束前执行真人模拟测试与推送部署

## 当前待办
- **[高优先]** 调试新华社文章搜不到的问题：习近平对服务业发展作出重要指示（news.cn/xinhuanet.com），已扩展搜索源（f55b136）但仍未搜到，需查看工作流日志分析根因
- **[中优先]** 修复 search_people_jhsjk() 时区问题：使用 UTC date.today() 而非北京时间，GitHub Actions 在 UTC 0:00（北京 8:00）运行时日期可能差一天
- **[中优先]** 继续观察 Step 3 详情页拆分后的线上稳定性，重点关注摘要/解读生成、语音播报、导出 Word、返回首页链路
- **[中优先]** 后续每一轮正式改动前先更新本文件
- **[中优先]** 后续每一轮正式改动后回写本文件
- **[低优先]** 改进 jhsjk.people.cn 爬取：该站使用 JS 动态渲染，简单 requests.get 只能获取页脚版权信息，实际文章列表无法抓取

## 2026-04-12 前台小步优化方案（⬜ 待执行）

> 每步独立，做完一步 build → preview → 模拟测试 → 再做下一步。风险从低到高排列。

### 第1步 ⬜ 删除 Timeline.tsx 死代码
- **为什么**：Timeline.tsx 未被任何路由引用（App.tsx 的 Routes 里没有 Timeline 路由），是纯死代码；还包含路径 bug（`/#/detail/` 应为 `#/detail/`）
- **涉及文件**：删除 `src/components/Timeline.tsx`
- **风险**：⭐ 几乎零风险（无任何页面使用）
- **改后效果**：减少约 170 行无用代码，包体积微降
- **验证方式**：build → 预览首页、详情页、专题页，确认无影响

### 第2步 ⬜ 统一滚动位置存储方式
- **为什么**：首页用 sessionStorage 存滚动位置，专题页 ZhengjiguanPage 用 localStorage，不一致会导致专题页滚动位置在关闭浏览器后仍然残留
- **涉及文件**：`src/components/ZhengjiguanPage.tsx`（约 2 行改动：localStorage → sessionStorage）
- **风险**：⭐ 几乎零风险
- **改后效果**：专题页滚动恢复行为与首页一致
- **验证方式**：build → 预览专题页，滚动后刷新确认恢复正常

### 第3步 ⬜ vite 分包细化（lucide-react 独立缓存）
- **为什么**：当前 manualChunks 只拆了 react 和 swr，lucide-react 图标库体积不小但没独立分包，每次改业务代码用户都要重新下载图标
- **涉及文件**：`vite.config.ts`（约 3 行改动：manualChunks 增加 `'vendor-icons': ['lucide-react']`）
- **风险**：⭐ 几乎零风险
- **改后效果**：图标库单独缓存，业务更新时用户不重下图标
- **验证方式**：build → 检查 dist/assets 是否多出 vendor-icons chunk → 预览确认页面正常

### 第4步 ⬜ 首页骨架屏提取为独立 memo 组件
- **为什么**：App.tsx 中的 PageLoader 是内联函数 `() => (<div>骨架屏</div>)`，每次父组件渲染都会重建，浪费性能
- **涉及文件**：`src/App.tsx`（约 10 行改动：把 PageLoader 提到组件外部用 React.memo 包裹）
- **风险**：⭐⭐ 低风险
- **改后效果**：减少不必要的组件重建，首页渲染更流畅
- **验证方式**：build → 预览首页加载时骨架屏仍正常显示

### 第5步 ⬜ 移除 ContentList.tsx 重复的详情页预加载逻辑
- **为什么**：ContentList.tsx 和 App.tsx 都有 preloadDetailPage 逻辑，存在重复；预加载行为应集中在一处管理
- **涉及文件**：`src/components/ContentList.tsx`（约 5 行改动：移除重复的 preloadDetailPage import 和调用）
- **风险**：⭐⭐ 低风险
- **改后效果**：代码更清晰，预加载行为更可预测
- **验证方式**：build → 预览首页列表 hover 文章标题后点进详情，确认预加载仍生效

### 执行流程（每步必做）
1. 改代码 → `npm.cmd run build`
2. `npm.cmd run preview` → 浏览器模拟真人操作（首页、筛选、详情、返回、专题页）
3. 确认无误 → git add + commit + push
4. push 后 `git status` 确认远端同步
5. 更新本文件状态（⬜→✅）和迭代记录

## 最近已完成
- [x] 2026-04-11 完成代码结构优化三步路线收尾：配置收敛、SpeechCard 复用、DetailPage 拆分；build 通过并已提交 `a254638`
- [x] 2026-04-09 修复 URL 提取"解析文章内容失败"：偏好 key 不匹配（preferred_api → preferred_extraction_api）、JSON 解析增强（控制字符/尾逗号修复）、CORS/API 日志增强
- [x] 2026-04-08 优化搜索查询策略：多轮精准查询替代单一长查询，扩展搜索源覆盖（f55b136，已推送）
- [x] 2026-04-08 修复手动搜索记录不显示标识徽章的问题（d9d32b5）
- [x] 2026-04-08 线上验证：4 项原始需求全部通过（定时任务标记、折叠日志框、去重逻辑展示、日志每一步可见）
- [x] 2026-04-08 搜索工作流区分手动/定时任务 + 增强详细日志数据 (d992eaf)
- [x] 2026-04-08 RLS修复 + 首页性能优化 (8a4c451)

## 本轮完成后项目状态
- 已建立统一规则文件与三份根目录协作文件
- 后续可以直接查看这三份文件，减少反复大面积翻代码
- 后续每轮都应把新的计划、结构变化、遗留事项沉淀到这里
- 前台核心结构已进一步收敛：常量、设备检测、文本处理、详情数据逻辑、TTS 逻辑已从页面组件中拆出
- 首页列表与专题页卡片已统一复用 SpeechCard，后续样式或交互调整可集中维护

## 最新一轮咨询
- [x] 评估当前项目仍值得优化的方向
- [x] 按优先级整理“稳定性 / 可维护性 / 可观测性 / 体验”优化项
- [x] 回写本文件与项目迭代记录，沉淀本轮咨询结论

## 当前进行中的第一步优化
- [x] 动手前确认本轮目标：统一解读格式清洗逻辑，且不能影响现有全部功能
- [x] 提取共享的解读格式规范化函数，替换多处重复实现
- [x] 跑 build / eslint / tsc，验证现有功能不受影响
- [x] 真人模拟回归关键后台链路
- [x] 验证无误后推送部署并回写记录

## 第一步优化完成情况
- 已在 src/lib/utils.ts 统一维护 normalizeAnalysisText
- aiSummaryService、kimiArticleService、articleDetailService、useAdminArticleManagement 已改为复用同一套规则
- 已补上 articleDetailService 本地缓存读取处的统一调用，避免遗漏旧函数引用
- 已通过 build / eslint / tsc
- 已做真人模拟回归：后台文章管理页可打开，新增文章弹窗可正常显示“解读”输入框，前台详情页可正常展示摘要与解读
- 回归中发现的 404 来自 http://127.0.0.1:4174/favicon.ico，与本轮改动无关

## 当前进行中的第二步优化
- [x] 动手前确认本轮目标：处理历史 article_details 解读文本，并评估 /favicon.ico 404 是否需要最小修复
- [x] 为历史 article_details 增加批量清洗方案，且不影响现有运行链路
- [x] 以最小改动修复 favicon 404，避免新增无意义报错
- [x] 跑 build / eslint / tsc，验证现有功能不受影响
- [x] 真人模拟回归首页、详情页、后台关键链路
- [x] 验证无误后推送部署并回写记录

## 第二步优化完成情况
- 已在 index.html 显式接入站点图标，复用 public/share-cover.svg，首页已不再请求 /favicon.ico 404
- 已新增 scripts/normalize_article_details_analysis.py，用于批量清洗历史 article_details.analysis 文本
- 已通过已登录管理员会话完成历史数据排查：article_details 共 1138 条，其中 1 条旧格式记录需要清洗
- 已实际完成该 1 条历史记录清洗，记录 ID 为 P2024-0257，复查后剩余需清洗数量为 0
- 已通过 build / eslint / tsc
- 已做真人模拟回归：首页正常加载，详情页摘要与解读正常展示，favicon 请求返回 200
- 当前仍可见的 404 来自 analytics 对 Supabase 表名 new_table 的探测回退，不属于 favicon 问题，也不由本轮改动引入

## 当前进行中的第三步优化
- [x] 动手前确认本轮目标：消除 analytics 表名探测 404，且不能影响现有统计功能
- [x] 调整 analytics / supabaseAnalytics 的表名优先级与缓存逻辑
- [x] 跑 build / eslint / tsc，验证现有功能不受影响
- [x] 真人模拟回归首页、后台访问统计、详情页关键链路
- [x] 验证无误后推送部署并回写记录

## 第三步优化完成情况
- analytics.ts 与 supabaseAnalytics.ts 已统一优先使用真实存在的表名 New table，并继续保留表名缓存
- 已避免首页和后台访问统计首次探测时先请求不存在的 new_table，从而消除该 404
- 已验证首页请求链路中 analytics 表探测返回 200，后台访问统计页加载与刷新正常
- 已通过 build / eslint / tsc
- 已做真人模拟回归：首页正常、详情页正常、后台访问统计页正常，相关表探测均为 200

## 当前进行中的第四步优化
- [x] 动手前确认本轮目标：优化人民网文章领域识别，避免 URL 提取后大量默认落入政治分类
- [x] 在 kimiArticleService 中补充人民网 URL/栏目特征推断逻辑，仅在原结果缺失或默认政治时兜底修正
- [x] 同步补全手动粘贴提取链路对 domain/domainName 的回填
- [x] 跑 build / eslint / tsc，验证现有功能不受影响
- [x] 以代表性人民网 URL 样本校验栏目识别映射，并确认首页/详情/后台主链路未受影响
- [x] 验证无误后推送部署并回写记录

## 第四步优化完成情况
- 已为 people.com.cn / jhsjk.people.cn 提取结果补充 URL 栏目识别逻辑
- 当 AI 返回领域为空或默认 politics 时，会优先参考人民网栏目特征修正为经济 / 党建 / 外交 / 国防 / 社会 / 文化 / 生态等更贴近来源栏目
- 已保持原有 AI 识别结果优先级，非默认政治结果不会被强行覆盖
- 已补全手动粘贴提取场景下的 domain / domainName 回填，避免 URL 提取和手动提取表现不一致
- 已通过 build / eslint / tsc
- 已用代表性人民网 URL 样本验证 finance/cpc/world/military/health/culture/env 等栏目映射结果符合预期，politics 栏目不会被误判为经济

## 当前进行中的第五步优化
- [x] 动手前确认本轮目标：优化人民网文章类型识别，减少“发表文章/会议/调研”被默认归为重要讲话
- [x] 在 kimiArticleService 中补充人民网文章类型兜底修正逻辑，仅在原结果缺失或默认 speech 时介入
- [x] 保持现有领域纠偏与解读清洗逻辑不变，避免交叉回归
- [x] 跑 build / eslint / tsc，验证现有功能不受影响
- [x] 使用代表性人民网标题 + URL 样本模拟验证文章类型映射
- [x] 验证无误后推送部署并回写记录

## 第五步优化完成情况
- 已新增人民网文章类型兜底识别：优先识别“发表文章、考察调研、重要会议、重要讲话”
- 仅当 AI 未给出类型，或仍停留在默认 speech 时，才使用人民网标题/栏目特征纠偏，避免覆盖已识别正确的非默认类型
- 已验证“人民日报评论员、和音、《求是》文章”会落到发表文章，“考察/调研/植树/慰问”会落到考察调研，“召开会议/会见/会谈/审议/开幕/闭幕”会落到重要会议
- 已验证“贺信/贺电/致电/回信/复信/指示/命令/致辞”等仍保持重要讲话，不会被误归到会议
- 已通过 build / eslint / tsc

## 当前进行中的第六步优化
- [x] 动手前确认本轮目标：提升人民网文章领域类型识别精度，减少经济 / 外交 / 社会 / 生态等内容被默认归到政治
- [x] 在 kimiArticleService 中补充“URL 栏目 + 标题 + 来源 + 摘要 + 正文关键词”的综合领域评分兜底
- [x] 修正 theory.people.com.cn 被误归到党建的问题，避免《求是》经济类文章继续误判
- [x] 跑 build / eslint / tsc，验证现有功能不受影响
- [x] 使用代表性人民网标题 + URL + 摘要 / 正文样本模拟验证领域映射
- [x] 验证无误后推送部署并回写记录

## 第六步优化完成情况
- 已在 kimiArticleService 中新增领域关键词评分逻辑，综合 URL、标题、来源、摘要、正文为 economy / politics / culture / society / ecology / party / defense / diplomacy 打分
- 已改为优先使用人民网明确栏目，其次再用内容评分兜底，避免很多文章一律落回 politics
- 已移除 theory.people.com.cn 到党建的硬编码误判，让《求是》理论栏目文章回到由内容语义决定领域
- 已完成模拟验证：海洋经济文章归为经济，拉共体峰会贺信归为外交，植树活动归为生态，卫生健康相关座谈归为社会，政治局会议保持政治
- 已通过 build / eslint / tsc 与 diagnostics，确认首页、详情页、后台文章管理主链路未受影响
- 本轮用户可自行复测：后台新增文章里分别粘贴经济 / 外交 / 社会 / 生态 / 政治类人民网链接，检查提取结果中的领域是否不再大面积默认显示“政治”

## 当前进行中的第七步优化
- [x] 动手前确认本轮目标：继续提升人民网领域识别精度，并同步收紧摘要长度、优化首页/详情页返回体验、排查额外搜索工作流
- [x] 在 kimiArticleService 中补充“标题/摘要强信号优先 + 扩展关键词评分”，减少经济 / 外交 / 社会 / 生态等内容继续被回落到政治
- [x] 在 aiSummaryService 中把摘要提示词收紧到 80-120 字，并增加抽取式摘要与长度裁剪兜底
- [x] 在 App.tsx、ContentList.tsx、DetailPage.tsx、articleServiceEnhanced.ts 中补充首页本地缓存回填、详情页预加载、脏数据兜底，降低首次进入和返回首页卡顿/报错概率
- [x] 复核 GitHub Actions 工作流，确认今天上午额外“搜索工作流”并非 fetch-articles 定时自动触发
- [x] 跑 build / eslint / tsc 与 diagnostics，验证现有功能不受影响

## 第七步优化完成情况
- 已在 kimiArticleService 中新增标题/摘要强信号识别，外交、国防、党建、生态、文化、社会、经济类文章优先按主题落域，不再轻易被 politics.people.com.cn 频道名带偏
- 已扩展经济、外交、社会、生态等领域关键词，并放宽非政治领域领先阈值，减少“明明有明显主题词却仍回落政治”的情况
- 已在摘要生成链路中把摘要要求改为 80-120 字，强调“简洁明了、尽量复用原文表述”，同时新增抽取式兜底和超长裁剪，避免摘要比原文还长
- 已在首页链路中接入本地缓存 fallback、详情页空闲预加载、列表 hover/focus 预加载，以及 category 异常值兜底，减少首次进入首页、点击详情、详情返回首页时的卡顿和错误边界触发
- 已确认 fetch-articles.yml 当前只有 workflow_dispatch，没有 schedule；今天上午看到的自动搜索主要来自 ai-auto-search，其他“像搜索”的记录更可能是历史手动运行或其他 workflow
- 已通过 build / eslint / tsc 与 diagnostics，并在本地页面完成首页进入、详情打开、浏览器返回首页的模拟检查，未再出现“页面在加载时遇到了意外错误”
- 本轮用户可自行复测：1）后台新增人民网经济/外交/社会/生态/政治文章，看领域是否更精准；2）详情页点“AI生成”重新生成摘要，确认摘要明显缩短；3）首次打开首页、点进详情再返回首页，确认进入速度和稳定性改善

## 当前进行中的第八步优化
- [x] 动手前确认本轮目标：拆分“AI 搜索优先模型”和“URL 新增文章识别优先模型”，避免两个配置互相联动
- [x] 在 aiSearchService 中增加独立的新增文章识别优先模型存储键与读写方法
- [x] 在 AdminDashboard / AdminApiConfigDialog 中拆出两套独立设置入口
- [x] 在 useAdminArticleManagement 与 kimiArticleService 中改为读取新增文章识别专用偏好
- [x] 跑 build / eslint / tsc 与 diagnostics，验证拆分后不影响现有功能

## 第八步优化完成情况
- 已将 AI 搜索优先模型继续保留在 preferred_search_api 中，专门用于搜索链路
- 已新增 URL 新增文章识别优先模型配置 preferred_article_extraction_api，专门用于后台“新增文章 -> 粘贴 URL -> AI 提取”链路
- 已在后台 API 配置弹窗中拆出两组按钮：“搜索时优先使用”和“URL新增文章识别时优先使用”，现在切换一项不会再带动另一项
- 已让 useAdminArticleManagement 与 kimiArticleService 改为读取新增文章识别专用偏好，后台新增文章时可单独优先走 DeepSeek，AI 搜索仍可单独优先走 Kimi
- 已通过 build / eslint / tsc 与 diagnostics，确认本轮拆分未引入新的编译或类型错误
- 本轮用户可自行复测：后台“管理 API”里把“搜索时优先使用”设成 Kimi，把“URL新增文章识别时优先使用”设成 DeepSeek；关闭后重新打开确认两个选择仍分别保持；再去新增文章页看“已配置 DeepSeek”标识是否跟随识别优先项，而不是跟搜索优先项一起变化

## 2026-04-11 代码结构优化三步路线（已完成）

### Step 1 配置收敛
- [x] 提取并统一维护 `src/config/constants.ts`
- [x] 将分类、领域、级别和本地语音包配置改为集中读取
- [x] 同步改造 FilterBar、Timeline、DetailPage 等消费端

### Step 2 SpeechCard 复用
- [x] 新增 `src/components/SpeechCard.tsx` 统一卡片渲染
- [x] `ContentList.tsx` 改为复用 SpeechCard，删除重复内联卡片 JSX
- [x] `ZhengjiguanPage.tsx` 改为复用 SpeechCard，保持专题页表现一致

### Step 3 DetailPage 拆分
- [x] 提取 `src/utils/textUtils.ts` 承载文本处理纯函数
- [x] 提取 `src/utils/deviceDetect.ts` 承载设备与环境识别
- [x] 提取 `src/hooks/useTTS.ts` 承载语音播报状态与控制
- [x] 提取 `src/hooks/useArticleDetail.ts` 承载详情数据、AI 生成、SEO 相关逻辑
- [x] 重写 `src/components/DetailPage.tsx`，收敛为页面壳与交互编排层
- [x] 执行 `npm.cmd run build` 验证通过
- [x] 提交 `a254638`：`refactor: 代码结构优化 - SpeechCard复用 + DetailPage拆分 + 常量/工具/钩子抽取`

### 本轮结构优化结果
- 前台结构的职责边界更清晰：页面组件负责编排，hooks 负责状态，utils 负责纯逻辑，config 负责常量
- `DetailPage.tsx` 大幅瘦身，后续排查摘要、导出、语音、返回首页等问题时可按模块定位
- 首页列表与专题页已共享同一套卡片结构，后续 UI 调整无需双处维护
- 当前仓库状态仅剩临时类型检查输出文件未跟踪，代码提交已完成

## 版本回退修复 — 建议信箱/搜索日志/导航/浏览器指纹（✅ 已完成）
- [x] **suggestionService.ts**：重新应用 publicSupabase 客户端（commit 5c7589b 的修复被后续版本覆盖丢失）
  - 使用 `persistSession: false` 的独立 Supabase 客户端，避免管理员登录时 RLS 冲突
  - 字段映射确认：`content` 字段正确读取
- [x] **DetailPage.tsx**：清理 isReturning 残余状态（commit f179328 的简化被覆盖丢失）
  - 移除无用的 `isReturning` state，返回导航不再出现额外 loading 遮罩
- [x] **supabaseAnalytics.ts**：重新应用浏览器指纹生成（commit a8ef7d6 的方法被覆盖丢失）
  - 使用 djb2 hash 算法生成基于 userAgent/language/screen/timezone 等的 `fp_` 前缀唯一标识
  - 存储到 localStorage 的 `visitor_id` 和 `ip_hash`
- [x] **project_rules.md**：写入永久防版本回退规则
  - 禁止整文件重写、改动前确认现有状态、保持历史修复完整性、小步提交、修复前查 git log
- [x] **搜索日志功能确认**：AdminPendingTab.tsx 中所有搜索日志功能完整存在
  - 手动/自动区分（search_type）、可折叠详细日志、去重详情（merge_summary/merge_details）
  - 线上未显示是因为代码尚未推送部署
- [x] build ✅ 构建通过
- [x] 模拟测试：线上匿名用户建议信箱提交成功
- [x] 推送部署 → 待验证线上效果

---

## 性能与体验优化方案（2026-04-11 生成）

> 基于构建产物分析，按优先级分为4批共14项。每项完成后实时更新状态（✅已完成 / 🔄进行中 / ⏭跳过）。

### 第一批：构建体积优化（按需加载重型依赖）

| # | 优化项 | 涉及文件 | 当前体积 | 优化方式 | 状态 |
|---|--------|----------|----------|----------|------|
| 1 | TTS/ONNX/Piper 语音播报改为按需加载 | DetailPage.tsx | ort-wasm-simd-threaded.wasm **24MB** + ort.bundle.min.js **389KB** + piper **86KB** + voices_static **94KB** | 已确认本就是动态 import，无需额外改动 | ✅ 已完成（无需改动） |
| 2 | recharts 图表库移除 | chart.tsx, package.json | recharts 打包进 AdminDashboard chunk **122KB** | 删除无引用的 chart.tsx 死代码 + 从 package.json 移除 recharts 依赖（减少37个npm包） | ✅ 已完成 |
| 3 | docx + file-saver 按需加载 | DetailPage.tsx | 打包进 DetailPage chunk **380KB**（含其他代码） | 静态 import 改为 handleExportWord 内动态 import，DetailPage 降至 **48.5KB**（-87%） | ✅ 已完成 |
| 4 | html2canvas 按需加载 | DetailPage.tsx | 打包进 DetailPage chunk **380KB**（含其他代码） | html2canvas 不存在于代码库中，无需处理 | ⏭ 跳过（不存在） |

### 第二批：CSS/UI 优化

| # | 优化项 | 涉及文件 | 当前体积 | 优化方式 | 状态 |
|---|--------|----------|----------|----------|------|
| 5 | 暗色模式 CSS 清理 | index.css + 18个ui/组件 | CSS 103.46KB → **98.26KB**（-5.0%） | 移除 .dark{} CSS变量块 + tailwind darkMode配置 + 18个组件中42处 dark: 类 | ✅ 已完成 |
| 6 | 删除未使用 ui/ 组件 | 52→10个ui/组件 | CSS 98.26KB → **51.48KB**（-47.6%） | 删除42个零引用死代码组件（accordion/alert-dialog/avatar/calendar/checkbox/command/sidebar/switch/table/tooltip等） | ✅ 已完成 |
| 7 | App.css 死代码清理 | App.css（91→38行） | CSS 51.48KB → **50.93KB** | 删除5个零引用自定义样式（line-clamp-3/animate-fade-in/card-hover/gradient-text/no-print） | ✅ 已完成 |

### 第三批：SEO/Meta 优化

| # | 优化项 | 涉及文件 | 说明 | 优化方式 | 状态 |
|---|--------|----------|------|----------|------|
| 8 | 社交分享 Meta 标签 | index.html, DetailPage.tsx, utils.ts | OG URL错误+无Twitter Card | 修正OG URL、添加Twitter Card、详情页动态设置meta | ✅ 已完成 |
| 9 | 结构化数据 JSON-LD | DetailPage.tsx, utils.ts | 当前无结构化数据 | 为文章详情添加 Article 类型 JSON-LD | ✅ 已完成 |
| 10 | sitemap.xml 生成 | — | noindex站点无需sitemap | 跳过（站点robots为noindex，sitemap无实际价值） | ⏭️ 跳过 |
| 11 | robots.txt 优化 | public/robots.txt | 增加AI爬虫覆盖 | 补充Anthropic-AI、PerplexityBot、Applebot-Extended屏蔽 | ✅ 已完成 |

### 第四批：加载体验优化

| # | 优化项 | 涉及文件 | 说明 | 优化方式 | 状态 |
|---|--------|----------|------|----------|------|
| 12 | 首屏骨架屏 | App.tsx | 首次加载无占位 | 5张卡片骨架屏替代"加载文章中..."文字 | ✅ 已完成 |
| 13 | 图片懒加载 | — | 纯文字内容站，无实际图片 | 跳过（无图片资源需要懒加载） | ⏭️ 跳过 |
| 14 | 路由预加载策略 | App.tsx, ContentList.tsx | 详情页预加载 | requestIdleCallback(1200ms) + hover/focus 预加载（已在之前迭代实现） | ✅ 已完成 |

### 优化进度备注
- 用户可能选择跳过某些优化项，如实记录为 ⏭跳过
- 每批完成后执行：build → 本地模拟测试 → 推送部署 → 线上验证
- 预期第一批完成后首屏加载体积从 ~1.3MB 降至 ~650KB（减少约 50%）
