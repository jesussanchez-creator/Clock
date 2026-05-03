# Exportar fichajes de Acerca Clock a Excel

Esta guía está pensada para Recursos Humanos. Explica cómo obtener los datos de fichaje desde Supabase y abrirlos en Excel manteniendo el formato de las plantillas oficiales.

> Las dos plantillas de referencia son:
> - `acerca-clock-eventos-ejemplo.xlsx` — todos los eventos en bruto (un fichaje por fila).
> - `acerca-clock-resumen-diario-ejemplo.xlsx` — un resumen por trabajador y día con cálculos automáticos.

---

## 1. Acceder a Supabase

1. Entra en <https://supabase.com> con la cuenta de Acerca.
2. Selecciona el proyecto **Acerca Clock**.
3. En el menú lateral, abre **SQL Editor**.

---

## 2. Exportar todos los eventos (registro detallado)

Pega esta consulta en el SQL Editor y pulsa **Run**:

```sql
select
  email,
  full_name           as "Nombre completo",
  local_date          as "Fecha (Madrid)",
  local_time          as "Hora (Madrid)",
  event_type          as "Evento",
  case event_type
    when 'CLOCK_IN'    then 'Inicio de jornada'
    when 'BREAK_START' then 'Inicio de descanso'
    when 'BREAK_END'   then 'Vuelta de descanso'
    when 'LUNCH_START' then 'Inicio de comida'
    when 'LUNCH_END'   then 'Vuelta de comida'
    when 'CLOCK_OUT'   then 'Fin de jornada'
  end                 as "Acción",
  event_timestamp     as "Timestamp UTC",
  ip_address          as "IP origen",
  timezone            as "Zona horaria"
from public.time_events
where local_date >= current_date - interval '30 days'   -- ajusta el rango
order by local_date desc, email, event_timestamp;
```

Cuando aparezcan los resultados:

1. Pulsa **Download as CSV** (botón arriba a la derecha de la tabla).
2. Abre el CSV en Excel.
3. Si quieres mantener el formato corporativo de la plantilla: copia los datos sin la cabecera y pégalos en `acerca-clock-eventos-ejemplo.xlsx` a partir de la fila 5.

---

## 3. Exportar el resumen diario (lo más útil para nóminas)

```sql
select
  email,
  full_name             as "Nombre completo",
  local_date            as "Fecha",
  first_clock_in        as "Inicio jornada",
  last_clock_out        as "Fin jornada",
  break_minutes         as "Descansos (min)",
  lunch_minutes         as "Comida (min)",
  gross_minutes         as "Bruto (min)",
  net_worked_minutes    as "Neto (min)"
from public.daily_time_summary
where local_date >= date_trunc('month', current_date)   -- mes en curso
order by local_date desc, email;
```

Otros rangos comunes:

```sql
-- Mes anterior completo
where local_date >= date_trunc('month', current_date) - interval '1 month'
  and local_date <  date_trunc('month', current_date)

-- Una persona concreta
where email = 'jesus.sanchez@acerca.info'

-- Un rango de fechas exacto
where local_date between '2026-04-01' and '2026-04-30'
```

---

## 4. Filtrar por trabajador o por fecha

Si sólo quieres datos de una persona en concreto:

```sql
select * from public.daily_time_summary
where email = 'jesus.sanchez@acerca.info'
  and local_date >= current_date - interval '90 days'
order by local_date desc;
```

---

## 5. Recordatorios importantes

- Las horas en Supabase están en **UTC** en la columna `event_timestamp`. La hora local española está en `local_time` y `local_date` (zona `Europe/Madrid`). Para nóminas usa siempre las columnas locales.
- Los registros son **inmutables**: nadie puede editarlos ni borrarlos desde la aplicación. Si detectas un error, déjalo registrado y añade una nota fuera del sistema.
- La vista `daily_time_summary` ignora días sin `CLOCK_OUT` para los cálculos de Bruto y Neto. Aparecerán como vacíos.
- Si un descanso o comida queda abierto (sin `BREAK_END` / `LUNCH_END`), no se cuenta en los totales. Esto debería ser raro porque la app fuerza cerrar antes de finalizar jornada.

---

## 6. Mantener el formato de las plantillas

Las plantillas oficiales:

- Aplican los colores corporativos (azul marino #283040 + naranja #F88000).
- Tienen filtros automáticos en la fila de cabecera.
- En el resumen diario, las columnas **Bruto** y **Neto** son fórmulas Excel: si alguien edita una fila a mano, se recalculan solas.
- Tienen una hoja **Leyenda** explicando cada columna.

Para copiar datos nuevos en una plantilla sin romperla:

1. Abre la plantilla.
2. Borra los datos antiguos (filas 5 en adelante), **conservando** las cabeceras y la fila de totales.
3. Pega los datos nuevos a partir de la fila 5.
4. En el resumen, las fórmulas de Bruto y Neto se replicarán al copiar fila — si no, copia una fila ya formateada y reemplaza valores.
