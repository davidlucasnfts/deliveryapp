-- ============================================================================
-- 008_rls_seguranca.sql — Hardening de segurança (RLS completo)
-- Executar no Supabase SQL Editor ANTES do deploy do frontend desta sessão.
--
-- O que este script faz:
--   1. View pública `lojas_publicas` — expõe só colunas seguras da loja.
--      NUNCA expor para anon: mp_access_token, waha_api_key, email_dono.
--   2. Funções helper security definer (is_admin, minha_loja_id) — evitam
--      recursão de RLS na tabela usuarios.
--   3. RLS habilitado em TODAS as tabelas de dados com policies por papel:
--        anon         -> só o que o cardápio público precisa (catálogo, criar pedido)
--        dono (auth)  -> CRUD completo na própria loja (via minha_loja_id())
--        admin (auth) -> gestão de lojas/usuários (via is_admin())
--   4. RPCs security definer para operações sensíveis do fluxo público:
--        buscar_cliente_por_telefone (autopreenchimento sem dump de PII)
--        obter_numero_pedido         (exibir número na confirmação)
--        confirmar_pagamento         (cliente confirma pagamento sem UPDATE livre)
--        registrar_ganho_pontos      (fidelidade sem SELECT/UPDATE livre em clientes)
--   5. Trigger do número de pedido com SECURITY DEFINER + contador trancado.
-- ============================================================================

-- ─── 1. Funções helper (security definer = sem recursão de RLS) ─────────────

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND perfil = 'admin')
$$;

CREATE OR REPLACE FUNCTION public.minha_loja_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT loja_id FROM usuarios WHERE id = auth.uid()
$$;

-- ─── 2. View pública de lojas (só colunas seguras) ──────────────────────────
-- Views rodam com permissão do dono (postgres, bypassa RLS) por padrão.
-- O anon NÃO tem policy de SELECT na tabela base `lojas` — só nesta view.

CREATE OR REPLACE VIEW public.lojas_publicas AS
SELECT
  id, nome, descricao, logo_url, foto_capa_url, cor_primaria,
  tempo_entrega, cidade, aberta, ativa, hora_abre, hora_fecha,
  pix_ativo, chave_pix, mp_ativo, mp_public_key, dinheiro_ativo, whatsapp
FROM public.lojas;

GRANT SELECT ON public.lojas_publicas TO anon, authenticated;

-- ─── 3. RLS em todas as tabelas ─────────────────────────────────────────────

ALTER TABLE lojas                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias               ENABLE ROW LEVEL SECURITY;
ALTER TABLE produtos                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE grupos_adicionais        ENABLE ROW LEVEL SECURITY;
ALTER TABLE adicionais               ENABLE ROW LEVEL SECURITY;
ALTER TABLE taxas_entrega            ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE itens_pedido             ENABLE ROW LEVEL SECURITY;
ALTER TABLE itens_pedido_adicionais  ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE pontos_historico         ENABLE ROW LEVEL SECURITY;
ALTER TABLE fidelidade_config        ENABLE ROW LEVEL SECURITY;
ALTER TABLE cupons                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE transmissoes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE banners                  ENABLE ROW LEVEL SECURITY;

-- ─── usuarios ───────────────────────────────────────────────────────────────
-- Self-service da própria linha + admin vê/gerencia todos.
-- (Policies de outras tabelas consultam usuarios via funções definer — sem recursão.)

DROP POLICY IF EXISTS usuarios_select ON usuarios;
CREATE POLICY usuarios_select ON usuarios FOR SELECT
  USING (id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS usuarios_insert_admin ON usuarios;
CREATE POLICY usuarios_insert_admin ON usuarios FOR INSERT
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS usuarios_update ON usuarios;
CREATE POLICY usuarios_update ON usuarios FOR UPDATE
  USING (id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS usuarios_delete_admin ON usuarios;
CREATE POLICY usuarios_delete_admin ON usuarios FOR DELETE
  USING (public.is_admin());

-- ─── lojas ──────────────────────────────────────────────────────────────────
-- anon: SEM acesso à tabela base (usa a view lojas_publicas).
-- dono: lê/edita a própria loja. admin: tudo.

DROP POLICY IF EXISTS lojas_select ON lojas;
CREATE POLICY lojas_select ON lojas FOR SELECT
  USING (id = public.minha_loja_id() OR public.is_admin());

DROP POLICY IF EXISTS lojas_insert_admin ON lojas;
CREATE POLICY lojas_insert_admin ON lojas FOR INSERT
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS lojas_update ON lojas;
CREATE POLICY lojas_update ON lojas FOR UPDATE
  USING (id = public.minha_loja_id() OR public.is_admin())
  WITH CHECK (id = public.minha_loja_id() OR public.is_admin());

DROP POLICY IF EXISTS lojas_delete_admin ON lojas;
CREATE POLICY lojas_delete_admin ON lojas FOR DELETE
  USING (public.is_admin());

-- ─── Catálogo público (categorias, produtos, grupos, adicionais, taxas, banners)
-- anon/authenticated: SELECT livre (é o cardápio público).
-- Escrita: só o dono da loja.

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['categorias','produtos','grupos_adicionais','adicionais','taxas_entrega','banners']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_select_publico ON %I', t, t);
    EXECUTE format('CREATE POLICY %I_select_publico ON %I FOR SELECT USING (true)', t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I_dono_all ON %I', t, t);
    EXECUTE format('CREATE POLICY %I_dono_all ON %I FOR ALL TO authenticated
                    USING (loja_id = public.minha_loja_id())
                    WITH CHECK (loja_id = public.minha_loja_id())', t, t);
  END LOOP;
END $$;

-- ─── pedidos ────────────────────────────────────────────────────────────────
-- anon: só INSERT (criar pedido). SELECT/UPDATE negados — impede enumeração
-- de pedidos e fraude (marcar como pago). Confirmação de pagamento via RPC.
-- dono: tudo nos pedidos da própria loja.

DROP POLICY IF EXISTS pedidos_insert_anon ON pedidos;
CREATE POLICY pedidos_insert_anon ON pedidos FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS pedidos_dono_all ON pedidos;
CREATE POLICY pedidos_dono_all ON pedidos FOR ALL TO authenticated
  USING (loja_id = public.minha_loja_id())
  WITH CHECK (loja_id = public.minha_loja_id());

-- ─── itens_pedido ───────────────────────────────────────────────────────────

DROP POLICY IF EXISTS itens_pedido_insert_anon ON itens_pedido;
CREATE POLICY itens_pedido_insert_anon ON itens_pedido FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS itens_pedido_dono_all ON itens_pedido;
CREATE POLICY itens_pedido_dono_all ON itens_pedido FOR ALL TO authenticated
  USING (pedido_id IN (SELECT id FROM pedidos WHERE loja_id = public.minha_loja_id()))
  WITH CHECK (pedido_id IN (SELECT id FROM pedidos WHERE loja_id = public.minha_loja_id()));

-- ─── itens_pedido_adicionais ────────────────────────────────────────────────

DROP POLICY IF EXISTS ipa_insert_anon ON itens_pedido_adicionais;
CREATE POLICY ipa_insert_anon ON itens_pedido_adicionais FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS ipa_dono_all ON itens_pedido_adicionais;
CREATE POLICY ipa_dono_all ON itens_pedido_adicionais FOR ALL TO authenticated
  USING (item_pedido_id IN (
    SELECT ip.id FROM itens_pedido ip
    JOIN pedidos p ON p.id = ip.pedido_id
    WHERE p.loja_id = public.minha_loja_id()
  ))
  WITH CHECK (item_pedido_id IN (
    SELECT ip.id FROM itens_pedido ip
    JOIN pedidos p ON p.id = ip.pedido_id
    WHERE p.loja_id = public.minha_loja_id()
  ));

-- ─── clientes ───────────────────────────────────────────────────────────────
-- anon: INSERT (cadastro no checkout) + UPDATE só de colunas não sensíveis
-- (grant de coluna abaixo). SELECT negado — PII não vaza; autopreenchimento
-- e pontos via RPCs security definer.

DROP POLICY IF EXISTS clientes_insert_anon ON clientes;
CREATE POLICY clientes_insert_anon ON clientes FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS clientes_update_anon ON clientes;
CREATE POLICY clientes_update_anon ON clientes FOR UPDATE
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS clientes_dono_all ON clientes;
CREATE POLICY clientes_dono_all ON clientes FOR ALL TO authenticated
  USING (loja_id = public.minha_loja_id())
  WITH CHECK (loja_id = public.minha_loja_id());

-- anon só pode alterar estas colunas (nunca telefone/loja_id/totais de pontos):
REVOKE UPDATE ON public.clientes FROM anon;
GRANT UPDATE (nome, endereco_rua, endereco_num, endereco_comp, endereco_bairro,
              endereco_cidade, endereco_cep, lgpd_consent_em)
  ON public.clientes TO anon;

-- ─── pontos_historico ───────────────────────────────────────────────────────
-- Escrita apenas via RPC registrar_ganho_pontos. dono lê o da sua loja.

DROP POLICY IF EXISTS pontos_historico_dono_all ON pontos_historico;
CREATE POLICY pontos_historico_dono_all ON pontos_historico FOR ALL TO authenticated
  USING (loja_id = public.minha_loja_id())
  WITH CHECK (loja_id = public.minha_loja_id());

-- ─── fidelidade_config ──────────────────────────────────────────────────────

DROP POLICY IF EXISTS fidelidade_config_select_publico ON fidelidade_config;
CREATE POLICY fidelidade_config_select_publico ON fidelidade_config FOR SELECT
  USING (true);

DROP POLICY IF EXISTS fidelidade_config_dono_all ON fidelidade_config;
CREATE POLICY fidelidade_config_dono_all ON fidelidade_config FOR ALL TO authenticated
  USING (loja_id = public.minha_loja_id())
  WITH CHECK (loja_id = public.minha_loja_id());

-- ─── cupons ─────────────────────────────────────────────────────────────────
-- anon: SELECT (validar cupom) + UPDATE apenas da coluna usos_atual (grant).

DROP POLICY IF EXISTS cupons_select_publico ON cupons;
CREATE POLICY cupons_select_publico ON cupons FOR SELECT
  USING (true);

DROP POLICY IF EXISTS cupons_update_anon ON cupons;
CREATE POLICY cupons_update_anon ON cupons FOR UPDATE
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS cupons_dono_all ON cupons;
CREATE POLICY cupons_dono_all ON cupons FOR ALL TO authenticated
  USING (loja_id = public.minha_loja_id())
  WITH CHECK (loja_id = public.minha_loja_id());

REVOKE UPDATE ON public.cupons FROM anon;
GRANT UPDATE (usos_atual) ON public.cupons TO anon;

-- ─── transmissoes ───────────────────────────────────────────────────────────

DROP POLICY IF EXISTS transmissoes_dono_all ON transmissoes;
CREATE POLICY transmissoes_dono_all ON transmissoes FOR ALL TO authenticated
  USING (loja_id = public.minha_loja_id())
  WITH CHECK (loja_id = public.minha_loja_id());

-- ─── 4. RPCs security definer ───────────────────────────────────────────────

-- Autopreenchimento do checkout: retorna só o necessário, sem dump da tabela.
CREATE OR REPLACE FUNCTION public.buscar_cliente_por_telefone(p_loja_id uuid, p_telefone text)
RETURNS TABLE (id uuid, nome text, endereco_rua text, endereco_num text,
               endereco_comp text, endereco_bairro text, endereco_cidade text,
               endereco_cep text)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.nome::text, c.endereco_rua::text, c.endereco_num::text,
         c.endereco_comp::text, c.endereco_bairro::text, c.endereco_cidade::text,
         c.endereco_cep::text
  FROM clientes c
  WHERE c.loja_id = p_loja_id
    AND c.telefone = regexp_replace(p_telefone, '\D', '', 'g')
    AND c.anonimizado_em IS NULL
  LIMIT 1
$$;

-- Número formatado do pedido (PD-YYYYMMDD-NNNNN) para a tela de confirmação.
-- Recebe o UUID (inadivinhável) que o próprio cliente acabou de gerar.
CREATE OR REPLACE FUNCTION public.obter_numero_pedido(p_id uuid)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT numero FROM pedidos WHERE id = p_id
$$;

-- Cliente confirma a forma de pagamento após pagar (PIX/cartão/dinheiro).
-- Substitui o UPDATE livre que permitia fraude. Webhook do MP é o passo futuro.
CREATE OR REPLACE FUNCTION public.confirmar_pagamento(p_pedido_id uuid, p_forma text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_forma NOT IN ('pix', 'cartao', 'dinheiro') THEN
    RAISE EXCEPTION 'Forma de pagamento inválida';
  END IF;
  UPDATE pedidos SET
    forma_pagamento  = p_forma,
    status_pagamento = CASE WHEN p_forma = 'dinheiro' THEN 'na_entrega' ELSE 'pago' END
  WHERE id = p_pedido_id;
END;
$$;

-- Fidelidade: registra ganho de pontos e atualiza total_gasto em uma chamada.
CREATE OR REPLACE FUNCTION public.registrar_ganho_pontos(
  p_loja_id uuid, p_cliente_id uuid, p_pedido_id uuid,
  p_pontos integer, p_descricao text, p_total numeric
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_pontos > 0 THEN
    INSERT INTO pontos_historico (loja_id, cliente_id, pedido_id, pontos, tipo, descricao)
    VALUES (p_loja_id, p_cliente_id, p_pedido_id, p_pontos, 'ganho', p_descricao);
  END IF;
  UPDATE clientes
  SET total_gasto   = COALESCE(total_gasto, 0) + p_total,
      total_pedidos = COALESCE(total_pedidos, 0) + 1,
      total_pontos  = COALESCE(total_pontos, 0) + GREATEST(p_pontos, 0)
  WHERE id = p_cliente_id AND loja_id = p_loja_id;
END;
$$;

-- ─── 5. Trigger do número de pedido: SECURITY DEFINER + contador trancado ───

CREATE OR REPLACE FUNCTION public.gerar_numero_pedido()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  data_hoje    DATE;
  data_str     TEXT;
  novo_cont    INTEGER;
BEGIN
  data_hoje := (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE;
  data_str  := TO_CHAR(data_hoje, 'YYYYMMDD');

  INSERT INTO public.pedidos_contador (data, contador)
    VALUES (data_hoje, 1)
  ON CONFLICT (data)
    DO UPDATE SET contador = public.pedidos_contador.contador + 1
  RETURNING contador INTO novo_cont;

  NEW.numero := 'PD-' || data_str || '-' || LPAD(novo_cont::TEXT, 5, '0');
  RETURN NEW;
END;
$$;

REVOKE ALL ON public.pedidos_contador FROM anon, authenticated;
