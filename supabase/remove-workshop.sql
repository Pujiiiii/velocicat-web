-- VelociCAT: eliminació definitiva de la funcionalitat de taller
-- Executar al Supabase SQL Editor després de desplegar el canvi de codi.

DROP FUNCTION IF EXISTS public.create_workshop_request(text, text, text);
DROP TABLE IF EXISTS public.workshop_appointments;

-- customers es manté perquè event_bookings continua utilitzant-la.
