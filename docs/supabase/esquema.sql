-- =====================================================================================
-- Hotel Canino — esquema completo para tu propio proyecto de Supabase (plan gratuito)
--
-- Cómo usarlo: Supabase → SQL Editor → New query → pegar TODO este archivo → Run.
-- Se ejecuta UNA sola vez en un proyecto nuevo y vacío. No crea reservas ni perros de
-- ejemplo: solo la estructura, las reglas de seguridad y los ajustes por defecto.
--
-- Las reglas de negocio replican src/lib/hotel/rules.ts (máximo 6 perros por noche, solo las
-- reservas confirmadas ocupan lugar, salida después de las 13:00 suma una noche, fechas
-- bloqueadas sin lugar, tarifa especial en fechas de fiesta). Si cambian allí, cambian aquí.
-- =====================================================================================

begin;

-- ------------------------------------------------------------------ Roles de administrador
create type public.app_role as enum ('admin');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "Cada usuario ve sus propios roles" on public.user_roles
  for select to authenticated using (user_id = auth.uid());

create function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(auth.uid(), 'admin')
$$;

-- --------------------------------------------------------------------------------- Ajustes
create table public.settings (
  id boolean primary key default true check (id),
  nightly_rate numeric(12, 2) not null default 0 check (nightly_rate >= 0),
  special_multiplier numeric(5, 2) not null default 2 check (special_multiplier >= 1),
  special_dates text[] not null default array['12-24', '12-25', '12-31', '01-01'],
  bank_alias text not null default '' check (char_length(bank_alias) <= 100),
  bank_holder text not null default '' check (char_length(bank_holder) <= 100),
  bank_name text not null default '' check (char_length(bank_name) <= 100),
  conditions text[] not null default array[
    'Capacidad máxima de 6 perros alojados al mismo tiempo.',
    'La reserva se confirma al recibir la seña del 50% por transferencia.',
    'El día de salida, el retiro hasta las 13:00 no suma una noche adicional. Después de esa hora se cobra una noche más.',
    'Las fechas de Navidad y Año Nuevo tienen tarifa doble.',
    'Vacunas al día y desparasitación reciente (presentar libreta sanitaria).',
    'Informar alimentación, medicación y cualquier cuidado especial al ingresar.'
  ],
  -- Zona horaria del hotel: define qué día es "hoy" al validar solicitudes.
  time_zone text not null default 'America/La_Paz',
  updated_at timestamptz not null default now()
);
insert into public.settings (id) values (true);
grant select on public.settings to anon, authenticated;
grant update on public.settings to authenticated;
grant all on public.settings to service_role;
alter table public.settings enable row level security;
create policy "Cualquiera lee los ajustes" on public.settings
  for select to anon, authenticated using (true);
create policy "Solo admin modifica los ajustes" on public.settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------------- Perros
create table public.dogs (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 60),
  breed text check (char_length(breed) <= 60),
  owner_name text check (char_length(owner_name) <= 100),
  notes text check (char_length(notes) <= 1000),
  photo_path text check (char_length(photo_path) <= 300),
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.dogs to authenticated;
grant all on public.dogs to service_role;
alter table public.dogs enable row level security;
create policy "Solo admin gestiona perros" on public.dogs
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- -------------------------------------------------------------------------------- Reservas
create type public.reservation_status as enum ('pending', 'confirmed', 'cancelled');
create type public.reservation_source as enum ('public', 'admin');

create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  owner_name text not null check (char_length(btrim(owner_name)) between 1 and 100),
  phone text not null default '' check (char_length(phone) <= 40),
  email text check (char_length(email) <= 200),
  check_in date not null,
  check_out date not null,
  checkout_time time not null default '13:00',
  status public.reservation_status not null default 'pending',
  total numeric(12, 2) not null default 0 check (total >= 0),
  notes text check (char_length(notes) <= 2000),
  source public.reservation_source not null,
  created_at timestamptz not null default now(),
  check (check_out > check_in)
);
create index reservations_status_dates_idx on public.reservations (status, check_in, check_out);
grant select, insert, update, delete on public.reservations to authenticated;
grant all on public.reservations to service_role;
alter table public.reservations enable row level security;
create policy "Solo admin gestiona reservas" on public.reservations
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create table public.reservation_dogs (
  reservation_id uuid not null references public.reservations (id) on delete cascade,
  dog_id uuid not null references public.dogs (id) on delete cascade,
  primary key (reservation_id, dog_id)
);
create index reservation_dogs_dog_idx on public.reservation_dogs (dog_id);
grant select, insert, update, delete on public.reservation_dogs to authenticated;
grant all on public.reservation_dogs to service_role;
alter table public.reservation_dogs enable row level security;
create policy "Solo admin gestiona perros de reservas" on public.reservation_dogs
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ----------------------------------------------------------------------------------- Pagos
create type public.payment_kind as enum ('deposit', 'balance');

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations (id) on delete cascade,
  kind public.payment_kind not null,
  amount numeric(12, 2) not null check (amount > 0),
  paid_on date not null default current_date,
  note text check (char_length(note) <= 500),
  created_at timestamptz not null default now()
);
create index payments_reservation_idx on public.payments (reservation_id);
grant select, insert, update, delete on public.payments to authenticated;
grant all on public.payments to service_role;
alter table public.payments enable row level security;
create policy "Solo admin gestiona pagos" on public.payments
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------------------ Fechas bloqueadas
create table public.blocked_dates (
  date date primary key,
  reason text check (char_length(reason) <= 200)
);
grant select on public.blocked_dates to anon, authenticated;
grant insert, update, delete on public.blocked_dates to authenticated;
grant all on public.blocked_dates to service_role;
alter table public.blocked_dates enable row level security;
create policy "Cualquiera ve las fechas bloqueadas" on public.blocked_dates
  for select to anon, authenticated using (true);
create policy "Solo admin agrega fechas bloqueadas" on public.blocked_dates
  for insert to authenticated with check (public.is_admin());
create policy "Solo admin cambia fechas bloqueadas" on public.blocked_dates
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Solo admin quita fechas bloqueadas" on public.blocked_dates
  for delete to authenticated using (public.is_admin());

-- ===================================================================== Reglas del negocio
-- Noches que se cobran y ocupan lugar (igual que chargedNights en rules.ts).
create function public.hotel_nights(p_check_in date, p_check_out date, p_checkout_time time)
returns setof date language sql immutable set search_path = public as $$
  select d::date
    from generate_series(p_check_in, p_check_out - 1, interval '1 day') as d
   where p_check_out > p_check_in
  union all
  select p_check_out where p_check_out > p_check_in and p_checkout_time > time '13:00'
$$;

-- Perros alojados por noche. Solo cuentan las reservas confirmadas.
create function public.hotel_occupancy(p_from date, p_to date, p_exclude uuid default null)
returns table (night date, dogs integer)
language sql stable security definer set search_path = public as $$
  select n.night, sum(dc.cnt)::integer
    from public.reservations r
    cross join lateral (
      select count(*) as cnt from public.reservation_dogs rd where rd.reservation_id = r.id
    ) dc
    cross join lateral public.hotel_nights(r.check_in, r.check_out, r.checkout_time) as n (night)
   where r.status = 'confirmed'
     and (p_exclude is null or r.id <> p_exclude)
     and r.check_in <= p_to and r.check_out >= p_from
     and n.night between p_from and p_to
   group by n.night
$$;

-- Devuelve null si hay lugar, o el mismo mensaje que muestra la app (availabilityMessage).
create function public.hotel_availability_error(
  p_check_in date, p_check_out date, p_checkout_time time, p_dog_count integer,
  p_exclude uuid default null
) returns text language plpgsql stable security definer set search_path = public as $$
declare
  v_night date;
  v_used integer;
  v_min_free integer := 6;
  v_blocked boolean := false;
  v_conflict boolean := false;
begin
  if p_check_in is null or p_check_out is null or p_check_out <= p_check_in then
    return 'La fecha de salida debe ser posterior a la de ingreso.';
  end if;
  if coalesce(p_dog_count, 0) < 1 then return 'Agregá al menos un perro.'; end if;
  if p_dog_count > 6 then return 'No se pueden alojar más de 6 perros al mismo tiempo.'; end if;
  for v_night in select * from public.hotel_nights(p_check_in, p_check_out, p_checkout_time) loop
    if exists (select 1 from public.blocked_dates b where b.date = v_night) then
      v_blocked := true; v_conflict := true; v_min_free := 0;
      continue;
    end if;
    select coalesce(sum(o.dogs), 0) into v_used
      from public.hotel_occupancy(v_night, v_night, p_exclude) o;
    v_min_free := least(v_min_free, 6 - v_used);
    if 6 - v_used < p_dog_count then v_conflict := true; end if;
  end loop;
  if not v_conflict then return null; end if;
  if v_blocked then return 'Algunas de las fechas elegidas no están disponibles.'; end if;
  if v_min_free <= 0 then return 'No quedan lugares para alguna de las noches elegidas.'; end if;
  return format('Solo quedan %s lugar(es) para alguna de las noches elegidas.', v_min_free);
end $$;

-- Precio total (igual que quoteStay en rules.ts): tarifa por noche × perros, fiestas × recargo.
create function public.hotel_quote(
  p_check_in date, p_check_out date, p_checkout_time time, p_dog_count integer
) returns numeric language sql stable security definer set search_path = public as $$
  select coalesce(sum(
           s.nightly_rate
           * case when to_char(n, 'MM-DD') = any (s.special_dates) then s.special_multiplier else 1 end
         ), 0) * greatest(p_dog_count, 0)
    from public.settings s
    cross join public.hotel_nights(p_check_in, p_check_out, p_checkout_time) as n
$$;

create function public.hotel_lock_capacity()
returns void language sql volatile set search_path = public as $$
  select pg_advisory_xact_lock(hashtext('hotel-canino-capacity'))
$$;

-- Red de seguridad: ninguna noche puede superar 6 perros confirmados, venga de donde venga
-- el cambio. Se verifica al final de cada transacción.
create function public.hotel_enforce_capacity()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  r public.reservations;
  v_over date;
begin
  v_id := case when tg_table_name = 'reservation_dogs' then new.reservation_id else new.id end;
  select * into r from public.reservations where id = v_id;
  if not found or r.status <> 'confirmed' then return null; end if;
  perform public.hotel_lock_capacity();
  select o.night into v_over
    from public.hotel_occupancy(r.check_in, r.check_out) o
   where o.dogs > 6
     and o.night in (select public.hotel_nights(r.check_in, r.check_out, r.checkout_time))
   limit 1;
  if v_over is not null then
    raise exception 'Se superaría el máximo de 6 perros la noche del %', to_char(v_over, 'DD/MM/YYYY')
      using errcode = 'check_violation';
  end if;
  return null;
end $$;

create constraint trigger reservations_capacity
  after insert or update on public.reservations
  deferrable initially deferred for each row execute function public.hotel_enforce_capacity();
create constraint trigger reservation_dogs_capacity
  after insert or update on public.reservation_dogs
  deferrable initially deferred for each row execute function public.hotel_enforce_capacity();

-- Un perro con reservas activas (pendientes o confirmadas) no se puede eliminar.
create function public.hotel_protect_dog()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (
    select 1 from public.reservation_dogs rd
      join public.reservations r on r.id = rd.reservation_id
     where rd.dog_id = old.id and r.status <> 'cancelled'
  ) then
    raise exception 'Este perro tiene reservas activas. Cancelalas antes de eliminarlo.'
      using errcode = 'foreign_key_violation';
  end if;
  return old;
end $$;
create trigger dogs_protect_active before delete on public.dogs
  for each row execute function public.hotel_protect_dog();

-- ===================================================================== Funciones públicas
-- Ocupación por noche (solo cantidades, sin datos personales).
create function public.public_availability(p_from date, p_to date)
returns table (night date, dogs integer, blocked boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 400 then
    raise exception 'Rango de fechas inválido' using errcode = 'invalid_parameter_value';
  end if;
  return query
    select d::date, coalesce(o.dogs, 0),
           exists (select 1 from public.blocked_dates b where b.date = d::date)
      from generate_series(p_from, p_to, interval '1 day') as d
      left join public.hotel_occupancy(p_from, p_to) o on o.night = d::date
     order by 1;
end $$;

-- Perros con reserva CONFIRMADA en el rango: solo nombre y foto (nunca dueño ni teléfono).
create function public.public_confirmed_stays(p_from date, p_to date)
returns table (
  reservation_id uuid, check_in date, check_out date, checkout_time time,
  dog_id uuid, dog_name text, photo_path text
) language plpgsql stable security definer set search_path = public as $$
begin
  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 400 then
    raise exception 'Rango de fechas inválido' using errcode = 'invalid_parameter_value';
  end if;
  return query
    select r.id, r.check_in, r.check_out, r.checkout_time, d.id, d.name, d.photo_path
      from public.reservations r
      join public.reservation_dogs rd on rd.reservation_id = r.id
      join public.dogs d on d.id = rd.dog_id
     where r.status = 'confirmed' and r.check_in <= p_to and r.check_out >= p_from
     order by r.check_in, d.name;
end $$;

-- Solicitud de reserva desde el sitio público. Queda PENDIENTE y no ocupa lugar hasta que el
-- administrador la confirme. El precio se calcula aquí con los ajustes guardados.
create function public.submit_booking_request(
  p_owner_name text, p_phone text, p_email text,
  p_check_in date, p_check_out date, p_checkout_time time,
  p_notes text, p_dogs jsonb
) returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  v_today date;
  v_count integer;
  v_error text;
  v_total numeric;
  v_reservation uuid;
  v_dog jsonb;
  v_dog_id uuid;
  v_photo text;
begin
  select (now() at time zone s.time_zone)::date into v_today from public.settings s;
  if coalesce(btrim(p_owner_name), '') = '' then
    raise exception 'Ingresá tu nombre.' using errcode = 'check_violation';
  end if;
  if coalesce(btrim(p_phone), '') = '' then
    raise exception 'Ingresá un teléfono de contacto.' using errcode = 'check_violation';
  end if;
  if p_check_in is null or p_check_in < v_today then
    raise exception 'La fecha de ingreso no puede ser anterior a hoy.' using errcode = 'check_violation';
  end if;
  -- Límites técnicos contra abusos: hasta 2 años de anticipación y estadías de hasta 1 año.
  if p_check_in > v_today + 730 or p_check_out > p_check_in + 365 then
    raise exception 'Las fechas elegidas están fuera del rango permitido.' using errcode = 'check_violation';
  end if;
  if p_dogs is null or jsonb_typeof(p_dogs) <> 'array' then
    raise exception 'Agregá al menos un perro.' using errcode = 'check_violation';
  end if;
  v_count := jsonb_array_length(p_dogs);

  perform public.hotel_lock_capacity();
  v_error := public.hotel_availability_error(
    p_check_in, p_check_out, coalesce(p_checkout_time, time '13:00'), v_count);
  if v_error is not null then
    raise exception '%', v_error using errcode = 'check_violation';
  end if;

  v_total := public.hotel_quote(p_check_in, p_check_out, coalesce(p_checkout_time, time '13:00'), v_count);

  insert into public.reservations (
    owner_name, phone, email, check_in, check_out, checkout_time, status, total, notes, source
  ) values (
    btrim(p_owner_name), btrim(p_phone), nullif(btrim(p_email), ''), p_check_in, p_check_out,
    coalesce(p_checkout_time, time '13:00'), 'pending', v_total, nullif(btrim(p_notes), ''), 'public'
  ) returning id into v_reservation;

  for v_dog in select * from jsonb_array_elements(p_dogs) loop
    v_photo := nullif(btrim(v_dog ->> 'photo_path'), '');
    if v_photo is not null and v_photo not like 'solicitudes/%' then
      raise exception 'Foto inválida.' using errcode = 'check_violation';
    end if;
    if coalesce(btrim(v_dog ->> 'name'), '') = '' then
      raise exception 'Ingresá el nombre de cada perro.' using errcode = 'check_violation';
    end if;
    insert into public.dogs (name, breed, owner_name, notes, photo_path)
    values (
      btrim(v_dog ->> 'name'), nullif(btrim(v_dog ->> 'breed'), ''), btrim(p_owner_name),
      nullif(btrim(v_dog ->> 'notes'), ''), v_photo
    ) returning id into v_dog_id;
    insert into public.reservation_dogs (reservation_id, dog_id) values (v_reservation, v_dog_id);
  end loop;

  return jsonb_build_object('id', v_reservation, 'total', v_total);
end $$;

-- ================================================================ Funciones del administrador
-- Crear (p_id null) o editar una reserva con sus perros en un solo paso.
create function public.admin_save_reservation(
  p_id uuid, p_owner_name text, p_phone text, p_email text, p_dog_ids uuid[],
  p_check_in date, p_check_out date, p_checkout_time time, p_notes text, p_total numeric,
  p_confirm boolean default false, p_deposit numeric default 0
) returns uuid language plpgsql volatile security definer set search_path = public as $$
declare
  v_id uuid := p_id;
  v_status public.reservation_status;
  v_error text;
begin
  if not public.is_admin() then
    raise exception 'No autorizado.' using errcode = 'insufficient_privilege';
  end if;
  if coalesce(btrim(p_owner_name), '') = '' then
    raise exception 'Ingresá el nombre del responsable.' using errcode = 'check_violation';
  end if;
  if coalesce(cardinality(p_dog_ids), 0) = 0 then
    raise exception 'Seleccioná al menos un perro.' using errcode = 'check_violation';
  end if;
  if p_check_in is null or p_check_out is null or p_check_out <= p_check_in then
    raise exception 'La fecha de salida debe ser posterior a la de ingreso.' using errcode = 'check_violation';
  end if;

  if v_id is null then
    v_status := case when p_confirm then 'confirmed' else 'pending' end;
  else
    select status into v_status from public.reservations where id = v_id for update;
    if not found then raise exception 'La reserva ya no existe.' using errcode = 'no_data_found'; end if;
  end if;

  if v_status = 'confirmed' then
    perform public.hotel_lock_capacity();
    v_error := public.hotel_availability_error(
      p_check_in, p_check_out, p_checkout_time, cardinality(p_dog_ids), v_id);
    if v_error is not null then raise exception '%', v_error using errcode = 'check_violation'; end if;
  end if;

  if v_id is null then
    insert into public.reservations (
      owner_name, phone, email, check_in, check_out, checkout_time, status, total, notes, source
    ) values (
      btrim(p_owner_name), coalesce(btrim(p_phone), ''), nullif(btrim(p_email), ''), p_check_in,
      p_check_out, p_checkout_time, v_status, coalesce(p_total, 0), nullif(btrim(p_notes), ''), 'admin'
    ) returning id into v_id;
    if p_confirm and coalesce(p_deposit, 0) > 0 then
      insert into public.payments (reservation_id, kind, amount) values (v_id, 'deposit', p_deposit);
    end if;
  else
    update public.reservations set
      owner_name = btrim(p_owner_name), phone = coalesce(btrim(p_phone), ''),
      email = nullif(btrim(p_email), ''), check_in = p_check_in, check_out = p_check_out,
      checkout_time = p_checkout_time, total = coalesce(p_total, 0), notes = nullif(btrim(p_notes), '')
    where id = v_id;
    delete from public.reservation_dogs where reservation_id = v_id;
  end if;

  insert into public.reservation_dogs (reservation_id, dog_id)
  select v_id, d from unnest(p_dog_ids) as d group by d;
  return v_id;
end $$;

-- Confirmar una solicitud al recibir la seña. Vuelve a verificar el cupo.
create function public.admin_confirm_reservation(p_id uuid, p_deposit numeric default 0)
returns void language plpgsql volatile security definer set search_path = public as $$
declare
  r public.reservations;
  v_dogs integer;
  v_error text;
begin
  if not public.is_admin() then
    raise exception 'No autorizado.' using errcode = 'insufficient_privilege';
  end if;
  perform public.hotel_lock_capacity();
  select * into r from public.reservations where id = p_id for update;
  if not found then raise exception 'La reserva ya no existe.' using errcode = 'no_data_found'; end if;
  if r.status = 'confirmed' then
    raise exception 'La reserva ya está confirmada.' using errcode = 'check_violation';
  end if;
  select count(*) into v_dogs from public.reservation_dogs where reservation_id = p_id;
  v_error := public.hotel_availability_error(r.check_in, r.check_out, r.checkout_time, v_dogs, p_id);
  if v_error is not null then raise exception '%', v_error using errcode = 'check_violation'; end if;
  update public.reservations set status = 'confirmed' where id = p_id;
  if coalesce(p_deposit, 0) > 0 then
    insert into public.payments (reservation_id, kind, amount) values (p_id, 'deposit', p_deposit);
  end if;
end $$;

-- ---------------------------------------------------------- Quién puede ejecutar cada función
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.has_role(uuid, public.app_role) to authenticated, service_role;
grant execute on function public.is_admin() to authenticated, service_role;
grant execute on function public.public_availability(date, date) to anon, authenticated, service_role;
grant execute on function public.public_confirmed_stays(date, date) to anon, authenticated, service_role;
grant execute on function
  public.submit_booking_request(text, text, text, date, date, time, text, jsonb)
  to anon, authenticated, service_role;
grant execute on function
  public.admin_save_reservation(uuid, text, text, text, uuid[], date, date, time, text, numeric, boolean, numeric)
  to authenticated, service_role;
grant execute on function public.admin_confirm_reservation(uuid, numeric) to authenticated, service_role;

-- ===================================================================== Fotos de los perros
-- Carpeta pública "dog-photos" (máx. 2 MB por foto, solo JPG/PNG/WEBP). Las fotos se ven con
-- su enlace, pero nadie puede listar la carpeta. Los clientes solo pueden SUBIR fotos nuevas
-- dentro de "solicitudes/"; el administrador gestiona todo.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('dog-photos', 'dog-photos', true, 2097152, array['image/jpeg', 'image/png', 'image/webp']);

create policy "Clientes suben fotos de solicitudes" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'dog-photos' and (storage.foldername(name))[1] = 'solicitudes');
create policy "Admin ve fotos" on storage.objects
  for select to authenticated using (bucket_id = 'dog-photos' and public.is_admin());
create policy "Admin sube fotos" on storage.objects
  for insert to authenticated with check (bucket_id = 'dog-photos' and public.is_admin());
create policy "Admin cambia fotos" on storage.objects
  for update to authenticated
  using (bucket_id = 'dog-photos' and public.is_admin())
  with check (bucket_id = 'dog-photos' and public.is_admin());
create policy "Admin borra fotos" on storage.objects
  for delete to authenticated using (bucket_id = 'dog-photos' and public.is_admin());

commit;
