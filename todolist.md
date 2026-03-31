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
- [ ] 验证无误后推送部署并回写记录

## 第二步优化完成情况
- 已在 index.html 显式接入站点图标，复用 public/share-cover.svg，首页已不再请求 /favicon.ico 404
- 已新增 scripts/normalize_article_details_analysis.py，用于批量清洗历史 article_details.analysis 文本
- 已通过已登录管理员会话完成历史数据排查：article_details 共 1138 条，其中 1 条旧格式记录需要清洗
- 已实际完成该 1 条历史记录清洗，记录 ID 为 P2024-0257，复查后剩余需清洗数量为 0
- 已通过 build / eslint / tsc
- 已做真人模拟回归：首页正常加载，详情页摘要与解读正常展示，favicon 请求返回 200
- 当前仍可见的 404 来自 analytics 对 Supabase 表名 new_table 的探测回退，不属于 favicon 问题，也不由本轮改动引入
