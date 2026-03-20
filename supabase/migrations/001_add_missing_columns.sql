-- 添加缺失的列到 articles 表
-- 请在 Supabase SQL Editor 中执行此脚本

-- 添加 domain 列（领域分类）
ALTER TABLE articles ADD COLUMN IF NOT EXISTS domain TEXT DEFAULT 'economy';

-- 添加 domain_name 列（领域名称）
ALTER TABLE articles ADD COLUMN IF NOT EXISTS domain_name TEXT DEFAULT '经济';

-- 添加 is_zhengjiguan 列（是否为政绩观专题文章）
ALTER TABLE articles ADD COLUMN IF NOT EXISTS is_zhengjiguan BOOLEAN DEFAULT FALSE;

-- 添加 zhengjiguan_level 列（政绩观层级：central/jiangsu/suzhou）
ALTER TABLE articles ADD COLUMN IF NOT EXISTS zhengjiguan_level TEXT;

-- 更新现有数据的默认值
UPDATE articles SET domain = 'economy' WHERE domain IS NULL;
UPDATE articles SET domain_name = '经济' WHERE domain_name IS NULL;
UPDATE articles SET is_zhengjiguan = FALSE WHERE is_zhengjiguan IS NULL;

-- 创建索引以优化查询
CREATE INDEX IF NOT EXISTS idx_articles_domain ON articles(domain);
CREATE INDEX IF NOT EXISTS idx_articles_is_zhengjiguan ON articles(is_zhengjiguan);
CREATE INDEX IF NOT EXISTS idx_articles_zhengjiguan_level ON articles(zhengjiguan_level);