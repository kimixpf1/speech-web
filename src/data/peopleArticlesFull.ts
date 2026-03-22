// 人民网2026年完整文章数据（已去重）
// 抓取时间: 2026-03-20
// 来源: https://jhsjk.people.cn/result?year=2026
// 总数: 83条，与现有文章重复约15条，实际新增约68条

import { Speech } from './speeches';

// 已知重复的文章标题（与 speeches.ts 中的现有文章重复，不需要添加）
const DUPLICATE_TITLES = [
  '当前经济工作的重点任务',
  '在中央城市工作会议上的讲话',
  '学习好贯彻好党的二十届四中全会精神',
  '在北京考察并看望慰问基层干部群众',
  '二〇二六年新年贺词',
  '在二〇二六年春节团拜会上的讲话',
  '对国家自然科学基金委员会工作作出重要指示',
  '在中共中央政治局第二十四次集体学习时的重要讲话',
  '向第39届非洲联盟峰会致贺电',
  '会见德国总理默茨',
  '中共中央政治局召开会议 讨论"十五五"规划纲要草案和政府工作报告',
  '在参加江苏代表团审议时的重要讲话',
  '推动海洋经济高质量发展',
  '走好中国特色金融发展之路，建设金融强国',
  '让愿担当、敢担当、善担当蔚然成风'
];

// 2026年新增文章（已去重）
export const peopleArticles2026New: Speech[] = [
  // 外交类
  {
    id: 'P2026-N01',
    title: '习近平会见土库曼斯坦民族领袖、人民委员会主席别尔德穆哈梅多夫',
    date: '2026-03-19', year: 2026, month: 3, day: 19,
    domain: 'diplomacy', domainName: '外交',
    category: 'meeting', categoryName: '重要会议',
    source: '人民网－人民日报',
    summary: '3月18日下午，国家主席习近平在北京钓鱼台国宾馆会见来华进行友好访问的土库曼斯坦民族领袖、人民委员会主席别尔德穆哈梅多夫。',
    url: 'https://jhsjk.people.cn/article/40684730'
  },
  {
    id: 'P2026-N02',
    title: '国家主席习近平任免驻外大使',
    date: '2026-03-18', year: 2026, month: 3, day: 18,
    domain: 'diplomacy', domainName: '外交',
    category: 'speech', categoryName: '重要讲话',
    source: '人民网－人民日报',
    summary: '新华社北京3月17日电，国家主席习近平任免驻外大使。',
    url: 'https://jhsjk.people.cn/article/40683958'
  },
  {
    id: 'P2026-N03',
    title: '《求是》杂志发表习近平总书记重要文章《推动海洋经济高质量发展》',
    date: '2026-03-16', year: 2026, month: 3, day: 16,
    domain: 'economy', domainName: '经济',
    category: 'article', categoryName: '发表文章',
    source: '人民网－人民日报',
    summary: '新华社北京3月15日电，《求是》杂志发表习近平总书记重要文章《推动海洋经济高质量发展》。',
    url: 'https://jhsjk.people.cn/article/40682570'
  },
  {
    id: 'P2026-N04',
    title: '中华人民共和国主席令（生态环境法典）',
    date: '2026-03-13', year: 2026, month: 3, day: 13,
    domain: 'politics', domainName: '政治',
    category: 'speech', categoryName: '重要讲话',
    source: '人民网－人民日报',
    summary: '第七十号，《中华人民共和国生态环境法典》已由第十四届全国人民代表大会第四次会议通过。',
    url: 'https://jhsjk.people.cn/article/40681085'
  },
  {
    id: 'P2026-N05',
    title: '十四届全国人大四次会议在京闭幕',
    date: '2026-03-13', year: 2026, month: 3, day: 13,
    domain: 'politics', domainName: '政治',
    category: 'meeting', categoryName: '重要会议',
    source: '人民网－人民日报',
    summary: '批准政府工作报告、"十五五"规划纲要等，通过生态环境法典等，习近平签署主席令。',
    url: 'https://jhsjk.people.cn/article/40681071'
  },
  {
    id: 'P2026-N06',
    title: '习近平复信法国国际学校中文班师生',
    date: '2026-03-13', year: 2026, month: 3, day: 13,
    domain: 'diplomacy', domainName: '外交',
    category: 'speech', categoryName: '重要讲话',
    source: '人民网－人民日报',
    summary: '新华社北京3月12日电，习近平复信法国国际学校中文班师生。',
    url: 'https://jhsjk.people.cn/article/40681072'
  },
  {
    id: 'P2026-N07',
    title: '全国政协十四届四次会议闭幕',
    date: '2026-03-12', year: 2026, month: 3, day: 12,
    domain: 'politics', domainName: '政治',
    category: 'meeting', categoryName: '重要会议',
    source: '人民网－人民日报',
    summary: '习近平李强赵乐际蔡奇丁薛祥李希韩正出席，王沪宁发表讲话。',
    url: 'https://jhsjk.people.cn/article/40680227'
  },
  {
    id: 'P2026-N08',
    title: '宋平同志遗体在京火化',
    date: '2026-03-11', year: 2026, month: 3, day: 11,
    domain: 'party', domainName: '党建',
    category: 'meeting', categoryName: '重要会议',
    source: '人民网－人民日报',
    summary: '习近平李强赵乐际王沪宁蔡奇丁薛祥李希韩正等到八宝山革命公墓送别。',
    url: 'https://jhsjk.people.cn/article/40679462'
  },
  {
    id: 'P2026-N09',
    title: '十四届全国人大四次会议举行第二次全体会议',
    date: '2026-03-10', year: 2026, month: 3, day: 10,
    domain: 'politics', domainName: '政治',
    category: 'meeting', categoryName: '重要会议',
    source: '人民网－人民日报',
    summary: '习近平李强王沪宁蔡奇丁薛祥李希韩正等出席，赵乐际作全国人大常委会工作报告。',
    url: 'https://jhsjk.people.cn/article/40678599'
  },
  {
    id: 'P2026-N10',
    title: '习近平向葡萄牙新任总统塞古罗致贺电',
    date: '2026-03-10', year: 2026, month: 3, day: 10,
    domain: 'diplomacy', domainName: '外交',
    category: 'speech', categoryName: '重要讲话',
    source: '人民网－人民日报',
    summary: '新华社北京3月9日电。',
    url: 'https://jhsjk.people.cn/article/40678596'
  },
  {
    id: 'P2026-N11',
    title: '习近平在出席解放军和武警部队代表团全体会议时强调',
    date: '2026-03-08', year: 2026, month: 3, day: 8,
    domain: 'defense', domainName: '国防',
    category: 'meeting', categoryName: '重要会议',
    source: '人民网－人民日报',
    summary: '充分发挥政治建军特有优势，凝心聚力推动国防和军队现代化行稳致远。',
    url: 'https://jhsjk.people.cn/article/40677150'
  },
  {
    id: 'P2026-N12',
    title: '习近平在看望参加政协会议的委员时强调',
    date: '2026-03-07', year: 2026, month: 3, day: 7,
    domain: 'society', domainName: '社会',
    category: 'meeting', categoryName: '重要会议',
    source: '人民网－人民日报',
    summary: '坚定不移走中国特色卫生与健康发展道路，推动"十五五"时期健康中国建设取得决定性进展。',
    url: 'https://jhsjk.people.cn/article/40676641'
  },
  {
    id: 'P2026-N13',
    title: '十四届全国人大四次会议在京开幕',
    date: '2026-03-06', year: 2026, month: 3, day: 6,
    domain: 'politics', domainName: '政治',
    category: 'meeting', categoryName: '重要会议',
    source: '人民网－人民日报',
    summary: '李强作政府工作报告，赵乐际主持大会审查"十五五"规划纲要草案。',
    url: 'https://jhsjk.people.cn/article/40675965'
  },
  {
    id: 'P2026-N14',
    title: '全国政协十四届四次会议在京开幕',
    date: '2026-03-05', year: 2026, month: 3, day: 5,
    domain: 'politics', domainName: '政治',
    category: 'meeting', categoryName: '重要会议',
    source: '人民网－人民日报',
    summary: '习近平李强赵乐际蔡奇丁薛祥李希韩正到会祝贺，王沪宁作政协常委会工作报告。',
    url: 'https://jhsjk.people.cn/article/40675088'
  },
  {
    id: 'P2026-N15',
    title: '十四届全国人大常委会第二十一次会议在京闭幕',
    date: '2026-02-27', year: 2026, month: 2, day: 27,
    domain: 'politics', domainName: '政治',
    category: 'meeting', categoryName: '重要会议',
    source: '人民网－人民日报',
    summary: '习近平签署主席令，赵乐际主持会议。',
    url: 'https://jhsjk.people.cn/article/40671052'
  },
  {
    id: 'P2026-N16',
    title: '中央政治局委员书记处书记等向党中央和习近平总书记述职',
    date: '2026-02-27', year: 2026, month: 2, day: 27,
    domain: 'party', domainName: '党建',
    category: 'meeting', categoryName: '重要会议',
    source: '人民网－人民日报',
    summary: '习近平审阅述职报告并提出重要要求，强调要增强政治责任感和历史使命感。',
    url: 'https://jhsjk.people.cn/article/40671051'
  },
  {
    id: 'P2026-N17',
    title: '中华人民共和国主席令 第六十九号',
    date: '2026-02-27', year: 2026, month: 2, day: 27,
    domain: 'politics', domainName: '政治',
    category: 'speech', categoryName: '重要讲话',
    source: '人民网－人民日报',
    summary: '免去王祥喜的应急管理部部长职务。',
    url: 'https://jhsjk.people.cn/article/40671058'
  },
  {
    id: 'P2026-N18',
    title: '习近平致电祝贺金正恩被推举为朝鲜劳动党总书记',
    date: '2026-02-24', year: 2026, month: 2, day: 24,
    domain: 'diplomacy', domainName: '外交',
    category: 'speech', categoryName: '重要讲话',
    source: '人民网－人民日报',
    summary: '习近平致电祝贺金正恩被推举为朝鲜劳动党总书记。',
    url: 'https://jhsjk.people.cn/article/40668885'
  },
  {
    id: 'P2026-N19',
    title: '习近平复信美国艾奥瓦州友人',
    date: '2026-02-19', year: 2026, month: 2, day: 19,
    domain: 'diplomacy', domainName: '外交',
    category: 'speech', categoryName: '重要讲话',
    source: '人民网－人民日报',
    summary: '习近平复信美国艾奥瓦州友人。',
    url: 'https://jhsjk.people.cn/article/40667614'
  },
  {
    id: 'P2026-N20',
    title: '中共中央国务院举行春节团拜会',
    date: '2026-02-15', year: 2026, month: 2, day: 15,
    domain: 'party', domainName: '党建',
    category: 'meeting', categoryName: '重要会议',
    source: '人民网－人民日报',
    summary: '习近平发表讲话代表党中央和国务院向全国各族人民拜年。',
    url: 'https://jhsjk.people.cn/article/40666401'
  },
  // ... 继续添加更多文章
  {
    id: 'P2026-N21',
    title: '习近平同党外人士共迎新春',
    date: '2026-02-12', year: 2026, month: 2, day: 12,
    domain: 'party', domainName: '党建',
    category: 'meeting', categoryName: '重要会议',
    source: '人民网－人民日报',
    summary: '代表中共中央向各民主党派、工商联和无党派人士致以诚挚问候和美好祝福。',
    url: 'https://jhsjk.people.cn/article/40664461'
  },
  {
    id: 'P2026-N22',
    title: '习近平春节前夕慰问部队',
    date: '2026-02-12', year: 2026, month: 2, day: 12,
    domain: 'defense', domainName: '国防',
    category: 'speech', categoryName: '重要讲话',
    source: '人民网－人民日报',
    summary: '向全体人民解放军指战员武警部队官兵军队文职人员预备役人员和民兵致以新春祝福。',
    url: 'https://jhsjk.people.cn/article/40664462'
  },
  {
    id: 'P2026-N23',
    title: '习近平春节前夕在北京看望慰问基层干部群众',
    date: '2026-02-11', year: 2026, month: 2, day: 11,
    domain: 'society', domainName: '社会',
    category: 'inspection', categoryName: '考察调研',
    source: '人民网－人民日报',
    summary: '向全国各族人民致以美好的新春祝福，祝各族人民幸福安康，祝伟大祖国繁荣昌盛。',
    url: 'https://jhsjk.people.cn/article/40663644'
  },
  {
    id: 'P2026-N24',
    title: '习近平致电祝贺费尔南德斯当选哥斯达黎加总统',
    date: '2026-02-08', year: 2026, month: 2, day: 8,
    domain: 'diplomacy', domainName: '外交',
    category: 'speech', categoryName: '重要讲话',
    source: '人民网－人民日报',
    summary: '习近平致电祝贺费尔南德斯当选哥斯达黎加总统。',
    url: 'https://jhsjk.people.cn/article/40661676'
  },
  {
    id: 'P2026-N25',
    title: '中央军委举行慰问驻京部队老干部迎新春文艺演出',
    date: '2026-02-08', year: 2026, month: 2, day: 8,
    domain: 'defense', domainName: '国防',
    category: 'meeting', categoryName: '重要会议',
    source: '人民网－人民日报',
    summary: '习近平向全军老同志祝贺新春。',
    url: 'https://jhsjk.people.cn/article/40661675'
  },
  {
    id: 'P2026-N26',
    title: '中老两党两国最高领导人共同宣布启动"中老友好年"',
    date: '2026-02-06', year: 2026, month: 2, day: 6,
    domain: 'diplomacy', domainName: '外交',
    category: 'meeting', categoryName: '重要会议',
    source: '人民网－人民日报',
    summary: '中老两党两国最高领导人共同宣布启动"中老友好年"。',
    url: 'https://jhsjk.people.cn/article/40660546'
  },
  {
    id: 'P2026-N27',
    title: '习近平同美国总统特朗普通电话',
    date: '2026-02-05', year: 2026, month: 2, day: 5,
    domain: 'diplomacy', domainName: '外交',
    category: 'speech', categoryName: '重要讲话',
    source: '人民网－人民日报',
    summary: '习近平同美国总统特朗普通电话。',
    url: 'https://jhsjk.people.cn/article/40659889'
  },
  {
    id: 'P2026-N28',
    title: '习近平同俄罗斯总统普京举行视频会晤',
    date: '2026-02-05', year: 2026, month: 2, day: 5,
    domain: 'diplomacy', domainName: '外交',
    category: 'meeting', categoryName: '重要会议',
    source: '人民网－人民日报',
    summary: '习近平同俄罗斯总统普京举行视频会晤。',
    url: 'https://jhsjk.people.cn/article/40659888'
  },
  {
    id: 'P2026-N29',
    title: '习近平会见越共中央总书记特使黎怀忠',
    date: '2026-02-05', year: 2026, month: 2, day: 5,
    domain: 'diplomacy', domainName: '外交',
    category: 'meeting', categoryName: '重要会议',
    source: '人民网－人民日报',
    summary: '习近平会见越共中央总书记特使黎怀忠。',
    url: 'https://jhsjk.people.cn/article/40659890'
  },
  {
    id: 'P2026-N30',
    title: '习近平同乌拉圭总统奥尔西举行会谈',
    date: '2026-02-04', year: 2026, month: 2, day: 4,
    domain: 'diplomacy', domainName: '外交',
    category: 'meeting', categoryName: '重要会议',
    source: '人民网－人民日报',
    summary: '习近平同乌拉圭总统奥尔西举行会谈。',
    url: 'https://jhsjk.people.cn/article/40659040'
  }
];

// 统计信息
export const peopleArticlesStats = {
  total2026: 83,
  duplicates: DUPLICATE_TITLES.length,
  newArticles: peopleArticles2026New.length,
  remaining: 83 - DUPLICATE_TITLES.length - peopleArticles2026New.length
};