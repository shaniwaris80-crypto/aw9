# ARW2026

Sistema integral nuevo para pedidos, preparación/compra, Ruta Madrid, reparto real, facturación, cobros, clientes, stock, compras, proveedores, almacenes/tiendas, documentos, gastos, caja, bancos, IVA, cierres, análisis, usuarios y auditoría.

## Flujo principal

**PEDIDO → PREPARACIÓN / COMPRA → CARGA → REPARTO REAL → PRECIO DEL CLIENTE → REVISIÓN → FACTURA PDF → COBRO → HISTORIAL**

La cantidad pedida no se factura automáticamente: se factura la cantidad realmente entregada.

## Facturación profesional

- 10 líneas visibles por defecto.
- Modos: CAJA × KG, CAJA FIJA, KG, UD y MANOJO.
- Conversión caja→kg usando KG/CAJA.
- BRUTO, TARA y NETO.
- IVA individual 0/4/10/21 por línea.
- Precio específico por cliente o precio general.
- Transporte fijo o porcentual, descuentos y pagos parciales.
- Borradores sin consumir numeración definitiva.
- Numeración protegida frente a emisión simultánea en varios dispositivos.
- PDF profesional en mayúsculas con CÓDIGO, PRODUCTO, MODO, CANTIDAD, KG/CAJA, BRUTO, TARA, NETO, PRECIO, IVA e IMPORTE.
- Pagada, pendiente, parcial, vencida, anulada y rectificativa.
- Anulación con motivo, auditoría y reversión opcional de stock/cobro.
- Rectificativas parciales vinculadas a factura original; base/IVA/total negativos.
- Selección de borradores y cambio masivo de precios.
- ZIP de facturas del día y preparación para WhatsApp.

## Clientes

- Ficha 360º.
- Datos fiscales, teléfono/WhatsApp, forma de pago y límite de crédito.
- Precios personalizados por producto.
- Histórico de facturas, IVA, pedidos y saldos.
- Estado de cuenta PDF y WhatsApp de saldo.
- Cobros totales/parciales y aplicación a facturas antiguas.
- Antigüedad de deuda y alertas de crédito.

## Pedidos / Ruta Madrid

- Pedido, preparado y entregado por línea.
- Lista de compra automática: pedidos + stock mínimo − stock físico.
- Hoja de carga.
- Ruta con pedidos/clientes asignados.
- Costes de combustible, peajes, personal y otros.
- Ventas, coste de mercancía y beneficio estimado por ruta.
- Cierre de ruta y control de pedidos sin terminar.

## Stock / compras

- Stock físico, reservado y disponible.
- Cajas + kg visibles.
- Valor a coste y venta potencial.
- Almacén, furgoneta, San Pablo, San Lesmes y Santiago.
- Compras con entrada automática de stock.
- Coste actualizado e histórico de compras.
- Traspasos, mermas, devoluciones e inventario físico.
- Control de envases/cajas por cliente.
- Pagos y saldo de proveedores.

## Documentos

- Presupuestos.
- Proformas.
- Albaranes con/sin precios.
- Conversión directa a factura sin reescribir líneas.
- Facturas rectificativas ligadas a la original.

## Finanzas / análisis

- Gastos, caja y bancos.
- Importación CSV bancaria.
- Sugerencias de conciliación por importe y aplicación a factura.
- Previsión de cobros 30 días y deuda de proveedores.
- Producto 360º: stock, ventas, compras, coste, beneficio y margen estimado.
- Clientes que reducen compras.
- Precios especiales bajo coste.
- Deuda por antigüedad.

## Reportes / cierre

- Mensual, trimestral y anual.
- IVA por tipo.
- Exportación de facturas a Excel.
- Rectificativas con signo negativo en base e IVA.
- Revisión de duplicados, saltos de numeración, IVA, caja×kg, stock negativo y entregas sin facturar.
- Fotografía de stock al cierre.
- Bloqueo de periodos cerrados.

## Seguridad / Firebase

Proyecto Firebase: `aw999-71828`.

Datos de ARW2026 aislados en `companies/arw2026`.

Propietario inicial:
- `shaniwaris80@gmail.com`
- UID `o6rMhcEyUXUstmb7ptClXSv8ejQ2`

La contraseña NO se guarda en el repositorio.

### Obligatorio en Firebase Console

1. Authentication → Email/Password activado.
2. Authorized domains → `shaniwaris80-crypto.github.io`.
3. Firestore `(default)` creado.
4. Publicar el contenido de `firestore.rules`.
5. Si se usa Storage, publicar `storage.rules`.

Roles: owner, admin, manager, billing, warehouse y delivery. Auditoría no se puede borrar/modificar desde las reglas normales.

## PWA / móvil

- Instalable como PWA.
- Caché de aplicación.
- Navegación móvil inferior: INICIO · PEDIDOS · FACTURAR · STOCK · MÁS.
- Email de acceso precargado y sesión persistente.

## Integraciones externas

La descarga ZIP/PDF, enlaces WhatsApp y generación local de documentos funcionan en navegador. El envío totalmente automático de archivos adjuntos por WhatsApp o email, biometría centralizada y VeriFactu requieren API/servicio externo o backend específico; no se simulan como si estuvieran conectados.

## GitHub Pages

Publicación desde `main` y `/`:

`https://shaniwaris80-crypto.github.io/aw9/`
