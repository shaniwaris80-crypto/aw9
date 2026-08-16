from pathlib import Path
R=Path('.')
# Functions: mirror AEAT status metadata to invoice and expose secure readiness probe
p=R/'functions/index.js';s=p.read_text()
old="await ref.update({status,aeatStatus:estado,aeatCode:code,aeatDescription:desc,aeatHttpStatus:resp.statusCode,submittedAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()});return{ok:accepted,status,estado,code,description:desc,httpStatus:resp.statusCode}});"
new="await ref.update({status,aeatStatus:estado,aeatCode:code,aeatDescription:desc,aeatHttpStatus:resp.statusCode,submittedAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()});if(record.invoiceId)await db.doc(`${ROOT}/invoices/${record.invoiceId}`).set({verifactuStatus:status,verifactuAeatStatus:estado,verifactuAeatCode:code,verifactuAeatDescription:desc,verifactuSubmittedAt:FieldValue.serverTimestamp()},{merge:true});return{ok:accepted,status,estado,code,description:desc,httpStatus:resp.statusCode}});\n\nexport const verifactuBackendStatus=onCall({region:'europe-west1',secrets:[PFX,PFX_PASSWORD]},async req=>{if(!req.auth)throw new HttpsError('unauthenticated','LOGIN REQUERIDO');const r=await role(req.auth.uid);if(!allowed(r))throw new HttpsError('permission-denied','ROL SIN PERMISO');return{backendReady:true,certificateReady:Boolean(PFX.value()),project:'aw999-71828',region:'europe-west1'}});"
if old not in s: raise SystemExit('Function status pattern missing')
p.write_text(s.replace(old,new,1))
# Backend client
p=R/'js/backend.js';s=p.read_text()
s=s.replace("const submit=httpsCallable(functions,'submitVerifactu',{timeout:60000});", "const submit=httpsCallable(functions,'submitVerifactu',{timeout:60000}),statusCall=httpsCallable(functions,'verifactuBackendStatus',{timeout:20000});")
if 'checkFiscalBackend' not in s:s += "\nexport async function checkFiscalBackend(){const r=await statusCall({});return r.data||{}}\n"
p.write_text(s)
# PRO view
p=R/'js/views-pro.js';s=p.read_text().replace("import {submitFiscalRecords} from './backend.js';", "import {submitFiscalRecords,checkFiscalBackend} from './backend.js';")
s=s.replace("<button class=\"btn primary\" data-action=\"verifactu-settings\">CONFIGURAR</button>", "<button class=\"btn primary\" data-action=\"verifactu-settings\">CONFIGURAR</button><button class=\"btn\" data-action=\"verifactu-check-backend\">COMPROBAR BACKEND</button>")
if 'checkVerifactuBackend' not in s:s += """\nexport async function checkVerifactuBackend(){try{const x=await checkFiscalBackend();await saveEntity('settings',{id:'main',verifactuBackendReady:Boolean(x.backendReady),verifactuCertificateReady:Boolean(x.certificateReady),verifactuBackendCheckedAt:now()},'VERIFACTU_BACKEND_CHECK',Runtime.user);toast(`BACKEND ${x.backendReady?'OK':'NO'} · CERTIFICADO ${x.certificateReady?'OK':'NO CONFIGURADO'}`,x.backendReady&&x.certificateReady?'good':'warn');Runtime.render?.();return x}catch(err){toast(`BACKEND NO DISPONIBLE: ${err.message||err}`,'bad');return null}}\n"""
p.write_text(s)
# app
p=R/'js/app.js';s=p.read_text().replace("exportVerifactuRecords,submitPendingVerifactu} from './views-pro.js';", "exportVerifactuRecords,submitPendingVerifactu,checkVerifactuBackend} from './views-pro.js';")
s=s.replace("case'verifactu-submit':return submitPendingVerifactu()", "case'verifactu-submit':return submitPendingVerifactu();case'verifactu-check-backend':return checkVerifactuBackend()")
p.write_text(s)
# permissions
p=R/'js/permissions.js';s=p.read_text().replace("'verifactu-submit':'verifactuSubmit'", "'verifactu-submit':'verifactuSubmit','verifactu-check-backend':'verifactuAdmin'")
p.write_text(s)
print('backend status patch OK')
