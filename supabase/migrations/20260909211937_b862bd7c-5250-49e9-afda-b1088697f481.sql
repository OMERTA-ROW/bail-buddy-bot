REVOKE ALL ON FUNCTION public.ensure_holder_activation(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_holder_activation(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.gen_activation_code() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.gen_activation_pin() FROM PUBLIC, anon, authenticated;