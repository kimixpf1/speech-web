-- 修复 search_logs 表的 RLS 策略，允许公开读取日志记录
-- 请在 Supabase SQL Editor 中执行此脚本

-- 启用 RLS
ALTER TABLE search_logs ENABLE ROW LEVEL SECURITY;

-- 删除现有策略（如果存在）
DROP POLICY IF EXISTS "Allow public read access to search_logs" ON search_logs;
DROP POLICY IF EXISTS "Allow authenticated insert to search_logs" ON search_logs;

-- 允许所有人读取日志
CREATE POLICY "Allow public read access to search_logs" 
ON search_logs FOR SELECT 
USING (true);

-- 允许通过服务端（anon key）插入日志
CREATE POLICY "Allow anon insert to search_logs" 
ON search_logs FOR INSERT 
WITH CHECK (true);

-- 同时确保 pending_articles 表也有正确的权限
ALTER TABLE pending_articles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to pending_articles" ON pending_articles;
DROP POLICY IF EXISTS "Allow anon insert to pending_articles" ON pending_articles;
DROP POLICY IF EXISTS "Allow anon update to pending_articles" ON pending_articles;
DROP POLICY IF EXISTS "Allow anon delete to pending_articles" ON pending_articles;

CREATE POLICY "Allow public read access to pending_articles" 
ON pending_articles FOR SELECT 
USING (true);

CREATE POLICY "Allow anon insert to pending_articles" 
ON pending_articles FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow anon update to pending_articles" 
ON pending_articles FOR UPDATE 
USING (true);

CREATE POLICY "Allow anon delete to pending_articles" 
ON pending_articles FOR DELETE 
USING (true);

-- 确保 article_details 表也有正确的权限
ALTER TABLE article_details ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to article_details" ON article_details;
DROP POLICY IF EXISTS "Allow anon write to article_details" ON article_details;

CREATE POLICY "Allow public read access to article_details" 
ON article_details FOR SELECT 
USING (true);

CREATE POLICY "Allow anon write to article_details" 
ON article_details FOR ALL 
WITH CHECK (true);
