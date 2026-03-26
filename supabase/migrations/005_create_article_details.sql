-- 创建文章详情表（如果不存在）
CREATE TABLE IF NOT EXISTS article_details (
  id TEXT PRIMARY KEY,
  abstract TEXT,
  full_text TEXT,
  analysis TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 禁用 RLS 或添加允许 service_role 写入的策略
ALTER TABLE article_details DISABLE ROW LEVEL SECURITY;

-- 或者如果需要保留 RLS，添加以下策略：
-- ALTER TABLE article_details ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow service_role full access" ON article_details
--   FOR ALL TO service_role USING (true) WITH CHECK (true);
-- CREATE POLICY "Allow public read" ON article_details
--   FOR SELECT TO anon USING (true);

-- 添加更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_article_details_updated_at ON article_details;
CREATE TRIGGER update_article_details_updated_at
    BEFORE UPDATE ON article_details
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();