-- =============================================
-- IDENTIDADE VISUAL — execute no SQL Editor do Supabase
-- =============================================

ALTER TABLE lojas ADD COLUMN IF NOT EXISTS logo_url     TEXT;
ALTER TABLE lojas ADD COLUMN IF NOT EXISTS foto_capa_url TEXT;
ALTER TABLE lojas ADD COLUMN IF NOT EXISTS cor_primaria  TEXT DEFAULT '#E85000';

-- NOTA: o upload de logos e capas usa o bucket 'produtos' (já existente e público).
-- Não é necessário criar novo bucket.
