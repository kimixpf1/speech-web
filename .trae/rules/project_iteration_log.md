# 项目迭代记录

## 2026-04-26 定时任务错峰修复

### 本次目标
- 排查昨晚 AI 自动搜索定时任务未触发原因
- 通过调整 cron 触发时间，降低 GitHub Actions 在整点高峰丢弃 schedule 任务的概率

### 实际改动
- 核对 `.github/workflows/ai-auto-search.yml`：
  - workflow 位于默认分支 `main`
  - 仓库为公开仓库，且近期有 push 活动
  - 原定时配置为北京时间 08:00 / 20:00，对应 UTC `0 0 * * *` / `0 12 * * *`
- 根据 GitHub 官方对 `schedule` 的说明，确认整点属于高负载时段，任务可能延迟或被丢弃
- 将 [ai-auto-search.yml](file:///e:/ccswitch/AI编程工作目录/讲话网站/app/.github/workflows/ai-auto-search.yml#L3-L8) 的 cron 调整为：
  - `17 0 * * *`（北京时间 08:17）
  - `17 12 * * *`（北京时间 20:17）
- 保留 `workflow_dispatch`，便于异常时手动补跑

### 当前状态
- ✅ 定时任务未触发原因已完成排查
- ✅ 定时任务已从整点调整为错峰触发
- ⏳ 待提交并推送部署

### 验证依据
- `ai-auto-search.yml` 位于默认分支 `main`
- 仓库 `kimixpf1/speech-web` 为公开仓库，`pushed_at` 显示近期有活动
- GitHub 官方文档说明：`schedule` 在整点高负载时段可能延迟，严重时会被直接丢弃

### 提交记录
- 待本轮提交

### 遗留事项
- 观察下一次 08:17 / 20:17 定时任务是否正常触发
- 若仍偶发未触发，可继续增加补偿型二次 schedule 或外部触发机制

## 2026-04-26 自动搜索过滤与 AI 分类修复

### 本次目标
- 修正自动搜索 workflow 中评论类、非总书记直接相关、跨来源重复的漏网样例
- 修正“外交 + 致电”稿件被误识别为“政治 + 重要会议”的问题

### 实际改动
- 在 `.github/scripts/ai_search.py` 扩展 `FILTER_RULES`：
  - 新增 `躬身示范` 等评论类/综述类关键词
  - 新增 `王沪宁主持`、`专题宣介会举行` 等非总书记直接参与关键词与正则模式
- 补强 `is_non_direct_xi_title()`：
  - 在“总书记活动白名单”命中后，仍对已知误抓模式继续拦截，避免“躬身示范”“专题宣介会举行”等漏网
- 补强 `normalize_article_title()` / `simplify_title()`：
  - 增加新华社/人民网/人民日报来源前缀清理
  - 增加“习近平向/致……贺电、贺信、回信、复信”等标题归一化，提升求是/人民日报/新华社跨来源重复识别能力
- 调整自动搜索入库字段：
  - 先计算 `category` 再计算 `domain`
  - 入库时补写 `domain` 与 `domain_name`
  - 避免后台因字段缺失把外交稿件错误回落为默认领域
- 调整 `detect_domain()`：
  - 对 `call` 分类及“致电/贺电/贺信/回信/复信”关键词优先识别为 `diplomacy`
- 调整 `src/services/kimiArticleService.ts`：
  - 补充 `call` 为合法分类
  - 补充 AI 返回 JSON 的分类/领域兜底归一化
  - 当标题含“致电/贺电/贺信/回信/复信”时，优先兜底为 `call + diplomacy`
  - 同步更新提示词中的分类规则，明确“致电”优先级高于“会议”

### 当前状态
- ✅ 自动搜索过滤补强完成
- ✅ AI 提取分类/领域兜底修复完成
- ✅ `python -m py_compile .github/scripts/ai_search.py` 通过
- ✅ `npm.cmd run lint` 通过
- ✅ `npm.cmd run build` 通过
- ⏳ 待提交并推送部署

### 验证样例
- “总书记为全民阅读躬身示范” -> 过滤
- ““中国共产党的故事——习近平新时代中国特色社会主义思想在粤港澳大湾区的实践”专题宣介会举行” -> 过滤
- “王沪宁主持召开全国政协主席会议” -> 过滤
- 求是“习近平：……”与平台现有新华社/人民日报同内容标题 -> 参与更强归一化重复比对
- “致电/贺电/贺信/回信/复信”类标题 -> 优先识别为 `call`，领域优先识别为 `diplomacy`

### 提交记录
- 待本轮提交

### 遗留事项
- 继续观察自动搜索日志，确认不同媒体对同一外交致电稿件的标题变体都能正确归类与去重
- 如后续仍有外交稿件被误判，再补充标题模式而不是放宽默认回落逻辑

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
