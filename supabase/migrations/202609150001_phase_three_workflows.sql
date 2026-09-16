create extension if not exists pgcrypto;

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  submission_reference text not null unique,
  name text not null check (char_length(name) between 2 and 100),
  email text not null check (char_length(email) <= 254),
  enquiry_type text not null check (enquiry_type in ('Collecting concept', 'Creator support', 'Partnerships', 'Press')),
  message text not null check (char_length(message) between 20 and 3000),
  consent_at timestamptz not null,
  submitted_at timestamptz not null default now(),
  status text not null default 'new' check (status in ('new', 'in_review', 'resolved', 'deleted')),
  notification_status text not null default 'pending' check (notification_status in ('pending', 'sent')),
  source text not null,
  dedupe_key text not null unique
);

create table if not exists public.creator_applications (
  id uuid primary key default gen_random_uuid(),
  submission_reference text not null unique,
  creator_name text not null check (char_length(creator_name) between 2 and 100),
  email text not null check (char_length(email) <= 254),
  location text not null check (char_length(location) between 2 and 120),
  portfolio_url text not null check (char_length(portfolio_url) <= 500),
  specialty text not null check (specialty in ('3D streetwear', 'Virtual couture', 'Digital accessories', 'Material artist')),
  vision text not null check (char_length(vision) between 30 and 3000),
  consent_at timestamptz not null,
  submitted_at timestamptz not null default now(),
  review_status text not null default 'new' check (review_status in ('new', 'in_review', 'shortlisted', 'declined', 'deleted')),
  notification_status text not null default 'pending' check (notification_status in ('pending', 'sent')),
  source text not null,
  dedupe_key text not null unique
);

create table if not exists public.newsletter_subscriptions (
  id uuid primary key default gen_random_uuid(),
  normalized_email text not null unique check (normalized_email = lower(normalized_email) and char_length(normalized_email) <= 254),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'unsubscribed')),
  consent_at timestamptz not null,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  unsubscribed_at timestamptz,
  confirmation_token_hash text unique check (confirmation_token_hash is null or char_length(confirmation_token_hash) = 64),
  confirmation_expires_at timestamptz,
  unsubscribe_token_hash text unique check (unsubscribe_token_hash is null or char_length(unsubscribe_token_hash) = 64),
  provider_sync_status text not null default 'pending' check (provider_sync_status in ('pending', 'synced')),
  source text not null
);

create table if not exists public.submission_rate_limits (
  client_key text not null,
  scope text not null,
  window_started_at timestamptz not null default now(),
  attempts integer not null default 1,
  primary key (client_key, scope)
);

create index if not exists contact_messages_submitted_at_idx on public.contact_messages (submitted_at desc);
create index if not exists creator_applications_submitted_at_idx on public.creator_applications (submitted_at desc);
create index if not exists newsletter_subscriptions_status_idx on public.newsletter_subscriptions (status);

alter table public.contact_messages enable row level security;
alter table public.creator_applications enable row level security;
alter table public.newsletter_subscriptions enable row level security;
alter table public.submission_rate_limits enable row level security;

revoke all on public.contact_messages from anon, authenticated;
revoke all on public.creator_applications from anon, authenticated;
revoke all on public.newsletter_subscriptions from anon, authenticated;
revoke all on public.submission_rate_limits from anon, authenticated;

grant select, insert, update, delete on public.contact_messages to service_role;
grant select, insert, update, delete on public.creator_applications to service_role;
grant select, insert, update, delete on public.newsletter_subscriptions to service_role;
grant select, insert, update, delete on public.submission_rate_limits to service_role;

create or replace function public.consume_submission_rate_limit(
  p_key text,
  p_scope text,
  p_limit integer,
  p_window_seconds integer
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_attempts integer;
begin
  if p_limit < 1 or p_window_seconds < 1 or char_length(p_key) <> 64 or char_length(p_scope) > 64 then
    return false;
  end if;

  insert into public.submission_rate_limits (client_key, scope, window_started_at, attempts)
  values (p_key, p_scope, now(), 1)
  on conflict (client_key, scope) do update
  set attempts = case
      when public.submission_rate_limits.window_started_at <= now() - make_interval(secs => p_window_seconds) then 1
      else public.submission_rate_limits.attempts + 1
    end,
    window_started_at = case
      when public.submission_rate_limits.window_started_at <= now() - make_interval(secs => p_window_seconds) then now()
      else public.submission_rate_limits.window_started_at
    end
  returning attempts into next_attempts;

  return next_attempts <= p_limit;
end;
$$;

revoke all on function public.consume_submission_rate_limit(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_submission_rate_limit(text, text, integer, integer) to service_role;

comment on table public.contact_messages is 'Private website contact submissions. No anonymous Data API access.';
comment on table public.creator_applications is 'Private creator applications. No anonymous Data API access.';
comment on table public.newsletter_subscriptions is 'Consent and double-opt-in newsletter state. Raw tokens are never stored.';
