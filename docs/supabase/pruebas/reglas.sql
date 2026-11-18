-- Pruebas de las reglas del negocio y de la seguridad de esquema.sql.
\set ON_ERROR_STOP 1
create function pg_temp.expect_error(sql text, needle text) returns void language plpgsql as $$
begin
  begin execute sql; exception when others then
    if position(needle in sqlerrm) = 0 then raise exception 'FAIL wrong error for %: %', sql, sqlerrm; end if;
    raise notice 'OK error: %', sqlerrm; return;
  end;
  raise exception 'FAIL expected error "%" but succeeded: %', needle, sql;
end $$;
-- Igual que expect_error, pero verificando las reglas diferidas en el acto (no al final).
create function pg_temp.expect_error_now(sql text, needle text) returns void language plpgsql as $$
begin
  begin set constraints all immediate; execute sql; exception when others then
    if position(needle in sqlerrm) = 0 then raise exception 'FAIL wrong error for %: %', sql, sqlerrm; end if;
    raise notice 'OK error: %', sqlerrm; return;
  end;
  raise exception 'FAIL expected error "%" but succeeded: %', needle, sql;
end $$;
create function pg_temp.check(cond boolean, label text) returns void language plpgsql as $$
begin if cond is not true then raise exception 'FAIL: %', label; end if; raise notice 'PASS: %', label; end $$;
grant execute on all functions in schema pg_temp to public;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'admin@x'), ('00000000-0000-0000-0000-00000000000b', 'user@x');
insert into public.user_roles (user_id, role) values ('00000000-0000-0000-0000-00000000000a', 'admin');
update public.settings set nightly_rate = 1000;
insert into public.blocked_dates values (current_date + 40, 'vacaciones');
create table pg_temp.ids (k text primary key, id uuid);
grant all on pg_temp.ids to public;

-- ------------------------------------------------------------------ Visitante sin sesión
set role anon;
select pg_temp.expect_error('select * from public.reservations', 'permission denied');
select pg_temp.expect_error('select * from public.dogs', 'permission denied');
select pg_temp.expect_error('select * from public.payments', 'permission denied');
select pg_temp.expect_error('update public.settings set nightly_rate = 1', 'permission denied');
select pg_temp.check((select nightly_rate from public.settings) = 1000, 'visitante lee ajustes');
select pg_temp.expect_error($q$select public.admin_confirm_reservation(gen_random_uuid(), 0)$q$, 'permission denied');
select pg_temp.expect_error($q$select public.hotel_occupancy(current_date, current_date)$q$, 'permission denied');

insert into pg_temp.ids select 'ana', (r->>'id')::uuid from (select public.submit_booking_request(
  'Ana', '111', null, current_date + 10, current_date + 12, '14:00', null,
  '[{"name":"Toby","photo_path":"solicitudes/a.jpg"},{"name":"Luna"}]') r) s;
select pg_temp.check((select sum(dogs) from public.public_availability(current_date + 10, current_date + 12)) = 0, 'solicitud pendiente no ocupa lugar');
select pg_temp.check((select count(*) from public.public_confirmed_stays(current_date, current_date + 60)) = 0, 'perros pendientes no son públicos');
select pg_temp.check((public.submit_booking_request('Eva', '1', null, '2026-12-23', '2026-12-25', '13:00', null, '[{"name":"A"}]') ->> 'total')::numeric = 3000, 'tarifa doble el 24/12; salida 13:00 no suma noche');
select pg_temp.expect_error($q$select public.submit_booking_request('X','1',null,current_date+5,current_date+6,'12:00',null,'[{"name":"1"},{"name":"2"},{"name":"3"},{"name":"4"},{"name":"5"},{"name":"6"},{"name":"7"}]')$q$, 'más de 6');
select pg_temp.expect_error($q$select public.submit_booking_request('X','1',null,current_date-3,current_date+1,'12:00',null,'[{"name":"1"}]')$q$, 'anterior a hoy');
select pg_temp.expect_error($q$select public.submit_booking_request('X','1',null,current_date+39,current_date+41,'12:00',null,'[{"name":"1"}]')$q$, 'no están disponibles');
select pg_temp.expect_error($q$select public.submit_booking_request('X','1',null,current_date+5,current_date+6,'12:00',null,'[{"name":"1","photo_path":"perros/x.jpg"}]')$q$, 'Foto inválida');
select pg_temp.expect_error($q$select public.submit_booking_request('X','',null,current_date+5,current_date+6,'12:00',null,'[{"name":"1"}]')$q$, 'teléfono');
insert into storage.objects (bucket_id, name) values ('dog-photos', 'solicitudes/abc.jpg');
select pg_temp.expect_error($q$insert into storage.objects (bucket_id, name) values ('dog-photos', 'perros/abc.jpg')$q$, 'row-level security');
select pg_temp.check((select count(*) from storage.objects) = 0, 'visitante no puede listar fotos');
reset role;
select pg_temp.check((select total from public.reservations where id = (select id from pg_temp.ids where k = 'ana')) = 6000, 'salida 14:00 suma noche: 3 noches x 2 perros x 1000');

-- ----------------------------------------------------------- Usuario con sesión, sin rol admin
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
select pg_temp.check((select count(*) from public.reservations) = 0, 'no-admin no ve reservas');
select pg_temp.check((select count(*) from public.dogs) = 0, 'no-admin no ve perros');
select pg_temp.expect_error($q$select public.admin_confirm_reservation(gen_random_uuid(), 0)$q$, 'No autorizado');
select pg_temp.expect_error($q$insert into public.user_roles (user_id, role) values ('00000000-0000-0000-0000-00000000000b', 'admin')$q$, 'permission denied');
select pg_temp.expect_error($q$insert into public.blocked_dates values (current_date + 2)$q$, 'row-level security');
reset role;

-- --------------------------------------------------------------------------- Administrador
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
select pg_temp.check((select count(*) from public.reservations) = 2, 'admin ve solicitudes');
select public.admin_confirm_reservation((select id from pg_temp.ids where k = 'ana'), 3000);
select pg_temp.check((select status from public.reservations where id = (select id from pg_temp.ids where k = 'ana')) = 'confirmed', 'admin confirma');
select pg_temp.check((select amount from public.payments) = 3000, 'seña registrada');
select pg_temp.check((select array_agg(dogs order by night) from public.public_availability(current_date + 10, current_date + 13)) = array[2, 2, 2, 0], 'ocupación incluye la noche extra por salida tardía');
select pg_temp.expect_error($q$select public.admin_confirm_reservation((select id from pg_temp.ids where k = 'ana'), 0)$q$, 'ya está confirmada');
insert into public.dogs (name) values ('d1'), ('d2'), ('d3'), ('d4'), ('d5');
select public.admin_save_reservation(null, 'Beto', '', null,
  (select array_agg(id) from public.dogs where name in ('d1', 'd2', 'd3', 'd4')),
  current_date + 10, current_date + 12, '13:00', null, 0, true, 0);
select pg_temp.check((select max(dogs) from public.public_availability(current_date + 10, current_date + 12)) = 6, 'cupo completo con 6');
select pg_temp.expect_error($q$select public.admin_save_reservation(null, 'C', '', null, array[(select id from public.dogs where name = 'd5')], current_date + 11, current_date + 12, '13:00', null, 0, true, 0)$q$, 'No quedan lugares');
select public.admin_save_reservation(null, 'C', '', null, array[(select id from public.dogs where name = 'd5')],
  current_date + 11, current_date + 12, '13:00', null, 0, false, 0);
select pg_temp.check(true, 'admin puede guardar pendiente aunque esté lleno');
select pg_temp.check((select dogs from public.public_availability(current_date + 12, current_date + 12)) = 2, 'salida 13:00 libera el día de salida');
select pg_temp.expect_error_now($q$update public.reservations set status = 'confirmed' where owner_name = 'C'$q$, 'máximo de 6');
select pg_temp.expect_error($q$delete from public.dogs where name = 'd1'$q$, 'reservas activas');
update public.reservations set status = 'cancelled' where owner_name = 'Beto';
delete from public.dogs where name = 'd1';
select pg_temp.check((select count(*) from public.dogs where name = 'd1') = 0, 'perro se puede borrar tras cancelar');
select public.admin_save_reservation((select id from pg_temp.ids where k = 'ana'), 'Ana', '111', null,
  (select array_agg(dog_id) from public.reservation_dogs where reservation_id = (select id from pg_temp.ids where k = 'ana')),
  current_date + 10, current_date + 13, '14:00', null, 8000, false, 0);
select pg_temp.check((select check_out from public.reservations where owner_name = 'Ana') = current_date + 13, 'editar confirmada vuelve a verificar cupo sin contarse a sí misma');
insert into public.blocked_dates values (current_date + 2, 'x');
insert into storage.objects (bucket_id, name) values ('dog-photos', 'perros/admin.jpg');
select pg_temp.check((select count(*) from storage.objects) = 2, 'admin ve y sube fotos');
reset role;

-- ------------------------------------------------------- Visitante con el hotel ya ocupado
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
select public.admin_save_reservation(null, 'Dani', '', null,
  (select array_agg(id) from public.dogs where name in ('d2', 'd3', 'd4', 'd5')),
  current_date + 11, current_date + 12, '13:00', null, 0, true, 0);
reset role;
set role anon;
select pg_temp.expect_error($q$select public.submit_booking_request('X','1',null,current_date+11,current_date+12,'12:00',null,'[{"name":"1"}]')$q$, 'No quedan lugares');
select pg_temp.expect_error($q$select public.submit_booking_request('X','1',null,current_date+12,current_date+13,'12:00',null,'[{"name":"1"},{"name":"2"},{"name":"3"},{"name":"4"},{"name":"5"}]')$q$, 'Solo quedan 4');
select pg_temp.check((select count(*) from public.public_confirmed_stays(current_date, current_date + 60)) = 6, 'perros confirmados visibles (solo nombre y foto)');
reset role;
