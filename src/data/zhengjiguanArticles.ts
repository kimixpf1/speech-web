// 政绩观专题文章数据
// 来源：人民日报、新华社、求是、江苏省政府、苏州市政府等官方平台
// 注意：文章从官方平台搜索添加，不在首页直接显示

import { Speech } from './speeches';

export const zhengjiguanArticles: Speech[] = [
  // ===== 中央层面 =====
  {
    id: 'ZJG-C01',
    title: '在全党开展树立和践行正确政绩观学习教育',
    date: '2026-02-24',
    year: 2026, month: 2, day: 24,
    category: 'article', categoryName: '发表文章',
    domain: 'party', domainName: '党建',
    isZhengjiguan: true,
    zhengjiguanLevel: 'central',
    source: '人民日报',
    summary: '经党中央同意，在全党开展树立和践行正确政绩观学习教育。学习教育以县处级以上领导班子和领导干部为重点，覆盖全体党员干部。',
    url: 'http://paper.people.com.cn/rmrb/pc/content/202602/24/content_30141591.html'
  },
  {
    id: 'ZJG-C02',
    title: '"干事创业一定要树立正确政绩观"（总书记的人民情怀）',
    date: '2026-03-18',
    year: 2026, month: 3, day: 18,
    category: 'article', categoryName: '发表文章',
    domain: 'party', domainName: '党建',
    isZhengjiguan: true,
    zhengjiguanLevel: 'central',
    source: '人民日报',
    summary: '习近平总书记多次阐释"说"和"做"、"知"和"行"的辩证关系，树立"业绩都是干出来的"鲜明导向；新时代以来，广大党员干部树立和践行正确政绩观，鼓足干事创业的精气神。',
    url: 'http://paper.people.com.cn/rmrb/pc/content/202603/18/content_30145792.html'
  },
  {
    id: 'ZJG-C03',
    title: '实干担当为民造福——习近平总书记引领全党树立和践行正确政绩观',
    date: '2026-02-25',
    year: 2026, month: 2, day: 25,
    category: 'article', categoryName: '发表文章',
    domain: 'party', domainName: '党建',
    isZhengjiguan: true,
    zhengjiguanLevel: 'central',
    source: '新华社',
    summary: '对于政绩观，习近平总书记始终有着深邃思考与明确指引，锚定为民造福的根本目的，坚守求真务实的基本路径，引领全党不断创造经得起实践、人民、历史检验的实绩。',
    url: 'https://www.spp.gov.cn/tt/202602/t20260225_720294.shtml'
  },
  {
    id: 'ZJG-C04',
    title: '以正确政绩观推动实现"十五五"良好开局',
    date: '2026-03-10',
    year: 2026, month: 3, day: 10,
    category: 'article', categoryName: '发表文章',
    domain: 'party', domainName: '党建',
    isZhengjiguan: true,
    zhengjiguanLevel: 'central',
    source: '人民日报',
    summary: '习近平总书记在参加江苏代表团审议时强调："要认真组织开展树立和践行正确政绩观学习教育，引导广大党员干部树立和践行正确政绩观。"',
    url: 'http://paper.people.com.cn/rmrb/pc/content/202603/10/content_30144447.html'
  },

  // ===== 江苏省层面 =====
  {
    id: 'ZJG-J01',
    title: '江苏新春两场重要会议，强调了怎样的政绩观？',
    date: '2026-02-27',
    year: 2026, month: 2, day: 27,
    category: 'article', categoryName: '发表文章',
    domain: 'party', domainName: '党建',
    isZhengjiguan: true,
    zhengjiguanLevel: 'jiangsu',
    source: '江苏先锋',
    summary: '省委书记信长星强调，要树立和践行正确政绩观，坚持从实际出发、按规律办事，一个问题一个问题攻坚，一件事一件事落实。',
    url: 'https://www.jsxc.gov.cn/jsfb/ztxc/202602/t20260227_90725.shtml'
  },
  {
    id: 'ZJG-J02',
    title: '牢固树立和践行正确政绩观推动实现"十五五"良好开局',
    date: '2026-03-12',
    year: 2026, month: 3, day: 12,
    category: 'article', categoryName: '发表文章',
    domain: 'party', domainName: '党建',
    isZhengjiguan: true,
    zhengjiguanLevel: 'jiangsu',
    source: '人民日报',
    summary: '要树立和践行正确政绩观，坚持从实际出发、按规律办事，自觉为人民出政绩、以实干出政绩。',
    url: 'http://paper.people.com.cn/rmrb/pc/content/202603/12/content_30144854.html'
  },

  // ===== 苏州市层面 =====
  {
    id: 'ZJG-S01',
    title: '苏州市政府党组会议研究部署树立和践行正确政绩观学习教育工作',
    date: '2026-03-15',
    year: 2026, month: 3, day: 15,
    category: 'meeting', categoryName: '重要会议',
    domain: 'party', domainName: '党建',
    isZhengjiguan: true,
    zhengjiguanLevel: 'suzhou',
    source: '苏州市政府',
    summary: '会议强调，市政府党组要树牢造福人民的政绩观，深入开展服务企业、服务项目、服务园区和基层"三服务"专项行动。',
    url: 'https://www.suzhou.gov.cn/szsrmzf/szyw/202603/50bd856f1be3467caea94c7222ea0509.shtml'
  }
];

// 政绩观文章统计
export const zhengjiguanStats = {
  total: zhengjiguanArticles.length,
  central: zhengjiguanArticles.filter(a => a.zhengjiguanLevel === 'central').length,
  jiangsu: zhengjiguanArticles.filter(a => a.zhengjiguanLevel === 'jiangsu').length,
  suzhou: zhengjiguanArticles.filter(a => a.zhengjiguanLevel === 'suzhou').length
};