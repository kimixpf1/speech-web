// 访问统计服务
// 支持：百度统计、Google Analytics、Supabase、本地统计（作为备份）

// ============================================
// 配置 - 请修改为你的 tracking ID
// ============================================

// 百度统计 Tracking ID（从百度统计后台获取）
// 格式如：1234567890abcdef1234567890abcdef
const BAIDU_TRACKING_ID = 'fde2c5ee85e02a961caa756c4a6e2c88';

// Google Analytics Tracking ID（从 Google Analytics 后台获取）
// 格式如：G-XXXXXXXXXX
const GA_TRACKING_ID = 'YOUR_GA_TRACKING_ID';

// Supabase 配置
const SUPABASE_URL = 'https://ejeiuqcmkznfbglvbkbe.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqZWl1cWNta3puZmJnbHZia2JlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI2NjgxMTQsImV4cCI6MjA1ODI0NDExNH0.3EqqmzP5fXHF0sYVFNbVKWwLPqOYqOlK2JlFPZLf3Sk';
const USE_SUPABASE_ANALYTICS = true; // 已配置 Supabase
const VISITS_TABLE = 'New%20table'; // 访问统计表名（URL编码）