-- 修复 search_logs 表的 RLS 策略，只允许管理员访问
-- 请在 Supabase SQL Editor 中执行此脚本
-- 
-- 管理员用户ID白名单：
-- xpf: bed2d6c8-f2ee-44fe-93c5-794e74e199ee
-- 备用管理员: fc722159-5a27-4127-875c-6bad30f656e2

-- 启用 RLS
ALTER TABLE search_logs ENABLE ROW LEVEL SECURITY;

-- 删除现有策略（如果存在）
DROP POLICY IF EXISTS "Allow public read access to search_logs" ON search_logs;
DROP POLICY IF EXISTS "Allow authenticated insert to search_logs" ON search_logs;
DROP POLICY IF EXISTS "Allow anon insert to search_logs" ON search_logs;
DROP POLICY IF EXISTS "Allow admin read access to search_logs" ON search_logs;

-- 只允许管理员读取日志
CREATE POLICY "Allow admin read access to search_logs" 
ON search_logs FOR SELECT 
USING (
  auth.uid() IN (
    'bed2d6c8-f2ee-44fe-93c5-794e74e199ee'::uuid,  -- xpf
    'fc722159-5a27-4127-875c-6bad30f656e2'::uuid   -- 备用管理员
  )
);

-- 允许 GitHub Actions (使用 anon key) 插入日志
-- 插入日志不是安全敏感操作，可以开放
DROP POLICY IF EXISTS "Allow anon insert to search_logs" ON search_logs;
CREATE POLICY "Allow anon insert to search_logs" 
ON search_logs FOR INSERT 
WITH CHECK (true);

-- 同时确保 pending_articles 表也有正确的权限
-- GitHub Actions 需要用 anon key 插入，管理员需要完全访问权限
ALTER TABLE pending_articles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to pending_articles" ON pending_articles;
DROP POLICY IF EXISTS "Allow anon insert to pending_articles" ON pending_articles;
DROP POLICY IF EXISTS "Allow anon update to pending_articles" ON pending_articles;
DROP POLICY IF EXISTS "Allow anon delete to pending_articles" ON pending_articles;
DROP POLICY IF EXISTS "Allow admin full access to pending_articles" ON pending_articles;

-- 允许管理员读取所有待审核文章
CREATE POLICY "Allow admin read access to pending_articles" 
ON pending_articles FOR SELECT 
USING (
  auth.uid() IN (
    'bed2d6c8-f2ee-44fe-93c5-794e74e199ee'::uuid,
    'fc722159-5a27-4127-875c-6bad30f656e2'::uuid
  )
);

-- 允许 GitHub Actions (anon key) 插入新发现的文章
CREATE POLICY "Allow anon insert to pending_articles" 
ON pending_articles FOR INSERT 
WITH CHECK (true);

-- 只允许管理员更新和删除
CREATE POLICY "Allow admin update to pending_articles" 
ON pending_articles FOR UPDATE 
USING (
  auth.uid() IN (
    'bed2d6c8-f2ee-44fe-93c5-794e74e199ee'::uuid,
    'fc722159-5a27-4127-875c-6bad30f656e2'::uuid
  )
);

CREATE POLICY "Allow admin delete to pending_articles" 
ON pending_articles FOR DELETE 
USING (
  auth.uid() IN (
    'bed2d6c8-f2ee-44fe-93c5-794e74e199ee'::uuid,
    'fc722159-5a27-4127-875c-6bad30f656e2'::uuid
  )
);

-- 确保 article_details 表也有正确的权限（只允许管理员写入，公开读取详情）
ALTER TABLE article_details ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to article_details" ON article_details;
DROP POLICY IF EXISTS "Allow anon write to article_details" ON article_details;
DROP POLICY IF EXISTS "Allow admin write to article_details" ON article_details;

-- 允许所有人读取文章详情（用于前端展示）
CREATE POLICY "Allow public read access to article_details" 
ON article_details FOR SELECT 
USING (true);

-- 只允许管理员写入文章详情
CREATE POLICY "Allow admin write to article_details" 
ON article_details FOR INSERT 
WITH CHECK (
  auth.uid() IN (
    'bed2d6c8-f2ee-44fe-93c5-794e74e199ee'::uuid,
    'fc722159-5a27-4127-875c-6bad30f656e2'::uuid
  )
);

CREATE POLICY "Allow admin update to article_details" 
ON article_details FOR UPDATE 
USING (
  auth.uid() IN (
    'bed2d6c8-f2ee-44fe-93c5-794e74e199ee'::uuid,
    'fc722159-5a27-4127-875c-6bad30f656e2'::uuid
  )
);

CREATE POLICY "Allow admin delete to article_details" 
ON article_details FOR DELETE 
USING (
  auth.uid() IN (
    'bed2d6c8-f2ee-44fe-93c5-794e74e199ee'::uuid,
    'fc722159-5a27-4127-875c-6bad30f656e2'::uuid
  )
);
