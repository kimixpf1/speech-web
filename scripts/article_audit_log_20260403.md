# 文章链接与内容体检日志

- 排查时间：2026-04-03 21:46:12
- 文章总数：1144
- 详情记录数：1144
- 原始 HTTP 链接数：9
- 空链接数：0
- 需归一化或替换的链接数：10
- 摘要过短数：320
- 详情异常数：156

## 结论摘要
- 手机端“点原文没反应”主要由两类问题叠加造成：一是移动端/微信环境对纯 `target="_blank"` 外链兼容性差，二是文章库中存在旧 `http://`、旧来源和已知坏链。
- “在参加江苏代表团审议时的重要讲话”原始链接曾指向 `js.people.com.cn`，现已统一替换为更稳定的 `cpc.people.com.cn`。
- 首页列表、政绩观专题页、详情页的原文入口都已统一接入移动端显式打开兜底：优先 `window.open()`，失败时回退到当前页跳转。
- 详情内容异常以存量数据问题为主，前端已补摘要、正文、解读兜底，避免继续向用户显示“加载中”“整理中”之类占位文本。

## 原始 HTTP 链接清单
- `P2024-0034` 习近平将赴澳门出席庆祝澳门回归祖国25周年大会暨澳门特别行政区第六届政府就职典礼并视察澳门特别行政区 | `http://www.news.cn/politics/leaders/20241220/753bab6a3b2047a7b8304855c0086b70/c.html`
- `2024-10` 在湖南考察时的重要讲话 | `http://www.news.cn/politics/20240321/c280965c8ddd41ff9659dbeb0d9e51b6/c.html`
- `2026-21` 中共中央政治局召开会议 审议《中国共产党地方委员会工作条例》中共中央总书记习近平主持会议 | `http://jhsjk.people.cn/article/40690634?isindex=1`
- `2026-22` 习近平在参加首都义务植树活动时强调为山川大地增添锦绣 让中国式现代化底色更加亮丽 | `http://jhsjk.people.cn/article/40692134?isindex=1`
- `2026-23` 习近平致电祝贺萨苏当选连任刚果（布）总统 | `http://jhsjk.people.cn/article/40692139?isindex=1`
- `2026-24` 中共中央和习近平总书记欢迎并邀请中国国民党主席郑丽文率团来访 | `http://jhsjk.people.cn/article/40692140?isindex=1`
- `2026-25` 习近平向世界数据组织成立致贺信 | `http://jhsjk.people.cn/article/40692137?isindex=1`
- `2024-F02` 在中非合作论坛北京峰会开幕式上的主旨讲话 | `http://www.news.cn/20240908/53d07ce1b0ba47e8a45bb75022109cc9/c.html`
- `2024-09` 在重庆考察时的重要讲话 | `http://www.news.cn/politics/leaders/20240424/84305235338744fd833e447a002574e4/c.html`

## 已归一化或替换的重点链接
- `P2024-0034` `http://www.news.cn/politics/leaders/20241220/753bab6a3b2047a7b8304855c0086b70/c.html` -> `https://www.news.cn/politics/leaders/20241220/753bab6a3b2047a7b8304855c0086b70/c.html`
- `2024-10` `http://www.news.cn/politics/20240321/c280965c8ddd41ff9659dbeb0d9e51b6/c.html` -> `https://www.news.cn/politics/20240321/c280965c8ddd41ff9659dbeb0d9e51b6/c.html`
- `2026-21` `http://jhsjk.people.cn/article/40690634?isindex=1` -> `https://jhsjk.people.cn/article/40690634?isindex=1`
- `2026-22` `http://jhsjk.people.cn/article/40692134?isindex=1` -> `https://jhsjk.people.cn/article/40692134?isindex=1`
- `2026-23` `http://jhsjk.people.cn/article/40692139?isindex=1` -> `https://jhsjk.people.cn/article/40692139?isindex=1`
- `2026-24` `http://jhsjk.people.cn/article/40692140?isindex=1` -> `https://jhsjk.people.cn/article/40692140?isindex=1`
- `2026-25` `http://jhsjk.people.cn/article/40692137?isindex=1` -> `https://jhsjk.people.cn/article/40692137?isindex=1`
- `2024-F02` `http://www.news.cn/20240908/53d07ce1b0ba47e8a45bb75022109cc9/c.html` -> `https://www.news.cn/20240908/53d07ce1b0ba47e8a45bb75022109cc9/c.html`
- `2024-09` `http://www.news.cn/politics/leaders/20240424/84305235338744fd833e447a002574e4/c.html` -> `https://www.news.cn/politics/leaders/20240424/84305235338744fd833e447a002574e4/c.html`
- `2026-12` `https://js.people.com.cn/n2/2026/0306/c358232-41516244.html` -> `https://cpc.people.com.cn/n1/2026/0306/c435113-40676004.html`

## 摘要过短样本
- `P2024-0313` 习近平会见乌兹别克斯坦总统米尔济约耶夫 | 摘要长度：19
- `P2024-0314` 习近平会见阿塞拜疆总统阿利耶夫 | 摘要长度：15
- `P2024-0264` 习近平向第六届中俄能源商务论坛致贺信 | 摘要长度：18
- `P2024-0017` 习近平会见李家超 | 摘要长度：8
- `P2024-0020` 习近平会见何厚铧和崔世安 | 摘要长度：12
- `P2024-0021` 习近平考察澳门科技大学 | 摘要长度：11
- `P2024-0136` 习近平向莫桑比克当选总统查波致贺电 | 摘要长度：17
- `P2024-0334` 习近平同秘鲁总统博鲁阿尔特会谈 | 摘要长度：15
- `P2024-0103` 习近平致中山大学建校100周年的贺信 | 摘要长度：18
- `P2024-0024` 习近平考察横琴粤澳深度合作区 | 摘要长度：14

## 详情异常说明
- 本轮发现详情异常 156 条，主要表现为摘要缺失或过短、正文缺失、解读缺失，以及个别记录仍带旧占位文本。
- 这部分已先通过前端详情兜底处理，保证用户进入详情页时不会再直接看到“加载中”“整理中”等占位内容。
- 后续若要彻底消除这 156 条异常，需要再做一轮历史 `article_details` 批量补齐或重抓。

## 重点案例
- `2026-12` 在参加江苏代表团审议时的重要讲话：旧链接 `js.people.com.cn` 已统一替换为 `https://cpc.people.com.cn/n1/2026/0306/c435113-40676004.html`，并在工具层保留映射，兼容数据库或缓存里的旧值。
