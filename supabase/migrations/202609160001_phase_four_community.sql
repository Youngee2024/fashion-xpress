-- Phase 4: public profile fields and RLS-protected Community content.
-- Deleting an auth.users row cascades through profiles, discussions, replies,
-- likes, reports and rate-limit records. No account email is copied here.

create table public.community_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  handle text not null unique check (handle ~ '^[a-z0-9_]{3,24}$' and handle = lower(handle)),
  display_name text not null check (char_length(trim(display_name)) between 2 and 60),
  bio text not null default '' check (char_length(bio) <= 280),
  location text not null default '' check (char_length(location) <= 80),
  identity text not null default 'Community Member' check (identity in ('Creator','Collector','Community Member')),
  avatar_id text not null default 'acid' check (avatar_id in ('acid','cream','ember','violet')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index community_profiles_handle_idx on public.community_profiles(handle);

create table public.community_discussions (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.community_profiles(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 8 and 120),
  body text not null check (char_length(trim(body)) between 20 and 5000),
  category text not null check (category in ('Marketplace','Tools','Showcase','Technology','General')),
  status text not null default 'published' check (status in ('published','hidden','removed')),
  like_count integer not null default 0 check (like_count >= 0),
  reply_count integer not null default 0 check (reply_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  edited_at timestamptz,
  last_activity_at timestamptz not null default now(),
  check (position('<' in title) = 0 and position('<' in body) = 0),
  check (title !~* '(https?://|www\.|javascript:|data:)' and body !~* '(https?://|www\.|javascript:|data:)')
);
create index community_discussions_feed_idx on public.community_discussions(status, created_at desc);
create index community_discussions_active_idx on public.community_discussions(status, last_activity_at desc);
create index community_discussions_liked_idx on public.community_discussions(status, like_count desc);
create index community_discussions_author_idx on public.community_discussions(author_id, created_at desc);

create table public.community_replies (
  id uuid primary key default gen_random_uuid(),
  discussion_id uuid not null references public.community_discussions(id) on delete cascade,
  author_id uuid not null references public.community_profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 2 and 2000),
  status text not null default 'published' check (status in ('published','hidden','removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  edited_at timestamptz,
  check (position('<' in body) = 0 and body !~* '(https?://|www\.|javascript:|data:)')
);
create index community_replies_discussion_idx on public.community_replies(discussion_id, created_at);
create index community_replies_author_idx on public.community_replies(author_id, created_at desc);

create table public.community_likes (
  user_id uuid not null references public.community_profiles(id) on delete cascade,
  discussion_id uuid not null references public.community_discussions(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, discussion_id)
);
create index community_likes_discussion_idx on public.community_likes(discussion_id);

create table public.community_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  discussion_id uuid references public.community_discussions(id) on delete cascade,
  reply_id uuid references public.community_replies(id) on delete cascade,
  reason text not null check (reason in ('Spam','Harassment','Hate or abuse','Unsafe content','Other')),
  explanation text not null default '' check (char_length(explanation) <= 500 and position('<' in explanation) = 0),
  created_at timestamptz not null default now(),
  check ((discussion_id is not null) <> (reply_id is not null))
);
create index community_reports_discussion_idx on public.community_reports(discussion_id);
create index community_reports_reply_idx on public.community_reports(reply_id);
create index community_reports_reporter_idx on public.community_reports(reporter_id);

create table public.community_rate_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null check (action in ('discussion','reply','like','report')),
  target_id uuid not null default '00000000-0000-0000-0000-000000000000',
  last_action_at timestamptz not null default now(),
  primary key (user_id, action, target_id)
);

create function public.community_touch_updated() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.updated_at := now();
  if tg_table_name = 'community_discussions' then
    if (new.title, new.body, new.category) is distinct from (old.title, old.body, old.category) then new.edited_at := now(); end if;
  elsif tg_table_name = 'community_replies' then
    if new.body is distinct from old.body then new.edited_at := now(); end if;
  end if;
  return new;
end;
$$;
create trigger profiles_touch before update on public.community_profiles for each row execute function public.community_touch_updated();
create trigger discussions_touch before update on public.community_discussions for each row execute function public.community_touch_updated();
create trigger replies_touch before update on public.community_replies for each row execute function public.community_touch_updated();

create function public.community_guard_write() returns trigger language plpgsql security definer set search_path = '' as $$
declare action_name text; target uuid; wait_seconds integer; accepted timestamptz;
begin
  if auth.uid() is null then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;
  if tg_table_name = 'community_discussions' then action_name := 'discussion'; target := '00000000-0000-0000-0000-000000000000'; wait_seconds := 30;
  elsif tg_table_name = 'community_replies' then
    action_name := 'reply'; target := '00000000-0000-0000-0000-000000000000'; wait_seconds := 10;
    if not exists (select 1 from public.community_discussions where id = new.discussion_id and status = 'published') then raise exception 'Discussion unavailable.' using errcode = 'P0001'; end if;
  elsif tg_table_name = 'community_likes' then
    action_name := 'like'; wait_seconds := 5;
    if tg_op = 'DELETE' then target := old.discussion_id; else target := new.discussion_id; end if;
    if tg_op = 'INSERT' and not exists (select 1 from public.community_discussions where id = new.discussion_id and status = 'published') then raise exception 'Discussion unavailable.' using errcode = 'P0001'; end if;
  else action_name := 'report'; target := '00000000-0000-0000-0000-000000000000'; wait_seconds := 30;
  end if;
  insert into public.community_rate_limits(user_id, action, target_id, last_action_at) values (auth.uid(), action_name, target, now())
    on conflict (user_id, action, target_id) do update set last_action_at = excluded.last_action_at
    where community_rate_limits.last_action_at <= now() - make_interval(secs => wait_seconds)
    returning last_action_at into accepted;
  if accepted is null then raise exception 'Action is temporarily rate limited.' using errcode = 'P0001'; end if;
  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;
create trigger discussions_rate before insert on public.community_discussions for each row execute function public.community_guard_write();
create trigger replies_rate before insert on public.community_replies for each row execute function public.community_guard_write();
create trigger likes_rate_insert before insert on public.community_likes for each row execute function public.community_guard_write();
create trigger likes_rate_delete before delete on public.community_likes for each row execute function public.community_guard_write();
create trigger reports_rate before insert on public.community_reports for each row execute function public.community_guard_write();

create function public.community_update_counts() returns trigger language plpgsql security definer set search_path = '' as $$
declare target uuid;
begin
  if tg_op = 'DELETE' then target := old.discussion_id; else target := new.discussion_id; end if;
  if tg_table_name = 'community_likes' then
    update public.community_discussions set like_count = greatest(0, like_count + case when tg_op = 'INSERT' then 1 else -1 end) where id = target;
  else
    update public.community_discussions set reply_count = greatest(0, reply_count + case when tg_op = 'INSERT' then 1 else -1 end), last_activity_at = now() where id = target;
  end if;
  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;
create trigger likes_counts after insert or delete on public.community_likes for each row execute function public.community_update_counts();
create trigger replies_counts after insert or delete on public.community_replies for each row execute function public.community_update_counts();

alter table public.community_profiles enable row level security;
alter table public.community_discussions enable row level security;
alter table public.community_replies enable row level security;
alter table public.community_likes enable row level security;
alter table public.community_reports enable row level security;
alter table public.community_rate_limits enable row level security;

revoke all on public.community_profiles, public.community_discussions, public.community_replies, public.community_likes, public.community_reports, public.community_rate_limits from public, anon, authenticated;
revoke all on function public.community_touch_updated(), public.community_guard_write(), public.community_update_counts() from public, anon, authenticated;

grant select on public.community_profiles, public.community_discussions, public.community_replies to anon, authenticated;
grant insert (id, handle, display_name, bio, location, identity, avatar_id) on public.community_profiles to authenticated;
grant update (handle, display_name, bio, location, identity, avatar_id) on public.community_profiles to authenticated;
grant insert (author_id, title, body, category) on public.community_discussions to authenticated;
grant update (title, body, category) on public.community_discussions to authenticated;
grant delete on public.community_discussions to authenticated;
grant insert (discussion_id, author_id, body) on public.community_replies to authenticated;
grant update (body) on public.community_replies to authenticated;
grant delete on public.community_replies to authenticated;
grant select (user_id, discussion_id) on public.community_likes to authenticated;
grant insert (user_id, discussion_id) on public.community_likes to authenticated;
grant delete on public.community_likes to authenticated;
grant insert (reporter_id, discussion_id, reply_id, reason, explanation) on public.community_reports to authenticated;

create policy profiles_read on public.community_profiles for select to anon, authenticated using (true);
create policy profiles_insert_self on public.community_profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy profiles_update_self on public.community_profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy discussions_read_published on public.community_discussions for select to anon, authenticated using (status = 'published');
create policy discussions_insert_self on public.community_discussions for insert to authenticated with check ((select auth.uid()) = author_id and status = 'published');
create policy discussions_update_self on public.community_discussions for update to authenticated using ((select auth.uid()) = author_id and status = 'published') with check ((select auth.uid()) = author_id and status = 'published');
create policy discussions_delete_self on public.community_discussions for delete to authenticated using ((select auth.uid()) = author_id);
create policy replies_read_published on public.community_replies for select to anon, authenticated using (status = 'published' and exists (select 1 from public.community_discussions d where d.id = discussion_id and d.status = 'published'));
create policy replies_insert_self on public.community_replies for insert to authenticated with check ((select auth.uid()) = author_id and status = 'published' and exists (select 1 from public.community_discussions d where d.id = discussion_id and d.status = 'published'));
create policy replies_update_self on public.community_replies for update to authenticated using ((select auth.uid()) = author_id and status = 'published') with check ((select auth.uid()) = author_id and status = 'published');
create policy replies_delete_self on public.community_replies for delete to authenticated using ((select auth.uid()) = author_id);
create policy likes_read_self on public.community_likes for select to authenticated using ((select auth.uid()) = user_id);
create policy likes_insert_self on public.community_likes for insert to authenticated with check ((select auth.uid()) = user_id and exists (select 1 from public.community_discussions d where d.id = discussion_id and d.status = 'published'));
create policy likes_delete_self on public.community_likes for delete to authenticated using ((select auth.uid()) = user_id);
create policy reports_insert_self on public.community_reports for insert to authenticated with check ((select auth.uid()) = reporter_id and ((discussion_id is not null and exists (select 1 from public.community_discussions d where d.id = discussion_id and d.status = 'published')) or (reply_id is not null and exists (select 1 from public.community_replies r where r.id = reply_id and r.status = 'published'))));

-- No browser SELECT grant or policy exists for reports or rate limits. Moderation
-- changes status only through privileged Supabase SQL/admin operations.
