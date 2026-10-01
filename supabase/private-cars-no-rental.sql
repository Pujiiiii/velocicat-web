-- Vehicles particulars: visible in the fleet and rally participation, but never rentable.
alter table public.rally_cars
  add column if not exists ownership text not null default 'escuderia';

update public.rally_cars
set ownership = 'escuderia'
where ownership is null;

alter table public.rally_cars
  drop constraint if exists rally_cars_ownership_check,
  drop constraint if exists rally_cars_private_price_check;

alter table public.rally_cars
  add constraint rally_cars_ownership_check
    check (ownership in ('escuderia','particular')),
  add constraint rally_cars_private_price_check
    check (ownership = 'escuderia' or coalesce(daily_rate, 0) = 0);

create or replace function public.prevent_private_car_booking()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1
    from public.rally_cars
    where id = new.car_id
      and ownership = 'particular'
  ) then
    raise exception 'Aquest vehicle particular no està disponible per lloguer.';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_private_car_booking on public.event_bookings;
create trigger prevent_private_car_booking
before insert or update of car_id on public.event_bookings
for each row
execute function public.prevent_private_car_booking();

comment on column public.rally_cars.ownership is
  'Propietat del vehicle: escuderia o particular. Els particulars no es poden llogar.';


-- El BMW 330d forma part de la flota com a vehicle particular.
update public.rally_cars
set ownership = 'particular', daily_rate = 0
where lower(trim(model)) = lower('BMW 330d');
