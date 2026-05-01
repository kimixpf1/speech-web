# 项目框架

## 本文件职责
- 记录项目稳定结构、核心业务链路、关键文件职责
- 记录当前仍有效的已知问题与长期协作方式
- 不记录本轮进度、一次性排查细节、临时执行过程

## 技术栈
- 前端框架：Vite + React + TypeScript
- 样式方案：Tailwind CSS
- UI 组件：Radix UI + 自定义组件
- 数据与后端能力：Supabase
- 部署方式：GitHub Pages

## 项目概览
- src：前端主代码，包含页面组件、后台组件、服务层、hooks、静态数据
- api：预留的服务端接口目录；若后续迁移到支持函数的平台，可启用同源语音代理接口
- public：静态资源与站点公开文件
- supabase/migrations：数据库迁移脚本
- scripts：数据迁移、批处理、排查脚本，现包含历史 article_details 解读清洗脚本
- .github/workflows：部署与自动化任务
- .trae/rules：项目协作规则

## src 当前结构
- components：前台页面组件、后台页面组件、通用 UI 组件；其中列表卡片已统一收敛到 `SpeechCard.tsx`
- hooks：后台文章管理、详情数据、TTS 等复用逻辑
- services：Supabase、AI 提取、摘要生成、详情持久化、后台能力
- data：静态文章数据与专题数据
- lib：基础工具与 Supabase 客户端
- config：集中维护分类、领域、级别、本地语音包等前台配置常量
- utils：沉淀文本处理、设备识别等纯函数工具

## 当前核心业务链路
- 文章列表/详情展示：articles + article_details
- 后台新增文章：管理员后台 -> AI 提取/手动录入 -> URL 栏目/文章类型纠偏 + 标题/摘要强信号优先 + 领域评分 + 解读格式清洗 -> 保存 articles -> 保存 article_details
- AI 搜索：GitHub Actions 定时/手动触发 `.github/scripts/ai_search.py`，来源优先级为新华社 / 人民日报 / 求是 / 人民网兜底，百度仅作补漏
- AI 解读生成：Kimi / DeepSeek -> 摘要提示词 -> 摘要压缩兜底 -> 解读格式清洗 -> 保存 -> 详情展示
- 历史解读治理：批量脚本清洗历史 article_details.analysis -> 前端继续做兜底规范化
- 访问统计：analytics / supabaseAnalytics 优先命中真实统计表并缓存表名
- 首页体验优化：SWR 本地缓存回填 -> 空闲时预加载详情页 -> 列表摘要统一压缩 -> 详情返回首页恢复列表 -> 首页分页（默认每页 50，可选 20/50/100/500） -> 支持页码直选与翻页回顶 -> 支持首页/末页跳转与移动端紧凑分页 -> 分页回顶统一延后到页码状态更新后执行，并绑定目标页在布局完成后回顶 -> 顶部分页栏与快速跳页输入，减少长列表往返滚动成本 -> 空结果态显示当前筛选摘要，并提供一键恢复全部筛选 / 清空搜索词 / 清空筛选条件入口
- 自动搜索过滤链路：来源白名单与 URL 校验 -> 评论/解读类过滤（含“总书记的人民情怀”“人民论坛”“人民观察”“人民时评”“仲音”“钟声”等栏目型标题）-> 非总书记直接相关标题过滤（领会解读类、主席特使/特别代表代行出席类）-> 总书记本人活动白名单兜底（会见/出席/主持/考察/调研/致电等）-> 统一去重（标题+URL）-> 历史库去重（pending+articles）-> 入待审核
- 自动搜索过滤配置：`ai_search.py` 内 `FILTER_RULES` 统一管理过滤词与模式，括号栏目正则通过 `build_parenthetical_patterns()` 从配置自动生成，后续新增词优先改配置不改判定函数
- 部署可观测性：前台页脚展示版本号、commit 短哈希、构建时间，便于确认 GitHub Pages 当前包版本
- 详情页渲染链路：`useArticleDetail` 负责详情数据与 AI 生成，`useTTS` 负责语音播放状态与回退控制，`DetailPage.tsx` 负责页面编排与交互拼装
- 删除文章：删除主记录 -> 数据库级联删除详情 -> 前端校验并清缓存
- 待审核转正式文章：pending_articles -> 新增文章弹窗 -> 提取/补录 -> 发布

## 当前关键文件
- src/components/AdminDashboard.tsx：后台主入口
- src/App.tsx：首页路由、SWR 数据获取、详情页懒加载、首屏回填、分页栏、快速跳页、空结果态与分页回顶控制
- src/components/ContentList.tsx：首页列表渲染、详情跳转入口
- src/components/SpeechCard.tsx：文章卡片统一展示组件，供首页列表与专题页复用
- src/components/ZhengjiguanPage.tsx：专题页展示，现复用 SpeechCard
- src/components/DetailPage.tsx：详情页页面壳，负责展示编排、交互组合、返回首页链路与导出入口
- src/hooks/useArticleDetail.ts：详情数据获取、AI 摘要/解读生成、衍生状态与链接整理
- src/hooks/useTTS.ts：语音播报状态管理、离线语音包/原生 TTS/外部音频回退控制
- src/utils/textUtils.ts：详情页相关文本处理纯函数
- src/utils/deviceDetect.ts：设备、浏览器与运行环境识别工具
- src/config/constants.ts：分类、领域、级别、本地语音包等前台配置集中定义
- src/components/admin/AdminAddArticleDialog.tsx：新增文章弹窗
- src/components/admin/AdminApiConfigDialog.tsx：后台 API 配置弹窗
- src/hooks/useAdminArticleManagement.ts：后台文章管理门面 Hook，组合四个子 Hook（filter/editor/creation/configPrompt）
- src/hooks/admin/useArticleFilter.ts：文章搜索与筛选
- src/hooks/admin/useArticleEditor.ts：文章编辑、详情加载、删除确认
- src/hooks/admin/useArticleCreationFlow.ts：新增草稿、AI 提取、手动补录、待审核发布
- src/hooks/admin/useExtractionCredentialPrompt.ts：Kimi Key 提示与校验弹窗
- src/services/adminArticleWorkflowService.ts：发布编排纯函数（生成文章、保存详情、失败回滚、待审核转正式）
- src/lib/utils.ts：共享工具函数，统一承载解读格式规范化与摘要长度压缩
- src/services/kimiArticleService.ts：文章提取与提取结果格式清洗
- src/services/analytics.ts：前台访问统计与埋点表解析
- src/services/supabaseAnalytics.ts：后台访问统计读取与统计表解析
- src/services/aiSearchService.ts：AI 搜索能力与模型偏好存储
- src/services/aiSummaryService.ts：摘要/解读生成
- src/services/articleDetailService.ts：详情缓存、读写、格式归一化
- src/services/articleServiceEnhanced.ts：文章增删改与首页/详情缓存同步
- scripts/normalize_article_details_analysis.py：历史 article_details 解读文本批量清洗
- supabase/migrations/006_fix_articles_delete_and_article_details_fk.sql：删除权限与级联删除关键迁移

## 当前协作文件分工
- project_rules.md：长期规则、执行边界、事故级安全网
- project_framework.md：结构、链路、关键文件职责、长期有效结论
- todolist.md：本轮目标、当前待办、完成状态、下一步
- project_iteration_log.md：每轮目标、实际改动、验证结果、遗留事项
- universal_template.md：通用项目模板

## 当前长期有效结论
- 前端手动 AI 搜索主要走 src/services/aiSearchService.ts，但 GitHub Actions 定时自动搜索实际执行 .github/scripts/ai_search.py
- 浏览器端 autoSearchScheduler 已不再在 src/main.tsx 启动，避免与 GitHub Actions 的正式自动搜索记录混淆
- 自动搜索当前已覆盖人民网讲话数据库直抓、求是网直抓、百度兜底、新华社直抓、人民日报电子版直抓
- 自动搜索当前去重规则包含 URL 规范化去重、标题归一化精确去重、待审核库与正式文章库历史标题/URL 联合去重
- 自动搜索当前已在抓取阶段过滤评论、述评、解读、回响等非原文标题；并在入库前过滤“非总书记直接相关”标题，同时对总书记本人活动标题进行白名单兜底避免误伤
- 首页统计总数已包含政绩观专题文章，普通文章列表与专题文章列表统计口径统一
- 摘要链路当前已统一为尽量复用原文关键句、适中长度的策略
- 详情页语音播报已针对 GitHub Pages 静态部署做兼容：线上默认不依赖本地 /api/tts，而是优先尝试原生 speechSynthesis，再回退到外部语音源

## 当前已知问题与长期待办
- 调试新华社文章搜不到的问题：已扩展搜索源，但仍需继续结合工作流日志分析根因
- 改进 jhsjk.people.cn 爬取：该站使用 JS 动态渲染，简单 requests.get 无法抓到完整文章列表
- 持续观察详情页拆分后的线上稳定性，重点关注摘要/解读生成、语音播报、导出 Word、返回首页链路

## 当前文档优化结论（2026-04-21）
- rules 目录继续保持“长期规则 / 结构框架 / 本轮待办 / 本轮迭代”分工
- 本次补充同步了 AI 搜索过滤词可配置化（FILTER_RULES + 自动正则生成）
- 后续仅在核心链路、关键职责或长期有效结论发生变化时更新本文件
