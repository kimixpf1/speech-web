-- 为 article_details 表启用 RLS 并设置基于角色的策略
-- service_role 天然绕过 RLS，无需为它建策略
--
-- 前置状态：migration 005 创建表时 DISABLE RLS，003 曾启用并创建基于管理员UID的策略
-- 本迁移：DROP 旧策略 → 重新 ENABLE RLS → 创建基于角色的新策略

-- ========== 启用 RLS ==========
ALTER TABLE article_details ENABLE ROW LEVEL SECURITY;

-- ========== 清理旧策略（003 创建的基于管理员UID的策略）==========
DROP POLICY IF EXISTS "Allow public read access to article_details" ON article_details;
DROP POLICY IF EXISTS "Allow anon write to article_details" ON article_details;
DROP POLICY IF EXISTS "Allow admin write to article_details" ON article_details;
DROP POLICY IF EXISTS "Allow admin update to article_details" ON article_details;
DROP POLICY IF EXISTS "Allow admin delete to article_details" ON article_details;

-- ========== 新建策略 ==========

-- SELECT: anon 可读（前端公开展示文章详情）
CREATE POLICY "article_details_select_anon" ON article_details
FOR SELECT TO anon
USING (true);

-- SELECT: authenticated 可读（管理员后台读取）
CREATE POLICY "article_details_select_authenticated" ON article_details
FOR SELECT TO authenticated
USING (true);

-- INSERT: 仅 authenticated（管理员新增文章详情）
CREATE POLICY "article_details_insert_authenticated" ON article_details
FOR INSERT TO authenticated
WITH CHECK (true);

-- UPDATE: 仅 authenticated（管理员编辑文章详情）
CREATE POLICY "article_details_update_authenticated" ON article_details
FOR UPDATE TO authenticated
USING (true);

-- DELETE: 仅 authenticated（管理员删除文章详情）
CREATE POLICY "article_details_delete_authenticated" ON article_details
FOR DELETE TO authenticated
USING (true);

-- ========== 验证 ==========
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'article_details'
ORDER BY cmd;
