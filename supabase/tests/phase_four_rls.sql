-- Execute after the Phase 4 migration in a disposable Supabase database.
-- This checks grants and policy structure without creating real users or content.
do $$
declare table_name text;
begin
  foreach table_name in array array['community_profiles','community_discussions','community_replies','community_likes','community_reports','community_rate_limits'] loop
    if not exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = table_name and c.relrowsecurity) then
      raise exception 'RLS is not enabled on %', table_name;
    end if;
  end loop;
  if has_table_privilege('anon', 'public.community_reports', 'SELECT') or has_table_privilege('authenticated', 'public.community_reports', 'SELECT') then
    raise exception 'Community reports must not be browser-readable';
  end if;
  if has_table_privilege('anon', 'public.community_rate_limits', 'SELECT') or has_table_privilege('authenticated', 'public.community_rate_limits', 'SELECT') then
    raise exception 'Rate limits must not be browser-readable';
  end if;
  if has_table_privilege('anon', 'public.community_discussions', 'INSERT') or has_table_privilege('anon', 'public.community_replies', 'INSERT') then
    raise exception 'Anonymous visitors must not publish';
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'community_profiles' and column_name = 'email') then
    raise exception 'Profiles must not expose email';
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'community_discussions' and policyname = 'discussions_read_published' and qual like '%published%') then
    raise exception 'Published-only discussion policy missing';
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'community_replies' and policyname = 'replies_read_published' and qual like '%published%') then
    raise exception 'Published-only reply policy missing';
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'community_profiles' and policyname = 'profiles_update_self' and qual like '%auth.uid%') then
    raise exception 'Profile ownership policy missing';
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.community_likes'::regclass and contype = 'p') then
    raise exception 'Unique like key missing';
  end if;
  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in ('community_touch_updated', 'community_guard_write', 'community_update_counts')
      and (not p.prosecdef or not coalesce('search_path=' = any(p.proconfig), false))
  ) then
    raise exception 'Community trigger functions require SECURITY DEFINER with an empty search_path';
  end if;
end;
$$;
