-- =============================================
-- POLÍTICAS DO BUCKET 'logos' — execute no SQL Editor do Supabase
-- =============================================

-- Leitura pública (qualquer um pode ver logo/capa)
CREATE POLICY "logos_public_read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'logos');

-- Upload apenas para usuários autenticados (donos)
CREATE POLICY "logos_auth_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'logos');

-- Atualizar/substituir (upsert)
CREATE POLICY "logos_auth_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'logos');

-- Remover
CREATE POLICY "logos_auth_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'logos');
