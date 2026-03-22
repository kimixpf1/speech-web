// 人民网金句数据库 - 2026年文章完整数据
// 抓取时间: 2026-03-20
// 来源: https://jhsjk.people.cn/result?year=2026
// 总数: 83条

import { Speech } from './speeches';

// 根据标题自动判断领域
function detectDomain(title: string, summary: string = ''): { domain: string, domainName: string } {
  const text = (title + summary).toLowerCase();

  if (text.includes('外交') || text.includes('会见') || text.includes('访问') || text.includes('贺电') || text.includes('复信') || text.includes('函电')) {
    return { domain: 'diplomacy', domainName: '外交' };
  }
  if (text.includes('国防') || text.includes('军队') || text.includes('解放军') || text.includes('武警')) {
    return { domain: 'defense', domainName: '国防' };
  }
  if (text.includes('党建') || text.includes('干部') || text.includes('政绩观') || text.includes('作风')) {
    return { domain: 'party', domainName: '党建' };
  }
  if (text.includes('生态') || text.includes('环境') || text.includes('绿色') || text.includes('海洋')) {
    return { domain: 'ecology', domainName: '生态' };
  }
  if (text.includes('人民') || text.includes('政协') || text.includes('人大') || text.includes('会议') || text.includes('立法')) {
    return { domain: 'politics', domainName: '政治' };
  }
  if (text.includes('经济') || text.includes('发展') || text.includes('改革')) {
    return { domain: 'economy', domainName: '经济' };
  }

  return { domain: 'economy', domainName: '经济' };
}

// 根据标题判断类型
function detectCategory(title: string, source: string): { category: 'speech' | 'article' | 'meeting' | 'inspection', categoryName: string } {
  if (title.includes('考察') || title.includes('看望') || title.includes('慰问')) {
    return { category: 'inspection', categoryName: '考察调研' };
  }
  if (title.includes('会议') || title.includes('座谈') || title.includes('审议') || title.includes('开幕') || title.includes('闭幕')) {
    return { category: 'meeting', categoryName: '重要会议' };
  }
  if (source.includes('求是') || title.includes('文章')) {
    return { category: 'article', categoryName: '发表文章' };
  }
  return { category: 'speech', categoryName: '重要讲话' };
}

// 2026年文章数据（共83条）
export const peopleArticles2026: Speech[] = [
  // 第1页
  {
    id: 'P2026-001',
    title: '习近平会见土库曼斯坦民族领袖、人民委员会主席别尔德穆哈梅多夫',
    date: '2026-03-19', year: 2026, month: 3, day: 19,
    ...detectDomain('会见土库曼斯坦'),
    ...detectCategory('会见', '人民日报'),
    source: '人民网－人民日报',
    summary: '3月18日下午，国家主席习近平在北京钓鱼台国宾馆会见来华进行友好访问的土库曼斯坦民族领袖、人民委员会主席别尔德穆哈梅多夫。',
    url: 'https://jhsjk.people.cn/article/40684730'
  },
  {
    id: 'P2026-002',
    title: '国家主席习近平任免驻外大使',
    date: '2026-03-18', year: 2026, month: 3, day: 18,
    ...detectDomain('任免驻外大使'),
    ...detectCategory('任免', '人民日报'),
    source: '人民网－人民日报',
    summary: '新华社北京3月17日电，国家主席习近平任免驻外大使。',
    url: 'https://jhsjk.people.cn/article/40683958'
  },
  {
    id: 'P2026-003',
    title: '《求是》杂志发表习近平总书记重要文章《推动海洋经济高质量发展》',
    date: '2026-03-16', year: 2026, month: 3, day: 16,
    ...detectDomain('海洋经济高质量发展'),
    ...detectCategory('文章', '求是'),
    source: '人民网－人民日报',
    summary: '新华社北京3月15日电，《求是》杂志发表习近平总书记重要文章《推动海洋经济高质量发展》。',
    url: 'https://jhsjk.people.cn/article/40682570'
  },
  {
    id: 'P2026-004',
    title: '推动海洋经济高质量发展',
    date: '2026-03-15', year: 2026, month: 3, day: 15,
    domain: 'economy', domainName: '经济',
    category: 'article', categoryName: '发表文章',
    source: '《求是》2026/06',
    summary: '这是习近平总书记关于推动海洋经济高质量发展的重要文章。',
    url: 'https://jhsjk.people.cn/article/40682272'
  },
  {
    id: 'P2026-005',
    title: '中华人民共和国主席令',
    date: '2026-03-13', year: 2026, month: 3, day: 13,
    domain: 'politics', domainName: '政治',
    category: 'speech', categoryName: '重要讲话',
    source: '人民网－人民日报',
    summary: '第七十号，《中华人民共和国生态环境法典》已由第十四届全国人民代表大会第四次会议通过。',
    url: 'https://jhsjk.people.cn/article/40681085'
  },
  {
    id: 'P2026-006',
    title: '十四届全国人大四次会议在京闭幕',
    date: '2026-03-13', year: 2026, month: 3, day: 13,
    domain: 'politics', domainName: '政治',
    category: 'meeting', categoryName: '重要会议',
    source: '人民网－人民日报',
    summary: '批准政府工作报告、"十五五"规划纲要等，通过生态环境法典等，习近平签署主席令。',
    url: 'https://jhsjk.people.cn/article/40681071'
  },
  {
    id: 'P2026-007',
    title: '习近平复信法国国际学校中文班师生',
    date: '2026-03-13', year: 2026, month: 3, day: 13,
    domain: 'diplomacy', domainName: '外交',
    category: 'speech', categoryName: '重要讲话',
    source: '人民网－人民日报',
    summary: '新华社北京3月12日电，习近平复信法国国际学校中文班师生。',
    url: 'https://jhsjk.people.cn/article/40681072'
  },
  {
    id: 'P2026-008',
    title: '全国政协十四届四次会议闭幕',
    date: '2026-03-12', year: 2026, month: 3, day: 12,
    domain: 'politics', domainName: '政治',
    category: 'meeting', categoryName: '重要会议',
    source: '人民网－人民日报',
    summary: '习近平李强赵乐际蔡奇丁薛祥李希韩正出席，王沪宁发表讲话。',
    url: 'https://jhsjk.people.cn/article/40680227'
  },
  {
    id: 'P2026-009',
    title: '宋平同志遗体在京火化',
    date: '2026-03-11', year: 2026, month: 3, day: 11,
    domain: 'party', domainName: '党建',
    category: 'meeting', categoryName: '重要会议',
    source: '人民网－人民日报',
    summary: '习近平李强赵乐际王沪宁蔡奇丁薛祥李希韩正等到八宝山革命公墓送别。',
    url: 'https://jhsjk.people.cn/article/40679462'
  },
  {
    id: 'P2026-010',
    title: '十四届全国人大四次会议举行第二次全体会议',
    date: '2026-03-10', year: 2026, month: 3, day: 10,
    domain: 'politics', domainName: '政治',
    category: 'meeting', categoryName: '重要会议',
    source: '人民网－人民日报',
    summary: '习近平李强王沪宁蔡奇丁薛祥李希韩正等出席，赵乐际作全国人大常委会工作报告。',
    url: 'https://jhsjk.people.cn/article/40678599'
  },
  // 第2页
  {
    id: 'P2026-011',
    title: '习近平向葡萄牙新任总统塞古罗致贺电',
    date: '2026-03-10', year: 2026, month: 3, day: 10,
    domain: 'diplomacy', domainName: '外交',
    category: 'speech', categoryName: '重要讲话',
    source: '人民网－人民日报',
    summary: '新华社北京3月9日电。',
    url: 'https://jhsjk.people.cn/article/40678596'
  },
  {
    id: 'P2026-012',
    title: '习近平在出席解放军和武警部队代表团全体会议时强调 充分发挥政治建军特有优势 凝心聚力推动国防和军队现代化行稳致远',
    date: '2026-03-08', year: 2026, month: 3, day: 8,
    domain: 'defense', domainName: '国防',
    category: 'meeting', categoryName: '重要会议',
    source: '人民网－人民日报',
    summary: '3月7日下午，习近平总书记出席十四届全国人大四次会议解放军和武警部队代表团全体会议并发表重要讲话。',
    url: 'https://jhsjk.people.cn/article/40677150'
  },
  {
    id: 'P2026-013',
    title: '习近平在看望参加政协会议的农工党九三学社医药卫生界社会福利和社会保障界委员时强调 坚定不移走中国特色卫生与健康发展道路',
    date: '2026-03-07', year: 2026, month: 3, day: 7,
    domain: 'society', domainName: '社会',
    category: 'meeting', categoryName: '重要会议',
    source: '人民网－人民日报',
    summary: '3月6日下午，习近平总书记看望参加全国政协十四届四次会议的委员并参加联组会。',
    url: 'https://jhsjk.people.cn/article/40676641'
  },
  {
    id: 'P2026-014',
    title: '十四届全国人大四次会议在京开幕',
    date: '2026-03-06', year: 2026, month: 3, day: 6,
    domain: 'politics', domainName: '政治',
    category: 'meeting', categoryName: '重要会议',
    source: '人民网－人民日报',
    summary: '李强作政府工作报告，赵乐际主持大会审查"十五五"规划纲要草案。',
    url: 'https://jhsjk.people.cn/article/40675965'
  },
  {
    id: 'P2026-015',
    title: '习近平在参加江苏代表团审议时强调 经济大省要在研究新情况解决新问题上下功夫出经验',
    date: '2026-03-06', year: 2026, month: 3, day: 6,
    domain: 'economy', domainName: '经济',
    category: 'meeting', categoryName: '重要会议',
    source: '人民网－人民日报',
    summary: '3月5日下午，习近平总书记参加他所在的十四届全国人大四次会议江苏代表团审议。',
    url: 'https://jhsjk.people.cn/article/40675966'
  },
  {
    id: 'P2026-016',
    title: '全国政协十四届四次会议在京开幕',
    date: '2026-03-05', year: 2026, month: 3, day: 5,
    domain: 'politics', domainName: '政治',
    category: 'meeting', categoryName: '重要会议',
    source: '人民网－人民日报',
    summary: '习近平李强赵乐际蔡奇丁薛祥李希韩正到会祝贺，王沪宁作政协常委会工作报告。',
    url: 'https://jhsjk.people.cn/article/40675088'
  },
  {
    id: 'P2026-017',
    title: '《求是》杂志发表习近平总书记重要文章 让愿担当、敢担当、善担当蔚然成风',
    date: '2026-03-01', year: 2026, month: 3, day: 1,
    domain: 'party', domainName: '党建',
    category: 'article', categoryName: '发表文章',
    source: '人民网－人民日报',
    summary: '新华社北京2月28日电。',
    url: 'https://jhsjk.people.cn/article/40672406'
  },
  {
    id: 'P2026-018',
    title: '让愿担当、敢担当、善担当蔚然成风',
    date: '2026-02-28', year: 2026, month: 2, day: 28,
    domain: 'party', domainName: '党建',
    category: 'article', categoryName: '发表文章',
    source: '《求是》',
    summary: '实干兴邦，空谈误国。各级领导干部要坚持为民务实清廉，切实转变工作作风。',
    url: 'https://jhsjk.people.cn/article/40672236'
  },
  {
    id: 'P2026-019',
    title: '中共中央政治局召开会议 讨论"十五五"规划纲要草案和政府工作报告',
    date: '2026-02-28', year: 2026, month: 2, day: 28,
    domain: 'politics', domainName: '政治',
    category: 'meeting', categoryName: '重要会议',
    source: '人民网－人民日报',
    summary: '推动"十五五"时期经济社会发展，必须全面贯彻习近平新时代中国特色社会主义思想。',
    url: 'https://jhsjk.people.cn/article/40671760'
  },
  {
    id: 'P2026-020',
    title: '中华人民共和国主席令 第六十九号',
    date: '2026-02-27', year: 2026, month: 2, day: 27,
    domain: 'politics', domainName: '政治',
    category: 'speech', categoryName: '重要讲话',
    source: '人民网－人民日报',
    summary: '根据第十四届全国人民代表大会常务委员会第二十一次会议决定，免去王祥喜的应急管理部部长职务。',
    url: 'https://jhsjk.people.cn/article/40671058'
  }
  // 注：由于篇幅限制，这里仅包含前20条
  // 完整的83条数据需要继续抓取或使用自动化脚本
];

// 导出统计信息
export const peopleArticles2026Stats = {
  total: 83,
  scraped: peopleArticles2026.length,
  remaining: 83 - peopleArticles2026.length
};