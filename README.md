# ARW2026 PRO v7

Sistema operativo de facturación, pedidos, reparto, clientes, precios, stock, compras, cobros y análisis financiero para la ruta y negocios asociados.

## Flujo principal
PEDIDO → PREPARACIÓN / COMPRA → ENTREGA REAL → REVISIÓN → FACTURA → COBRO → HISTORIAL → ANÁLISIS FINANCIERO

## Principios
- Firestore es la fuente de verdad multidispositivo.
- Las facturas emitidas y la numeración no se reinician al recargar el catálogo.
- Los reinicios semanales son cortes operativos: no borran historial fiscal.
- El stock se corrige mediante movimientos y por ubicación.
- El reset total lleva a cero tanto stock positivo como negativo, incluso cuando dos ubicaciones se compensan entre sí.
- Las operaciones críticas usan validación central y transacciones Firestore.
- Los PDFs emitidos usan snapshot del emisor para no cambiar al modificar datos futuros.
- Las líneas de factura nuevas congelan el coste de compra del producto para conservar el margen histórico.

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

## Centro financiero
Disponible en el menú como `CENTRO FINANCIERO` y filtrable por periodo operativo, mes, trimestre, año o histórico completo.

### Fórmulas
- VENTA MERCANCÍA = base de los productos después de descuentos, sin IVA ni recargo.
- TRANSPORTE COBRADO = transporte repercutido en facturas, sin IVA.
- COSTE VENDIDO = cantidad realmente facturada × coste unitario histórico/congelado.
- MARGEN MERCANCÍA = venta mercancía − coste vendido.
- BENEFICIO BRUTO = margen mercancía + transporte cobrado.
- BENEFICIO OPERATIVO = beneficio bruto − gastos registrados.
- IVA y recargo de equivalencia nunca se consideran beneficio.

### Análisis incluidos
- Por factura: mercancía, transporte, coste vendido, margen, beneficio, margen %, total, deuda y calidad del coste.
- Por producto: comprado, gasto de compra, vendido neto, ingresos, transporte imputado, coste vendido, beneficio, margen, stock, valor y venta potencial.
- Por cliente: facturas, mercancía, transporte, coste vendido, beneficio, margen, total facturado, pendiente y ticket medio.
- Stock: valor actual a coste, venta potencial a precios generales actuales y margen potencial.
- Compras: base sin IVA y desembolso total con IVA.

### Calidad de costes
1. `COSTE CONGELADO`: coste guardado en la propia línea al crear/emitir la factura.
2. `COSTE HISTÓRICO`: coste recuperado del historial de compras anterior a la factura.
3. `COSTE ESTIMADO`: solo cuando no existe información histórica; usa el coste actual y se marca claramente como estimación.

## Stock
- Stock total y por ALMACÉN, FURGONETA, SAN PABLO, SAN LESMES y SANTIAGO.
- Visualización en cajas + kg cuando procede.
- Reset total por cada ubicación conservando todo el histórico.
- El reset incluye negativos: `-5` genera `+5`; `+5` genera `-5`.
- Un producto con `ALMACÉN -5` y `FURGONETA +5` ya no se considera “0” hasta que ambas ubicaciones estén realmente a cero.
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
- Exportación del análisis financiero a Excel.
- Cierre mensual con controles previos y bloqueo de nuevas emisiones/compras del mes cerrado.
- Roles: owner, admin, manager, billing, warehouse y delivery.
- Caja/bancos, envases retornables, usuarios/roles y backup JSON.
- La restauración automática protege facturas, cobros, series, cierres, auditoría y miembros.

## Datos maestros
El catálogo y la cartera inicial están en `js/data.js` con IDs estables. La carga maestra completa estructura y datos faltantes, pero no reinicia la serie ni pisa precios, costes o IVA editados posteriormente.

## Firebase
Datos bajo `companies/arw2026`. Deben publicarse manualmente `firestore.rules` y, si se usa Storage, `storage.rules` en el proyecto Firebase. También debe estar autorizado el dominio de GitHub Pages en Firebase Authentication.

## Validación automática
GitHub Actions comprueba sintaxis, imports, pruebas de dominio y pruebas financieras. Entre otras invariantes: caja × kg, transporte 10/15%, IVA, recargo, precio cero, cajas fraccionadas, stock por ubicación, fecha local, importador, coste con portes, corte operativo, beneficio por factura, coste histórico y reset de stock negativo aunque el total global del producto sea cero.


## Auditoría v6
- Diagnóstico de integridad en tiempo real desde AUDITORÍA.
- Permisos centralizados y alineados con Firestore.
- Facturas emitidas bloqueadas; borradores editables.
- Coste congelado al emitir cualquier factura.
- Operaciones de stock atómicas.
- Cierre mensual con stock y coste a fecha de cierre.
- Ubicación de salida de stock configurable.
- Pruebas automáticas de dominio, finanzas, permisos, salud e invariantes.


## ARW2026 PRO v7
- Rama estable V6 protegida antes de iniciar V7.
- Monitor de sincronización, caché, errores y pendientes.
- Reglas Firestore reforzadas: cobros, movimientos de stock y registros fiscales inmutables.
- Centro VERI*FACTU con huella SHA-256, encadenamiento, QR tributario y registros locales.
- La remisión real a AEAT solo se habilita mediante backend seguro con certificado; nunca se almacena el certificado en el navegador.
- PWA mejorada con recursos críticos y librerías externas cacheables tras la primera carga.
- Pruebas de dominio, finanzas, auditoría, VERI*FACTU, reglas Firestore y navegador.
