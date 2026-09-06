-- =============================================
-- ESQUEMA BASE · común a cualquier negocio de servicios
--
-- Sale de barberia-app, quitándole lo que era de barbería. Estas tablas son
-- las mismas en la barbería, el carwash y la lavandería: gente que cobra,
-- cosas que se cobran, plata que entra y sale, y clientes.
--
-- Lo que NO está aquí, a propósito: la UNIDAD DE TRABAJO de cada negocio
-- (la cita en la barbería, el vehículo en el carwash, la bolsa de ropa con
-- fecha de entrega en la lavandería). Eso lo define cada app en su propio
-- SQL, porque es lo único que de verdad cambia.
--
-- Cómo se usa: en un proyecto de Supabase NUEVO y VACÍO, pegar este archivo
-- entero en SQL Editor → New query → Run. Después, el SQL del vertical.
--
-- Es idempotente: se puede correr dos veces sin romper nada.
-- =============================================

-- ---------- Gente ----------

-- Quien hace el trabajo y cobra por él. Antes se llamaba `barberos`.
create table if not exists empleados (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  email text unique,             -- correo de acceso, para su vista personal
  telefono text,                 -- para avisarle por WhatsApp
  activo boolean not null default true,
  creado timestamptz default now()
);

-- Quién puede entrar y qué ve. Los roles son de la app, no de la base:
-- la separación real la hacen las políticas de más abajo.
create table if not exists usuarios (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  nombre text not null,
  apellido text,
  telefono text,                 -- el celular de contacto
  rol text not null default 'empleado'
    check (rol in ('admin','socio','encargado','empleado')),
  empleado_nombre text,          -- a qué empleado corresponde, si es uno
  activo boolean not null default true,
  -- Solicitud que llegó por el QR de alta: existe pero no puede entrar
  -- hasta que el admin le asigne rol y la active.
  pendiente boolean not null default false,
  creado timestamptz default now()
);
alter table usuarios add column if not exists apellido text;
alter table usuarios add column if not exists telefono text;
alter table usuarios add column if not exists pendiente boolean not null default false;

-- ---------- Lo que se cobra ----------

create table if not exists servicios (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  precio numeric not null default 0,
  comision_pct numeric not null default 50,   -- % que gana el empleado
  activo boolean not null default true
);

create table if not exists ventas (
  id uuid primary key default gen_random_uuid(),
  fecha timestamptz not null default now(),
  empleado text not null,
  servicio text not null,
  precio numeric not null,
  propina numeric not null default 0,   -- va directo al empleado, no entra a caja
  comision numeric not null default 0,  -- calculada al registrar; se recalcula el mismo día
  producto_id uuid,                     -- si la venta es de mostrador, no un trabajo
  -- La cortesía es trabajo hecho que no cobra dinero (premio de lealtad,
  -- cortesía comercial). Paga comisión igual. Ver `ingresoReal` en el núcleo.
  metodo text not null
    check (metodo in ('efectivo','transferencia','tarjeta','cortesia'))
);

-- ---------- Plata que sale ----------

create table if not exists gastos (
  id uuid primary key default gen_random_uuid(),
  fecha timestamptz not null default now(),
  concepto text not null,
  monto numeric not null,
  fuente text not null check (fuente in ('caja','cuenta'))
);

-- Retiros de efectivo de la caja. Solo los aprobados salen del saldo.
create table if not exists retiros (
  id uuid primary key default gen_random_uuid(),
  fecha timestamptz not null default now(),
  monto numeric not null check (monto > 0),
  persona text not null,
  motivo text,
  estado text not null default 'pendiente'
    check (estado in ('pendiente','aprobado','rechazado'))
);

-- Pagos de comisiones y propinas a los empleados.
create table if not exists pagos_empleados (
  id uuid primary key default gen_random_uuid(),
  fecha timestamptz not null default now(),
  empleado text not null,
  monto numeric not null check (monto > 0),
  incluye_propinas boolean not null default false,
  -- De dónde salió la plata. Sin valor se asume caja, que es como funcionaba
  -- antes de que existiera la opción de pagar desde la cuenta.
  fuente text check (fuente in ('caja','cuenta')),
  desde date,
  hasta date,
  pagado_por text,
  nota text
);

-- ---------- Inventario ----------

create table if not exists inventario (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  stock int not null default 0,
  minimo int not null default 1,
  precio numeric not null default 0
);

-- ---------- Clientes ----------

create table if not exists clientes (
  id uuid primary key default gen_random_uuid(),
  creado timestamptz not null default now(),
  ultima_visita timestamptz not null default now(),
  visitas int not null default 1,
  nombre text not null,
  telefono text not null unique,
  email text,
  nacimiento date,
  -- Lo que cada negocio necesite y no esté aquí (tarjeta de lealtad, placa
  -- del auto, preferencias de lavado). Antes de añadir una columna al núcleo,
  -- preguntarse si la necesitan los tres negocios o solo uno.
  extra jsonb not null default '{}'::jsonb
);

-- Alta de cliente desde fuera (un QR, un formulario público) sin poder leer
-- la tabla. Si el teléfono ya existe, actualiza y suma una visita.
create or replace function registrar_cliente(
  p_nombre text, p_telefono text, p_email text default null, p_nacimiento date default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  insert into clientes (nombre, telefono, email, nacimiento)
  values (trim(p_nombre), trim(p_telefono), lower(nullif(trim(p_email), '')), p_nacimiento)
  on conflict (telefono) do update
    set nombre        = excluded.nombre,
        email         = coalesce(excluded.email, clientes.email),
        nacimiento    = coalesce(excluded.nacimiento, clientes.nacimiento),
        visitas       = clientes.visitas + 1,
        ultima_visita = now()
  returning id into v_id;
  return v_id;
end $$;

revoke all on function registrar_cliente(text, text, text, date) from public;
grant execute on function registrar_cliente(text, text, text, date) to anon, authenticated;

-- ---------- Seguridad ----------
--
-- Por defecto TODO cerrado: solo quien inició sesión entra. Lo que tenga que
-- ver un cliente sin cuenta (el catálogo, su propio ticket) se abre a `anon`
-- en el SQL del vertical, tabla por tabla y explicándolo.
--
-- Nunca abrir una tabla a `anon` "para que se vea en la app". Si algo no se
-- ve, es que falta la política del rol correcto. Ya hubo cuatro funciones
-- abiertas a `anon` sin que nadie lo quisiera.

do $$
declare t text;
begin
  foreach t in array array[
    'empleados','usuarios','servicios','ventas','gastos',
    'retiros','pagos_empleados','inventario','clientes'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "acceso_autenticado" on %I', t);
    execute format(
      'create policy "acceso_autenticado" on %I for all to authenticated using (true) with check (true)', t
    );
  end loop;
end $$;

-- Escribir en `usuarios` es dar acceso: solo un admin puede.
-- Sin esto, cualquier sesión podía ponerse rol='admin' a sí misma.
drop policy if exists "acceso_autenticado" on usuarios;

drop policy if exists "usuarios_lectura" on usuarios;
create policy "usuarios_lectura" on usuarios
  for select to authenticated using (true);

-- ¿La sesión actual es de un admin activo? `security definer`: lee
-- `usuarios` SIN pasar por RLS. Si la política preguntara leyendo la tabla
-- directamente, evaluaría su propia política otra vez: recursión infinita
-- (42P17 — lo encontró el carwash al encender, 2-sep-2026).
create or replace function soy_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from usuarios u
    where lower(u.email) = lower(auth.jwt() ->> 'email')
      and u.rol = 'admin' and u.activo
  );
$$;

revoke all on function soy_admin() from public;
grant execute on function soy_admin() to authenticated;

drop policy if exists "usuarios_escritura_admin" on usuarios;
drop policy if exists "usuarios_insert_admin" on usuarios;
create policy "usuarios_insert_admin" on usuarios
  for insert to authenticated with check (soy_admin());
drop policy if exists "usuarios_update_admin" on usuarios;
create policy "usuarios_update_admin" on usuarios
  for update to authenticated using (soy_admin()) with check (soy_admin());
drop policy if exists "usuarios_delete_admin" on usuarios;
create policy "usuarios_delete_admin" on usuarios
  for delete to authenticated using (soy_admin());

-- ---------- Tiempo real ----------
-- Los cambios se transmiten a todos los dispositivos conectados.

do $$
declare t text;
begin
  foreach t in array array[
    'empleados','servicios','ventas','gastos',
    'retiros','pagos_empleados','inventario','clientes'
  ] loop
    begin
      execute format('alter publication supabase_realtime add table %I', t);
    exception when duplicate_object then null; end;
  end loop;
end $$;
