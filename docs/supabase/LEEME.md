# Supabase propio (plan gratuito) — guía de la Etapa 2

Todo lo de esta carpeta es para **tu** proyecto de Supabase. Lovable Cloud no se usa.

## Archivos
- `esquema.sql` — crea tablas, seguridad, reglas del hotel y la carpeta de fotos. Se pega una sola vez
  en Supabase → SQL Editor.
- `pruebas/` — pruebas automáticas del esquema en una base local descartable
  (`bash docs/supabase/pruebas/ejecutar.sh`). No se ejecutan en Supabase.

## Qué garantiza la base de datos (aunque alguien manipule el navegador)
- Máximo 6 perros por noche; solo las reservas **confirmadas** ocupan lugar.
- Salida después de las 13:00 suma la noche del día de salida.
- Fechas bloqueadas sin lugar; tarifa especial (× recargo) en las fechas de fiesta.
- El precio de las solicitudes públicas se calcula en la base con los ajustes guardados.
- El público solo ve: ajustes (tarifa, alias, condiciones), fechas bloqueadas, cantidad de perros por
  noche y nombre + foto de perros con reserva confirmada. Nunca dueños, teléfonos ni pagos.
- Solo usuarios con rol `admin` en `user_roles` ven y modifican reservas, perros, pagos y ajustes.
- Límites técnicos contra abusos en solicitudes públicas: ingreso hasta 2 años adelante, estadías de
  hasta 365 noches, fotos de hasta 2 MB (JPG, PNG o WEBP).

## Claves: cuáles se pueden compartir
- **Project URL** (`https://xxxx.supabase.co`) y **Publishable key** (`sb_publishable_...`): públicas,
  van en la app y en Cloudflare como `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`.
- **Secret key / service_role** y **contraseña de la base de datos**: nunca se comparten ni se pegan
  en el chat ni en el código. La app no las necesita.

## Crear el primer administrador (después de pegar esquema.sql)
1. Authentication → Users → Add user → Create new user. Email + contraseña, marcar *Auto Confirm User*.
2. SQL Editor → New query:
   ```sql
   insert into public.user_roles (user_id, role)
   select id, 'admin' from auth.users where email = 'TU_EMAIL_AQUI';
   ```
3. Authentication → Sign In / Providers → desactivar *Allow new users to sign up*
   (así nadie más puede crearse una cuenta).

## Límites del plan gratuito
- 500 MB de base de datos y 1 GB de fotos (las fotos se achican antes de subirse).
- El proyecto se **pausa tras 7 días sin actividad**; se reactiva desde el panel de Supabase con
  "Restore". Con clientes reservando normalmente no ocurre.

## Verificar que tu usuario es administrador

Ejecuta en el SQL Editor:

```sql
select u.email, r.role
from auth.users u
join public.user_roles r on r.user_id = u.id;
```

Debe aparecer una fila con tu correo y `admin`. Si no aparece ninguna fila, ejecuta el `insert` de la sección anterior con tu correo.
