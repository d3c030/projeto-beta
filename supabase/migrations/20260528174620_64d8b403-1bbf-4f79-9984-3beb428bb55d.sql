
-- 1) agenda_days: remove public SELECT (public booking uses admin server fn)
DROP POLICY IF EXISTS "Public read agenda_days" ON public.agenda_days;
REVOKE SELECT ON public.agenda_days FROM anon;

-- 2) contact_settings: drop overly permissive policies
DROP POLICY IF EXISTS "Public read contact_settings" ON public.contact_settings;
DROP POLICY IF EXISTS "Auth insert contact_settings" ON public.contact_settings;
DROP POLICY IF EXISTS "Auth update contact_settings" ON public.contact_settings;
DROP POLICY IF EXISTS "Auth delete contact_settings" ON public.contact_settings;

-- Only superadmin can manage this legacy table; no public access.
CREATE POLICY "Superadmin manage contact_settings"
ON public.contact_settings
FOR ALL
TO authenticated
USING (public.is_superadmin(auth.uid()))
WITH CHECK (public.is_superadmin(auth.uid()));

REVOKE SELECT ON public.contact_settings FROM anon;

-- 3) branding storage bucket: scope writes by user folder, restrict listing
DROP POLICY IF EXISTS "Public read branding" ON storage.objects;
DROP POLICY IF EXISTS "Auth upload branding" ON storage.objects;
DROP POLICY IF EXISTS "Auth update branding" ON storage.objects;
DROP POLICY IF EXISTS "Auth delete branding" ON storage.objects;

-- Authenticated users may list/inspect their own folder only.
-- Public file URLs still work via the bucket's public CDN access.
CREATE POLICY "Owner list branding"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'branding'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Owner upload branding"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'branding'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Owner update branding"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'branding'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'branding'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Owner delete branding"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'branding'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 4) Revoke EXECUTE on internal SECURITY DEFINER helpers from anon/public.
-- Authenticated retains EXECUTE because RLS policies invoke them.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_superadmin(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.current_tenant_id(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.my_tenant_status() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.ensure_client_for_appointment() FROM anon, PUBLIC, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_tenant_id_from_user() FROM anon, PUBLIC, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM anon, PUBLIC, authenticated;
