-- DesignLens — user_api_keys table
-- Stores per-user OpenAI/Anthropic API keys encrypted at rest (AES-256-GCM).
-- Only the server (service_role) reads or writes; Row-Level Security blocks
-- all client-side access via the anon key.

create table if not exists public.user_api_keys (
  user_id          uuid primary key references auth.users on delete cascade,

  openai_ct        text,
  openai_iv        text,
  openai_tag       text,
  openai_last4     text,
  openai_updated_at timestamptz,

  anthropic_ct     text,
  anthropic_iv     text,
  anthropic_tag    text,
  anthropic_last4  text,
  anthropic_updated_at timestamptz,

  updated_at       timestamptz not null default now()
);

alter table public.user_api_keys enable row level security;

-- Clients using the anon key should never touch this table. The server uses
-- the service_role key, which bypasses RLS. This explicit deny policy makes
-- the intent clear and blocks anon access even if a policy is later added.
drop policy if exists "deny anon access" on public.user_api_keys;
create policy "deny anon access"
  on public.user_api_keys
  for all
  to anon, authenticated
  using (false)
  with check (false);
