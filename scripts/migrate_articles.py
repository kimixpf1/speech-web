"""
从人民网学习金句数据库迁移文章到讲话网站
"""
import json
import re
from datetime import datetime

# 现有52篇文章标题列表（用于去重）
EXISTING_TITLES = [
    '当前经济工作的重点任务',
    '在中央城市工作会议上的讲话',
    '学习好贯彻好党的二十届四中全会精神',
    '在北京考察并看望慰问基层干部群众',
    '二〇二六年新年贺词',
    '在2026年春节团拜会上的讲话',
    '对国家自然科学基金委员会工作作出重要指示',
    '在中共中央政治局第二十四次集体学习时的重要讲话',
    '向第39届非洲联盟峰会致贺电',
    '会见德国总理默茨',
    '中共中央政治局召开会议 讨论"十五五"规划纲要草案和政府工作报告',
    '在参加江苏代表团审议时的重要讲话',
    '在民营企业座谈会上的讲话',
    '在听取西藏自治区党委和政府工作汇报时的重要讲话',
    '在全国两会期间的重要讲话',
    '经济工作必须统筹好几对重要关系',
    '坚持和落实"两个毫不动摇"',
    '在贵州考察时的重要讲话',
    '在云南考察时的重要讲话',
    '在上海考察时的重要讲话',
    '在河南考察时的重要讲话',
    '在辽宁考察时的重要讲话',
    '在吉林长春听取吉林省委和省政府工作汇报',
    '在山西考察时的重要讲话',
    '对"十五五"规划编制工作作出重要指示',
    '在2025年中央经济工作会议上的讲话',
    '坚定不移推进高水平对外开放',
    '因地制宜发展新质生产力',
    '扩大内需是战略之举',
    '走好中国特色金融发展之路，建设金融强国',
    '在2024年中央经济工作会议上的讲话',
    '在第四次"一带一路"建设工作座谈会上的讲话',
    '在中华全国供销合作总社成立70周年之际作出重要指示',
    '在亚太经合组织第三十一次领导人非正式会议上的讲话',
    '在二十国集团领导人第十九次峰会上的讲话',
    '在金砖国家领导人第十六次会晤上的讲话',
    '在党的二十届三中全会第二次全体会议上的讲话',
    '在青海考察时的重要讲话',
    '在宁夏考察时的重要讲话',
    '在中央财经委员会第四次会议上的讲话',
    '在福建考察时的重要讲话',
    '在安徽考察时的重要讲话',
    '促进高质量充分就业',
    '在湖北考察时的重要讲话',
    '开创我国高质量发展新局面',
    '在山东考察时的重要讲话',
    '在重庆考察时的重要讲话',
    '在湖南考察时的重要讲话',
    '在天津考察时的重要讲话',
    '蓝图已经绘就 奋进正当其时',
    '推动海洋经济高质量发展',
    '微镜头·习近平总书记两会下团组',
]

# 类型映射
CATEGORY_MAP = {
    '讲话': 'speech',
    '会议': 'meeting',
    '活动': 'inspection',
    '考察': 'inspection',
    '会见': 'speech',
    '出访': 'speech',
    '函电': 'speech',
    '其他': 'speech',
}

CATEGORY_NAMES = {
    'speech': '重要讲话',
    'article': '发表文章',
    'meeting': '重要会议',
    'inspection': '考察调研',
}

# 领域映射
DOMAIN_MAP = {
    '经济': 'economy',
    '政治': 'politics',
    '文化': 'culture',
    '社会': 'society',
    '生态': 'ecology',
    '党建': 'party',
    '国防': 'defense',
    '外交': 'diplomacy',
}

DOMAIN_NAMES = {
    'economy': '经济',
    'politics': '政治',
    'culture': '文化',
    'society': '社会',
    'ecology': '生态',
    'party': '党建',
    'defense': '国防',
    'diplomacy': '外交',
}

def is_duplicate(title):
    """检查是否与现有文章重复"""
    title_clean = title.strip()
    for existing in EXISTING_TITLES:
        # 标题相似度检查
        if title_clean == existing:
            return True
        # 包含关系检查
        if title_clean in existing or existing in title_clean:
            return True
    return False

def normalize_article(raw_article, domain='economy'):
    """规范化文章格式"""
    title = raw_article.get('title', '').strip()
    
    if is_duplicate(title):
        return None
    
    date_str = raw_article.get('date', '')
    # 解析日期
    try:
        date_obj = datetime.strptime(date_str, '%Y-%m-%d')
        year = date_obj.year
        month = date_obj.month
        day = date_obj.day
    except:
        year = 2025
        month = 1
        day = 1
        date_str = '2025-01-01'
    
    # 确定分类
    category_type = raw_article.get('category', '讲话')
    category = CATEGORY_MAP.get(category_type, 'speech')
    
    # 如果标题包含"求是杂志发表"，归类为文章
    if '求是' in title or '发表' in title:
        category = 'article'
    
    # 确定领域
    domain_code = DOMAIN_MAP.get(domain, 'economy')
    
    return {
        'id': f"{year}-{str(len(EXISTING_TITLES) + 1).zfill(2)}",
        'title': title,
        'date': date_str,
        'year': year,
        'month': month,
        'day': day,
        'category': category,
        'categoryName': CATEGORY_NAMES[category],
        'domain': domain_code,
        'domainName': DOMAIN_NAMES[domain_code],
        'source': raw_article.get('source', '人民网'),
        'summary': raw_article.get('summary', title)[:200],
        'url': raw_article.get('url', ''),
    }

# 示例新文章数据（需要从人民网抓取）
# 这是一个模板，实际需要从网站抓取
NEW_ARTICLES_TEMPLATE = """
从人民网抓取的文章数据将放在这里
"""

if __name__ == '__main__':
    print("文章迁移工具")
    print(f"现有文章数量: {len(EXISTING_TITLES)}")
    print("请使用浏览器自动化或API从人民网抓取文章数据")