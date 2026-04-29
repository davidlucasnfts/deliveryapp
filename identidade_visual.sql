-- =============================================
-- IDENTIDADE VISUAL — execute no SQL Editor do Supabase
-- =============================================

ALTER TABLE lojas ADD COLUMN IF NOT EXISTS logo_url     TEXT;
ALTER TABLE lojas ADD COLUMN IF NOT EXISTS foto_capa_url TEXT;
ALTER TABLE lojas ADD COLUMN IF NOT EXISTS cor_primaria  TEXT DEFAULT '#E85000';

-- APÓS rodar este SQL, crie manualmente no Supabase Dashboard:
-- Storage → New bucket → nome: "logos" → Public: SIM
