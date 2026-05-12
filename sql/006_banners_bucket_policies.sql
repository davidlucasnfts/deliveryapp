-- =============================================
-- POLÍTICAS DO BUCKET 'banners' — execute no Supabase SQL Editor
-- Garante que cada dono só faz upload na pasta da sua própria loja
-- =============================================

-- Limpeza prévia
DROP POLICY IF EXISTS "banners_public_read"  ON storage.objects;
DROP POLICY IF EXISTS "banners_auth_insert"  ON storage.objects;
DROP POLICY IF EXISTS "banners_auth_update"  ON storage.objects;
DROP POLICY IF EXISTS "banners_auth_delete"  ON storage.objects;

-- Leitura pública — banners aparecem no cardápio do cliente
CREATE POLICY "banners_public_read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'banners');

-- Upload restrito ao dono da loja
-- Path usado: [loja_id]/banner_[ts].jpg
CREATE POLICY "banners_auth_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'banners'
  AND (storage.foldername(name))[1] IN (
    SELECT loja_id::text FROM public.usuarios WHERE email = auth.email()
  )
);

-- Substituição (upsert)
CREATE POLICY "banners_auth_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'banners'
  AND (storage.foldername(name))[1] IN (
    SELECT loja_id::text FROM public.usuarios WHERE email = auth.email()
  )
);

-- Exclusão
CREATE POLICY "banners_auth_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'banners'
  AND (storage.foldername(name))[1] IN (
    SELECT loja_id::text FROM public.usuarios WHERE email = auth.email()
  )
);
