-- 修复 suggestions 表的 RLS 策略
-- 问题：suggestions 表启用了 RLS 但没有 INSERT 策略，导致匿名用户无法提交建议
-- 请在 Supabase SQL Editor 中执行此脚本
--
-- 管理员用户ID白名单：
-- xpf: bed2d6c8-f2ee-44fe-93c5-794e74e199ee
-- 备用管理员: fc722159-5a27-4127-875c-6bad30f656e2

-- 启用 RLS
ALTER TABLE suggestions ENABLE ROW LEVEL SECURITY;

-- 删除所有现有策略（如果存在）
DROP POLICY IF EXISTS "Allow anon insert to suggestions" ON suggestions;
DROP POLICY IF EXISTS "Allow admin read access to suggestions" ON suggestions;
DROP POLICY IF EXISTS "Allow admin update to suggestions" ON suggestions;
DROP POLICY IF EXISTS "Allow admin delete to suggestions" ON suggestions;

-- 允许匿名用户提交建议（前端建议信箱功能）
CREATE POLICY "Allow anon insert to suggestions" 
ON suggestions FOR INSERT 
WITH CHECK (true);

-- 只允许管理员读取建议（后台管理）
CREATE POLICY "Allow admin read access to suggestions" 
ON suggestions FOR SELECT 
USING (
  auth.uid() IN (
    'bed2d6c8-f2ee-44fe-93c5-794e74e199ee'::uuid,
    'fc722159-5a27-4127-875c-6bad30f656e2'::uuid
  )
);

-- 只允许管理员更新建议状态（标记已读等）
CREATE POLICY "Allow admin update to suggestions" 
ON suggestions FOR UPDATE 
USING (
  auth.uid() IN (
    'bed2d6c8-f2ee-44fe-93c5-794e74e199ee'::uuid,
    'fc722159-5a27-4127-875c-6bad30f656e2'::uuid
  )
);

-- 只允许管理员删除建议
CREATE POLICY "Allow admin delete to suggestions" 
ON suggestions FOR DELETE 
USING (
  auth.uid() IN (
    'bed2d6c8-f2ee-44fe-93c5-794e74e199ee'::uuid,
    'fc722159-5a27-4127-875c-6bad30f656e2'::uuid
  )
);

-- 确认策略已创建
SELECT tablename, policyname, cmd FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'suggestions';
