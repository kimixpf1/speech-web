-- P0-1: 收紧 RLS INSERT 策略
-- 仅收紧 INSERT：service_role + authenticated（GitHub Actions用service_role绕过RLS，前端管理员用authenticated登录）
-- SELECT/UPDATE/DELETE 保持不变

-- ========== search_logs ==========
DROP POLICY IF EXISTS "search_logs_insert" ON search_logs;
CREATE POLICY "search_logs_insert" ON search_logs
FOR INSERT WITH CHECK (auth.role() IN ('service_role', 'authenticated'));

-- ========== pending_articles ==========
DROP POLICY IF EXISTS "pending_articles_insert" ON pending_articles;
CREATE POLICY "pending_articles_insert" ON pending_articles
FOR INSERT WITH CHECK (auth.role() IN ('service_role', 'authenticated'));

-- 验证
SELECT tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('search_logs', 'pending_articles')
ORDER BY tablename, cmd;
