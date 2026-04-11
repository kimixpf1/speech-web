# 项目框架

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
- 后台新增文章：管理员后台 -> AI 提取/手动录入 -> 人民网 URL 栏目/文章类型纠偏 + 标题/摘要强信号优先 + 标题/来源/摘要/正文领域评分 + 共享解读格式清洗 -> 保存 articles -> 保存 article_details
- AI 模型偏好：AI 搜索优先模型与 URL 新增文章识别优先模型已拆分为两套独立配置，可分别选择 Kimi / DeepSeek
- AI 解读生成：Kimi / DeepSeek -> 80-120 字摘要提示词 + 最多两句/尽量摘用原文 + 统一摘要压缩兜底 + 共享解读格式清洗 -> 保存 -> 详情展示
- 历史解读治理：批量脚本清洗历史 article_details.analysis -> 前端读取继续兜底规范化
- 访问统计：analytics / supabaseAnalytics 优先命中真实统计表并缓存表名，避免无效 404 探测
- 首页体验优化：SWR 本地缓存回填 -> 空闲时预加载详情页 -> 列表 hover/focus 预加载详情页 -> 列表摘要统一压缩 -> 详情返回首页恢复列表
- 详情页渲染链路：`useArticleDetail` 负责详情数据与 AI 生成，`useTTS` 负责语音播放状态与回退控制，`DetailPage.tsx` 负责页面编排与交互拼装
- 删除文章：删除主记录 -> 数据库级联删除详情 -> 前端校验并清缓存
- 待审核转正式文章：pending_articles -> 新增文章弹窗 -> 提取/补录 -> 发布

## 当前关键文件
- src/components/AdminDashboard.tsx：后台主入口
- src/App.tsx：首页路由、SWR 数据获取、详情页懒加载与首屏回填
- src/components/ContentList.tsx：首页列表渲染、详情跳转入口、详情页预加载；现复用 SpeechCard
- src/components/SpeechCard.tsx：文章卡片统一展示组件，供首页列表与专题页复用
- src/components/ZhengjiguanPage.tsx：专题页展示，现复用 SpeechCard
- src/components/DetailPage.tsx：详情页页面壳，负责展示编排、交互组合、返回首页链路与导出入口
- src/hooks/useArticleDetail.ts：详情数据获取、AI 摘要/解读生成、衍生状态与链接整理
- src/hooks/useTTS.ts：语音播报状态管理、离线语音包/原生 TTS/外部音频回退控制
- src/utils/textUtils.ts：详情页相关文本处理纯函数
- src/utils/deviceDetect.ts：设备、浏览器与运行环境识别工具
- src/config/constants.ts：分类、领域、级别、本地语音包等前台配置集中定义
- api/tts.js：预留的同源语音接口，适用于支持服务端函数的平台
- src/components/admin/AdminAddArticleDialog.tsx：新增文章弹窗
- src/components/admin/AdminApiConfigDialog.tsx：后台 API 配置弹窗，现支持分别设置搜索优先模型与新增文章识别优先模型
- src/hooks/useAdminArticleManagement.ts：后台文章新增/删除/提取主逻辑
- src/lib/utils.ts：共享工具函数，现统一承载解读格式规范化与摘要长度压缩
- src/services/kimiArticleService.ts：文章提取与提取结果格式清洗，现包含人民网 URL 栏目识别、文章类型兜底、标题/摘要强信号识别与领域关键词评分纠偏
- src/services/analytics.ts：前台访问统计与埋点表解析
- src/services/supabaseAnalytics.ts：后台访问统计读取与统计表解析
- src/services/aiSearchService.ts：AI 搜索能力、DeepSeek Key 管理、搜索/新增文章识别模型偏好存储
- src/services/aiSummaryService.ts：摘要/解读生成，现包含摘要长度收紧与抽取式兜底
- src/services/articleDetailService.ts：详情缓存、读写、格式归一化
- src/services/articleServiceEnhanced.ts：文章增删改与同步，现包含首页/详情链路所需的本地缓存同步回填、摘要压缩与默认值兜底
- scripts/normalize_article_details_analysis.py：历史 article_details 解读文本批量清洗
- supabase/migrations/006_fix_articles_delete_and_article_details_fk.sql：删除权限与级联删除关键迁移

## 当前已建立的长期协作机制
- 所有协作文件统一维护在 .trae/rules/ 目录下
- project_rules.md 用于项目长期规则
- 本文件（project_framework.md）用于维护整体结构与关键链路
- todolist.md 用于记录每轮计划、事项和完成状态
- project_iteration_log.md 用于记录每轮改动、验证结果和遗留事项
- universal_template.md 用于通用项目模板
- 后续每次正式运行前，先通读 .trae/rules/ 下的所有规则文件，再开始搜索、改动和部署

## 当前部署核对结论
- 本地最新结构优化提交为 `a254638`，内容包括 SpeechCard 复用、DetailPage 拆分、常量/工具/钩子抽取
- 已完成 `npm.cmd run build` 验证
- 当前 `git status` 显示本地分支与 `origin/main` 同步；代码层结构优化已不处于“本地领先未推送”状态
- 当前待补的是 rules 文档记录与临时输出文件清理，不影响已提交代码状态

## 当前自动搜索链路补充结论
- 前端手动 AI 搜索主要走 src/services/aiSearchService.ts，但 GitHub Actions 定时自动搜索实际执行 .github/scripts/ai_search.py
- 前端页面里原先还残留一条浏览器端 autoSearchScheduler，本地打开页面时也会写搜索日志；现已停止在 src/main.tsx 启动它，避免与 GitHub Actions 的正式自动搜索记录混在一起
- 自动搜索是否能覆盖“人民日报/人民网、新华社/新华网、求是杂志、人民网总书记讲话”，取决于 ai_search.py 里的官方来源直抓、AI 搜索提示词与去重逻辑
- 当前第十一步已进一步收紧 ai_search.py：人民网讲话数据库允许命中标题不带“习近平”的总书记原文；求是网按正文页“作者：习近平”识别原文；新华社/人民网评论综述类标题会被过滤
- 自动搜索当前去重规则包含：URL 规范化去重、标题归一化后的精确去重、文章库已有 URL 排除；其中 jhsjk.people.cn 原文链接与 ?isindex=1 视为同一篇
- 自动搜索当前来源优先级为：求是/新华社/人民日报原文优先，人民网原文兜底；同文重复时会优先保留高优先级来源
- 自动搜索执行记录当前已支持输出过程解释：来源命中、去重保留、非原文过滤、库内标题/链接排除、最终新增清单与保存结果，后台搜索记录面板会按这些阶段展示
- 后台顶部“搜索完成”提示当前也已与真实写入结果对齐：优先读取最新 search_logs 的新增结果，再以 pending_articles 真正的 count 差值兜底，不再出现“明明新增成功却提示暂无新文章”的错报
- GitHub Actions 搜索日志当前已支持区分触发来源：定时 cron 触发显示“定时任务”，后台按钮触发的 workflow_dispatch 显示“手动搜索”，两者不再混淆
- 首页统计总数当前已包含政绩观专题文章，普通文章列表与专题文章列表在首页统计口径上统一
- 摘要链路当前已统一为“尽量复用原文关键句、适中长度”的策略，并在 AI URL 识别框、待审核卡片、正式详情页之间保持一致；审核界面同时会显示摘要字数
- 详情页语音播报当前已针对 GitHub Pages 静态部署做兼容：线上默认不依赖本地 `/api/tts`，而是优先尝试原生 `speechSynthesis`，失败后再按顺序切换多个可直接播放的外部语音源；若后续迁移到支持函数的平台，再可通过 `VITE_ENABLE_TTS_PROXY=true` 显式切回同源语音接口方案
- 详情页当前还补充了一条浏览器端本地语音模型链路：华为手机与微信环境会优先尝试下载并复用中文 `zh_CN-huayan-x_low` 离线语音包，尽量减少对系统 TTS 和第三方音频链接的依赖
- 摘要批量治理已完成：scripts/_fix_v2_deepseek.py 使用 DeepSeek API 为 575 篇摘要为空或过短的文章批量生成摘要（532 成功）；_fix_v2_retry.py 重试补漏（31+4 篇）；_fix_v4_manual.py 手动修复 8 篇因 full_text 编码损坏导致 API 报错的特殊文章
- 当前摘要治理最终统计：1000 篇文章，0 篇摘要为空，890 篇摘要质量达标（≥40 字），8 篇编码损坏文章已人工补写摘要

## 搜索工作流日志增强线上验证结论（2026-04-08）
- 4 项原始需求已全部在线上验证通过：定时任务标记、折叠日志框、去重逻辑展示、日志每一步可见
- 去重管道在线上表现正常：原始候选 → 去重保留 → 非原文过滤 → 库内标题/链接排除 → 最终新增，各环节数量一致
- 已知限制：jhsjk.people.cn 使用 JS 动态渲染，requests.get 只能获取页脚版权信息，文章列表无法完整抓取
- 潜在 bug：search_people_jhsjk() 使用 UTC date.today()，GitHub Actions 在 UTC 0:00（北京 8:00）运行时日期可能差一天
