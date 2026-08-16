from pathlib import Path
import re
R=Path('.')
def rd(p): return (R/p).read_text()
def wr(p,s): (R/p).write_text(s)
def once(s,old,new,label):
    if old not in s: raise SystemExit(f'MISSING {label}')
    return s.replace(old,new,1)

# firebaseApp export
p='js/firebase.js';s=rd(p)
s=once(s,"const app=initializeApp(FIREBASE_CONFIG);export const auth=getAuth(app);export const db=getFirestore(app);enableMultiTabIndexedDbPersistence(db).catch(()=>{});const googleProvider=new GoogleAuthProvider();","export const firebaseApp=initializeApp(FIREBASE_CONFIG);export const auth=getAuth(firebaseApp);export const db=getFirestore(firebaseApp);enableMultiTabIndexedDbPersistence(db).catch(()=>{});const googleProvider=new GoogleAuthProvider();",'firebaseApp')
# bounded noisy collections, without truncating financial collections
s=s.replace("const q=name==='audit'?query(col(name),orderBy('at','desc'),limit(300)):col(name);","const q=name==='audit'?query(col(name),orderBy('at','desc'),limit(500)):name==='notifications'?query(col(name),orderBy('at','desc'),limit(200)):name==='fiscalRecords'?query(col(name),orderBy('generatedAt','desc'),limit(1000)):col(name);")
wr(p,s)

# sales: immutable PDF archive + fiscal type selectors
p='js/views-sales.js';s=rd(p)
if "from './storage.js'" not in s:s=s.replace("import {can} from './permissions.js';","import {can} from './permissions.js';\nimport {archiveInvoicePdf} from './storage.js';")
s=s.replace("equivalenceSurcharge:false,lines:Array.from", "equivalenceSurcharge:false,verifactuType:'F1',lines:Array.from",1)
s=s.replace("stockLocation:m.querySelector('[name=stockLocation]')?.value||base.stockLocation||'ALMACEN',transportType:", "stockLocation:m.querySelector('[name=stockLocation]')?.value||base.stockLocation||'ALMACEN',verifactuType:m.querySelector('[name=verifactuType]')?.value||base.verifactuType||'F1',transportType:",1)
needle="<label>SALIDA DE STOCK<select name=\"stockLocation\" ${locked?'disabled':''}>${stockLocationOpts(inv.stockLocation||settings().defaultStockLocation||'ALMACEN')}</select></label><label>TRANSPORTE"
repl="<label>SALIDA DE STOCK<select name=\"stockLocation\" ${locked?'disabled':''}>${stockLocationOpts(inv.stockLocation||settings().defaultStockLocation||'ALMACEN')}</select></label>${settings().verifactuEnabled?`<label>TIPO FISCAL<select name=\"verifactuType\" ${locked?'disabled':''}><option value=\"F1\">F1 · FACTURA</option><option value=\"F2\">F2 · SIMPLIFICADA</option><option value=\"F3\">F3 · SUSTITUCIÓN SIMPLIFICADAS</option></select></label>`:''}<label>TRANSPORTE"
s=once(s,needle,repl,'invoice fiscal selector')
s=s.replace("m.querySelector('[name=transportType]').value=inv.transportType||'percent';", "m.querySelector('[name=transportType]').value=inv.transportType||'percent';if(m.querySelector('[name=verifactuType]'))m.querySelector('[name=verifactuType]').value=inv.verifactuType||'F1';",1)
old="const emitted=await emitInvoice(tmp,Runtime.user);toast(`FACTURA ${emitted.number} EMITIDA Y SINCRONIZADA`,'good');closeModal();downloadInvoice(emitted,client(emitted.clientId)||emitted.clientSnapshot,emitted.issuerSnapshot||settings())"
new="const emitted=await emitInvoice(tmp,Runtime.user),ec=client(emitted.clientId)||emitted.clientSnapshot,es=emitted.issuerSnapshot||settings();toast(`FACTURA ${emitted.number} EMITIDA Y SINCRONIZADA`,'good');closeModal();downloadInvoice(emitted,ec,es);archiveInvoicePdf(emitted,ec,es).then(()=>toast(`PDF ORIGINAL ${emitted.number} ARCHIVADO`,'good')).catch(err=>{console.warn('ARCHIVO PDF',err);toast(`FACTURA EMITIDA · PDF CLOUD PENDIENTE: ${err.message||err}`,'warn')})"
s=once(s,old,new,'archive emitted pdf')
# rectification fiscal selectors
old="<label class=\"check\"><input id=\"rStock\" type=\"checkbox\"> DEVOLVER ESTA MERCANCÍA AL STOCK</label>${table"
new="<label class=\"check\"><input id=\"rStock\" type=\"checkbox\"> DEVOLVER ESTA MERCANCÍA AL STOCK</label>${settings().verifactuEnabled?`<div class=\"form-grid\"><label>TIPO RECTIFICATIVA<select id=\"rVfType\"><option>R1</option><option>R2</option><option>R3</option><option selected>R4</option><option>R5</option></select></label><label>MÉTODO<select id=\"rVfMethod\"><option value=\"I\">I · POR DIFERENCIAS</option><option value=\"S\">S · SUSTITUTIVA</option></select></label></div>`:''}${table"
s=once(s,old,new,'rect fiscal selector')
s=s.replace("transportType,transportValue});toast(`RECTIFICATIVA", "transportType,transportValue,verifactuType:m.querySelector('#rVfType')?.value||'R4',verifactuRectificationType:m.querySelector('#rVfMethod')?.value||'I'});toast(`RECTIFICATIVA",1)
wr(p,s)

# service worker
p='service-worker.js';s=rd(p)
if "'./js/storage.js'" not in s:s=s.replace("'./js/pro.js','./js/verifactu.js'", "'./js/pro.js','./js/verifactu.js','./js/storage.js','./js/backend.js'")
wr(p,s)

# views-pro: secure submission buttons
p='js/views-pro.js';s=rd(p)
if "from './backend.js'" not in s:s=s.replace("import {VERIFACTU_SPEC,verifactuReadiness,verifyChainRecords,buildQrUrl} from './verifactu.js';", "import {VERIFACTU_SPEC,verifactuReadiness,verifyChainRecords,buildQrUrl} from './verifactu.js';\nimport {submitFiscalRecords} from './backend.js';")
old="<button class=\"btn\" data-action=\"verifactu-export\">EXPORTAR REGISTROS</button>"
new="<button class=\"btn\" data-action=\"verifactu-export\">EXPORTAR REGISTROS</button>${backend?'<button class=\"btn primary\" data-action=\"verifactu-submit\">ENVIAR PENDIENTES A AEAT</button>':''}"
s=once(s,old,new,'vf submit button')
s += """\nexport async function submitPendingVerifactu(){const cfg=s();if(!cfg.verifactuEnabled)return toast('VERI*FACTU ESTÁ DESACTIVADO','bad');if(!cfg.verifactuBackendReady)return toast('BACKEND FISCAL NO CONFIGURADO','bad');const pending=fiscalRecords().filter(r=>['prepared','pending_submission','retry'].includes(r.status));if(!pending.length)return toast('NO HAY REGISTROS PENDIENTES','good');if(!confirm(`ENVIAR ${pending.length} REGISTROS AL ENTORNO ${upper(cfg.verifactuEnvironment||'test')}?`))return;let last=0;const results=await submitFiscalRecords(pending.map(r=>r.id),p=>{last=p.done;toast(`AEAT: ${p.done}/${p.total}`,'good')});const ok=results.filter(x=>x.ok).length,bad=results.length-ok;toast(`REMISIÓN TERMINADA · ${ok} OK · ${bad} CON ERROR`,bad?'warn':'good');return{ok,bad,total:last}}\n"""
wr(p,s)

# app integration
p='js/app.js';s=rd(p)
s=s.replace("exportVerifactuRecords} from './views-pro.js';", "exportVerifactuRecords,submitPendingVerifactu} from './views-pro.js';")
s=s.replace("case'verifactu-export':return exportVerifactuRecords()", "case'verifactu-export':return exportVerifactuRecords();case'verifactu-submit':return submitPendingVerifactu()")
wr(p,s)

# admin V7 text
p='js/views-admin.js';s=rd(p).replace('VERSIÓN: <b>6.0.0</b>','VERSIÓN: <b>7.0.0 PRO</b>').replace('V6 · AUDITORÍA ACTIVA','V7 PRO · AUDITORÍA ACTIVA')
wr(p,s)

# manifest icon version remains; README archive
p='README.md';s=rd(p)
if 'PDF ORIGINAL' not in s:s += """\n- Las facturas nuevas intentan archivar una copia PDF original e inmutable en Firebase Storage; un fallo de Storage no revierte una factura fiscal ya emitida.\n- MONITOR PRO muestra online/offline, caché, escrituras pendientes y errores del dispositivo.\n- Las colecciones de ruido (auditoría, notificaciones y registros fiscales) se limitan en escucha en tiempo real; facturas/compras permanecen completas para no falsear análisis financieros.\n"""
wr(p,s)
print('finish V7 PRO OK')
