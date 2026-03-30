import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, MessageSquare, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { submitSuggestion } from '@/services/suggestionService';

export function SuggestionBox() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 验证
    if (!name.trim()) {
      setError('请输入您的姓名');
      return;
    }
    if (!content.trim()) {
      setError('请输入建议内容');
      return;
    }
    if (content.trim().length < 10) {
      setError('建议内容至少需要10个字');
      return;
    }

    setIsSubmitting(true);

    // 提交建议
    try {
      const result = await submitSuggestion(name, content);
      if (result.success) {
        setSubmitted(true);
        setName('');
        setContent('');
      } else {
        setError(`提交失败，请稍后重试 (${result.error || '未知错误'})`);
      }
    } catch (err: any) {
      setError(`提交失败，请稍后重试 (${err.message || String(err)})`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="flex items-center justify-between h-16">
            <Button
              variant="ghost"
              onClick={() => navigate('/')}
              className="text-gray-600 hover:text-red-600"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回首页
            </Button>
            <h1 className="text-xl font-bold text-gray-900">建议信箱</h1>
            <div className="w-20"></div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-8">
        <div className="max-w-2xl mx-auto">
          {submitted ? (
            <Card className="shadow-lg border-0">
              <CardContent className="p-8 text-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-10 h-10 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">提交成功！</h2>
                <p className="text-gray-500 mb-6">感谢您的宝贵建议，我们会认真阅读并改进。</p>
                <div className="flex gap-4 justify-center">
                  <Button variant="outline" onClick={() => navigate('/')}>
                    返回首页
                  </Button>
                  <Button onClick={() => setSubmitted(false)} className="bg-red-600 hover:bg-red-700">
                    继续提交
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-lg border-0">
              <CardHeader className="text-center pb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-red-600 to-red-700 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <MessageSquare className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-2xl font-bold text-gray-900">您的建议对我们很重要</CardTitle>
                <CardDescription className="text-gray-500">
                  欢迎提出宝贵意见和建议，帮助我们不断改进
                </CardDescription>
              </CardHeader>

              <CardContent>
                {error && (
                  <Alert className="mb-4 bg-red-50 border-red-200">
                    <AlertDescription className="text-red-700">{error}</AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      您的姓名 <span className="text-red-500">*</span>
                    </label>
                    <Input
                      placeholder="请输入姓名"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-12"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      建议内容 <span className="text-red-500">*</span>
                    </label>
                    <Textarea
                      placeholder="请详细描述您的建议..."
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      rows={8}
                      className="resize-none"
                    />
                    <p className="text-xs text-gray-400">建议内容至少10个字</p>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-medium"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      '提交中...'
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        提交建议
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
