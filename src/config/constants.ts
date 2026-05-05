import {
  Mic, FileText, Users, MapPin as MapPinIcon,
  Building2, Building, Home,
  TrendingUp, Landmark, BookOpen, Leaf, Flag, Shield, Globe, LayoutGrid, Phone,
} from 'lucide-react';

export const categoryConfig = {
  speech: { icon: Mic, color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-100', label: '重要讲话' },
  article: { icon: FileText, color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-100', label: '发表文章' },
  meeting: { icon: Users, color: 'text-purple-600', bgColor: 'bg-purple-50', borderColor: 'border-purple-100', label: '重要会议' },
  inspection: { icon: MapPinIcon, color: 'text-orange-600', bgColor: 'bg-orange-50', borderColor: 'border-orange-100', label: '考察调研' },
  call: { icon: Phone, color: 'text-cyan-600', bgColor: 'bg-cyan-50', borderColor: 'border-cyan-100', label: '致电回信' },
} as const;

export const domainConfig = {
  economy: { color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200', label: '经济' },
  politics: { color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-200', label: '政治' },
  culture: { color: 'text-purple-600', bgColor: 'bg-purple-50', borderColor: 'border-purple-200', label: '文化' },
  society: { color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-200', label: '社会' },
  ecology: { color: 'text-emerald-600', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200', label: '生态' },
  party: { color: 'text-orange-600', bgColor: 'bg-orange-50', borderColor: 'border-orange-200', label: '党建' },
  defense: { color: 'text-slate-600', bgColor: 'bg-slate-50', borderColor: 'border-slate-200', label: '国防' },
  diplomacy: { color: 'text-cyan-600', bgColor: 'bg-cyan-50', borderColor: 'border-cyan-200', label: '外交' },
} as const;

export const levelConfig = {
  central: { icon: Building2, color: 'text-red-600', bgColor: 'bg-red-50', label: '中央' },
  jiangsu: { icon: Building, color: 'text-blue-600', bgColor: 'bg-blue-50', label: '江苏省' },
  suzhou: { icon: Home, color: 'text-green-600', bgColor: 'bg-green-50', label: '苏州市' },
} as const;

export const categoryColors: Record<string, { bg: string; text: string; border: string }> = {
  all: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' },
  speech: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
  article: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' },
  meeting: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' },
  inspection: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' },
  call: { bg: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-cyan-200' },
};

export const domainColors: Record<string, { bg: string; text: string; border: string }> = {
  all: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' },
  economy: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
  politics: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' },
  culture: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' },
  society: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' },
  ecology: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
  party: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' },
  defense: { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200' },
  diplomacy: { bg: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-cyan-200' },
};

export const categoryIconMap: Record<string, React.ElementType> = {
  LayoutGrid,
  Mic,
  FileText,
  Users,
  MapPin: MapPinIcon,
  Globe,
  Phone,
};

export const domainIconMap: Record<string, React.ElementType> = {
  LayoutGrid,
  TrendingUp,
  Landmark,
  BookOpen,
  Users,
  Leaf,
  Flag,
  Shield,
  Globe,
};

export const LOCAL_VOICE_PACK_ID = 'zh_CN-huayan-x_low';
export const LOCAL_VOICE_PACK_SIZE_MB = 20;
