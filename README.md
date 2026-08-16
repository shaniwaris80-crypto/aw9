# ARW2026 v4

Sistema operativo de facturación, pedidos, reparto, clientes, precios, stock, compras, cobros y reportes para la ruta y negocios asociados.

## Flujo principal
PEDIDO → PREPARACIÓN / COMPRA → ENTREGA REAL → REVISIÓN → FACTURA → COBRO → HISTORIAL

## Regla caja × kg
Solo los productos cuyo `mode` es `caja_kg` multiplican automáticamente `cantidad de cajas × kgPerBox`. Ejemplo: MACHO MADURO, 2 cajas × 22 kg = 44 kg facturables. Los productos `caja_fija` cobran por caja; `kg`, `ud` y `manojo` cobran por su unidad.

## Datos maestros
El catálogo y la cartera inicial están en `js/data.js` con IDs estables. La carga maestra completa estructura y datos faltantes, pero v4 no reinicia la serie de facturación ni pisa precios/costes/IVA editados posteriormente.

## Sincronización
Toda la información operativa se guarda en Firestore bajo `companies/arw2026` y se escucha con `onSnapshot`. La suscripción se limita a las colecciones permitidas para el rol del usuario.

## Facturas
- Validación central también para emisiones masivas.
- Precio 0 bloqueado.
- Caja × kg exige kg/caja.
- La emisión usa transacción Firestore para número + factura + stock + pedido + cobro.
- Los meses cerrados bloquean nuevas emisiones.
- Las anulaciones revierten el saldo cobrado y pueden devolver stock.
- Las rectificativas pueden devolver stock cuando existe devolución física.

## Stock
- Stock por movimientos y ubicación.
- El reset total se realiza por cada ubicación, preservando historial.
- CAJA × KG se almacena físicamente en kg y se muestra también en cajas equivalentes.

## Compras
v4 incorpora una operación transaccional para compra + stock + coste + historial. El importador `ARW2026_COMPRA_V1` sigue siendo la vía recomendada desde fotos/PDF interpretados por ChatGPT, siempre con vista previa antes de guardar.

## Publicación Firebase
Publicar manualmente `firestore.rules` y, si se usa Storage, `storage.rules` en el proyecto `aw999-71828`. Autorizar `shaniwaris80-crypto.github.io` en Authentication.

## Validación
GitHub Actions comprueba sintaxis, imports, dominio y varias invariantes críticas de v4: transporte, caja × kg, precio cero, numeración protegida, cierre mensual y reset de stock por ubicación.
