-- Modalitats de lloguer: tarifes i disponibilitat per vehicle.
alter table public.rally_cars
  add column if not exists sprint_rate numeric(10,2) not null default 0,
  add column if not exists rentable_rally boolean not null default true,
  add column if not exists rentable_sprint boolean not null default false;

alter table public.rally_events
  add column if not exists event_type text not null default 'rally';
alter table public.rally_events
  drop constraint if exists rally_events_event_type_check;
alter table public.rally_events
  add constraint rally_events_event_type_check
  check (event_type in ('rally', 'rally_sprint', 'pujada_costa'));

alter table public.rally_cars
  drop constraint if exists rally_cars_sprint_rate_check;
alter table public.rally_cars
  add constraint rally_cars_sprint_rate_check check (sprint_rate >= 0);

alter table public.event_bookings
  add column if not exists rental_rate numeric(10,2);

create or replace function public.create_rally_booking(
  p_name text, p_phone text, p_event_id bigint, p_car_id bigint
) returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_customer_id bigint;
  v_booking_id bigint;
  v_event_type text;
  v_rate numeric(10,2);
begin
  if p_name is null or length(btrim(p_name)) < 2 or length(p_name) > 120 then
    raise exception 'Nom no valid';
  end if;
  if p_phone is null or length(btrim(p_phone)) < 3 or length(p_phone) > 30 then
    raise exception 'Telèfon no valid';
  end if;
  if p_event_id is null or p_car_id is null then
    raise exception 'Reserva incompleta';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_event_id::text || ':' || p_car_id::text, 0));

  select e.event_type,
         case when e.event_type = 'rally' then c.daily_rate else c.sprint_rate end
    into v_event_type, v_rate
  from public.rally_events e
  join public.rally_cars c on c.id = p_car_id
  where e.id = p_event_id
    and p_car_id = any(coalesce(e.assigned_cars, '{}'::bigint[]))
    and c.status <> 'manteniment'
    and c.ownership <> 'particular'
    and ((e.event_type = 'rally' and c.rentable_rally)
      or (e.event_type in ('rally_sprint','pujada_costa') and c.rentable_sprint));

  if not found then
    raise exception 'El vehicle no està disponible per a aquesta modalitat';
  end if;
  if exists (select 1 from public.event_bookings b where b.event_id=p_event_id and b.car_id=p_car_id) then
    raise exception 'Aquest vehicle ja està reservat per aquest esdeveniment';
  end if;

  insert into public.customers(name, phone) values (btrim(p_name), btrim(p_phone))
  returning id into v_customer_id;
  insert into public.event_bookings(event_id, car_id, customer_id, status, rental_rate)
  values (p_event_id, p_car_id, v_customer_id, 'pendent', v_rate)
  returning id into v_booking_id;

  return jsonb_build_object('success', true, 'booking_id', v_booking_id, 'rental_rate', v_rate);
end;
$function$;

revoke all on function public.create_rally_booking(text,text,bigint,bigint) from public;
grant execute on function public.create_rally_booking(text,text,bigint,bigint) to anon, authenticated;
