-- Permite que usuários autenticados removam arquivos da pasta instalacoes/ ao finalizar instalação.
-- Rode no SQL Editor do Supabase ou via supabase db push.

CREATE POLICY "instalacoes_uploads_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'versoes'
    AND (storage.foldername(name))[1] = 'instalacoes'
  );
