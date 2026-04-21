# 项目迭代记录

## 2026-04-21 AI 搜索误抓继续修复（“总书记的人民情怀”栏目）

### 本次目标
- 修复人民日报标题“（总书记的人民情怀）”这类栏目型误抓
- 在已有“非总书记直接相关”过滤上补充白名单兜底，避免误伤真实总书记活动标题

### 实际改动
- 在 `.github/scripts/ai_search.py` 中扩展 `NON_ORIGINAL_TITLE_KEYWORDS`，新增：`总书记的人民情怀`
- 扩展 `NON_ORIGINAL_TITLE_PATTERNS`，将 `人民情怀` 纳入括号栏目识别
- 新增 `DIRECT_XI_ACTIVITY_KEYWORDS` 白名单（会见/出席/主持/考察/调研/致电/回信等总书记本人活动模式）
- 调整 `is_non_direct_xi_title()`：
  1. 先命中白名单则直接保留
  2. 再执行“非直接相关”关键词与正则判定
  3. 最后执行“主席特使/特别代表”组合判定
- 保持既有评论类过滤与历史去重逻辑不变

### 当前状态
- ✅ 误抓“总书记的人民情怀”已可过滤
- ✅ 非直接相关过滤保留白名单兜底能力
- ✅ `python -m py_compile .github/scripts/ai_search.py` 通过
- ✅ `npm.cmd run lint` 通过
- ✅ `npm.cmd run build` 通过
- ⏳ 待提交并推送部署

### 验证样例
- “中国式现代化关键在科技现代化（总书记的人民情怀）” -> `is_non_original_title=True`（过滤）
- “领会总书记对服务业发展的战略擘画” -> `is_non_direct_xi_title=True`（过滤）
- “习近平主席特使、全国政协副主席邵鸿出席刚果（布）总统就职典礼” -> `is_non_direct_xi_title=True`（过滤）
- “习近平会见法国总统马克龙” -> 非过滤（保留）

### 提交记录
- 待本轮提交

### 遗留事项
- 继续观察是否出现新的人民日报栏目变体（如“人民观察”“人民论坛”）需要补充
- 推送后在线上搜索日志中确认 `non_direct_rejected` 与 `validation_rejected` 统计是否符合预期

## 2026-04-20 AI 搜索误抓修复（非总书记直接相关过滤）

### 本次目标
- 修复 AI 搜索链路中“非总书记直接相关”标题被误抓的问题
- 覆盖用户给出的三类样例：领会解读类、主席特别代表/特使出席类
- 保持既有评论类过滤、历史去重、来源校验能力不退化

### 实际改动
- 在 `.github/scripts/ai_search.py` 新增 `NON_DIRECT_XI_KEYWORDS` 与 `NON_DIRECT_XI_PATTERNS`
- 新增 `is_non_direct_xi_title(title)`，用于识别并过滤非总书记直接相关标题，重点规则包括：
  - “领会总书记/学习贯彻总书记/贯彻落实总书记”类解读标题
  - “习近平主席特使/特别代表/受习近平主席委派（指派）”类代行出席标题
- 在 `merge_and_dedupe()` 的统一入库口 `add()` 中加入该过滤，确保不论来源（新华社/人民日报/百度/人民网兜底）都统一生效
- 增加日志字段：`non_direct_rejected_count` 与 `non_direct_rejected`，方便后续在 search log 中定位被该规则淘汰的条目
- 保留并兼容现有 `is_non_original_title()` 评论/解读过滤逻辑，形成“评论类 + 非直接相关”双层过滤

### 当前状态
- ✅ 误抓过滤逻辑已完成
- ✅ 用户给出的三条样例已覆盖到过滤规则
- ✅ 典型正样本“习近平会见法国总统马克龙”验证可保留
- ✅ `python -m py_compile .github/scripts/ai_search.py` 通过
- ✅ `npm.cmd run lint` 通过
- ✅ `npm.cmd run build` 通过
- ⏳ 待提交并推送部署

### 提交记录
- 待本轮提交

### 遗留事项
- 需在线上观察是否还有新的“非总书记直接相关”变体漏网，若有再补充关键词与模式
- 继续跟踪 jhsjk.people.cn 动态渲染抓取完整性问题（长期待办）
