# ARW2026 v4

Sistema operativo de facturación, pedidos, reparto, clientes, precios, stock, compras, cobros y reportes para la ruta y negocios asociados.

## Flujo principal
PEDIDO → PREPARACIÓN / COMPRA → ENTREGA REAL → REVISIÓN → FACTURA → COBRO → HISTORIAL

## Principios de v4
- Firestore es la fuente de verdad multidispositivo.
- Las facturas emitidas y la numeración no se reinician al recargar el catálogo.
- Los reinicios semanales son cortes operativos: no borran historial fiscal.
- El stock se corrige mediante movimientos y por ubicación.
- Las operaciones críticas usan validación central y transacciones Firestore.
- Los PDFs emitidos usan snapshot del emisor para no cambiar al modificar datos futuros.

## Caja × kg
`caja_kg` multiplica automáticamente `cajas × kgPerBox`. Ejemplo: MACHO MADURO, 2 cajas × 22 kg = 44 kg. Las cajas deben ser enteras. `caja_fija` factura por caja; `kg`, `ud` y `manojo` por su unidad.

## Facturación
- Precio 0 bloqueado y kg/caja obligatorio cuando corresponde.
- Transporte fijo o porcentual recalcula base, IVA y total en tiempo real.
- Recargo de equivalencia por cliente y por tipo de IVA.
- Emisión transaccional: número + factura + stock + pedido + cobro.
- Emisión masiva de ruta pasa por el mismo validador que una factura manual.
- Anulación con trazabilidad, reversión de cobro y devolución opcional de stock.
- Rectificativas de precio y cantidad, con devolución física opcional.
- ZIP del día y marcado manual de factura enviada.
- Último precio real del cliente como ayuda cuando no existe tarifa especial.

## Stock
- Stock total y por ALMACÉN, FURGONETA, SAN PABLO, SAN LESMES y SANTIAGO.
- Visualización en cajas + kg cuando procede.
- Reset total por cada ubicación conservando todo el histórico.
- Ajustes, traspasos, mermas, devoluciones e inventario físico.
- Producto 360º con movimientos y ventas netas, descontando rectificativas.

## Compras
- Importador `ARW2026_COMPRA_V1` y texto libre.
- Reconoce `PRECIO_TIPO=KG|CAJA|UD|MANOJO`.
- `IVA=DESCONOCIDO` obliga a revisar antes de guardar.
- Productos ambiguos requieren código exacto.
- Compra + stock + coste + historial se guardan en una transacción.
- Los portes se distribuyen para obtener coste efectivo de mercancía.
- Detección de factura de proveedor duplicada.

## Periodos, clientes y cobros
- El corte semanal usa fecha y hora exactas.
- Inicio, facturas, clientes y cobros utilizan el mismo periodo operativo.
- El histórico completo sigue accesible.
- Cliente 360º: deuda actual/histórica, facturas, cobros, pedidos, productos habituales y precios especiales.
- Estado de cuenta PDF con facturas y movimientos de cobro.

## Administración
- Reportes por mes, trimestre y año.
- Libro de ventas y compras en Excel.
- Cierre mensual con controles previos y bloqueo de nuevas emisiones/compras del mes cerrado.
- Roles: owner, admin, manager, billing, warehouse y delivery.
- Caja/bancos, envases retornables, usuarios/roles y backup JSON.
- La restauración automática protege facturas, cobros, series, cierres, auditoría y miembros.

## Datos maestros
El catálogo y la cartera inicial están en `js/data.js` con IDs estables. La carga maestra completa estructura y datos faltantes, pero v4 no reinicia la serie ni pisa precios, costes o IVA editados posteriormente.

## Firebase
Datos bajo `companies/arw2026`. Deben publicarse manualmente `firestore.rules` y, si se usa Storage, `storage.rules` en el proyecto `aw999-71828`. También debe estar autorizado `shaniwaris80-crypto.github.io` en Firebase Authentication.

## Validación automática
GitHub Actions comprueba sintaxis, imports y pruebas de dominio: caja × kg, transporte 10/15%, IVA, recargo, precio cero, cajas fraccionadas, stock por ubicación, fecha local, importador, ambigüedad de productos, coste con portes y corte operativo por timestamp. Además verifica invariantes estáticas como numeración protegida y validación central de emisión.
