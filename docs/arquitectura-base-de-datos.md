# Hotel Canino — arquitectura prevista para la base de datos

Base de datos: proyecto **propio** de Supabase (plan gratuito), sin Lovable Cloud.
El esquema listo para pegar está en `docs/supabase/esquema.sql` (guía en `docs/supabase/LEEME.md`).

Estado actual: modo demostración. Los datos viven en el navegador (`src/lib/hotel/store.ts`)
y la app arranca vacía. Las reglas de negocio están en `src/lib/hotel/rules.ts` (funciones puras,
cubiertas por `src/test/hotel-rules.test.ts`) para reutilizarlas en el servidor.

## Tablas

| Tabla | Campos principales |
|---|---|
| `dogs` | id, name, breed, owner_name, notes, photo_path, created_at |
| `reservations` | id, owner_name, phone, email, check_in (date), check_out (date), checkout_time (time), status (`pending`/`confirmed`/`cancelled`), total, notes, source, created_at |
| `reservation_dogs` | reservation_id, dog_id |
| `payments` | id, reservation_id, kind (`deposit`/`balance`), amount, paid_on, note |
| `blocked_dates` | date (pk), reason |
| `settings` | fila única: nightly_rate, special_multiplier, special_dates (text[] "MM-DD"), bank_alias, bank_holder, bank_name, conditions (text[]) |
| `user_roles` | user_id, role (`admin`) — roles en tabla aparte, nunca en el perfil |

Fotos: bucket de almacenamiento `dog-photos`.

## Acceso

- Público (sin sesión): leer `settings`, `blocked_dates`, ocupación por noche (vista/función que
  solo cuenta reservas confirmadas) y nombre + foto de perros con reserva **confirmada**.
- Público: crear solicitudes `pending` con la función SQL `submit_booking_request` (no inserción directa).
  Lecturas públicas con `public_availability` y `public_confirmed_stays`.
- Administrador: todo lo demás, verificado con `has_role(auth.uid(), 'admin')`. Crear/editar reservas
  con `admin_save_reservation` y confirmar con `admin_confirm_reservation`.

## Validación en servidor

Toda creación, confirmación o modificación de reservas confirmadas pasa por una función SQL
que, dentro de una transacción con bloqueo, repite la lógica de `checkAvailability`
(`hotel_availability_error`), y un disparador diferido rechaza cualquier noche con más de 6 perros:
máximo 6 perros por noche, solo reservas confirmadas ocupan lugar, fechas bloqueadas no
disponibles, salida después de las 13:00 suma la noche del día de salida.
