-- Phase 2: hardening for public contact submissions.
-- Safe to run after official-team-platform.sql.

alter table public.contact_messages
  drop constraint if exists contact_messages_name_length,
  drop constraint if exists contact_messages_email_length,
  drop constraint if exists contact_messages_phone_length,
  drop constraint if exists contact_messages_subject_length,
  drop constraint if exists contact_messages_message_length,
  drop constraint if exists contact_messages_status_check;

alter table public.contact_messages
  add constraint contact_messages_name_length
    check (char_length(trim(name)) between 2 and 100),
  add constraint contact_messages_email_length
    check (email is null or char_length(trim(email)) between 3 and 254),
  add constraint contact_messages_phone_length
    check (phone is null or char_length(trim(phone)) between 3 and 30),
  add constraint contact_messages_subject_length
    check (char_length(trim(subject)) between 2 and 100),
  add constraint contact_messages_message_length
    check (char_length(trim(message)) between 10 and 4000),
  add constraint contact_messages_status_check
    check (status in ('new', 'read', 'replied', 'archived'));

comment on table public.contact_messages is
  'Missatges de contacte públics amb límits de longitud per reduir abusos i dades malformades.';
