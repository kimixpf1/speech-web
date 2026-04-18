# todolist

## 本文件职责
- 只记录本轮目标、当前待办、执行状态、验证结果、下一步
- 长期规则写入 project_rules.md
- 项目结构与核心链路写入 project_framework.md
- 每轮复盘细节写入 project_iteration_log.md

## 使用规则
- 每次动手前先补充“本轮目标 / 待办 / 风险点”
- 每次改动后回写“已完成 / 验证结果 / 下一步”
- 如果项目结构或关键链路发生变化，同时更新 project_framework.md

## 当前长期待办
- 持续保证新增文章、AI 提取、摘要/解读展示、删除链路完整可用
- 持续保持 DeepSeek 与 Kimi 的解读格式一致
- 持续保持 article_details 不产生孤儿记录
- 每轮结束前执行真人模拟测试与推送部署

## 本轮目标（2026-04-17 ~ 04-18）
- 精修新华社直抓规则，提升命中率
- 接入人民日报电子版直抓到主链（头版/要闻版，最小接入）
- 修复 ai_search.py 双 BOM 编码问题
- 保持来源优先级：新华社 / 求是 / 人民日报优先，人民网兜底

## 本轮风险点
- 只改 .github/scripts/ai_search.py，不碰 src/ 和前端
- 不破坏现有搜索链路
- 人民日报只接头版/要闻版（node_01~04），不贸然扩展

## 当前待办
- **[高优先]** 修复历史标题去重逻辑（existing_titles_simple 当前从本轮 merged 构建，不是历史库）
- **[中优先]** 修复 search_people_jhsjk() 时区问题
- **[中优先]** 继续观察线上稳定性
- **[低优先]** 改进 jhsjk.people.cn 动态渲染抓取

## 本轮执行状态（2026-04-18）
- ✅ 已完成：修复双 BOM 编码（efbbbfefbbbf → efbbbf）
- ✅ 已完成：新华社直抓新增 mrdx.cn 版面页补抓
- ✅ 已完成：OFFICIAL_DOMAINS 和 BAIDU_SITES 补入 mrdx.cn
- ✅ 已完成：新增 search_rmrb() 人民日报电子版直抓
- ✅ 已完成：merge_and_dedupe() 接入 rmrb_articles，来源顺序：新华社→求是→人民日报→Qwen→Kimi→百度→人民网
- ✅ 已完成：save_log() 更新签名和 pipeline 描述
- ✅ 已完成：py_compile 通过
- ✅ 已完成：本地 search_rmrb() 测试命中 5 条（含今天和昨天）
- ✅ 已完成：本地 search_xinhua_mrdx() 测试命中 1 条
- ✅ 已完成：npm run lint 通过

## 本轮验证结果
- ✅ py_compile 通过
- ✅ npm run lint 通过
- ✅ search_rmrb() 本地实测 5 条
- ✅ search_xinhua_mrdx() 本地实测 1 条
- ✅ 未修改 src/ 和前端代码

## 下一步
- 推送部署后线上验证工作流
- 后续修复 existing_titles_simple 历史标题去重逻辑

## 最近已完成
- [x] 2026-04-17 rules 文档职责收敛：明确长期规则 / 项目结构 / 本轮待办 / 本轮迭代四类文件边界
- [x] 2026-04-12 修复《求是》杂志总书记重要文章漏搜问题：新增 search_qstheory() 直抓求是网、搜索查询增加《求是》关键词、百度 fallback 增加 qstheory.cn、AI 提示词增加求是重点提示、日期校验放宽未来容忍度（`45bd004`）
- [x] 2026-04-12 前台 5 步小步优化全部完成：Timeline 死代码删除、滚动存储统一、vite 分包细化、骨架屏 memo 化、预加载去重
- [x] 2026-04-11 完成代码结构优化三步路线收尾：配置收敛、SpeechCard 复用、DetailPage 拆分；build 通过并已提交 `a254638`
- [x] 2026-04-09 修复 URL 提取“解析文章内容失败”：偏好 key 不匹配、JSON 解析增强、CORS/API 日志增强
- [x] 2026-04-08 优化搜索查询策略：多轮精准查询替代单一长查询，扩展搜索源覆盖（`f55b136`，已推送）
- [x] 2026-04-08 修复手动搜索记录不显示标识徽章的问题（`d9d32b5`）
- [x] 2026-04-08 线上验证：4 项原始需求全部通过（定时任务标记、折叠日志框、去重逻辑展示、日志每一步可见）
- [x] 2026-04-08 搜索工作流区分手动/定时任务 + 增强详细日志数据（`d992eaf`）
- [x] 2026-04-08 RLS 修复 + 首页性能优化（`8a4c451`）