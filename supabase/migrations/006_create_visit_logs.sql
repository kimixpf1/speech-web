-- 创建 visit_logs 访问记录表
-- 用于统计网站访问量

CREATE TABLE IF NOT EXISTS visit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path TEXT NOT NULL DEFAULT '/',
  referrer TEXT DEFAULT '',
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  visitor_id TEXT NOT NULL DEFAULT '',
  duration INTEGER,
  date TEXT,
  time TEXT,
  device TEXT,
  browser TEXT,
  os TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引提升查询性能
CREATE INDEX IF NOT EXISTS idx_visit_logs_timestamp ON visit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_visit_logs_visitor_id ON visit_logs(visitor_id);
CREATE INDEX IF NOT EXISTS idx_visit_logs_date ON visit_logs(date);

-- 允许任何人写入（记录访问）
ALTER TABLE visit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_insert_visit_logs" ON visit_logs
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "allow_select_visit_logs" ON visit_logs
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "allow_delete_visit_logs" ON visit_logs
  FOR DELETE TO authenticated
  USING (true);
