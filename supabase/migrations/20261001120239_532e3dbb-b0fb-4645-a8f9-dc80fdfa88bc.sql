CREATE OR REPLACE FUNCTION public.is_user_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin','administrator'));
$$;
GRANT EXECUTE ON FUNCTION public.is_user_admin() TO authenticated;

DROP POLICY IF EXISTS "profiles readable" ON public.profiles;
DROP POLICY IF EXISTS "own profile update" ON public.profiles;
DROP POLICY IF EXISTS "admin manage profiles" ON public.profiles;
DROP POLICY IF EXISTS "insert own profile" ON public.profiles;
CREATE POLICY "profiles read own or admin" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_user_admin());
CREATE POLICY "profiles update own or admin" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid() OR public.is_user_admin()) WITH CHECK (id = auth.uid() OR public.is_user_admin());
CREATE POLICY "profiles delete admin" ON public.profiles FOR DELETE TO authenticated USING (public.is_user_admin());
CREATE POLICY "profiles insert own or admin" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid() OR public.is_user_admin());

DROP POLICY IF EXISTS "roles readable" ON public.user_roles;
CREATE POLICY "roles read own or admin" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_user_admin());

DROP POLICY IF EXISTS "audit_read" ON public.audit_logs;
CREATE POLICY "audit read admin" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_user_admin());

CREATE OR REPLACE FUNCTION public.protect_profile_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_user_admin() THEN
    IF NEW.status IS DISTINCT FROM OLD.status OR NEW.username IS DISTINCT FROM OLD.username OR NEW.email IS DISTINCT FROM OLD.email THEN
      RAISE EXCEPTION 'Only administrators can change status, username or email';
    END IF;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS protect_profile_fields ON public.profiles;
CREATE TRIGGER protect_profile_fields BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.protect_profile_fields();