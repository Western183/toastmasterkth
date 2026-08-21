-- Remove blanket PUBLIC execute rights from every function in public schema
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
  END LOOP;
END $$;

-- Internal only: maintenance + trigger helper
REVOKE ALL ON FUNCTION public.cleanup_old_pin_attempts() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_pin_attempts() TO service_role;

-- Re-grant only the RPCs the app requires (capability-based: PIN + edit_token guarded)
GRANT EXECUTE ON FUNCTION public.get_all_sessions_public() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_session_public(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_session_by_share_code(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_people_for_session(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_tempo_items_for_session(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.verify_session_pin_with_token(uuid, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.verify_edit_token(uuid, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_session_with_token(text, text, text, text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.add_person_with_token(uuid, text, text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.delete_person_with_token(uuid, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_tempo_item_with_token(uuid, text, integer, text, text, text, integer, integer, uuid, text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_tempo_item_with_token(uuid, text, text, text, text, integer, integer, uuid, integer, boolean, text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.delete_tempo_item_with_token(uuid, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_tempo_done(uuid, boolean, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_tempo_order_with_token(uuid, text, jsonb) TO anon, authenticated, service_role;