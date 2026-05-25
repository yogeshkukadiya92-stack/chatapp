-- Development seed users requested for local chat testing.
-- Run this after supabase/chat_schema.sql.

insert into chat_users (phone, name, about, is_online)
values
  ('9825344428', 'User 4428', 'Available', false),
  ('7990979942', 'User 9942', 'Available', false)
on conflict (phone) do update
set
  name = excluded.name,
  about = excluded.about,
  updated_at = now();
