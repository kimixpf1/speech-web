# todolist

## 使用规则
- 每次动手前先补充“本轮目标 / 待办 / 风险点”
- 每次改动后回写“已完成 / 验证结果 / 下一步”
- 如果项目结构或关键链路发生变化，同时更新项目框架.md

## 当前长期待办
- 持续保证新增文章、AI 提取、摘要/解读展示、删除链路完整可用
- 持续保持 DeepSeek 与 Kimi 的解读格式一致
- 持续保持 article_details 不产生孤儿记录
- 每轮结束前执行真人模拟测试与推送部署

## 本轮事项
- [x] 将用户长期原则写入 .trae/rules/project_rules.md
- [x] 在根目录建立 项目框架.md
- [x] 在根目录建立 todolist.md
- [x] 在根目录建立 项目迭代记录.md
- [x] 初始化写入当前项目结构与关键链路
- [ ] 后续每一轮正式改动前先更新本文件
- [ ] 后续每一轮正式改动后回写本文件

## 本轮完成后项目状态
- 已建立统一规则文件与三份根目录协作文件
- 后续可以直接查看这三份文件，减少反复大面积翻代码
- 后续每轮都应把新的计划、结构变化、遗留事项沉淀到这里

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
