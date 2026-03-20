"""
从人民网学习金句数据库批量迁移文章
使用方法：在本地运行此脚本，生成迁移数据后导入到平台
"""
import json
import re
import time
import requests
from datetime import datetime

# 现有52篇文章的标题和URL（用于去重）
EXISTING_ARTICLES = {
    '当前经济工作的重点任务': 'https://www.qstheory.cn/20260215/9f11863af9414728880eda8352202ed6/c.html',
    '在中央城市工作会议上的讲话': 'https://www.qstheory.cn/20260116/dfbbdd564af24b4b9dbf0e96088480c8/c.html',
    '学习好贯彻好党的二十届四中全会精神': 'http://kaogu.cssn.cn/djgz/esdszqh/202512/t20251231_5967806.shtml',
    '在北京考察并看望慰问基层干部群众': 'http://politics.people.com.cn/n1/2026/0213/c461001-40665453.html',
    '二〇二六年新年贺词': 'http://politics.people.com.cn/n1/2025/1231/c1024-40637032.html',
    '在2026年春节团拜会上的讲话': 'https://www.news.cn/politics/leaders/20260214/6b31b0de246547e0ab00cad14b81d570/c.html',
    '对国家自然科学基金委员会工作作出重要指示': 'https://www.nsfc.gov.cn/p1/3381/2821/101312.html',
    '在中共中央政治局第二十四次集体学习时的重要讲话': 'https://www.gov.cn/yaowen/liebiao/202601/content_7056737.htm',
    '向第39届非洲联盟峰会致贺电': 'http://politics.people.com.cn/n1/2026/0215/c1024-40666339.html',
    '会见德国总理默茨': 'https://baijiahao.baidu.com/s?id=1858137285053171169',
    '中共中央政治局召开会议 讨论"十五五"规划纲要草案和政府工作报告': 'http://politics.people.com.cn/n1/2026/0227/c1024-40671456.html',
    '在参加江苏代表团审议时的重要讲话': 'http://js.people.com.cn/n2/2026/0306/c358232-41516244.html',
    '在民营企业座谈会上的讲话': 'https://www.xuexi.cn/lgpage/detail/index.html?id=12355104368162374703',
    '在听取西藏自治区党委和政府工作汇报时的重要讲话': 'https://www.12371.cn/2025/08/20/ARTI1755690087482879.shtml',
    '在全国两会期间的重要讲话': 'http://lianghui.people.com.cn/2025/n1/2025/0305/c460142-40431822.html',
    '经济工作必须统筹好几对重要关系': 'http://www.qstheory.cn/20250228/f4d73896848446b8ad6423696f16ebbf/c.html',
    '坚持和落实"两个毫不动摇"': 'http://www.qstheory.cn/20250315/54c22dd89ddf43b0b7676fc512b2c96e/c.html',
    '在贵州考察时的重要讲话': 'http://cpc.people.com.cn/n1/2025/0319/c64094-40441715.html',
    '在云南考察时的重要讲话': 'http://cpc.people.com.cn/n1/2025/0321/c64094-40443431.html',
    '在上海考察时的重要讲话': 'http://politics.people.com.cn/n1/2025/0430/c1024-40471089.html',
    '在河南考察时的重要讲话': 'http://cpc.people.com.cn/n1/2025/0521/c64094-40487818.html',
    '在辽宁考察时的重要讲话': 'http://politics.people.com.cn/n1/2025/0124/c1024-40408758.html',
    '在吉林长春听取吉林省委和省政府工作汇报': 'http://www.news.cn/',
    '在山西考察时的重要讲话': 'http://politics.people.com.cn/n1/2025/0708/c1024-40517342.html',
    '对"十五五"规划编制工作作出重要指示': 'http://politics.people.com.cn/n1/2025/0520/c1024-40483226.html',
    '在2025年中央经济工作会议上的讲话': 'http://politics.people.com.cn/n1/2025/1211/c1024-40622544.html',
    '坚定不移推进高水平对外开放': 'http://mp.weixin.qq.com/s?__biz=MzAxNjM5NzA2OQ==&mid=2649526736&idx=1&sn=39a7b11631a6414567938ab7c5afa4b8',
    '因地制宜发展新质生产力': 'http://www.zyshgzb.gov.cn/n1/2025/1218/c461257-40627248.html',
    '扩大内需是战略之举': 'https://www.gov.cn/yaowen/liebiao/202512/content_7051330.htm',
    '走好中国特色金融发展之路，建设金融强国': 'https://www.qstheory.cn/20260131/bcd4780261044de2ac97bf9cea6e4c87/c.html',
    '在2024年中央经济工作会议上的讲话': 'http://politics.people.com.cn/n1/2024/1213/c1024-40381049.html',
    '在第四次"一带一路"建设工作座谈会上的讲话': 'http://politics.people.com.cn/n1/2024/1203/c1024-40374829.html',
    '在中华全国供销合作总社成立70周年之际作出重要指示': 'http://politics.people.com.cn/n1/2024/1129/c1024-40371589.html',
    '在亚太经合组织第三十一次领导人非正式会议上的讲话': 'http://politics.people.com.cn/n1/2024/1117/c1024-40361789.html',
    '在二十国集团领导人第十九次峰会上的讲话': 'http://politics.people.com.cn/n1/2024/1119/c1024-40363389.html',
    '在金砖国家领导人第十六次会晤上的讲话': 'http://politics.people.com.cn/n1/2024/1024/c1024-40347289.html',
    '在党的二十届三中全会第二次全体会议上的讲话': 'http://politics.people.com.cn/n1/2024/0719/c1024-40291289.html',
    '在青海考察时的重要讲话': 'http://politics.people.com.cn/n1/2024/0619/c1024-40271289.html',
    '在宁夏考察时的重要讲话': 'http://politics.people.com.cn/n1/2024/0620/c1024-40281289.html',
    '在中央财经委员会第四次会议上的讲话': 'http://politics.people.com.cn/n1/2024/0224/c1024-40191289.html',
    '在福建考察时的重要讲话': 'http://politics.people.com.cn/n1/2024/1016/c1024-40340748.html',
    '在安徽考察时的重要讲话': 'http://politics.people.com.cn/n1/2024/1018/c1024-40342325.html',
    '促进高质量充分就业': 'http://www.qstheory.cn/dukan/qs/2024-10/31/c_1130214661.htm',
    '在湖北考察时的重要讲话': 'http://politics.people.com.cn/n1/2024/1106/c1024-40355974.html',
    '开创我国高质量发展新局面': 'http://www.qstheory.cn/dukan/qs/2024-06/15/c_1130160583.htm',
    '在山东考察时的重要讲话': 'http://politics.people.com.cn/n1/2024/0524/c1024-40243026.html',
    '在重庆考察时的重要讲话': 'http://politics.people.com.cn/n1/2024/0424/c1024-40223170.html',
    '在湖南考察时的重要讲话': 'http://politics.people.com.cn/n1/2024/0321/c1024-40200556.html',
    '在天津考察时的重要讲话': 'http://politics.people.com.cn/n1/2024/0204/c1024-40172926.html',
    '蓝图已经绘就 奋进正当其时': 'http://paper.people.com.cn/rmrb/pc/content/202603/13/content_30145066.html',
    '推动海洋经济高质量发展': 'https://www.qstheory.cn/20260314/eca2335226a84f3f8d583926b70fef9b/c.html',
    '微镜头·习近平总书记两会下团组': 'https://news.sina.cn/gn/2026-03-07/detail-inhqcuct1841393.d.html?vt=4',
}

# 领域配置
DOMAINS = {
    '501': 'economy',    # 经济
    '502': 'politics',   # 政治
    '503': 'culture',    # 文化
    '504': 'society',    # 社会
    '505': 'ecology',    # 生态
    '506': 'party',      # 党建
    '507': 'defense',    # 国防
    '508': 'diplomacy',  # 外交
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

# 类型配置
CATEGORIES = {
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

BASE_URL = 'https://jhsjk.people.cn/result?form=706&else={}'

def is_duplicate(title):
    """检查是否重复"""
    title_clean = title.strip()
    for existing_title in EXISTING_ARTICLES.keys():
        # 精确匹配
        if title_clean == existing_title:
            return True
        # 包含关系
        if title_clean in existing_title or existing_title in title_clean:
            return True
        # 核心词匹配（去除前缀后比较）
        clean_new = re.sub(r'《求是》杂志发表习近平总书记重要文章\s*', '', title_clean)
        clean_old = re.sub(r'《求是》杂志发表习近平总书记重要文章\s*', '', existing_title)
        if clean_new == clean_old:
            return True
    return False

def fetch_article_list(domain_code, page=1):
    """抓取文章列表"""
    url = f'https://jhsjk.people.cn/result?form=706&else={domain_code}&page={page}'
    try:
        resp = requests.get(url, timeout=30)
        resp.encoding = 'utf-8'
        # 这里需要解析HTML，简化处理
        return []
    except Exception as e:
        print(f'抓取失败: {e}')
        return []

def generate_article_id(year, existing_ids):
    """生成文章ID"""
    num = 1
    while f'{year}-{str(num).zfill(2)}' in existing_ids:
        num += 1
    return f'{year}-{str(num).zfill(2)}'

def main():
    print('='*60)
    print('人民网学习金句数据库文章迁移工具')
    print('='*60)
    print(f'现有文章数量: {len(EXISTING_ARTICLES)}')
    print()
    print('使用方法:')
    print('1. 本脚本需要配合浏览器自动化或手动操作')
    print('2. 从人民网复制文章信息后运行本脚本进行格式化')
    print('3. 生成的数据可以导入到 Supabase 或 speeches.ts')
    print()
    print('请手动从以下URL获取文章数据:')
    for code, domain in DOMAINS.items():
        print(f'  {DOMAIN_NAMES[domain]}: https://jhsjk.people.cn/result?form=706&else={code}')

if __name__ == '__main__':
    main()