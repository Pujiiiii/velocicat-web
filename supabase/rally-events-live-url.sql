-- Afegeix la columna live_timing_url a rally_events si no existeix
alter table public.rally_events
  add column if not exists live_timing_url text;

comment on column public.rally_events.live_timing_url is 'URL oficial del cronometratge en directe del ral·li per a sincronització automàtica i enllaç públic';
