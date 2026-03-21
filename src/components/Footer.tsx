import { BookOpen, Heart, ExternalLink } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  const links = [
    {
      title: '权威来源',
      items: [
        { label: '人民日报', url: 'http://www.people.com.cn/' },
        { label: '新华社', url: 'http://www.xinhuanet.com/' },
        { label: '求是杂志', url: 'http://www.qstheory.cn/' },
        { label: '中国政府网', url: 'http://www.gov.cn/' },
      ]
    },
    {
      title: '学习资源',
      items: [
        { label: '学习强国', url: 'https://www.xuexi.cn/' },
        { label: '共产党员网', url: 'https://www.12371.cn/' },
        { label: '中央党校', url: 'http://www.ccps.gov.cn/' },
      ]
    }
  ];

  return (
    <footer className="bg-gray-900 text-white">
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold truncate leading-tight">重要讲话学习平台</h3>
                <p className="text-xs text-gray-400 truncate leading-tight">习近平总书记重要讲话精神</p>
              </div>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              汇集人民日报、新华社、求是杂志等权威媒体发布的重要讲话、发表文章、重要会议和考察调研动态。
            </p>
          </div>

          {/* Links */}
          {links.map((section, index) => (
            <div key={index}>
              <h4 className="text-sm font-semibold mb-3 text-gray-300">{section.title}</h4>
              <ul className="space-y-2">
                {section.items.map((item, itemIndex) => (
                  <li key={itemIndex}>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-white transition-colors flex items-center gap-1 text-sm"
                    >
                      {item.label}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="mt-8 pt-6 border-t border-gray-800">
          {/* 版权与法律声明 */}
          <div className="mb-4 text-xs text-gray-500 leading-relaxed space-y-1">
            <p className="font-medium text-gray-400">版权声明与免责声明</p>
            <p>本平台为非盈利性质的内部学习交流工具，不作任何商业用途。所有文章内容的版权归人民日报社、新华通讯社、求是杂志社等原始发布平台所有。</p>
            <p>本平台内容来源于公开的官方媒体报道，仅做学习整理之用。部分摘要和解读由AI生成，仅供参考，不代表任何官方立场。如有侵权，请联系管理员删除。</p>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-gray-500 text-sm text-center md:text-left">
              &copy; {currentYear} 重要讲话学习平台 · 非盈利内部学习使用 · 文章版权归原发布平台所有
            </p>
            <p className="text-gray-500 text-sm flex items-center gap-1">
              用 <Heart className="w-4 h-4 text-red-500" /> 打造
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
