# Hotel Canino — hoja de ruta (hosting propio, costo $0)

- [x] Etapa 0: revisar que el proyecto pueda exportarse a GitHub e inventariar lo que vive en el navegador
- [x] Etapa 1: conectar GitHub y verificar el repositorio
- [ ] Etapa 2: crear proyecto propio de Supabase Free y preparar la app para usarlo
  - [x] Script de base de datos con reglas y seguridad, probado (docs/supabase/esquema.sql)
  - [x] Script ejecutado en Supabase del usuario ("Success. No rows returned")
  - [x] Usuario: registro público desactivado, URL + publishable key recibidas (proyecto qochzsyyybnynbysfjye)
  - [x] Conexión verificada: funciones públicas responden, tablas privadas ocultas al público
  - [x] Usuario: rol admin asignado y verificado (mmnavarrolopez@gmail.com → admin)
- [ ] Etapa 3: migrar datos del navegador a Supabase (perros, fotos, reservas, pagos, fechas bloqueadas, ajustes, acceso admin)
  - [x] App conectada: lecturas públicas, solicitudes, panel admin, fotos y acceso con contraseña usan Supabase
  - [x] Botón para pasar datos de prueba del navegador (Ajustes), sin borrar la copia local
  - [x] Verificado: lecturas públicas OK, login rechaza claves incorrectas, funciones admin bloqueadas al público
  - [ ] Usuario: entrar al panel, hacer una solicitud de prueba con foto, confirmarla y cancelarla — espera al usuario
- [ ] Etapa 4: compilar y configurar Cloudflare (sin publicar) — espera Etapa 3
- [ ] Etapa 5: publicar — solo cuando el usuario lo autorice
