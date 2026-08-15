# AW9 · FACTUMADRID

Nueva generación de FACTUMADRID, separada del repositorio antiguo.

## Primera versión funcional
- Login profesional con email `shaniwaris80@gmail.com` precargado.
- Recordar sesión con Firebase Authentication.
- Modo local de emergencia.
- Facturas con estados: borrador, emitida, pendiente, parcial, pagada, vencida y anulada.
- Solo los borradores se pueden borrar.
- Selección de facturas y subida masiva de precios sobre borradores.
- Ficha de cliente con historial completo, base, IVA, cobrado y pendiente.
- Stock visual: cajas completas + kg sueltos cuando corresponde.
- Valor de stock a coste, venta potencial y beneficio potencial.
- Reportes mensuales y trimestrales con listado de facturas e IVA.
- Backup JSON.
- Preparado para Firebase Realtime Database nuevo.

## Configurar Firebase nuevo
1. Crear un proyecto nuevo en Firebase.
2. Añadir una aplicación Web.
3. Activar Authentication > Email/Password.
4. Crear el usuario `shaniwaris80@gmail.com`.
5. Crear Realtime Database.
6. Copiar la configuración de Firebase Web dentro de `firebase-config.js`.
7. Publicar las reglas de `firebase.rules.json`.

La contraseña del usuario nunca se guarda en GitHub.

## Ruta de datos
`companies/aw9/state`

## Seguridad inicial
Las reglas de Realtime Database permiten acceso solo al usuario autenticado cuyo email sea `shaniwaris80@gmail.com`.

Más adelante se puede ampliar a varios usuarios y roles.
