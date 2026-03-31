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
- [ ] 验证无误后推送部署并回写记录

## 第四步优化完成情况
- 已为 people.com.cn / jhsjk.people.cn 提取结果补充 URL 栏目识别逻辑
- 当 AI 返回领域为空或默认 politics 时，会优先参考人民网栏目特征修正为经济 / 党建 / 外交 / 国防 / 社会 / 文化 / 生态等更贴近来源栏目
- 已保持原有 AI 识别结果优先级，非默认政治结果不会被强行覆盖
- 已补全手动粘贴提取场景下的 domain / domainName 回填，避免 URL 提取和手动提取表现不一致
- 已通过 build / eslint / tsc
- 已用代表性人民网 URL 样本验证 finance/cpc/world/military/health/culture/env 等栏目映射结果符合预期，politics 栏目不会被误判为经济
