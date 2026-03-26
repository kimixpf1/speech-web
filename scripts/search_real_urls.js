/**
 * 搜索缺失详情文章的真实URL
 * 使用Kimi API联网搜索
 */

const KIMI_API_URL = 'https://api.moonshot.cn/v1/chat/completions';

// 需要搜索的文章主题
const ARTICLES_TO_SEARCH = [
  {
    id: '2024-P01',
    title: '在庆祝全国人民代表大会成立70周年大会上的讲话',
    date: '2024-09-14',
    searchQuery: '习近平 庆祝全国人民代表大会成立70周年大会 讲话 人民网'
  },
  {
    id: '2024-P02',
    title: '在庆祝中国人民政治协商会议成立75周年大会上的讲话',
    date: '2024-09-20',
    searchQuery: '习近平 庆祝中国人民政治协商会议成立75周年大会 讲话 新华社'
  },
  {
    id: '2024-C01',
    title: '加强文化遗产保护传承 弘扬中华优秀传统文化',
    date: '2024-06-08',
    searchQuery: '习近平 加强文化遗产保护传承 弘扬中华优秀传统文化 求是'
  },
  {
    id: '2024-S01',
    title: '在全国教育大会上的讲话',
    date: '2024-09-10',
    searchQuery: '习近平 全国教育大会 讲话 2024年9月 新华社'
  },
  {
    id: '2024-E01',
    title: '全面推进美丽中国建设',
    date: '2024-06-05',
    searchQuery: '习近平 全面推进美丽中国建设 求是 2024'
  },
  {
    id: '2024-G01',
    title: '在二十届中央纪委三次全会上的讲话',
    date: '2024-01-08',
    searchQuery: '习近平 二十届中央纪委三次全会 讲话 2024年1月 新华社'
  },
  {
    id: '2024-D01',
    title: '在中央军委政治工作会议上的讲话',
    date: '2024-06-18',
    searchQuery: '习近平 中央军委政治工作会议 讲话 2024年6月 新华社'
  },
  {
    id: '2024-F01',
    title: '在和平共处五项原则发表70周年纪念大会上的讲话',
    date: '2024-06-28',
    searchQuery: '习近平 和平共处五项原则发表70周年纪念大会 讲话 2024年6月'
  },
  {
    id: '2024-F02',
    title: '在中非合作论坛北京峰会开幕式上的主旨讲话',
    date: '2024-09-05',
    searchQuery: '习近平 中非合作论坛北京峰会开幕式 主旨讲话 2024年9月'
  }
];

async function searchWithKimi(query, apiKey) {
  const response = await fetch(KIMI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'moonshot-v1-auto',
      messages: [
        {
          role: 'system',
          content: `你是一个专业的搜索助手。请使用$web_search工具联网搜索。

【最重要规则】
1. 必须使用$web_search联网搜索
2. 只返回搜索结果中真实存在的URL
3. 绝对禁止编造URL
4. URL必须来自官方网站：people.com.cn, xinhuanet.com, news.cn, qstheory.cn, gov.cn

返回JSON格式：
{
  "found": true/false,
  "url": "真实URL",
  "title": "文章标题",
  "source": "来源网站"
}`
        },
        {
          role: 'user',
          content: `请搜索："${query}"，找到该文章在官方网站上的真实URL。`
        }
      ],
      tools: [{ type: 'builtin_function', function: { name: '$web_search' } }],
      temperature: 0.1
    })
  });

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

function parseResult(content) {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error('解析失败:', e.message);
  }
  return null;
}

async function main() {
  const apiKey = process.env.KIMI_API_KEY;
  if (!apiKey) {
    console.error('请设置环境变量 KIMI_API_KEY');
    process.exit(1);
  }

  console.log('开始搜索文章真实URL...\n');
  
  const results = [];
  
  for (const article of ARTICLES_TO_SEARCH) {
    console.log(`搜索: ${article.title}`);
    console.log(`关键词: ${article.searchQuery}`);
    
    try {
      const content = await searchWithKimi(article.searchQuery, apiKey);
      const result = parseResult(content);
      
      if (result && result.found && result.url) {
        console.log(`找到: ${result.url}`);
        results.push({
          id: article.id,
          title: article.title,
          oldDate: article.date,
          url: result.url,
          source: result.source,
          newTitle: result.title
        });
      } else {
        console.log('未找到真实URL');
        results.push({
          id: article.id,
          title: article.title,
          url: null,
          error: '未找到'
        });
      }
    } catch (e) {
      console.log(`错误: ${e.message}`);
      results.push({
        id: article.id,
        title: article.title,
        url: null,
        error: e.message
      });
    }
    
    console.log('---\n');
    await new Promise(r => setTimeout(r, 2000)); // 等待2秒避免请求过快
  }
  
  console.log('\n=== 搜索结果汇总 ===\n');
  console.log(JSON.stringify(results, null, 2));
}

main();