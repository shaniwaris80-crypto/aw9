# ARW2026 v2

Reconstrucción completa y limpia del sistema de gestión y facturación para Ruta Madrid y operaciones de fruta/verdura.

## Flujo central

**PEDIDO → PREPARACIÓN / COMPRA → CARGA → REPARTO REAL → PRECIOS DEL CLIENTE → REVISIÓN → FACTURA → ENVÍO → COBRO → HISTORIAL**

La cantidad pedida nunca se factura automáticamente: se factura lo realmente entregado.

## Facturación

- 10 líneas visibles por defecto.
- CAJA × KG, CAJA FIJA, KG, UD y MANOJO.
- Conversión automática: 2 cajas × 22 kg = 44 kg facturables.
- BRUTO, TARA y NETO.
- IVA individual 0/4/10/21 por línea.
- Precio general o precio personalizado por cliente.
- Historial de precios, precios bloqueados, simulación y cambios masivos.
- Transporte fijo/% y descuentos por línea/general.
- Vista previa antes de emitir.
- Comprobación pedido → entregado → facturado.
- Aviso de duplicados, margen bajo y venta bajo coste.
- Borradores sin consumir numeración.
- Numeración transaccional multi-dispositivo y múltiples series.
- Factura emitida bloqueada: correcciones mediante rectificativa/anulación.
- Rectificativas totales/parciales ligadas a la original.
- Anulación con motivo y trazabilidad.
- PDF profesional en MAYÚSCULAS, IVA por producto, desglose fiscal, IBAN, QR interno, saldo anterior opcional y copia interna con costes/margen.
- Estado pagada/parcial/pendiente/vencida/anulada.
- Factura semanal juntando varias entregas.
- ZIP de facturas del día, WhatsApp, email preparado y registro de comunicaciones.

## Pedidos / clientes

- Cliente 360º: datos fiscales, pagos, facturas, pedidos, IVA, comunicaciones, archivos, límite de crédito y clasificación A/B/C.
- Pedidos recurrentes y plantillas.
- Duplicar pedido.
- Clientes que faltan por pedir y “NO PIDE ESTA SEMANA”.
- Pegar pedido de WhatsApp con reconocimiento automático por nombre/código.
- Productos habituales, historial de precios y comparador entre clientes.
- Estado de cuenta PDF y WhatsApp de saldo.
- Deuda por antigüedad.

## Reparto / Ruta Madrid

- Pedido, preparado, cargado, entregado y facturado.
- Firma táctil, foto, incidencia, hora y GPS opcional.
- Cliente cerrado/no encontrado/rechazado/entrega parcial.
- Cobro durante la entrega.
- Rutas con paradas, zonas y enlaces de navegación.
- Hoja de carga y retorno esperado: cargado − entregado.
- Costes de combustible, peajes, personal y otros.
- Rentabilidad estimada de ruta.

## Stock / compras

- Físico, reservado y disponible.
- Cajas + kg visibles y valor a coste.
- Lotes, FIFO, antigüedad y stock envejecido.
- Mercancía en tránsito (compras pedidas no recibidas).
- Pedido proveedor → recepción real → lote → stock.
- Diferencia entre cantidad pedida y recibida.
- Transporte de compra imputado al coste.
- Coste actualizado e historial.
- Almacén, furgoneta, San Pablo, San Lesmes y Santiago.
- Traspasos, mermas, devoluciones, inventario físico y envases retornables.
- Comparador de proveedores por coste histórico.
- Escáner de código de barras cuando el navegador lo soporta.

## Finanzas

- Cobros totales/parciales y aplicación automática a facturas antiguas.
- Justificante PDF de cobro.
- Gastos, caja, bancos y varias cuentas.
- Arqueo de caja.
- Importación CSV bancaria y conciliación por importe.
- Previsión de cobros y deuda a proveedores.

## Reportes / control

- Mensual, trimestral y anual.
- IVA repercutido/soportado por tipo.
- Libro de ventas y compras en Excel.
- Rentabilidad por cliente/producto/ruta.
- Stock a Excel.
- Cierre mensual con control de numeración, IVA, cajas/kg, stock negativo y entregas sin facturar.
- Foto de stock al cierre y bloqueo del periodo.
- Centro de análisis: precios bajo margen, clientes que compran menos, inactivos, stock envejecido y oportunidades comerciales.

## Seguridad / Firebase

- Firebase Authentication Email/Password y Google opcional.
- Propietario: `shaniwaris80@gmail.com` / UID `o6rMhcEyUXUstmb7ptClXSv8ejQ2`.
- Firestore con caché persistente multi-pestaña: los cambios se encolan offline y sincronizan al recuperar conexión.
- Reglas por roles: owner/admin/manager/billing/warehouse/delivery.
- Permisos específicos de UI para costes, precios, anulación, rectificación, stock y cierres.
- Auditoría inmutable.
- PIN rápido local con hash.
- Firebase Storage para firma/fotos/adjuntos/backups si Storage está habilitado.

## PWA

- Instalable en iPhone/Android/PC.
- Navegación inferior móvil: INICIO · PEDIDOS · FACTURAR · STOCK · MÁS.
- Service worker con caché versionada.
- Email precargado y sesión persistente.

## Integraciones que requieren servicio externo

ARW2026 deja preparadas las opciones, pero no simula servicios inexistentes. El envío 100% automático de PDF adjunto por WhatsApp/email, push remoto, biometría centralizada y VeriFactu real requieren API/backend/proveedor específico y configuración legal/técnica adicional.

## Firebase Console

1. Authentication → Email/Password activado.
2. Authorized domains → `shaniwaris80-crypto.github.io`.
3. Firestore `(default)` creado.
4. Publicar `firestore.rules`.
5. Para archivos, activar Storage y publicar `storage.rules`.

## GitHub Pages

Publicación desde `main` `/`:

`https://shaniwaris80-crypto.github.io/aw9/`
