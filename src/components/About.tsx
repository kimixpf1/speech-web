import { BookOpen, Target, Users, Sparkles, Shield, Globe, Calendar, RefreshCw, Mail, Lock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export function About() {
  const features = [
    {
      icon: Target,
      title: '权威来源',
      description: '内容来源于人民日报、新华社、求是杂志、中国政府网等权威媒体，确保信息的准确性和权威性。'
    },
    {
      icon: Users,
      title: '服务学习',
      description: '为广大党员干部和群众提供便捷的学习平台，助力深入学习贯彻习近平总书记重要讲话精神。'
    },
    {
      icon: Sparkles,
      title: '分类清晰',
      description: '按照重要讲话、发表文章、重要会议、考察调研四大类别进行分类，方便快速查找。'
    },
    {
      icon: Shield,
      title: '持续更新',
      description: '持续跟踪权威媒体发布的最新内容，及时更新补充，确保学习资源的时效性。'
    },
    {
      icon: Globe,
      title: '原文链接',
      description: '每篇文章都提供原文链接，可直接跳转到权威媒体网站查看完整内容。'
    },
    {
      icon: BookOpen,
      title: '深度解读',
      description: '每篇文章提供核心要点、原文全文和解读分析，帮助深入理解讲话精神。'
    }
  ];

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-12">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-50 text-red-600 mb-4">
          <Sparkles className="w-4 h-4" />
          <span className="text-sm font-medium">关于平台</span>
        </div>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-3">
          习近平总书记重要讲话学习平台
        </h1>
        <p className="text-gray-600 leading-relaxed">
          本平台致力于收集整理习近平总书记的重要讲话、发表文章、重要会议和考察调研动态，
          为广大党员干部和群众提供一个集中、便捷、权威的学习资源平台。
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto mb-12">
        {features.map((feature, index) => (
          <Card key={index} className="group hover:shadow-md transition-all border-gray-100">
            <CardContent className="p-5">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center mb-3 group-hover:from-red-100 group-hover:to-red-200 transition-all">
                <feature.icon className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-1">{feature.title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{feature.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Platform Features */}
      <div className="max-w-3xl mx-auto mb-10">
        <h2 className="text-xl font-bold text-gray-900 text-center mb-6">平台功能</h2>
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-sm mb-1">文章浏览</h3>
                <p className="text-xs text-gray-500">按分类、年份筛选，支持关键词搜索</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Globe className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-sm mb-1">原文链接</h3>
                <p className="text-xs text-gray-500">每篇文章提供权威媒体原文链接</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                <Mail className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-sm mb-1">建议信箱</h3>
                <p className="text-xs text-gray-500">欢迎提出宝贵意见和建议</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                <Lock className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-sm mb-1">管理员后台</h3>
                <p className="text-xs text-gray-500">访问统计、文章管理、建议查看</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Data Sources */}
      <div className="max-w-3xl mx-auto mb-10">
        <h2 className="text-xl font-bold text-gray-900 text-center mb-6">数据来源</h2>
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-white shadow-sm flex items-center justify-center mx-auto mb-3">
                <span className="text-xl font-bold text-red-600">人</span>
              </div>
              <h3 className="font-semibold text-gray-900 text-sm mb-1">人民网</h3>
              <p className="text-xs text-gray-500">人民日报官方网站</p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-white shadow-sm flex items-center justify-center mx-auto mb-3">
                <span className="text-xl font-bold text-red-600">新</span>
              </div>
              <h3 className="font-semibold text-gray-900 text-sm mb-1">新华网</h3>
              <p className="text-xs text-gray-500">新华社官方网站</p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-white shadow-sm flex items-center justify-center mx-auto mb-3">
                <span className="text-xl font-bold text-red-600">求</span>
              </div>
              <h3 className="font-semibold text-gray-900 text-sm mb-1">求是网</h3>
              <p className="text-xs text-gray-500">求是杂志官方网站</p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-white shadow-sm flex items-center justify-center mx-auto mb-3">
                <span className="text-xl font-bold text-red-600">政</span>
              </div>
              <h3 className="font-semibold text-gray-900 text-sm mb-1">中国政府网</h3>
              <p className="text-xs text-gray-500">国务院官方网站</p>
            </div>
          </div>
        </div>
      </div>

      {/* Time Range */}
      <div className="max-w-2xl mx-auto mb-10">
        <div className="bg-red-50 border border-red-100 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <Calendar className="w-5 h-5 text-red-600" />
            <h3 className="font-semibold text-red-800">内容时间范围</h3>
          </div>
          <p className="text-sm text-red-700 leading-relaxed">
            本平台收录了 <strong>2024年至2026年</strong> 期间习近平总书记的重要讲话、发表文章、
            重要会议和考察调研动态，共计 <strong>1200+篇</strong> 内容，持续更新中。
          </p>
        </div>
      </div>

      {/* Update Info */}
      <div className="max-w-3xl mx-auto mb-10">
        <Card className="border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">内容更新</h3>
                <p className="text-sm text-gray-500">关于内容更新机制</p>
              </div>
            </div>
            <div className="space-y-3 text-sm text-gray-700">
              <p>
                <strong>更新方式：</strong>本平台内容需要手动更新。我们会定期跟踪人民日报、新华社、求是杂志等权威媒体，及时补充最新内容。
              </p>
              <p>
                <strong>更新内容：</strong>包括习近平总书记的重要讲话、发表文章、重要会议和考察调研动态。
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Disclaimer */}
      <div className="max-w-2xl mx-auto text-center">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <h3 className="font-semibold text-amber-800 mb-2">免责声明</h3>
          <p className="text-sm text-amber-700 leading-relaxed">
            本平台仅供学习交流使用，所有内容版权归原作者及原出处所有。
            如有侵权，请联系我们删除。本平台不对内容的准确性、完整性作任何保证。
          </p>
        </div>
      </div>
    </div>
  );
}
