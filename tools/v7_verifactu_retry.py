from pathlib import Path
p=Path('functions/index.js');s=p.read_text()
if "firebase-functions/v2/scheduler" not in s:
    s=s.replace("import {onCall,HttpsError} from 'firebase-functions/v2/https';", "import {onCall,HttpsError} from 'firebase-functions/v2/https';\nimport {onSchedule} from 'firebase-functions/v2/scheduler';")
if 'export const retryPendingVerifactu=' not in s:
    s += r'''

export const retryPendingVerifactu=onSchedule({region:'europe-west1',schedule:'every 60 minutes',timeZone:'Europe/Madrid',secrets:[PFX,PFX_PASSWORD],timeoutSeconds:300,memory:'256MiB'},async()=>{
  const settings=(await db.doc(`${ROOT}/settings/main`).get()).data()||{};
  if(!settings.verifactuEnabled||!settings.verifactuBackendReady)return;
  const pfxText=PFX.value();if(!pfxText)return;
  const snap=await db.collection(`${ROOT}/fiscalRecords`).where('status','in',['prepared','pending_submission','retry']).limit(100).get();
  const docs=[...snap.docs].sort((a,b)=>String(a.data().createdAt||a.data().generatedAt||'').localeCompare(String(b.data().createdAt||b.data().generatedAt||'')));
  let waitSeconds=0;
  for(const d of docs){
    if(waitSeconds>0)await new Promise(resolve=>setTimeout(resolve,Math.min(waitSeconds,60)*1000));
    const ref=d.ref,record=d.data(),environment=settings.verifactuEnvironment||'test';
    try{
      if(environment==='production'&&!settings.verifactuProductionConfirmed)throw new Error('Producción no confirmada');
      const xml=envelope(record),resp=await postXml(environment==='production'?PROD:TEST,xml,Buffer.from(pfxText,'base64'),PFX_PASSWORD.value());
      const estado=extract(resp.body,'EstadoRegistro')||extract(resp.body,'EstadoEnvio')||'',code=extract(resp.body,'CodigoErrorRegistro')||'',desc=extract(resp.body,'DescripcionErrorRegistro')||'',wait=Number(extract(resp.body,'TiempoEsperaEnvio')||0);
      const accepted=/Correcto|Aceptado/i.test(estado)&&!/Rechazado/i.test(estado),status=accepted?'accepted':(/Aceptado/i.test(estado)?'accepted_with_errors':'rejected');
      await ref.update({status,aeatStatus:estado,aeatCode:code,aeatDescription:desc,aeatHttpStatus:resp.statusCode,aeatWaitSeconds:wait,submittedAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()});
      if(record.invoiceId)await db.doc(`${ROOT}/invoices/${record.invoiceId}`).set({verifactuStatus:status,verifactuAeatStatus:estado,verifactuAeatCode:code,verifactuAeatDescription:desc,verifactuSubmittedAt:FieldValue.serverTimestamp()},{merge:true});
      waitSeconds=wait;
    }catch(error){
      await ref.set({status:'retry',lastError:String(error?.message||error).slice(0,1000),lastRetryAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()},{merge:true});
      waitSeconds=0;
    }
  }
});
'''
p.write_text(s)
print('VERIFACTU retry scheduler patch OK')
