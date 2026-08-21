CREATE OR REPLACE FUNCTION public.update_tempo_done_public(p_item_id uuid, p_done boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.tempo_items
  SET done = p_done, updated_at = now()
  WHERE id = p_item_id;
  RETURN FOUND;
END;
$function$;

REVOKE ALL ON FUNCTION public.update_tempo_done_public(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_tempo_done_public(uuid, boolean) TO anon, authenticated, service_role;