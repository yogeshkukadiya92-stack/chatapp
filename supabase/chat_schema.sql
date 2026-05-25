-- Phase 1 chat platform schema for Supabase/Postgres.
-- End-to-end encryption is not implemented in this phase. Future E2EE should use
-- Signal Protocol or another audited encryption library with formal security review.

create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'conversation_type') then
    create type conversation_type as enum ('direct', 'group');
  end if;

  if not exists (select 1 from pg_type where typname = 'message_type') then
    create type message_type as enum ('text', 'image', 'video', 'document', 'audio', 'location');
  end if;

  if not exists (select 1 from pg_type where typname = 'message_delivery_status') then
    create type message_delivery_status as enum ('sent', 'delivered', 'read');
  end if;

  if not exists (select 1 from pg_type where typname = 'call_type') then
    create type call_type as enum ('voice', 'video');
  end if;

  if not exists (select 1 from pg_type where typname = 'call_status') then
    create type call_status as enum ('ringing', 'accepted', 'rejected', 'ended', 'missed');
  end if;
end $$;

create table if not exists chat_users (
  id uuid primary key default gen_random_uuid(),
  phone text not null unique,
  name text not null,
  avatar_url text,
  about text not null default 'Available',
  last_seen_at timestamptz,
  is_online boolean not null default false,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references chat_users(id) on delete cascade,
  contact_user_id uuid not null references chat_users(id) on delete cascade,
  alias text,
  created_at timestamptz not null default now(),
  unique (owner_id, contact_user_id),
  check (owner_id <> contact_user_id)
);

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  type conversation_type not null,
  title text,
  avatar_url text,
  created_by uuid references chat_users(id) on delete set null,
  last_message_id uuid,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists conversation_participants (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  user_id uuid not null references chat_users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  muted_until timestamptz,
  joined_at timestamptz not null default now(),
  last_read_message_id uuid,
  unique (conversation_id, user_id)
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id uuid not null references chat_users(id) on delete cascade,
  type message_type not null default 'text',
  body text,
  media_url text,
  media_mime_type text,
  media_size bigint,
  reply_to_message_id uuid references messages(id) on delete set null,
  is_forwarded boolean not null default false,
  is_deleted boolean not null default false,
  deleted_for_everyone boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table conversations
  drop constraint if exists conversations_last_message_id_fkey;

alter table conversations
  add constraint conversations_last_message_id_fkey
  foreign key (last_message_id) references messages(id) on delete set null;

alter table conversation_participants
  drop constraint if exists conversation_participants_last_read_message_id_fkey;

alter table conversation_participants
  add constraint conversation_participants_last_read_message_id_fkey
  foreign key (last_read_message_id) references messages(id) on delete set null;

create table if not exists message_status (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references messages(id) on delete cascade,
  user_id uuid not null references chat_users(id) on delete cascade,
  status message_delivery_status not null default 'sent',
  delivered_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (message_id, user_id)
);

create table if not exists call_logs (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete set null,
  caller_id uuid not null references chat_users(id) on delete cascade,
  receiver_id uuid references chat_users(id) on delete set null,
  type call_type not null,
  status call_status not null default 'ringing',
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds integer not null default 0,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists blocked_users (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references chat_users(id) on delete cascade,
  blocked_id uuid not null references chat_users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists chat_users_set_updated_at on chat_users;
create trigger chat_users_set_updated_at
before update on chat_users
for each row execute function set_updated_at();

drop trigger if exists conversations_set_updated_at on conversations;
create trigger conversations_set_updated_at
before update on conversations
for each row execute function set_updated_at();

drop trigger if exists messages_set_updated_at on messages;
create trigger messages_set_updated_at
before update on messages
for each row execute function set_updated_at();

drop trigger if exists message_status_set_updated_at on message_status;
create trigger message_status_set_updated_at
before update on message_status
for each row execute function set_updated_at();

create index if not exists idx_chat_users_phone on chat_users(phone);
create index if not exists idx_chat_users_presence on chat_users(is_online, last_seen_at);
create index if not exists idx_contacts_owner on contacts(owner_id);
create index if not exists idx_conversation_participants_user on conversation_participants(user_id);
create index if not exists idx_conversation_participants_conversation on conversation_participants(conversation_id);
create index if not exists idx_messages_conversation_created on messages(conversation_id, created_at desc);
create index if not exists idx_messages_sender on messages(sender_id);
create index if not exists idx_message_status_message on message_status(message_id);
create index if not exists idx_message_status_user on message_status(user_id, status);
create index if not exists idx_call_logs_user_started on call_logs(caller_id, started_at desc);
create index if not exists idx_blocked_users_blocker on blocked_users(blocker_id);
create index if not exists idx_blocked_users_blocked on blocked_users(blocked_id);

alter table chat_users enable row level security;
alter table contacts enable row level security;
alter table conversations enable row level security;
alter table conversation_participants enable row level security;
alter table messages enable row level security;
alter table message_status enable row level security;
alter table call_logs enable row level security;
alter table blocked_users enable row level security;

-- The Phase 1 API uses the Supabase service role from the backend and enforces
-- authorization there. Add user-scoped RLS policies before exposing these tables
-- directly to clients.
