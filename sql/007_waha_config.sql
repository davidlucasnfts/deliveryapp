-- 007_waha_config.sql
-- Adiciona configurações WAHA à tabela lojas para notificações WhatsApp automáticas
-- Executar no Supabase SQL Editor

ALTER TABLE lojas
  ADD COLUMN IF NOT EXISTS waha_url       TEXT,
  ADD COLUMN IF NOT EXISTS waha_session   TEXT DEFAULT 'default',
  ADD COLUMN IF NOT EXISTS waha_api_key   TEXT,
  ADD COLUMN IF NOT EXISTS waha_ativo     BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN lojas.waha_url     IS 'URL do servidor WAHA (ex: http://SEU-IP:3000)';
COMMENT ON COLUMN lojas.waha_session IS 'Nome da sessão WAHA (padrão: default)';
COMMENT ON COLUMN lojas.waha_api_key IS 'API Key do WAHA (se configurado com WHATSAPP_API_KEY)';
COMMENT ON COLUMN lojas.waha_ativo   IS 'Habilita envio automático de mensagens via WAHA';
