-- Afegeix copilot als resultats de competició.
alter table public.rally_results
  add column if not exists copilot_id bigint references public.drivers(id) on delete set null;

create index if not exists results_copilot_idx on public.rally_results(copilot_id);