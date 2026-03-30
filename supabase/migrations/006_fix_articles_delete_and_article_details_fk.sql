ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "articles_select_public" ON articles;
DROP POLICY IF EXISTS "articles_insert_admin" ON articles;
DROP POLICY IF EXISTS "articles_update_admin" ON articles;
DROP POLICY IF EXISTS "articles_delete_admin" ON articles;
DROP POLICY IF EXISTS "Allow public read access to articles" ON articles;
DROP POLICY IF EXISTS "Allow admin insert to articles" ON articles;
DROP POLICY IF EXISTS "Allow admin update to articles" ON articles;
DROP POLICY IF EXISTS "Allow admin delete to articles" ON articles;

CREATE POLICY "articles_select_public"
ON articles FOR SELECT
USING (true);

CREATE POLICY "articles_insert_admin"
ON articles FOR INSERT
WITH CHECK (
  auth.uid() IN (
    'bed2d6c8-f2ee-44fe-93c5-794e74e199ee'::uuid,
    'fc722159-5a27-4127-875c-6bad30f656e2'::uuid
  )
);

CREATE POLICY "articles_update_admin"
ON articles FOR UPDATE
USING (
  auth.uid() IN (
    'bed2d6c8-f2ee-44fe-93c5-794e74e199ee'::uuid,
    'fc722159-5a27-4127-875c-6bad30f656e2'::uuid
  )
);

CREATE POLICY "articles_delete_admin"
ON articles FOR DELETE
USING (
  auth.uid() IN (
    'bed2d6c8-f2ee-44fe-93c5-794e74e199ee'::uuid,
    'fc722159-5a27-4127-875c-6bad30f656e2'::uuid
  )
);

DELETE FROM article_details
WHERE NOT EXISTS (
  SELECT 1
  FROM articles
  WHERE articles.id = article_details.id
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'article_details_id_fkey'
  ) THEN
    ALTER TABLE article_details
    ADD CONSTRAINT article_details_id_fkey
    FOREIGN KEY (id) REFERENCES articles(id) ON DELETE CASCADE;
  END IF;
END $$;
