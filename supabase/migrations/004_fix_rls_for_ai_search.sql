-- 修复 RLS 策略，允许 AI 搜索功能正常工作
-- 请在 Supabase SQL Editor 中执行此脚本

-- ========== search_logs 表 ==========
ALTER TABLE search_logs ENABLE ROW LEVEL SECURITY;

-- 删除所有现有策略
DROP POLICY IF EXISTS "Allow public read access to search_logs" ON search_logs;
DROP POLICY IF EXISTS "Allow authenticated insert to search_logs" ON search_logs;
DROP POLICY IF EXISTS "Allow anon insert to search_logs" ON search_logs;
DROP POLICY IF EXISTS "Allow admin read access to search_logs" ON search_logs;
DROP POLICY IF EXISTS "search_logs_select" ON search_logs;
DROP POLICY IF EXISTS "search_logs_insert" ON search_logs;

-- 允许已认证用户读取日志
CREATE POLICY "search_logs_select" ON search_logs 
FOR SELECT USING (auth.role() = 'authenticated');

-- 允许已认证用户和匿名用户插入日志
CREATE POLICY "search_logs_insert" ON search_logs 
FOR INSERT WITH CHECK (true);

-- ========== pending_articles 表 ==========
ALTER TABLE pending_articles ENABLE ROW LEVEL SECURITY;

-- 删除所有现有策略
DROP POLICY IF EXISTS "Allow public read access to pending_articles" ON pending_articles;
DROP POLICY IF EXISTS "Allow anon insert to pending_articles" ON pending_articles;
DROP POLICY IF EXISTS "Allow anon update to pending_articles" ON pending_articles;
DROP POLICY IF EXISTS "Allow anon delete to pending_articles" ON pending_articles;
DROP POLICY IF EXISTS "Allow admin read access to pending_articles" ON pending_articles;
DROP POLICY IF EXISTS "Allow admin update to pending_articles" ON pending_articles;
DROP POLICY IF EXISTS "Allow admin delete to pending_articles" ON pending_articles;
DROP POLICY IF EXISTS "pending_articles_select" ON pending_articles;
DROP POLICY IF EXISTS "pending_articles_insert" ON pending_articles;
DROP POLICY IF EXISTS "pending_articles_update" ON pending_articles;
DROP POLICY IF EXISTS "pending_articles_delete" ON pending_articles;

-- 允许已认证用户完全访问
CREATE POLICY "pending_articles_select" ON pending_articles 
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "pending_articles_insert" ON pending_articles 
FOR INSERT WITH CHECK (true);

CREATE POLICY "pending_articles_update" ON pending_articles 
FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "pending_articles_delete" ON pending_articles 
FOR DELETE USING (auth.role() = 'authenticated');

-- ========== 确认策略已创建 ==========
SELECT tablename, policyname, cmd FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('search_logs', 'pending_articles');
