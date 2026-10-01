-- Permet eliminar missatges de contacte només als administradors.
-- Migració idempotent.

REVOKE DELETE ON TABLE public.contact_messages FROM anon, authenticated;
GRANT DELETE ON TABLE public.contact_messages TO authenticated;

DROP POLICY IF EXISTS "admin contact delete" ON public.contact_messages;
CREATE POLICY "admin contact delete"
  ON public.contact_messages
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
