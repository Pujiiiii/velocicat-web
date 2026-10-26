-- Funció pública per comprovar l'estat de disponibilitat de vehicles en rallys
-- Retorna únicament event_id i car_id dels vehicles reservats (pendents o confirmats),
-- protegint les dades personals dels clients sota les polítiques de Row Level Security (RLS).

create or replace function public.get_public_booking_status()
returns table (
  event_id bigint,
  car_id bigint
)
language sql
security definer
set search_path = public
as $$
  select b.event_id, b.car_id
  from public.event_bookings b
  where b.status in ('pendent', 'confirmada');
$$;

revoke all on function public.get_public_booking_status() from public;
grant execute on function public.get_public_booking_status() to anon, authenticated;

comment on function public.get_public_booking_status() is
  'Retorna els IDs de cursa i vehicle que estan ocupats per calcular la disponibilitat al web públic sense exposar dades de clients.';
