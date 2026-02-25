-- Permite que usuários autenticados façam upload na pasta instalacoes/ do bucket versoes.
-- Resolve: "new row violates row-level security policy" ao enviar arquivos na criação/edição de instalações.
-- Rode no SQL Editor do Supabase ou via supabase db push.

-- INSERT: upload na pasta instalacoes/ do bucket versoes
CREATE POLICY "instalacoes_uploads_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'versoes'
    AND (storage.foldername(name))[1] = 'instalacoes'
  );

-- SELECT: leitura dos arquivos em instalacoes/ (para download e URLs públicas)
CREATE POLICY "instalacoes_uploads_select"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'versoes'
    AND (storage.foldername(name))[1] = 'instalacoes'
  );
