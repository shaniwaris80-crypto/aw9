# ARW2026

Sistema operativo de facturación, pedidos, reparto, clientes, precios, stock, compras, cobros y reportes para la ruta y negocios asociados.

## Flujo principal
PEDIDO → PREPARACIÓN / COMPRA → ENTREGA REAL → REVISIÓN → FACTURA → COBRO → HISTORIAL

## Regla caja × kg
Solo los productos cuyo `mode` es `caja_kg` multiplican automáticamente `cantidad de cajas × kgPerBox`. Ejemplo: MACHO MADURO, 2 cajas × 22 kg = 44 kg facturables. Los productos `caja_fija` cobran por caja; `kg`, `ud` y `manojo` cobran por su unidad.

## Datos maestros
El catálogo y la cartera inicial están en `js/data.js` con IDs estables. En la primera entrada del propietario se sincronizan con Firestore. Las siguientes entradas no los duplican mientras `masterVersion` coincida.

## Sincronización
Toda la información operativa se guarda en Firestore bajo `companies/arw2026` y se escucha con `onSnapshot`, por lo que dos dispositivos autenticados reciben cambios en tiempo real. LocalStorage solo se usa para preferencias visuales del panel lateral.

## Facturas emitidas
Las facturas emitidas no se sobrescriben para corregir precios. La herramienta de corrección masiva genera facturas rectificativas enlazadas a las originales. Los borradores sí admiten edición masiva directa.

## ARW2026 v3.1
- Total de factura destacado en un recuadro compacto y pie PDF simplificado.
- Recargo de equivalencia configurable por cliente y separado por tipo de IVA.
- Buscadores sin pérdida de foco al escribir varias letras seguidas.
- Importación de compras mediante texto `ARW2026_COMPRA_V1` o texto libre, con vista previa, detección de duplicados y actualización de stock/coste.
- Instrucción copiable para convertir fotos/PDF de facturas de proveedor con ChatGPT al formato que entiende ARW2026.
- Copiar/pegar pedidos para interpretarlos por código, nombre o alias, guardarlos como pedido o abrirlos directamente como factura.
- Reconocimiento protegido frente a confusiones entre códigos cortos como MM, MA o MV.
- Pruebas automáticas de caja × kg, transporte, IVA, recargo e importadores.

## Publicación Firebase
Publicar manualmente `firestore.rules` y, si se usa Storage, `storage.rules` en el proyecto `aw999-71828`. Autorizar el dominio `shaniwaris80-crypto.github.io` en Authentication.

## Validación
`node tests/domain.test.mjs` comprueba caja × kg, IVA, transporte, recargo de equivalencia e importadores críticos.
