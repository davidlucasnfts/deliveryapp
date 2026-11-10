-- ============================================================================
-- 009_meus_pedidos.sql — RPC para a tela "Meus pedidos" do cardápio
-- O cliente digita o celular e vê seus próprios pedidos (anon não tem SELECT
-- em pedidos desde sql/008 — esta RPC security definer retorna só o necessário,
-- sem endereço nem dados de pagamento).
-- Executar no Supabase SQL Editor.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.buscar_pedidos_cliente(p_loja_id uuid, p_telefone text)
RETURNS TABLE (numero text, status text, total numeric, criado_em timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.numero::text, p.status::text, p.total, p.criado_em
  FROM pedidos p
  WHERE p.loja_id = p_loja_id
    AND regexp_replace(p.telefone_cliente, '\D', '', 'g') = regexp_replace(p_telefone, '\D', '', 'g')
  ORDER BY p.criado_em DESC
  LIMIT 20
$$;
