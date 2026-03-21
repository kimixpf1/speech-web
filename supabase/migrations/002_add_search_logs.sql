-- 新建 search_logs 表，记录每次自动搜索的执行情况
CREATE TABLE IF NOT EXISTS search_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  crawl_count INTEGER DEFAULT 0,
  search_count INTEGER DEFAULT 0,
  new_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'success',
  details JSONB DEFAULT '{}',
  duration_seconds INTEGER DEFAULT 0
);

-- pending_articles 新增 discovered_by 列，标记文章发现来源
ALTER TABLE pending_articles
  ADD COLUMN IF NOT EXISTS discovered_by TEXT DEFAULT 'crawl';
