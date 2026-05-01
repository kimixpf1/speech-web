import { useState, startTransition } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin, ExternalLink, Share2, FileText, FileText as FileTextIcon, TrendingUp, Copy, Check, MessageCircle, Volume2, Download, Play, Pause, RefreshCw, Sparkles, AlertCircle, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogHeader,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { categoryConfig, domainConfig, LOCAL_VOICE_PACK_SIZE_MB } from '@/config/constants';
import { isMobileDevice, isWeChatBrowser } from '@/utils/deviceDetect';
import { isArticleUrl, inferSourceFromUrl } from '@/lib/utils';
import { useArticleDetail } from '@/hooks/useArticleDetail';
import { useTTS } from '@/hooks/useTTS';

export function DetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    speech,
    isLoading,
    isGenerating,
    generateError,
    hasGeneratedContent,
    normalizedSpeechUrl,
    handleGenerateContent,
  } = useArticleDetail(id);

  const {
    isSpeaking,
    speechRate,
    showTtsDialog,
    ttsError,
    isPreparingVoicePack,
    voicePackReady,
    voicePackDownloadProgress,
    voicePackStatusText,
    handleSpeak,
    stopSpeaking,
    setSpeechRate,
    setShowTtsDialog,
    handleDownloadVoicePack,
    supportsDownloadedVoicePack,
  } = useTTS();

  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const displaySource = speech ? inferSourceFromUrl(normalizedSpeechUrl, speech.source) : '';

  const getTtsText = () => {
    if (!speech) return '';
    let text = `${speech.title}。${speech.abstract}`;
    if (speech.fullText && !speech.fullText.includes('正在整理中')) {
      text += `。${speech.fullText.substring(0, isMobileDevice() || isWeChatBrowser() ? 900 : 2400)}`;
    }
    if (speech.analysis && !speech.analysis.includes('正在整理中') && !isMobileDevice() && !isWeChatBrowser()) {
      text += `。${speech.analysis.substring(0, 1600)}`;
    }
    text = text.replace(/\s+/g, ' ').replace(/\n+/g, '。').trim();
    const maxLength = isMobileDevice() || isWeChatBrowser() ? 1400 : 4200;
    if (text.length > maxLength) {
      text = text.substring(0, maxLength) + '。后续内容省略。';
    }
    return text;
  };

  const onSpeakToggle = () => {
    if (isSpeaking) {
      stopSpeaking();
    } else {
      handleSpeak(getTtsText);
    }
  };

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
    const isZhengjiguanDetail = window.location.hash.includes('/zhengjiguan/');
    const targetPath = isZhengjiguanDetail ? '/zhengjiguan' : '/';
    startTransition(() => {
      navigate(targetPath, { replace: true });
    });
  };

  const handleExportWord = async () => {
    if (!speech) return;

    const { Document, Paragraph, TextRun, AlignmentType, HeadingLevel, Packer } = await import('docx');
    const { saveAs } = await import('file-saver');

    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: {
              top: 1440,
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children: [
          new Paragraph({
            text: speech.title,
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `来源：${displaySource}`,
                size: 24,
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
          new Paragraph({
            text: '【摘要】',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 200 },
          }),
          new Paragraph({
            text: speech.abstract,
            spacing: { after: 400 },
            indent: { firstLine: 480 },
          }),
          new Paragraph({
            text: '【原文】',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 200 },
          }),
          ...speech.fullText.split('\n').filter(p => p.trim()).map(paragraph =>
            new Paragraph({
              text: paragraph.trim(),
              spacing: { after: 200 },
              indent: { firstLine: 480 },
            })
          ),
          new Paragraph({
            text: '【解读】',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 },
          }),
          ...speech.analysis.split('\n').filter(p => p.trim()).map(paragraph =>
            new Paragraph({
              text: paragraph.trim(),
              spacing: { after: 200 },
              indent: { firstLine: 480 },
            })
          ),
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
                text: `本文档由「习近平总书记重要讲话学习平台」生成`,
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

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${speech.title}.docx`);
  };

  if (isLoading && !speech) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="w-24 h-6 bg-gray-200 rounded animate-pulse mb-8"></div>
          <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8 space-y-4">
            <div className="w-16 h-6 bg-gray-200 rounded-full animate-pulse mb-4"></div>
            <div className="h-10 bg-gray-200 rounded w-3/4 animate-pulse"></div>
            <div className="h-10 bg-gray-200 rounded w-1/2 animate-pulse"></div>
            <div className="flex gap-4 pt-4 border-t border-gray-100 mt-6">
              <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8 space-y-8">
            <div className="space-y-3">
              <div className="h-6 bg-gray-200 rounded w-32 animate-pulse mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6 animate-pulse"></div>
            </div>
            <div className="space-y-3 pt-6 border-t border-gray-100">
              <div className="h-6 bg-gray-200 rounded w-32 animate-pulse mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-4/5 animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!speech && !isLoading) {
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

  const config = categoryConfig[speech.category] || categoryConfig.speech;
  const Icon = config.icon;

  return (
    <div className="min-h-screen bg-gray-50">
      {isLoading && (
        <div className="fixed top-0 left-0 right-0 z-[60] h-1 bg-gray-200">
          <div className="h-full bg-red-600 transition-all duration-300" style={{ width: '60%' }}></div>
        </div>
      )}
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
              <Button
                variant="outline"
                onClick={() => setShowTtsDialog(true)}
                className="text-gray-700 hover:text-red-600 hover:border-red-300 px-4 py-2 h-auto flex items-center gap-2"
                title="语音播报"
              >
                <Volume2 className="w-5 h-5" />
                <span className="text-sm font-medium">语音播报</span>
              </Button>
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

      <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10 pb-6 border-b-2 border-red-100">
            <h1 className="text-3xl lg:text-4xl font-bold text-red-700 mb-3">
              习近平总书记重要讲话精神
            </h1>
            <p className="text-xl text-gray-500">学习平台</p>
          </div>

          <div className="mb-10">
            <div className="flex items-center gap-3 mb-5">
              {speech.domain && speech.domainName && (
                <Badge className={`${domainConfig[speech.domain]?.bgColor || 'bg-gray-50'} ${domainConfig[speech.domain]?.color || 'text-gray-600'} border ${domainConfig[speech.domain]?.borderColor || 'border-gray-200'} text-lg px-4 py-1.5`}>
                  {speech.domainName}
                </Badge>
              )}
              <Badge className={`${config.bgColor} ${config.color} border ${config.borderColor} text-lg px-4 py-1.5`}>
                <Icon className="w-5 h-5 mr-2" />
                {speech.categoryName}
              </Badge>
            </div>

            <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 leading-tight mb-6">
              {speech.title}
            </h1>

            <div className="flex items-center gap-2 text-xl text-gray-600 mb-4">
              <span className="font-medium">来源：</span>
              <span>{displaySource}</span>
            </div>

            {isArticleUrl(normalizedSpeechUrl) ? (
              <div className="flex items-center gap-2 text-xl mb-5">
                <span className="font-medium text-gray-600">原文链接：</span>
                <a
                  href={normalizedSpeechUrl}
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

          <Card className="mb-10 border-yellow-200 bg-gradient-to-br from-yellow-50 to-amber-50">
            <CardHeader className="pb-5">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-3 text-2xl text-gray-900">
                  <FileTextIcon className="w-8 h-8 text-yellow-600" />
                  摘要
                </CardTitle>
                <Button
                  onClick={handleGenerateContent}
                  disabled={isGenerating}
                  variant="outline"
                  size="sm"
                  className="text-yellow-700 border-yellow-300 hover:bg-yellow-100"
                >
                  {isGenerating ? (
                    <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-1" />
                  )}
                  {hasGeneratedContent ? '重新生成' : 'AI生成'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-gray-700 leading-relaxed whitespace-pre-line text-xl">
                {speech.abstract}
              </p>
              {generateError && (
                <div className="flex items-center gap-2 text-red-600 text-sm mt-3 bg-red-50 p-2 rounded">
                  <AlertCircle className="w-4 h-4" />
                  {generateError}
                </div>
              )}
              <p className="text-xs text-gray-400 mt-4 pt-3 border-t border-yellow-200">摘要由AI生成，仅供参考</p>
            </CardContent>
          </Card>

          <Card className="mb-10">
            <CardHeader className="pb-5">
              <CardTitle className="flex items-center gap-3 text-2xl text-gray-900">
                <BookOpen className="w-8 h-8 text-blue-600" />
                原文
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {isArticleUrl(normalizedSpeechUrl) ? (
                <div className="bg-gray-50 rounded-lg p-6 text-center">
                  <BookOpen className="w-10 h-10 mx-auto mb-3 text-blue-500" />
                  <p className="text-gray-600 mb-4">点击下方按钮在新窗口中阅读官方原文</p>
                  <a
                    href={normalizedSpeechUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <ExternalLink className="w-5 h-5" />
                    新窗口打开原文
                  </a>
                  <p className="text-xs text-gray-400 mt-3">{displaySource}</p>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-6 text-center text-gray-500">
                  <BookOpen className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                  <p>暂无原文链接</p>
                </div>
              )}
              <p className="text-xs text-gray-400 mt-4 pt-3 border-t border-gray-200">原文内容来自官方网站</p>
            </CardContent>
          </Card>

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
              <p className="text-xs text-gray-400 mt-4 pt-3 border-t border-green-200">解读由AI生成，仅供参考</p>
            </CardContent>
          </Card>

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

      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden">
          <div className="bg-gradient-to-br from-red-700 to-red-800 p-6 text-white">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center border-2 border-white/30">
                <span className="text-2xl font-bold">习</span>
              </div>
              <div>
                <DialogTitle className="text-white text-lg font-bold">分享给同事学习</DialogTitle>
                <DialogDescription className="text-white/80 text-sm mt-1">
                  习近平总书记重要讲话精神
                </DialogDescription>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-500 mb-1">当前文章</p>
              <p className="font-medium text-gray-900 line-clamp-2">{speech.title}</p>
              <p className="text-xs text-gray-400 mt-1">{speech.date} · {displaySource}</p>
            </div>
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

            {supportsDownloadedVoicePack() && (
              <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-amber-900">中文离线语音包</p>
                    <p className="text-xs text-amber-800">
                      适合华为手机和微信环境，首次下载约 {LOCAL_VOICE_PACK_SIZE_MB}MB，之后会保存在当前浏览器里
                    </p>
                  </div>
                  <Badge variant="outline" className="border-amber-300 text-amber-700 bg-white">
                    {voicePackReady ? '已就绪' : '未下载'}
                  </Badge>
                </div>
                {voicePackStatusText && (
                  <p className="text-xs text-amber-900">{voicePackStatusText}</p>
                )}
                {(isPreparingVoicePack || voicePackDownloadProgress > 0) && (
                  <div className="space-y-1">
                    <Progress value={voicePackDownloadProgress} className="h-2 bg-amber-100" />
                    <p className="text-[11px] text-amber-700 text-right">{voicePackDownloadProgress}%</p>
                  </div>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    void handleDownloadVoicePack();
                  }}
                  disabled={isPreparingVoicePack || voicePackReady}
                  className="w-full border-amber-300 text-amber-900 hover:bg-amber-100"
                >
                  {isPreparingVoicePack ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      正在准备语音包
                    </>
                  ) : voicePackReady ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      语音包已下载
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      下载语音包
                    </>
                  )}
                </Button>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={onSpeakToggle}
                disabled={isPreparingVoicePack && !isSpeaking}
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

            {ttsError && (
              <p className="text-xs text-red-500 text-center bg-red-50 rounded p-2">
                {ttsError}
              </p>
            )}
            <p className="text-xs text-gray-500 text-center">
              华为和微信环境会优先尝试离线语音包，其余环境优先尝试浏览器内置语音，先播放标题和摘要，再继续正文
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
