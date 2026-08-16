# ARW2026 PRO · VERI*FACTU

ARW2026 V7 separa deliberadamente tres estados:

1. **DESACTIVADO**: se factura como hasta ahora; el centro fiscal solo audita preparación.
2. **PRUEBAS**: genera registro, huella SHA-256, encadenamiento y QR de pruebas. Si el backend/certificado están disponibles, puede remitirse al endpoint de pruebas.
3. **PRODUCCIÓN**: solo debe habilitarse cuando exista backend Firebase Functions desplegado, certificado configurado como secret y verificación completa con AEAT.

## Secrets de Functions

Nunca guardes un certificado en `index.html`, Firestore, GitHub ni en el navegador.

Configurar en Firebase/Google Secret Manager:

- `VERIFACTU_PFX_BASE64`: contenido del certificado PFX/P12 codificado en base64.
- `VERIFACTU_PFX_PASSWORD`: contraseña del certificado.

Después desplegar Functions desde el workflow `Firebase PRO deploy` con `deploy_functions=true`.

## GitHub Actions

Crear el secret del repositorio:

- `FIREBASE_SERVICE_ACCOUNT_AW999`: JSON completo de una cuenta de servicio limitada al proyecto `aw999-71828` con permisos necesarios para desplegar reglas/funciones y ejecutar el backup.

## Antes de producción

- Probar huellas contra los ejemplos oficiales de AEAT (`tests/verifactu.test.mjs`).
- Ejecutar pruebas de Firestore (`tests/rules.test.mjs`).
- Ejecutar smoke tests móvil/PWA.
- Configurar y probar el certificado en entorno de pruebas.
- Confirmar que NIF, razón social, series y tipos de factura son correctos.
- Revisar rectificativas R1-R5 y tipo de rectificación S/I para cada caso.
- Validar los XML con los XSD y validaciones oficiales vigentes.
- Preparar la declaración responsable de la versión del software que corresponda.
- Solo después marcar el backend/certificado como preparados y autorizar producción.

El navegador nunca marca una remisión como aceptada por sí mismo: el estado `accepted` debe venir de la respuesta procesada por el backend seguro.
