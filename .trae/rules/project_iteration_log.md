# 项目迭代记录

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
