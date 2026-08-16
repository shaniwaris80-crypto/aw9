from pathlib import Path
import re
R=Path('.')
def rd(p):return (R/p).read_text()
def wr(p,s):(R/p).write_text(s)
def one(s,a,b,label):
    if a not in s: raise SystemExit('MISSING '+label)
    return s.replace(a,b,1)

# APP declaration page/action
p='js/app.js';s=rd(p)
if "from './declaration.js'" not in s:s=s.replace("import {installConnectivityMonitor,installGlobalErrorMonitor,recordLocalError,updateSyncMeta,syncLabel} from './pro.js';", "import {installConnectivityMonitor,installGlobalErrorMonitor,recordLocalError,updateSyncMeta,syncLabel} from './pro.js';\nimport {declarationView,downloadDeclaration} from './declaration.js';")
s=s.replace("['verifactu','🧬','VERI*FACTU',['owner','admin','manager','billing']],['closures'", "['verifactu','🧬','VERI*FACTU',['owner','admin','manager','billing']],['declaration','📜','DECLARACIÓN SIF',['owner','admin','manager','billing']],['closures'")
s=s.replace("monitor:monitorView,verifactu:verifactuView,closures:closuresView", "monitor:monitorView,verifactu:verifactuView,declaration:declarationView,closures:closuresView")
s=s.replace("case'verifactu-check-backend':return checkVerifactuBackend()", "case'verifactu-check-backend':return checkVerifactuBackend();case'declaration-download':return downloadDeclaration()")
wr(p,s)

# permissions declaration action
p='js/permissions.js';s=rd(p).replace("verifactuRead:['owner','admin','manager','billing']", "declarationRead:['owner','admin','manager','billing'],verifactuRead:['owner','admin','manager','billing']")
s=s.replace("'verifactu-submit':'verifactuSubmit','verifactu-check-backend':'verifactuAdmin'", "'verifactu-submit':'verifactuSubmit','verifactu-check-backend':'verifactuAdmin','declaration-download':'declarationRead'")
wr(p,s)

# Service worker declaration
p='service-worker.js';s=rd(p)
if "'./js/declaration.js'" not in s:s=s.replace("'./js/storage.js','./js/backend.js'", "'./js/storage.js','./js/backend.js','./js/declaration.js'")
wr(p,s)

# views-pro producer declaration fields
p='js/views-pro.js';s=rd(p)
needle="<label>NIF PRODUCTOR<input name=\"producerNif\" maxlength=\"9\" value=\"${esc(x.verifactuProducerNif||x.companyNif||'')}\"></label></div>"
rep="<label>NIF PRODUCTOR<input name=\"producerNif\" maxlength=\"9\" value=\"${esc(x.verifactuProducerNif||x.companyNif||'')}\"></label><label>DIRECCIÓN PRODUCTOR<input name=\"producerAddress\" value=\"${esc(x.verifactuProducerAddress||'')}\"></label><label>CONTACTO PRODUCTOR<input name=\"producerContact\" value=\"${esc(x.verifactuProducerContact||'')}\"></label><label>LUGAR DECLARACIÓN<input name=\"declarationPlace\" value=\"${esc(x.responsibleDeclarationPlace||'BURGOS, ESPAÑA')}\"></label></div>"
s=one(s,needle,rep,'producer fields')
old="verifactuProducerNif:upper(f.get('producerNif')||x.companyNif||'')},'VERIFACTU_SETTINGS'"
new="verifactuProducerNif:upper(f.get('producerNif')||x.companyNif||''),verifactuProducerAddress:upper(f.get('producerAddress')||''),verifactuProducerContact:String(f.get('producerContact')||''),responsibleDeclarationPlace:upper(f.get('declarationPlace')||'BURGOS, ESPAÑA')},'VERIFACTU_SETTINGS'"
s=one(s,old,new,'producer save')
wr(p,s)

# sales automatic submit after emission
p='js/views-sales.js';s=rd(p)
if "from './backend.js'" not in s:s=s.replace("import {archiveInvoicePdf} from './storage.js';", "import {archiveInvoicePdf} from './storage.js';\nimport {submitFiscalRecord} from './backend.js';")
old="archiveInvoicePdf(emitted,ec,es).then(()=>toast(`PDF ORIGINAL ${emitted.number} ARCHIVADO`,'good')).catch(err=>{console.warn('ARCHIVO PDF',err);toast(`FACTURA EMITIDA · PDF CLOUD PENDIENTE: ${err.message||err}`,'warn')})"
new=old+";if(emitted.verifactuRecordId&&settings().verifactuBackendReady)submitFiscalRecord(emitted.verifactuRecordId).then(r=>toast(`AEAT ${emitted.number}: ${upper(r.status||'PROCESADO')}`,r.ok?'good':'warn')).catch(err=>toast(`AEAT PENDIENTE ${emitted.number}: ${err.message||err}`,'warn'))"
s=one(s,old,new,'auto submit invoice')
wr(p,s)

# enhancements route automatic submit
p='js/enhancements.js';s=rd(p)
if "from './backend.js'" not in s:s=s.replace("import {can} from './permissions.js';", "import {can} from './permissions.js';\nimport {submitFiscalRecord} from './backend.js';")
old="await emitInvoice({id:uid('inv'),clientId:o.clientId"
new="const emitted=await emitInvoice({id:uid('inv'),clientId:o.clientId"
s=one(s,old,new,'route emitted const')
old="sourceOrderIds:[o.id],lines},Runtime.user);ok++"
new="sourceOrderIds:[o.id],lines},Runtime.user);if(emitted.verifactuRecordId&&Runtime.settings().verifactuBackendReady)submitFiscalRecord(emitted.verifactuRecordId).catch(()=>{});ok++"
s=one(s,old,new,'route auto submit')
wr(p,s)

# purchase attachment optional
p='js/views-master.js';s=rd(p)
if "from './storage.js'" not in s:s=s.replace("import {can} from './permissions.js';", "import {can} from './permissions.js';\nimport {uploadPurchaseAttachment} from './storage.js';")
needle="<label>TOTAL FACTURA ORIGEN €<input name=\"expectedTotal\" type=\"number\" step=\".01\" value=\"${Number(seed.expectedTotal || 0)}\"></label>"
rep=needle+"<label>FACTURA ORIGINAL (PDF/FOTO)<input name=\"attachment\" type=\"file\" accept=\"application/pdf,image/*\"></label>"
s=one(s,needle,rep,'purchase attachment input')
old="await savePurchaseTransaction(purchase, Runtime.user);\n      toast('COMPRA GUARDADA ATÓMICAMENTE · STOCK Y COSTE REAL ACTUALIZADOS', 'good');"
new="await savePurchaseTransaction(purchase, Runtime.user);\n      const attachment=m.querySelector('[name=attachment]')?.files?.[0];if(attachment){try{const up=await uploadPurchaseAttachment(purchase.id,attachment);await saveEntity('purchases',{id:purchase.id,attachments:[...(purchase.attachments||[]),up]},'PURCHASE_ATTACHMENT',Runtime.user);toast('COMPRA Y DOCUMENTO ORIGINAL ARCHIVADOS','good')}catch(err){toast(`COMPRA GUARDADA · ADJUNTO PENDIENTE: ${err.message||err}`,'warn')}}\n      toast('COMPRA GUARDADA ATÓMICAMENTE · STOCK Y COSTE REAL ACTUALIZADOS', 'good');"
s=one(s,old,new,'purchase attachment save')
wr(p,s)

# backend sequential wait requested by AEAT
p='js/backend.js';s=rd(p)
old="done++;onProgress({done,total:recordIds.length,last:results.at(-1)})}return results}"
new="done++;onProgress({done,total:recordIds.length,last:results.at(-1)});const wait=Number(results.at(-1)?.waitSeconds||0);if(wait>0&&done<recordIds.length)await new Promise(r=>setTimeout(r,Math.min(wait,60)*1000))}return results}"
s=one(s,old,new,'backend wait')
wr(p,s)

# docs declaration draft
Path('docs').mkdir(exist_ok=True)
Path('docs/DECLARACION_RESPONSABLE_BORRADOR.md').write_text('''# DECLARACIÓN RESPONSABLE DEL SISTEMA INFORMÁTICO DE FACTURACIÓN\n\n**ESTADO: BORRADOR. NO SUSCRIBIR HASTA TERMINAR VALIDACIÓN TÉCNICA Y COMPLETAR LOS DATOS DEL PRODUCTOR.**\n\nLa versión visible y descargable se genera también dentro de ARW2026 PRO → DECLARACIÓN SIF. Debe conservarse una declaración por cada versión.\n\nCampos mínimos, en orden:\n\na) Nombre del sistema.\nb) Código identificador único del sistema.\nc) Identificador completo de versión.\nd) Componentes hardware/software, descripción y funcionalidades.\ne) Indicación de funcionamiento exclusivo o no como VERI*FACTU.\nf) Indicación de soporte a uno o varios obligados tributarios.\ng) Tipos de firma utilizados si funciona como NO VERI*FACTU.\nh) Persona o entidad productora.\ni) NIF del productor.\nj) Dirección postal completa del productor.\nk) Declaración de cumplimiento normativo de la versión.\nl) Fecha y lugar de suscripción.\n\nEl anexo recomendado documentará contacto, URL y explicación técnica de cumplimiento.\n''')
print('professional close patch OK')
