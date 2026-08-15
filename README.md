# ARW2026

Sistema integral nuevo de FACTUMADRID/ARW para pedidos, preparación, reparto real, facturación, cobros, clientes, stock, compras, proveedores, almacenes/tiendas, documentos, gastos, caja, bancos, reportes, IVA, cierres, usuarios y auditoría.

## Flujo principal
PEDIDO → PREPARACIÓN/COMPRA → REPARTO REAL → PRECIO CLIENTE → REVISIÓN → FACTURA PDF → COBRO → HISTORIAL.

## Facturación
- 10 líneas por defecto.
- Modos: CAJA × KG, CAJA FIJA, KG, UD, MANOJO.
- Conversión automática caja→kg usando KG/CAJA.
- Bruto, tara y neto.
- IVA individual 0/4/10/21 por producto y desglose por tipo.
- Precio específico por cliente o precio general.
- Transporte fijo o porcentual, descuento y pagos parciales.
- Borrador, emisión, PDF profesional en mayúsculas, anulada conservada, rectificativas.
- Envío del día, ZIP masivo y WhatsApp.

## Firebase
Proyecto `aw999-71828`, datos aislados en `companies/arw2026`.
Publicar `firestore.rules`. Storage es opcional y requiere publicar `storage.rules` si se usa.

## Publicación
GitHub Pages desde `main` y `/`.
