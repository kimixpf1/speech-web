import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin, ExternalLink, Share2, Mic, FileText, Users, MapPin as MapPinIcon, BookOpen, FileText as FileTextIcon, TrendingUp, Copy, Check, MessageCircle, Volume2, Download, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { speechesData } from '@/data/speeches';
import { getSpeechDetail, type SpeechDetail } from '@/data/speechesDetail';
import { getArticles, type Speech } from '@/services/articleServiceEnhanced';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogHeader,
} from '@/components/ui/dialog';
import { Document, Paragraph, TextRun, AlignmentType, HeadingLevel, Packer } from 'docx';
import { saveAs } from 'file-saver';

const categoryConfig: Record<string, { icon: React.ElementType; color: string; bgColor: string; borderColor: string; label: string }> = {
  speech: { icon: Mic, color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200', label: '重要讲话' },
  article: { icon: FileText, color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-200', label: '发表文章' },
  meeting: { icon: Users, color: 'text-purple-600', bgColor: 'bg-purple-50', borderColor: 'border-purple-200', label: '重要会议' },
  inspection: { icon: MapPinIcon, color: 'text-orange-600', bgColor: 'bg-orange-50', borderColor: 'border-orange-200', label: '考察调研' },
};

export function DetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [speech, setSpeech] = useState<SpeechDetail | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // 语音播报状态
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechRate, setSpeechRate] = useState(1);
  const [showTtsDialog, setShowTtsDialog] = useState(false);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    // 进入详情页时直接跳转到顶部（无动画）
    window.scrollTo({ top: 0, behavior: 'auto' });
    
    if (id) {
      // 先从静态数据查找
      let baseSpeech = speechesData.find(s => s.id === id);
      
      // 如果静态数据中没有，从云端数据查找
      if (!baseSpeech) {
        const loadFromCloud = async () => {
          const cloudArticles = await getArticles();
          const cloudSpeech = cloudArticles.find(s => s.id === id);
          if (cloudSpeech) {
            const detail = getSpeechDetail(id);
            setSpeech({
              ...cloudSpeech,
              abstract: detail?.abstract || '摘要正在整理中...',
              fullText: detail?.fullText || '原文全文正在整理中...',
              analysis: detail?.analysis || '解读分析正在整理中...'
            } as SpeechDetail);
          }
        };
        loadFromCloud();
        return;
      }
      
      const detail = getSpeechDetail(id);
      
      if (baseSpeech) {
        setSpeech({
          ...baseSpeech,
          abstract: detail?.abstract || '摘要正在整理中...',
          fullText: detail?.fullText || '原文全文正在整理中...',
          analysis: detail?.analysis || '解读分析正在整理中...'
        } as SpeechDetail);
      }
    }
  }, [id]);

  const handleShare = () => {
    setShareDialogOpen(true);
  };

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleShareToWeChat = () => {
    alert('请使用微信扫一扫功能分享此页面');
  };

  const handleBack = () => {
    // 返回首页时，保留 scrollPosition 让首页恢复滚动位置
    // 使用 replace: true 避免在历史记录中留下多余条目
    navigate('/', { replace: true });
  };

  // 初始化语音合成
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      synthRef.current = window.speechSynthesis;
    }
    
    return () => {
      // 清理：停止语音播放
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  // 语音播报功能 - 兼容手机端和微信浏览器
  const handleSpeak = () => {
    if (!speech) return;
    
    // 检查浏览器是否支持语音合成
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      alert('您的浏览器不支持语音播报功能，请使用Chrome、Safari或Edge浏览器');
      return;
    }
    
    // 确保 speechSynthesis 已初始化
    if (!synthRef.current) {
      synthRef.current = window.speechSynthesis;
    }
    
    // 如果正在播放，停止
    if (isSpeaking) {
      synthRef.current?.cancel();
      setIsSpeaking(false);
      return;
    }
    
    // 优化文本
    let text = `${speech.title}。${speech.abstract}。${speech.fullText}。${speech.analysis}`;
    text = text.replace(/\s+/g, ' ').replace(/\n+/g, ' ').trim();
    
    // 创建语音 utterance
    const utterance = new SpeechSynthesisUtterance(text);
    
    // 设置语速
    utterance.rate = speechRate;
    utterance.pitch = 1;
    
    // 获取语音列表
    let voices = synthRef.current?.getVoices() || [];
    
    // 选择中文语音
    const zhVoice = voices.find(v => 
      v.lang.includes('zh') || v.lang.includes('CN') || v.lang.includes('cmn')
    );
    if (zhVoice) {
      utterance.voice = zhVoice;
    }
    
    utterance.onend = () => {
      setIsSpeaking(false);
    };
    
    utterance.onerror = (e) => {
      console.error('语音播报错误:', e);
      // 忽略用户主动取消的错误 (canceled 或 interrupted)
      const errorType = (e as any).error;
      if (errorType === 'canceled' || errorType === 'interrupted' || errorType === 'aborted') {
        return;
      }
      setIsSpeaking(false);
      // 只在非用户主动取消时显示错误
      if (errorType !== 'canceled') {
        console.warn('语音播报失败:', errorType);
      }
    };
    
    utteranceRef.current = utterance;
    
    // 尝试播放
    try {
      synthRef.current?.speak(utterance);
      setIsSpeaking(true);
    } catch (e) {
      console.error('语音播放失败:', e);
      alert('语音播报启动失败，请检查浏览器设置');
    }
  };

  // 导出Word功能
  const handleExportWord = async () => {
    if (!speech) return;
    
    // 创建公文格式文档
    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: {
              top: 1440, // 1 inch = 1440 twips
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children: [
          // 标题
          new Paragraph({
            text: speech.title,
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          
          // 来源和日期
          new Paragraph({
            children: [
              new TextRun({
                text: `来源：${speech.source}`,
                size: 24, // 12pt
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          }),
          
          new Paragraph({
            children: [
              new TextRun({
                text: `日期：${speech.date}${speech.location ? `  地点：${speech.location}` : ''}`,
                size: 24,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          
          // 分隔线
          new Paragraph({
            border: {
              bottom: {
                color: '000000',
                space: 1,
                style: 'single',
                size: 6,
              },
            },
            spacing: { after: 400 },
          }),
          
          // 摘要标题
          new Paragraph({
            text: '【摘要】',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 200 },
          }),
          
          // 摘要内容
          new Paragraph({
            text: speech.abstract,
            spacing: { after: 400 },
            indent: { firstLine: 480 }, // 首行缩进2字符
          }),
          
          // 原文标题
          new Paragraph({
            text: '【原文】',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 200 },
          }),
          
          // 原文内容（分段）
          ...speech.fullText.split('\n').filter(p => p.trim()).map(paragraph => 
            new Paragraph({
              text: paragraph.trim(),
              spacing: { after: 200 },
              indent: { firstLine: 480 },
            })
          ),
          
          // 解读标题
          new Paragraph({
            text: '【解读】',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 },
          }),
          
          // 解读内容（分段）
          ...speech.analysis.split('\n').filter(p => p.trim()).map(paragraph => 
            new Paragraph({
              text: paragraph.trim(),
              spacing: { after: 200 },
              indent: { firstLine: 480 },
            })
          ),
          
          // 页脚
          new Paragraph({
            text: '',
            spacing: { before: 600 },
          }),
          new Paragraph({
            border: {
              top: {
                color: '000000',
                space: 1,
                style: 'single',
                size: 6,
              },
            },
            spacing: { before: 200, after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `本文档由「习近平总书记关于经济工作重要讲话精神学习平台」生成`,
                size: 18,
                color: '666666',
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `生成时间：${new Date().toLocaleString('zh-CN')}`,
                size: 18,
                color: '666666',
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
        ],
      }],
    });
    
    // 生成并下载文件
    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${speech.title}.docx`);
  };

  if (!speech) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-10 h-10 text-gray-400" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">内容未找到</h2>
          <p className="text-gray-500 mb-4 text-lg">该文章可能已被删除或不存在</p>
          <Button onClick={handleBack} className="bg-red-600 hover:bg-red-700 text-lg px-6 py-3">
            <ArrowLeft className="w-5 h-5 mr-2" />
            返回首页
          </Button>
        </div>
      </div>
    );
  }

  const config = categoryConfig[speech.category];
  const Icon = config.icon;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="flex items-center justify-between h-16">
            <Button
              variant="ghost"
              size="lg"
              onClick={handleBack}
              className="text-gray-600 hover:text-red-600 text-lg"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              返回
            </Button>
            <div className="flex items-center gap-3">
              {/* 语音播报按钮 */}
              <Button
                variant="outline"
                onClick={() => setShowTtsDialog(true)}
                className="text-gray-700 hover:text-red-600 hover:border-red-300 px-4 py-2 h-auto flex items-center gap-2"
                title="语音播报"
              >
                <Volume2 className="w-5 h-5" />
                <span className="text-sm font-medium">语音播报</span>
              </Button>
              
              {/* 导出Word按钮 */}
              <Button
                variant="outline"
                onClick={handleExportWord}
                className="text-gray-700 hover:text-red-600 hover:border-red-300 px-4 py-2 h-auto flex items-center gap-2"
                title="导出Word"
              >
                <Download className="w-5 h-5" />
                <span className="text-sm font-medium">下载文本</span>
              </Button>
              
              <Button
                variant="outline"
                onClick={handleShare}
                className="text-gray-700 hover:text-red-600 hover:border-red-300 px-4 py-2 h-auto flex items-center gap-2"
                title="分享"
              >
                <Share2 className="w-5 h-5" />
                <span className="text-sm font-medium">分享链接</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-8">
        <div className="max-w-4xl mx-auto">
          {/* 页面标题 */}
          <div className="text-center mb-10 pb-6 border-b-2 border-red-100">
            <h1 className="text-3xl lg:text-4xl font-bold text-red-700 mb-3">
              习近平总书记关于经济工作重要讲话精神
            </h1>
            <p className="text-xl text-gray-500">学习平台</p>
          </div>

          {/* Title Section */}
          <div className="mb-10">
            {/* 分类标签 */}
            <div className="flex items-center gap-3 mb-5">
              <Badge className={`${config.bgColor} ${config.color} border ${config.borderColor} text-lg px-4 py-1.5`}>
                <Icon className="w-5 h-5 mr-2" />
                {speech.categoryName}
              </Badge>
            </div>

            {/* 标题 */}
            <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 leading-tight mb-6">
              {speech.title}
            </h1>

            {/* 来源 */}
            <div className="flex items-center gap-2 text-xl text-gray-600 mb-4">
              <span className="font-medium">来源：</span>
              <span>{speech.source}</span>
            </div>

            {/* 原文链接 */}
            {speech.url && speech.url !== 'http://www.news.cn/' && speech.url !== 'https://www.qstheory.cn/' ? (
              <div className="flex items-center gap-2 text-xl mb-5">
                <span className="font-medium text-gray-600">原文链接：</span>
                <a
                  href={speech.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-red-600 hover:text-red-700 flex items-center gap-2 underline"
                >
                  点击阅读原文
                  <ExternalLink className="w-5 h-5" />
                </a>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xl text-gray-400 mb-5">
                <span className="font-medium">原文链接：</span>
                <span>暂无原文链接</span>
              </div>
            )}

            {/* 日期和地点 */}
            <div className="flex items-center gap-6 text-lg text-gray-500 flex-wrap">
              <span className="flex items-center gap-2">
                <Calendar className="w-6 h-6" />
                {speech.date}
              </span>
              {speech.location && (
                <span className="flex items-center gap-2">
                  <MapPin className="w-6 h-6" />
                  {speech.location}
                </span>
              )}
            </div>
          </div>

          {/* 摘要 */}
          <Card className="mb-10 border-yellow-200 bg-gradient-to-br from-yellow-50 to-amber-50">
            <CardHeader className="pb-5">
              <CardTitle className="flex items-center gap-3 text-2xl text-gray-900">
                <FileTextIcon className="w-8 h-8 text-yellow-600" />
                摘要
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-gray-700 leading-relaxed whitespace-pre-line text-xl">
                {speech.abstract}
              </p>
            </CardContent>
          </Card>

          {/* 原文 */}
          <Card className="mb-10">
            <CardHeader className="pb-5">
              <CardTitle className="flex items-center gap-3 text-2xl text-gray-900">
                <BookOpen className="w-8 h-8 text-blue-600" />
                原文
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="prose prose-gray max-w-none">
                <div className="bg-gray-50 rounded-lg p-8 text-gray-700 leading-loose whitespace-pre-line text-xl">
                  {speech.fullText}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 解读 */}
          <Card className="mb-10 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
            <CardHeader className="pb-5">
              <CardTitle className="flex items-center gap-3 text-2xl text-gray-900">
                <TrendingUp className="w-8 h-8 text-green-600" />
                解读
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-gray-700 leading-loose whitespace-pre-line text-xl">
                {speech.analysis}
              </div>
            </CardContent>
          </Card>

          {/* Back Button */}
          <div className="flex justify-center pt-8">
            <Button
              onClick={handleBack}
              variant="outline"
              className="border-red-200 text-red-600 hover:bg-red-50 text-lg px-8 py-4"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              返回首页
            </Button>
          </div>
        </div>
      </main>

      {/* Share Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden">
          {/* Header with image */}
          <div className="bg-gradient-to-br from-red-700 to-red-800 p-6 text-white">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center border-2 border-white/30">
                <span className="text-2xl font-bold">习</span>
              </div>
              <div>
                <DialogTitle className="text-white text-lg font-bold">分享给同事学习</DialogTitle>
                <DialogDescription className="text-white/80 text-sm mt-1">
                  习近平总书记关于经济工作重要讲话精神
                </DialogDescription>
              </div>
            </div>
          </div>
          
          {/* Content */}
          <div className="p-6">
            {/* Article info */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-500 mb-1">当前文章</p>
              <p className="font-medium text-gray-900 line-clamp-2">{speech.title}</p>
              <p className="text-xs text-gray-400 mt-1">{speech.date} · {speech.source}</p>
            </div>

            {/* Share buttons */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <Button
                onClick={handleShareToWeChat}
                className="flex flex-col items-center gap-2 h-auto py-4 bg-green-500 hover:bg-green-600"
              >
                <MessageCircle className="w-8 h-8" />
                <span className="text-sm">微信分享</span>
              </Button>
              <Button
                onClick={handleCopyLink}
                variant="outline"
                className="flex flex-col items-center gap-2 h-auto py-4"
              >
                {copied ? <Check className="w-8 h-8 text-green-500" /> : <Copy className="w-8 h-8" />}
                <span className="text-sm">{copied ? '已复制' : '复制链接'}</span>
              </Button>
            </div>

            {/* QR Code hint */}
            <div className="text-center">
              <p className="text-xs text-gray-400 mb-2">或使用微信扫一扫分享</p>
              <div className="w-32 h-32 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg mx-auto flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 bg-gray-200 rounded mx-auto mb-1 flex items-center justify-center">
                    <span className="text-xs text-gray-400">二维码</span>
                  </div>
                  <span className="text-xs text-gray-400">扫码分享</span>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 语音播报对话框 */}
      <Dialog open={showTtsDialog} onOpenChange={setShowTtsDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Volume2 className="w-5 h-5" />
              语音播报设置
            </DialogTitle>
            <DialogDescription>
              选择语音和语速，开始收听文章内容
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* 语速选择 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">语速: {speechRate}x</label>
              <div className="flex gap-2">
                {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                  <Button
                    key={rate}
                    variant={speechRate === rate ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSpeechRate(rate)}
                    className={speechRate === rate ? 'bg-red-600 hover:bg-red-700' : ''}
                  >
                    {rate}x
                  </Button>
                ))}
              </div>
            </div>
            
            {/* 播放控制 */}
            <div className="flex gap-2">
              <Button
                onClick={handleSpeak}
                className={`flex-1 ${isSpeaking ? 'bg-amber-600 hover:bg-amber-700' : 'bg-red-600 hover:bg-red-700'}`}
              >
                {isSpeaking ? (
                  <>
                    <Pause className="w-4 h-4 mr-2" />
                    停止播放
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    开始播放
                  </>
                )}
              </Button>
            </div>
            
            {/* 提示 */}
            <p className="text-xs text-gray-500 text-center">
              语音播报使用浏览器内置语音合成技术，不同浏览器支持程度可能不同
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
