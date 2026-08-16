from pathlib import Path
import re
p=Path('functions/index.js');s=p.read_text()
if "firebase-functions/v2/scheduler" not in s:s=s.replace("import {onCall,HttpsError} from 'firebase-functions/v2/https';", "import {onCall,HttpsError} from 'firebase-functions/v2/https';\nimport {onSchedule} from 'firebase-functions/v2/scheduler';")
marker="export const submitVerifactu=onCall"
if marker not in s: raise SystemExit('submit callable missing')
helper="""async function transmitRecord(ref,record,settings){const environment=settings.verifactuEnvironment||'test';if(environment==='production'&&!settings.verifactuProductionConfirmed)throw new Error('Producción no confirmada');const pfxText=PFX.value();if(!pfxText)throw new Error('Certificado no configurado');const xml=envelope(record),resp=await postXml(environment==='production'?PROD:TEST,xml,Buffer.from(pfxText,'base64'),PFX_PASSWORD.value()),estado=extract(resp.body,'EstadoRegistro')||extract(resp.body,'EstadoEnvio')||'',code=extract(resp.body,'CodigoErrorRegistro')||'',desc=extract(resp.body,'DescripcionErrorRegistro')||'',waitSeconds=Number(extract(resp.body,'TiempoEsperaEnvio')||0),accepted=/Correcto|Aceptado/i.test(estado)&&!/Rechazado/i.test(estado),status=accepted?'accepted':(/Aceptado/i.test(estado)?'accepted_with_errors':'rejected');await ref.update({status,aeatStatus:estado,aeatCode:code,aeatDescription:desc,aeatHttpStatus:resp.statusCode,aeatWaitSeconds:waitSeconds,submittedAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()});if(record.invoiceId)await db.doc(`${ROOT}/invoices/${record.invoiceId}`).set({verifactuStatus:status,verifactuAeatStatus:estado,verifactuAeatCode:code,verifactuAeatDescription:desc,verifactuSubmittedAt:FieldValue.serverTimestamp()},{merge:true});return{ok:accepted,status,estado,code,description:desc,httpStatus:resp.statusCode,waitSeconds}}

"""
if 'async function transmitRecord' not in s:s=s.replace(marker,helper+marker,1)
pattern=r"const xml=envelope\(record\),resp=await postXml[\s\S]*?return\{ok:accepted,status,estado,code,description:desc,httpStatus:resp\.statusCode\}"
out,n=re.subn(pattern,"return await transmitRecord(ref,record,settings)",s,count=1)
if n!=1: raise SystemExit(f'transmit body replace {n}')
s=out
if 'retryPendingVerifactu' not in s:s += """\n\nexport const retryPendingVerifactu=onSchedule({region:'europe-west1',schedule:'every 60 minutes',timeZone:'Europe/Madrid',secrets:[PFX,PFX_PASSWORD],timeoutSeconds:300,memory:'256MiB'},async()=>{const settings=(await db.doc(`${ROOT}/settings/main`).get()).data()||{};if(!settings.verifactuEnabled||!settings.verifactuBackendReady)return;const q=await db.collection(`${ROOT}/fiscalRecords`).where('status','in',['prepared','pending_submission','retry']).orderBy('createdAt','asc').limit(100).get();let wait=0;for(const snap of q.docs){if(wait>0)await new Promise(r=>setTimeout(r,Math.min(wait,60)*1000));const ref=snap.ref,record=snap.data();try{const r=await transmitRecord(ref,record,settings);wait=Number(r.waitSeconds||0)}catch(error){await ref.set({status:'retry',lastError:String(error?.message||error).slice(0,1000),lastRetryAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()},{merge:true});wait=0}}});\n"""
p.write_text(s)
print('VERIFACTU retry patch OK')
