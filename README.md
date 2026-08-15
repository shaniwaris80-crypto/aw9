# FACTUMADRID AW9

Nueva versión integral de FACTUMADRID para facturación, clientes, cobros, stock, compras, proveedores, pedidos/rutas, tiendas, mermas, gastos, documentos e informes.

## Firebase

Proyecto: `aw999-71828`

Propietario inicial:
- Email: `shaniwaris80@gmail.com`
- UID: `o6rMhcEyUXUstmb7ptClXSv8ejQ2`

La contraseña NO se guarda en el repositorio.

### Configuración necesaria en Firebase Console

1. Authentication > Sign-in method > Email/Password: activado.
2. Authentication > Settings > Authorized domains: añadir `shaniwaris80-crypto.github.io` cuando se publique en GitHub Pages.
3. Firestore Database: crear base `(default)` en modo producción.
4. Firestore > Rules: pegar y publicar `firestore.rules`.
5. Storage (opcional): si está habilitado, publicar `storage.rules`.

## Módulos incluidos

- Login Firebase con email precargado y sesión persistente.
- Dashboard: ventas, cobrado, pendiente, vencido, stock y beneficio.
- Facturas: borrador, emitir, editar, PDF, WhatsApp, anulaciones, rectificativas, cobros y adjuntos.
- Selección y cambio masivo de precios en borradores.
- Clientes 360º: histórico, IVA, facturación, cobrado, pendiente, productos y precios especiales.
- Cobros: parcial, total, a cuenta, vencidos y reversión automática al anular una factura cobrada.
- Stock: cajas + kg/unidades, valor a coste, venta potencial, reservado, disponible real y ubicaciones.
- Lista de compra automática según pedidos + stock mínimo - stock físico.
- Compras: proveedor, IVA soportado, entrada automática de stock, coste actualizado y adjuntos.
- Productos: códigos, kg/caja, coste, venta, IVA, margen y stock mínimo.
- Proveedores: compras, saldo y pagos.
- Presupuestos, proformas y albaranes con PDF y conversión a factura.
- Pedidos: estados, pegar pedidos por códigos de producto, convertir entrega en factura.
- Rutas: hoja de carga PDF, reparto PDF y cierre de ruta.
- Tiendas: San Pablo, San Lesmes y Santiago; traslados y stock por ubicación.
- Mermas, devoluciones e inventario físico.
- Gastos, caja y movimientos bancarios.
- Reportes mensuales, trimestrales y anuales; IVA 4/10/21, libros de facturas y compras, PDF y Excel.
- Cierres mensuales con bloqueo del periodo y fotografía de stock.
- Usuarios y roles: owner, admin, manager, billing, warehouse, delivery.
- Auditoría de cambios.
- Backup JSON / restauración.
- PWA instalable y caché local de respaldo.
- Firebase Storage opcional para fotos, PDF y justificantes.

## Publicación

El repositorio está preparado para GitHub Pages desde la rama `main` y carpeta `/ (root)`.

URL esperada una vez activado Pages:
`https://shaniwaris80-crypto.github.io/aw9/`
