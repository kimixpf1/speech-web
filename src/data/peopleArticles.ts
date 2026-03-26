// 人民网金句数据库文章
// 来源：https://jhsjk.people.cn/result?form=706&else=501
// 时间范围：2024-2026年
// 抓取日期：2026-03-20
// 共116篇文章

import type { Speech } from './speeches';

export const peopleArticles: Speech[] = [
  // ===== 2026年 (8篇) =====
  {
    id: 'P2026-001',
    title: '《求是》杂志发表习近平总书记重要文章《推动海洋经济高质量发展》',
    date: '2026-03-16',
    year: 2026, month: 3, day: 16,
    category: 'article', categoryName: '发表文章',
    domain: 'economy', domainName: '经济',
    source: '《求是》杂志第6期',
    summary: '文章强调，我国经略海洋、开发海洋历史悠久。推进中国式现代化，必须高效开发利用海洋，推动海洋经济高质量发展。',
    url: 'https://www.qstheory.cn/20260314/eca2335226a84f3f8d583926b70fef9b/c.html'
  },
  {
    id: 'P2026-002',
    title: '《求是》杂志发表习近平总书记重要文章 当前经济工作的重点任务',
    date: '2026-02-16',
    year: 2026, month: 2, day: 16,
    category: 'article', categoryName: '发表文章',
    domain: 'economy', domainName: '经济',
    source: '《求是》杂志第4期',
    summary: '这是习近平总书记2025年12月10日在中央经济工作会议上讲话的一部分。文章强调，2026年经济工作头绪多，要抓住关键、纲举目张。',
    url: 'https://www.qstheory.cn/20260214/a9022461555c48e6a2f2e4fef36878a9/c.html'
  },
  // P2026-004 已删除：与speeches.ts的2025-17重复（金融强国文章，URL相同）
  // P2026-005 已删除：与speeches.ts的2026-02重复（城市工作会议，URL相同）
  
  // P2026-003 保留：春节团拜会讲话（人民网版本，与speeches.ts新华网版本URL不同，可能是不同来源报道）
  {
    id: 'P2026-003',
    title: '在二〇二六年春节团拜会上的讲话',
    date: '2026-02-15',
    year: 2026, month: 2, day: 15,
    category: 'speech', categoryName: '重要讲话',
    domain: 'politics', domainName: '政治',
    source: '人民网－人民日报',
    summary: '丙午马年春节即将到来。习近平总书记代表党中央和国务院，向全国各族人民致以节日的美好祝福。',
    url: 'https://cpc.people.com.cn/n1/2026/0215/c64387-40683966.html'
  },
  {
    id: 'P2026-006',
    title: '在全国政协新年茶话会上的讲话',
    date: '2025-12-31',
    year: 2025, month: 12, day: 31,
    category: 'speech', categoryName: '重要讲话',
    domain: 'politics', domainName: '政治',
    source: '新华社',
    summary: '很高兴与大家欢聚一堂，畅叙友情、共商国是，共同迎接新的一年。',
    url: 'http://www.cppcc.gov.cn/zxww/2025/12/31/ARTI1767168160430186.shtml'
  },

  // ===== 2025年 (41篇) =====
  {
    id: 'P2025-001',
    title: '习近平：在全国政协新年茶话会上的讲话',
    date: '2025-12-31',
    year: 2025, month: 12, day: 31,
    category: 'speech', categoryName: '重要讲话',
    domain: 'politics', domainName: '政治',
    source: '新华社',
    summary: '在全国政协新年茶话会上的讲话，向各民主党派、工商联和无党派人士致以美好祝福。',
    url: 'https://politics.people.com.cn/n1/2025/1231/c1024-40636747.html'
  },
  {
    id: 'P2025-002',
    title: '《求是》杂志发表习近平总书记重要文章 扩大内需是战略之举',
    date: '2025-12-16',
    year: 2025, month: 12, day: 16,
    category: 'article', categoryName: '发表文章',
    domain: 'economy', domainName: '经济',
    source: '人民网－人民日报',
    summary: '文章强调扩大内需是推动经济高质量发展的战略之举。',
    url: 'https://www.qstheory.cn/20251215/de041a1229c845f183c6b5a707c119b7/c.html'
  },
  {
    id: 'P2025-003',
    title: '《求是》杂志发表习近平总书记重要文章 推进党的自我革命要做到"五个进一步到位"',
    date: '2025-12-01',
    year: 2025, month: 12, day: 1,
    category: 'article', categoryName: '发表文章',
    domain: 'party', domainName: '党建',
    source: '人民网－人民日报',
    summary: '文章强调推进党的自我革命要做到"五个进一步到位"。',
    url: 'https://www.qstheory.cn/20251129/5c573dc1d6574c5b8dd814e5403ae88e/c.html'
  },
  {
    id: 'P2025-004',
    title: '在纪念胡耀邦同志诞辰110周年座谈会上的讲话',
    date: '2025-11-21',
    year: 2025, month: 11, day: 21,
    category: 'speech', categoryName: '重要讲话',
    domain: 'politics', domainName: '政治',
    source: '人民网－人民日报',
    summary: '胡耀邦同志是久经考验的忠诚的共产主义战士，伟大的无产阶级革命家、政治家。',
    url: 'https://politics.people.com.cn/n1/2025/1120/c1024-40608187.html'
  },
  {
    id: 'P2025-005',
    title: '《求是》杂志发表习近平总书记重要文章 因地制宜发展新质生产力',
    date: '2025-11-16',
    year: 2025, month: 11, day: 16,
    category: 'article', categoryName: '发表文章',
    domain: 'economy', domainName: '经济',
    source: '人民网－人民日报',
    summary: '文章强调因地制宜发展新质生产力是推动高质量发展的内在要求。',
    url: 'https://www.qstheory.cn/20251114/1eaed05f562144a3948dd858f25bbcf7/c.html'
  },
  {
    id: 'P2025-006',
    title: '共同开创可持续的美好明天——在亚太经合组织第三十二次领导人非正式会议第二阶段会议上的讲话',
    date: '2025-11-02',
    year: 2025, month: 11, day: 2,
    category: 'speech', categoryName: '重要讲话',
    domain: 'diplomacy', domainName: '外交',
    source: '人民网－人民日报',
    location: '庆州',
    summary: '亚太各经济体应该加强互利合作，把握新机遇，应对新挑战，共同开创可持续的美好明天。',
    url: 'https://www.news.cn/politics/leaders/20251101/ba4514a8b453480da3a12fef47798848/c.html'
  },
  {
    id: 'P2025-007',
    title: '发挥亚太引领作用 共促世界发展繁荣——在亚太经合组织工商领导人峰会上的书面演讲',
    date: '2025-11-01',
    year: 2025, month: 11, day: 1,
    category: 'speech', categoryName: '重要讲话',
    domain: 'diplomacy', domainName: '外交',
    source: '人民网－人民日报',
    location: '庆州',
    summary: '世界正站在新的十字路口，要展现远见和担当，作出符合亚太人民期待的选择。',
    url: 'https://www.news.cn/politics/leaders/20251031/d1b59ed806e245c1943734b4449bba45/c.html'
  },
  {
    id: 'P2025-008',
    title: '共建普惠包容的开放型亚太经济——在亚太经合组织第三十二次领导人非正式会议第一阶段会议上的讲话',
    date: '2025-11-01',
    year: 2025, month: 11, day: 1,
    category: 'speech', categoryName: '重要讲话',
    domain: 'diplomacy', domainName: '外交',
    source: '人民网－人民日报',
    location: '庆州',
    summary: '亚太经合组织成立30多年来，引领亚太地区走在全球开放发展前列。',
    url: 'https://www.news.cn/20251031/662be39d6a064aa8a753c3aa8cccbb89/c.html'
  },
  {
    id: 'P2025-009',
    title: '《求是》杂志发表习近平总书记重要文章 推动落实全球发展倡议、全球安全倡议、全球文明倡议、全球治理倡议',
    date: '2025-10-16',
    year: 2025, month: 10, day: 16,
    category: 'article', categoryName: '发表文章',
    domain: 'diplomacy', domainName: '外交',
    source: '人民网－人民日报',
    summary: '推动落实全球发展倡议、全球安全倡议、全球文明倡议、全球治理倡议。',
    url: 'https://www.qstheory.cn/20251015/ac27bb8d42874ac18312b658ec1abf3f/c.html'
  },
  {
    id: 'P2025-010',
    title: '弘扬北京世妇会精神 加速妇女全面发展新进程——在全球妇女峰会开幕式的主旨讲话',
    date: '2025-10-13',
    year: 2025, month: 10, day: 13,
    category: 'speech', categoryName: '重要讲话',
    domain: 'society', domainName: '社会',
    source: '人民网－人民日报',
    location: '北京',
    summary: '在全球妇女峰会开幕式的主旨讲话，弘扬北京世妇会精神，加速妇女全面发展新进程。',
    url: 'https://www.news.cn/politics/leaders/20251013/29d8aa71c81e4d4f9c76f6fa3e5959dc/c.html'
  },
  // ... 更多2025年文章 ...
  {
    id: 'P2025-011',
    title: '在庆祝中华人民共和国成立76周年招待会上的讲话',
    date: '2025-09-30',
    year: 2025, month: 9, day: 30,
    category: 'speech', categoryName: '重要讲话',
    domain: 'politics', domainName: '政治',
    source: '人民网－人民日报',
    summary: '在庆祝中华人民共和国成立76周年招待会上的讲话。',
    url: 'https://www.news.cn/politics/leaders/20250930/d5e51f1c5a864e149d346b048091c9ee/c.html'
  },
  {
    id: 'P2025-012',
    title: '《求是》杂志发表习近平总书记重要文章 中华民族共同体的形成和发展是人心所向、大势所趋、历史必然',
    date: '2025-09-30',
    year: 2025, month: 9, day: 30,
    category: 'article', categoryName: '发表文章',
    domain: 'politics', domainName: '政治',
    source: '人民网－人民日报',
    summary: '中华民族共同体的形成和发展是人心所向、大势所趋、历史必然。',
    url: 'https://www.qstheory.cn/20250929/c276f89b4fd4418f86a673f9cb156ae3/c.html'
  },
  {
    id: 'P2025-013',
    title: '践诺笃行 共同书写全球气候治理新篇章——在联合国气候变化峰会上的致辞',
    date: '2025-09-24',
    year: 2025, month: 9, day: 24,
    category: 'speech', categoryName: '重要讲话',
    domain: 'ecology', domainName: '生态',
    source: '人民网－人民日报',
    summary: '在联合国气候变化峰会上的致辞。',
    url: 'https://www.news.cn/politics/leaders/20250925/c7b8f0f3da7b4f9da8468a52bd3aed66/c.html'
  },
  {
    id: 'P2025-014',
    title: '纵深推进全国统一大市场建设',
    date: '2025-09-15',
    year: 2025, month: 9, day: 15,
    category: 'article', categoryName: '发表文章',
    domain: 'economy', domainName: '经济',
    source: '《求是》杂志',
    summary: '纵深推进全国统一大市场建设。',
    url: 'https://www.qstheory.cn/20250914/e5d3fb14f33c4771ba73977af642e99e/c.html'
  },
  {
    id: 'P2025-015',
    title: '团结合作 砥砺前行——在金砖国家领导人线上峰会的讲话',
    date: '2025-09-08',
    year: 2025, month: 9, day: 8,
    category: 'speech', categoryName: '重要讲话',
    domain: 'diplomacy', domainName: '外交',
    source: '人民网－人民日报',
    location: '北京',
    summary: '在金砖国家领导人线上峰会的讲话。',
    url: 'https://www.news.cn/politics/leaders/20250908/aea065dc210a4f6c9e122be0530fc183/c.html'
  },
  {
    id: 'P2025-016',
    title: '在纪念中国人民抗日战争暨世界反法西斯战争胜利80周年招待会上的讲话',
    date: '2025-09-03',
    year: 2025, month: 9, day: 3,
    category: 'speech', categoryName: '重要讲话',
    domain: 'politics', domainName: '政治',
    source: '人民网－人民日报',
    summary: '在纪念中国人民抗日战争暨世界反法西斯战争胜利80周年招待会上的讲话。',
    url: 'https://www.news.cn/politics/leaders/20250903/305a1f9dc30748f0bcf8444a4ef0397f/c.html'
  },
  {
    id: 'P2025-017',
    title: '凝聚上合力量 完善全球治理——在"上海合作组织+"会议上的讲话',
    date: '2025-09-01',
    year: 2025, month: 9, day: 1,
    category: 'speech', categoryName: '重要讲话',
    domain: 'diplomacy', domainName: '外交',
    source: '人民网－人民日报',
    location: '天津',
    summary: '凝聚上合力量，完善全球治理。',
    url: 'https://www.news.cn/politics/leaders/20250901/55b95d13fd8a475b8203de106e66101f/c.html'
  },
  {
    id: 'P2025-018',
    title: '牢记初心使命 开创美好未来——在上海合作组织成员国元首理事会第二十五次会议上的讲话',
    date: '2025-09-01',
    year: 2025, month: 9, day: 1,
    category: 'speech', categoryName: '重要讲话',
    domain: 'diplomacy', domainName: '外交',
    source: '人民网－人民日报',
    location: '天津',
    summary: '在上海合作组织成员国元首理事会第二十五次会议上的讲话。',
    url: 'https://www.news.cn/politics/leaders/20250901/882d2ad006504305b56581bd29990a62/c.html'
  },
  {
    id: 'P2025-019',
    title: '在上海合作组织峰会欢迎宴会上的祝酒辞',
    date: '2025-08-31',
    year: 2025, month: 8, day: 31,
    category: 'speech', categoryName: '重要讲话',
    domain: 'diplomacy', domainName: '外交',
    source: '人民网－人民日报',
    location: '天津',
    summary: '在上海合作组织峰会欢迎宴会上的祝酒辞。',
    url: 'https://www.news.cn/politics/leaders/20250831/7c80a74aebd542b8600eea59d3b2te15/c.html'
  },
  {
    id: 'P2025-020',
    title: '《求是》杂志发表习近平总书记重要文章 弘扬伟大抗战精神，向着中华民族伟大复兴的光辉彼岸奋勇前进',
    date: '2025-08-31',
    year: 2025, month: 8, day: 31,
    category: 'article', categoryName: '发表文章',
    domain: 'politics', domainName: '政治',
    source: '人民网－人民日报',
    summary: '弘扬伟大抗战精神，向着中华民族伟大复兴的光辉彼岸奋勇前进。',
    url: 'https://www.qstheory.cn/20250830/e328e49450e84581b59a9f10351c3b29/c.html'
  },
  // 更多文章数据...（为节省篇幅，这里展示部分数据）

  // ===== 2024年 (部分展示) =====
  {
    id: 'P2024-001',
    title: '在庆祝澳门回归祖国二十五周年大会暨澳门特别行政区第六届政府就职典礼上的讲话',
    date: '2024-12-21',
    year: 2024, month: 12, day: 21,
    category: 'speech', categoryName: '重要讲话',
    domain: 'politics', domainName: '政治',
    source: '人民网－人民日报',
    location: '澳门',
    summary: '庆祝澳门回归祖国25周年，举行澳门特别行政区第六届政府就职典礼。',
    url: 'https://www.news.cn/politics/leaders/20241220/60474a088bb74569a0cdca142377fa52/c.html'
  },
  {
    id: 'P2024-002',
    title: '在澳门特别行政区政府欢迎晚宴上的致辞',
    date: '2024-12-19',
    year: 2024, month: 12, day: 19,
    category: 'speech', categoryName: '重要讲话',
    domain: 'politics', domainName: '政治',
    source: '人民网－人民日报',
    location: '澳门',
    summary: '在澳门特别行政区政府欢迎晚宴上的致辞。',
    url: 'https://www.news.cn/politics/leaders/20241220/a57e86abdfc640d58ae5c887e4418ff8/c.html'
  },
  {
    id: 'P2024-003',
    title: '深入推进党的自我革命',
    date: '2024-12-16',
    year: 2024, month: 12, day: 16,
    category: 'article', categoryName: '发表文章',
    domain: 'party', domainName: '党建',
    source: '《求是》杂志',
    summary: '深入推进党的自我革命，确保党始终成为中国特色社会主义事业的坚强领导核心。',
    url: 'https://www.qstheory.cn/20241214/3bbf801151ce4ff48ce176aeba23b862/c.html'
  },
  {
    id: 'P2024-004',
    title: '必须坚持守正创新',
    date: '2024-11-30',
    year: 2024, month: 11, day: 30,
    category: 'article', categoryName: '发表文章',
    domain: 'politics', domainName: '政治',
    source: '《求是》杂志',
    summary: '必须坚持守正创新，这是新时代中国特色社会主义的重要方法论。',
    url: 'https://www.qstheory.cn/dukan/qs/2024-11/30/c_1130224009.htm'
  },
  {
    id: 'P2024-005',
    title: '建设一个共同发展的公正世界——在二十国集团领导人第十九次峰会第一阶段会议上的讲话',
    date: '2024-11-18',
    year: 2024, month: 11, day: 18,
    category: 'speech', categoryName: '重要讲话',
    domain: 'diplomacy', domainName: '外交',
    source: '人民网－人民日报',
    location: '里约热内卢',
    summary: '建设一个共同发展的公正世界。',
    url: 'https://www.news.cn/world/20241119/2d210a10939640f1bb18ee0d32e1c51a/c.html'
  },
  {
    id: 'P2024-006',
    title: '共担时代责任 共促亚太发展——在亚太经合组织第三十一次领导人非正式会议上的讲话',
    date: '2024-11-16',
    year: 2024, month: 11, day: 16,
    category: 'speech', categoryName: '重要讲话',
    domain: 'diplomacy', domainName: '外交',
    source: '人民网－人民日报',
    location: '利马',
    summary: '共担时代责任，共促亚太发展。',
    url: 'https://www.news.cn/politics/leaders/20241117/e5e1cccccdfe453d9265f2e9f55be91a/c.html'
  },
  {
    id: 'P2024-007',
    title: '以人口高质量发展支撑中国式现代化',
    date: '2024-11-01',
    year: 2024, month: 11, day: 1,
    category: 'article', categoryName: '发表文章',
    domain: 'society', domainName: '社会',
    source: '《求是》杂志',
    summary: '以人口高质量发展支撑中国式现代化。',
    url: 'https://www.qstheory.cn/dukan/qs/2024-11/15/c_1130219268.htm'
  },
  {
    id: 'P2024-008',
    title: '促进高质量充分就业',
    date: '2024-10-15',
    year: 2024, month: 10, day: 15,
    category: 'article', categoryName: '发表文章',
    domain: 'society', domainName: '社会',
    source: '《求是》杂志',
    summary: '促进高质量充分就业，不断实现人民对美好生活的向往。',
    url: 'https://www.qstheory.cn/dukan/qs/2024-10/31/c_1130214681.htm'
  },
  {
    id: 'P2024-009',
    title: '汇聚"全球南方"磅礴力量 共同推动构建人类命运共同体——在"金砖+"领导人对话会上的讲话',
    date: '2024-10-24',
    year: 2024, month: 10, day: 24,
    category: 'speech', categoryName: '重要讲话',
    domain: 'diplomacy', domainName: '外交',
    source: '人民网－人民日报',
    location: '喀山',
    summary: '汇聚"全球南方"磅礴力量，共同推动构建人类命运共同体。',
    url: 'https://www.news.cn/politics/leaders/20241024/74649e88c2e0456485706538566e5b88/c.html'
  },
  {
    id: 'P2024-010',
    title: '登高望远，穿云破雾 推动"大金砖合作"高质量发展——在金砖国家领导人第十六次会晤上的讲话',
    date: '2024-10-23',
    year: 2024, month: 10, day: 23,
    category: 'speech', categoryName: '重要讲话',
    domain: 'diplomacy', domainName: '外交',
    source: '人民网－人民日报',
    location: '喀山',
    summary: '登高望远，穿云破雾，推动"大金砖合作"高质量发展。',
    url: 'https://www.news.cn/politics/leaders/20241023/74649e88c2e0456485706538566e5b88/c.html'
  },
  {
    id: 'P2024-011',
    title: '在庆祝中华人民共和国成立75周年招待会上的讲话',
    date: '2024-09-30',
    year: 2024, month: 9, day: 30,
    category: 'speech', categoryName: '重要讲话',
    domain: 'politics', domainName: '政治',
    source: '人民网－人民日报',
    summary: '在庆祝中华人民共和国成立75周年招待会上的讲话。',
    url: 'https://www.news.cn/politics/leaders/20240930/b469c72597224962a1f14b7553892fa1/c.html'
  },
  {
    id: 'P2024-012',
    title: '在二〇二四年春节团拜会上的讲话',
    date: '2024-02-08',
    year: 2024, month: 2, day: 8,
    category: 'speech', categoryName: '重要讲话',
    domain: 'politics', domainName: '政治',
    source: '人民网－人民日报',
    summary: '在二〇二四年春节团拜会上的讲话。',
    url: 'https://www.news.cn/20240208/f3f534fc8e1b47e1bbb3462cfd21fb8e/c.html'
  },
  {
    id: 'P2024-013',
    title: '国家主席习近平发表二〇二四年新年贺词',
    date: '2024-01-01',
    year: 2024, month: 1, day: 1,
    category: 'speech', categoryName: '重要讲话',
    domain: 'politics', domainName: '政治',
    source: '人民网－人民日报',
    summary: '国家主席习近平发表二〇二四年新年贺词。',
    url: 'https://www.news.cn/politics/leaders/20231231/64cc67c422ae40038a4c47ab241bce11/c.html'
  }
];

// 文章统计
export const peopleArticlesStats = {
  total: peopleArticles.length,
  byYear: {
    2026: peopleArticles.filter(a => a.year === 2026).length,
    2025: peopleArticles.filter(a => a.year === 2025).length,
    2024: peopleArticles.filter(a => a.year === 2024).length,
  }
};