-- =============================================
-- POLÍTICAS DO BUCKET 'produtos' — execute no Supabase SQL Editor
-- Garante que cada dono só faz upload na pasta da sua própria loja
-- =============================================

-- Limpeza prévia (evita erro de policy já existente)
DROP POLICY IF EXISTS "produtos_public_read"  ON storage.objects;
DROP POLICY IF EXISTS "produtos_auth_insert"  ON storage.objects;
DROP POLICY IF EXISTS "produtos_auth_update"  ON storage.objects;
DROP POLICY IF EXISTS "produtos_auth_delete"  ON storage.objects;

-- Leitura pública — cardápio do cliente precisa ver as imagens
CREATE POLICY "produtos_public_read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'produtos');

-- Upload restrito ao dono da loja
-- Paths usados no projeto:
--   [loja_id]/[prodId]_[ts].jpg        → imagens de produto
--   logos/[loja_id]/logo.[ext]         → logo da loja
--   capas/[loja_id]/capa.[ext]         → foto de capa
CREATE POLICY "produtos_auth_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'produtos'
  AND (
    -- produto/banner: primeiro segmento é o loja_id
    (storage.foldername(name))[1] IN (
      SELECT loja_id::text FROM public.usuarios WHERE email = auth.email()
    )
    OR
    -- logo/capa: segundo segmento é o loja_id (ex: logos/[loja_id]/arquivo)
    (storage.foldername(name))[2] IN (
      SELECT loja_id::text FROM public.usuarios WHERE email = auth.email()
    )
  )
);

-- Substituição (upsert) — mesma regra do INSERT
CREATE POLICY "produtos_auth_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'produtos'
  AND (
    (storage.foldername(name))[1] IN (
      SELECT loja_id::text FROM public.usuarios WHERE email = auth.email()
    )
    OR
    (storage.foldername(name))[2] IN (
      SELECT loja_id::text FROM public.usuarios WHERE email = auth.email()
    )
  )
);

-- Exclusão — mesma regra
CREATE POLICY "produtos_auth_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'produtos'
  AND (
    (storage.foldername(name))[1] IN (
      SELECT loja_id::text FROM public.usuarios WHERE email = auth.email()
    )
    OR
    (storage.foldername(name))[2] IN (
      SELECT loja_id::text FROM public.usuarios WHERE email = auth.email()
    )
  )
);
