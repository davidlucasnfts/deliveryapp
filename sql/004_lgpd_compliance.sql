-- Conformidade LGPD — adiciona campos de rastreio à tabela clientes
-- Executar no Supabase SQL Editor

ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS lgpd_consent_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS anonimizado_em  TIMESTAMPTZ;

COMMENT ON COLUMN clientes.lgpd_consent_em IS 'Data/hora em que o cliente aceitou a Política de Privacidade (LGPD art. 7 V)';
COMMENT ON COLUMN clientes.anonimizado_em  IS 'Data/hora em que os dados foram anonimizados a pedido do titular (LGPD art. 18)';
