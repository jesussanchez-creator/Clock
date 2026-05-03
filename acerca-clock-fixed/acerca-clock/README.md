# Acerca Clock

Fichador laboral interno (MVP) construido con **Next.js 14 App Router + TypeScript + Supabase + Google OAuth**.

Permite que cada trabajador, desde un ordenador de la oficina y con su email corporativo de Google Workspace, registre los eventos de su jornada (inicio, descansos, comida, fin). Todos los registros son inmutables y RRHH los consulta directamente desde Supabase.

---

## 1. Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- Supabase (PostgreSQL + Auth con Google OAuth)
- `date-fns` + `date-fns-tz` (zona horaria `Europe/Madrid`)
- Despliegue recomendado: Vercel

---

## 2. Estructura del proyecto

```
acerca-clock/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                # Home (gating: auth + dominio + IP)
│   ├── globals.css
│   ├── login/page.tsx          # Login con Google
│   ├── blocked/page.tsx        # IP no autorizada
│   ├── auth/callback/route.ts  # Callback OAuth
│   └── api/
│       ├── clock-event/route.ts    # POST de eventos (validación servidor)
│       └── session-state/route.ts  # GET estado actual
├── components/
│   ├── Dashboard.tsx
│   ├── ClockButtons.tsx
│   ├── TodayEvents.tsx
│   ├── DaySummary.tsx
│   ├── LiveClock.tsx
│   ├── LoginButton.tsx
│   └── LogoutLink.tsx
├── lib/
│   ├── supabase/{server,client}.ts
│   ├── time/index.ts           # Helpers Europe/Madrid
│   ├── ip/index.ts             # Detección IP + whitelist (incluye CIDR)
│   ├── utils.ts
│   └── validations/
│       ├── email.ts            # Dominio corporativo
│       ├── clock.ts            # Máquina de estados + cálculo resumen
│       └── session.ts          # Carga sesión + eventos del día
├── supabase/schema.sql         # Esquema completo + RLS + vista
├── middleware.ts               # Refresca cookies Supabase
├── .env.example
├── package.json
├── next.config.js
├── tailwind.config.js
├── postcss.config.js
└── tsconfig.json
```

---

## 3. Configuración paso a paso

### 3.1 Crear el proyecto Supabase

1. Entra en <https://supabase.com> y crea un proyecto.
2. Ve a **SQL Editor → New query**, pega el contenido de [`supabase/schema.sql`](supabase/schema.sql) y ejecútalo. Esto crea:
   - Tabla `time_events` con CHECK constraint para `event_type`.
   - Índices.
   - Políticas RLS (sólo INSERT y SELECT del propio usuario; UPDATE/DELETE bloqueados).
   - Vista `daily_time_summary` para RRHH.
3. Anota desde **Settings → API**:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 3.2 Configurar Google OAuth en Google Cloud

1. Entra en <https://console.cloud.google.com>.
2. Crea (o usa) un proyecto.
3. **APIs & Services → OAuth consent screen** → tipo *Internal* (Workspace) y rellena los datos.
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID**:
   - Tipo: *Web application*.
   - **Authorized JavaScript origins**:
     - `http://localhost:3000`
     - `https://TU_DOMINIO_PRODUCCION` (cuando despliegues)
   - **Authorized redirect URIs**:
     - `https://TU_PROYECTO.supabase.co/auth/v1/callback`
5. Copia el **Client ID** y **Client Secret**.

### 3.3 Activar Google en Supabase

1. En el panel Supabase: **Authentication → Providers → Google → Enable**.
2. Pega `Client ID` y `Client Secret`.
3. **Authentication → URL Configuration**:
   - **Site URL**: `http://localhost:3000` (luego cámbialo a tu dominio prod).
   - **Redirect URLs**: añade `http://localhost:3000/auth/callback` y `https://TU_DOMINIO/auth/callback`.

### 3.4 Variables de entorno

Copia `.env.example` a `.env.local` y rellena:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...        # sólo si usas el panel admin
NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN=acerca.info
ADMIN_EMAILS=rrhh@acerca.info                   # whitelist del panel /admin
ALLOWED_OFFICE_IPS=80.25.10.100,80.25.10.101
NEXT_PUBLIC_APP_NAME=Acerca Clock
```

`ALLOWED_OFFICE_IPS` admite también CIDR (p.ej. `80.25.10.0/24`).

**Sobre el panel admin (RRHH):**

- Cualquier email listado en `ADMIN_EMAILS` ve un botón "Panel admin" en el header del fichador.
- El panel está en `/admin` y permite filtrar por rango de fechas y por trabajadores, con descarga directa de los Excel ya formateados (resumen diario y eventos detallados).
- El panel admin **no tiene restricción de IP** (RRHH puede consultar desde casa o en una inspección). Sí mantiene login + dominio + ser admin.
- La `SUPABASE_SERVICE_ROLE_KEY` se usa **sólo en endpoints server-side** (`/api/admin/*`) y nunca llega al navegador.

### 3.5 Ejecución local

**Opción A — automática:**

```bash
bash setup.sh
```

Este script verifica Node 18+, copia `.env.local.template` a `.env.local` si no existe, ejecuta `npm install` y un type-check. Después rellena los `REPLACE_ME` y arranca con `npm run dev`.

**Opción B — manual:**

```bash
cp .env.local.template .env.local      # luego edita y rellena REPLACE_ME
npm install
npm run dev
```

Abre `http://localhost:3000`.

> **Bypass de IP en desarrollo**: el fichero `.env.local.template` trae `DEV_BYPASS_IP_CHECK=true` activado. Esto sólo se aplica si `NODE_ENV !== 'production'`, así que en Vercel **no surte efecto**. Si prefieres probar el bloqueo real en local, comenta esa línea y añade tu IP pública (consúltala en <https://ifconfig.me>) a `ALLOWED_OFFICE_IPS`.

### 3.6 Seed opcional para probar la vista de RRHH

Tras crear el esquema, si quieres ver `daily_time_summary` con datos:

```sql
-- En Supabase > SQL Editor, pega y ejecuta el contenido de:
-- supabase/seed.sql
```

Inserta un día completo de un usuario `demo@empresa.com`. Para limpiar después:

```sql
delete from time_events where email = 'demo@empresa.com';
```

---

## 4. Despliegue en Vercel

1. Sube el repo a GitHub.
2. En <https://vercel.com> → **New Project** → importa el repo.
3. Añade **todas** las variables de entorno en *Project Settings → Environment Variables* (Production y Preview).
4. Despliega.
5. Vuelve a Google Cloud y a Supabase y añade `https://TU_DOMINIO.vercel.app` y `https://TU_DOMINIO.vercel.app/auth/callback` a las redirect URLs.

> Vercel inyecta automáticamente cabeceras `x-forwarded-for` / `x-real-ip` / `x-vercel-forwarded-for`. La función `getClientIp()` ya las prioriza correctamente.

---

## 5. Cómo probar el flujo

1. Ve a `https://TU_DOMINIO/login`.
2. Pulsa **Entrar con Google**.
3. Selecciona una cuenta del dominio corporativo.
4. Si tu email no es del dominio → vuelves a `/login` con error `invalid_domain`.
5. Si tu IP no está en la whitelist → eres redirigido a `/blocked`.
6. Si todo OK → ves el dashboard. Al principio sólo aparece **Iniciar jornada**.
7. Pulsa **Iniciar jornada** → aparecen *Iniciar descanso*, *Iniciar comida*, *Finalizar jornada*.
8. Prueba flujos:
   - Descanso → sólo se ofrece *Volver del descanso*.
   - Comida → sólo se ofrece *Volver de comida*.
   - *Finalizar jornada* solicita confirmación.
9. Cada pulsación se guarda en `time_events` (compruébalo desde el SQL Editor de Supabase).
10. Tras finalizar, se muestra el bloque de **Resumen** y desaparecen los botones.

### Comprobaciones de seguridad recomendadas

- Desconecta del VPN/WiFi de oficina y refresca → debe enviarte a `/blocked`.
- Inicia sesión con un email externo al dominio → debe rechazarse.
- En el SQL editor de Supabase, intenta `update time_events set local_time = ...` autenticado como anon → debe fallar.
- Llama a `POST /api/clock-event` sin autenticación → 401.

---

## 6. Consultas para RRHH

Desde el SQL Editor de Supabase:

```sql
-- Eventos crudos del día
select email, local_time, event_type
from time_events
where local_date = current_date
order by email, event_timestamp;

-- Resumen agregado del día
select *
from daily_time_summary
where local_date = current_date
order by email;

-- Resumen del último mes
select *
from daily_time_summary
where local_date >= date_trunc('month', current_date)
order by local_date desc, email;
```

Para exportar CSV: en *Table Editor*, abre `time_events` o `daily_time_summary` y usa el botón **Export → CSV**.

---

## 7. Reglas de negocio implementadas

- Sólo un `CLOCK_IN` por día.
- No se permiten eventos posteriores a `CLOCK_OUT`.
- No se puede iniciar descanso con comida abierta y viceversa.
- No se puede finalizar jornada con descanso o comida abierta.
- Pueden existir varios descansos por jornada.
- La comida es opcional.
- Toda validación se ejecuta **en servidor** (`app/api/clock-event/route.ts`).
- RLS impide UPDATE y DELETE incluso si alguien obtuviera la anon key.

---

## 8. Checklist final del MVP

- [ ] SQL ejecutado en Supabase (tabla, RLS, índices, vista).
- [ ] Google OAuth configurado (consent screen interno + credentials).
- [ ] Provider Google activado en Supabase con redirect URLs correctos.
- [ ] `.env.local` (dev) y variables en Vercel (prod) rellenadas.
- [ ] Login con cuenta corporativa funciona.
- [ ] Login con cuenta no corporativa muestra error y bloquea.
- [ ] IP fuera de whitelist redirige a `/blocked` con la IP visible.
- [ ] IP en whitelist permite ver el fichador.
- [ ] Estados de botones cambian dinámicamente.
- [ ] Eventos aparecen en `time_events` con `local_date`, `local_time`, `timezone='Europe/Madrid'`.
- [ ] No es posible UPDATE/DELETE desde la app ni desde la anon key.
- [ ] El resumen al finalizar muestra inicio, fin, bruto, descansos, comida y neto.
- [ ] La vista `daily_time_summary` devuelve datos consistentes.
- [ ] Export CSV desde Supabase funciona.

---

## 9. Limitaciones conocidas (intencionadas para el MVP)

- No hay panel admin: RRHH consulta directamente Supabase.
- No hay corrección, edición, ni borrado de fichajes.
- No hay alertas, recordatorios, notificaciones.
- No hay separación por oficinas en la UI.
- No hay geolocalización GPS.
- No hay app móvil (la UI está pensada para escritorio; el bloqueo por IP es la barrera principal).

Estas decisiones siguen las restricciones del documento de requisitos.
