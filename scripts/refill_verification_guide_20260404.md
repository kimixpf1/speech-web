# 原文清洗与摘要补齐核查说明

## 一、先看最终结论

- 最终剩余候选统计文件：`scripts/_refill_candidate_stats_final.json`
- 预期结果：
  - `candidates = 0`
  - `ids = []`

如果这里不是 `0`，说明数据库里仍有文章命中 `needs_refill()` 规则，本轮治理不算完全结束。

## 二、看代表样本

- 样本文件：`scripts/_refill_verification_samples.json`
- 当前已整理的代表样本：
  - `2024-01`
  - `2025-09`
  - `2026-12`
  - `P2026-1019`
  - `ZJG-C05`

建议重点看这几个字段：

- `summary_len`
  - 是否明显大于 20
  - 是否不是空字符串
- `abstract_len`
  - 是否与摘要同步补齐
- `full_text_len`
  - 是否明显大于 0
  - 对长文通常应达到数百到数千字
  - 对主席令这类合法短文可以较短
- `full_text_preview`
  - 是否是正文开头
  - 是否还残留“分享 / 版权 / 客户端下载 / 相关阅读 / 页脚”之类噪音

## 三、人工抽查时看什么算通过

### 1. 摘要

摘要通过的标准：

- 不是空
- 不是“摘要正在整理中...”之类占位词
- 不明显短到只有几个字
- 能概括文章主题，而不是乱码、栏目名、版权语

### 2. 正文

正文通过的标准：

- 开头应直接进入正文，不应是导航栏、栏目路径、版权页
- 中间应是连贯内容，不应夹杂大段站点菜单
- 结尾不应残留：
  - 分享按钮
  - 客户端下载
  - 举报电话
  - 版权声明
  - 相关阅读标题串

### 3. 特殊短文

以下情况允许正文较短：

- 主席令
- 任免令
- 简短指示

这类文章只要正文真实、完整、不是占位文本，就算通过。

## 四、建议的核查顺序

### 第一层：看是否清零

看 `scripts/_refill_candidate_stats_final.json`

### 第二层：看代表样本

看 `scripts/_refill_verification_samples.json`

### 第三层：进数据库或前端详情页抽查

建议优先抽查这 5 条：

- `ZJG-C05`
- `2025-09`
- `2024-01`
- `P2026-1019`
- `2026-12`

## 五、重点样本说明

### `ZJG-C05`

- 原政协站链接会返回 `502`
- 已切换到 `jcrb.com` 镜像正文页
- 适合用来检查“顽固坏链是否已被替代并成功回填”

### `2025-09`

- 原链接为失效旧链
- 已修到新的 `cpc.people.com.cn` 正文页
- 适合用来检查“404 老链接是否已修复”

### `P2026-1019`

- 属于合法短正文
- 适合用来检查“短正文是否被正确保留，而不是被误判为空或异常”

## 六、如果你要继续复核数据库

最直接的核查方式就是看两份文件：

- `scripts/_refill_candidate_stats_final.json`
- `scripts/_refill_verification_samples.json`

如果你想再做一次机器复核，可以重新运行：

```bash
python .\scripts\audit_articles.py
```

以及：

```bash
python -c "import sys, json; from collections import Counter; sys.path.insert(0, 'scripts'); import refill_article_details as rad; articles=rad.fetch_all_rows('articles','id,title,date,source,url,summary','date.desc',batch_size=500); details=rad.fetch_all_rows('article_details','id,abstract,full_text,analysis','id.asc',batch_size=500); detail_map={item['id']: item for item in details}; candidates=[article for article in articles if rad.needs_refill(article, detail_map.get(article['id']))]; print(json.dumps({'candidates': len(candidates), 'ids': [item['id'] for item in candidates]}, ensure_ascii=False, indent=2))"
```

预期输出应为：

```json
{
  "candidates": 0,
  "ids": []
}
```
