# todolist

## 本文件职责
- 只记录本轮目标、当前待办、执行状态、验证结果、下一步
- 长期规则写入 project_rules.md
- 项目结构与核心链路写入 project_framework.md
- 每轮复盘细节写入 project_iteration_log.md

## 使用规则
- 每次动手前先补充"本轮目标 / 待办 / 风险点"
- 每次改动后回写"已完成 / 验证结果 / 下一步"
- 如果项目结构或关键链路发生变化，同时更新 project_framework.md

## 当前长期待办
- 持续保证新增文章、AI 提取、摘要/解读展示、删除链路完整可用
- 持续保持 DeepSeek 与 Kimi 的解读格式一致
- 持续保持 article_details 不产生孤儿记录
- 每轮结束前执行真人模拟测试与推送部署

## 本轮目标（2026-05-01）
- 修正来源识别不准（人民日报被识别为新华社）
- 修正领域识别不准（劳动节慰问归为政治、党建研讨班归为政治）
- 修正新增文章后界面卡顿
- 修正新增文章偶尔不显示（generateArticleId ID 冲突导致 upsert 覆盖）
- 定时任务兆底机制（多 cron + 今日已运行检测）
- 增强过滤规则（韩正/王毅/读者会等误抓）

## 本轮风险点
- 领域关键词扩充后，可能影响其他文章的分类
- skipArticlesRefresh 后需要确保本地 state 与云端一致

## 当前待办
- **[中优先]** 继续观察自动搜索日志，确认误抓样例不再入库
- **[中优先]** 观察多 cron 兆底机制是否正常触发
- **[低优先]** 改进 jhsjk.people.cn 动态渲染抓取

## 本轮执行状态（2026-05-01）
- ✅ 已完成：`ai_search.py` 来源识别修正（add() 函数调用 fix_source_from_url）
- ✅ 已完成：`ai_search.py` 领域关键词扩充（society: 劳动/工会/职工/工人等, party: 学习贯彻/研讨班/领导干部等）
- ✅ 已完成：`ai_search.py` 过滤规则增强（韩正/王毅/读者会等）
- ✅ 已完成：`ai_search.py` 爬虫标题匹配修复（'主席' → '习近平主席'/'国家主席'）
- ✅ 已完成：`ai_search.py` 今日已运行检测（check_today_already_ran）
- ✅ 已完成：`ai-auto-search.yml` 多 cron 兆底（5个时间点）
- ✅ 已完成：`kimiArticleService.ts` DS 来源修正（fixSourceFromUrl + URL_SOURCE_MAP）
- ✅ 已完成：`articleServiceEnhanced.ts` generateArticleId 改异步查云端避免 ID 冲突
- ✅ 已完成：`useAdminArticleManagement.ts` domainName 硬编码修复
- ✅ 已完成：`AdminDashboard.tsx` + `useAdminArticleManagement.ts` 新增文章后跳过全量刷新避免卡顿
- ✅ 已完成：lint + build 通过
- ✅ 已完成：推送部署，线上版本 `1fff8fa`

## 本轮验证结果
- ✅ 人民日报 URL 不再被识别为新华社
- ✅ 劳动节慰问 → 社会 ✅
- ✅ 省部级学习贯彻全会精神研讨班 → 党建 ✅
- ✅ 韩正/王毅/读者会文章被过滤
- ✅ 新增文章不再全量刷新，界面不卡

## 下一步
- 线上测试新增文章，确认不卡顿且文章正常显示
- 观察今晚多 cron 定时任务是否正常触发
- 继续收集误抓/误分类样例，持续优化过滤规则

## 最近已完成
- [x] 2026-05-01 来源/领域/过滤/定时任务/新增文章卡顿修复
- [x] 2026-04-26 自动搜索过滤、AI 分类、定时错峰修复
- [x] 2026-04-21 过滤词可配置化改造
- [x] 2026-04-21 人民日报栏目误抓过滤扩展
