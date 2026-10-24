-- Restrict direct EXECUTE access to the pre-existing event-trigger helper.
-- The installed DDL event trigger continues to invoke the function; clients do not need RPC access.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
