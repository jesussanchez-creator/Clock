-- =====================================================================
-- Acerca Clock — SEED de datos de ejemplo (OPCIONAL)
-- Ejecutar SOLO en entornos de prueba. NO ejecutar en producción real.
--
-- Crea un día completo de eventos para un usuario ficticio:
--   - 09:01 Inicio de jornada
--   - 11:15 / 11:27 Descanso
--   - 14:02 / 14:45 Comida
--   - 18:04 Fin de jornada
--
-- Tras ejecutarlo:
--   select * from daily_time_summary;
-- debería devolver una fila con net_worked_minutes ≈ 488.
-- =====================================================================

-- Este seed pasa por encima de RLS porque se ejecuta con el rol
-- `postgres` desde el SQL Editor de Supabase.

insert into public.time_events
  (email, full_name, event_type, event_timestamp, local_date, local_time, timezone, ip_address)
values
  ('demo@empresa.com','Demo User','CLOCK_IN',    '2026-04-30 07:01:00+00','2026-04-30','09:01:00','Europe/Madrid','80.25.10.100'),
  ('demo@empresa.com','Demo User','BREAK_START', '2026-04-30 09:15:00+00','2026-04-30','11:15:00','Europe/Madrid','80.25.10.100'),
  ('demo@empresa.com','Demo User','BREAK_END',   '2026-04-30 09:27:00+00','2026-04-30','11:27:00','Europe/Madrid','80.25.10.100'),
  ('demo@empresa.com','Demo User','LUNCH_START', '2026-04-30 12:02:00+00','2026-04-30','14:02:00','Europe/Madrid','80.25.10.100'),
  ('demo@empresa.com','Demo User','LUNCH_END',   '2026-04-30 12:45:00+00','2026-04-30','14:45:00','Europe/Madrid','80.25.10.100'),
  ('demo@empresa.com','Demo User','CLOCK_OUT',   '2026-04-30 16:04:00+00','2026-04-30','18:04:00','Europe/Madrid','80.25.10.100');

-- Verificación
select * from daily_time_summary where email = 'demo@empresa.com';

-- Para limpiar:
-- delete from time_events where email = 'demo@empresa.com';
