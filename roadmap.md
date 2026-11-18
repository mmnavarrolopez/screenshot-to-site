# Hotel Canino — hoja de ruta (hosting propio, costo $0)

- [x] Etapa 0: revisar que el proyecto pueda exportarse a GitHub e inventariar lo que vive en el navegador
- [x] Etapa 1: conectar GitHub y verificar el repositorio
- [ ] Etapa 2: crear proyecto propio de Supabase Free y preparar la app para usarlo
  - [x] Script de base de datos con reglas y seguridad, probado (docs/supabase/esquema.sql)
  - [x] Script ejecutado en Supabase del usuario ("Success. No rows returned")
  - [ ] Usuario: crear usuario admin, desactivar registro público, enviar URL + publishable key — espera al usuario
  - [ ] Verificar conexión con su proyecto
- [ ] Etapa 3: migrar datos del navegador a Supabase (perros, fotos, reservas, pagos, fechas bloqueadas, ajustes, acceso admin) — espera Etapa 2
- [ ] Etapa 4: compilar y configurar Cloudflare (sin publicar) — espera Etapa 3
- [ ] Etapa 5: publicar — solo cuando el usuario lo autorice
