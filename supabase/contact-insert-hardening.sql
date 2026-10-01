-- Security hardening: restrict public contact submissions to user-provided fields.
-- Safe to run after official-team-platform.sql and phase-2-hardening.sql.
-- This migration is intentionally idempotent.

-- Remove table-wide INSERT privileges, then grant only the fields used by the public form.
revoke insert on table public.contact_messages from anon, authenticated;
grant insert (name, email, phone, subject, message)
  on table public.contact_messages to anon, authenticated;

-- Public submissions must remain new; clients cannot set administrative status.
drop policy if exists "public contact insert" on public.contact_messages;
create policy "public contact insert"
  on public.contact_messages
  for insert
  to anon, authenticated
  with check (
    status = 'new'
    and char_length(trim(name)) between 2 and 100
    and (email is null or char_length(trim(email)) between 3 and 254)
    and (phone is null or char_length(trim(phone)) between 3 and 30)
    and char_length(trim(subject)) between 2 and 100
    and char_length(trim(message)) between 10 and 4000
  );

comment on policy "public contact insert" on public.contact_messages is
  'Permet enviaments públics amb camps limitats i estat inicial new; l’estat administratiu només el gestiona l’equip.';
