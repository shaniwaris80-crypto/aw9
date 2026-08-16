from pathlib import Path
import re
R=Path('.')
def rd(p): return (R/p).read_text()
def wr(p,s): (R/p).write_text(s)
def sub(pattern,repl,text,label,flags=re.S):
    out,n=re.subn(pattern,repl,text,count=1,flags=flags)
    if n!=1: raise SystemExit(f'PATCH {label}: {n}')
    return out

# FIREBASE
p='js/firebase.js';s=rd(p)
s=s.replace("import {calcInvoice,validateInvoice,stockMovementQty,stockQuantity,round2,today,now,uid,normalize} from './domain.js';", "import {calcInvoice,validateInvoice,stockMovementQty,stockQuantity,round2,today,now,uid,normalize} from './domain.js';\nimport {buildAltaRecord,buildAnulacionRecord} from './verifactu.js';")
s=s.replace("'notifications','members'];", "'notifications','members','fiscalRecords','fiscalChain'];")
s=s.replace("'containers'],warehouse:", "'containers','fiscalRecords','fiscalChain'],warehouse:")
subscribe="""export async function subscribeCollections(onState,onError,user=null){
  const role=await userRole(user||auth.currentUser),names=ROLE_COLLECTIONS[role]||[],state=Object.fromEntries(COLLECTIONS.map(c=>[c,[]])),unsubs=[],meta={};
  const publish=()=>{const values=Object.values(meta);onState({...state,role,_sync:{fromCache:values.length?values.every(x=>x.fromCache):false,pendingWrites:values.reduce((a,x)=>a+Number(x.pendingWrites||0),0)}})};
  for(const name of names){const q=name==='audit'?query(col(name),orderBy('at','desc'),limit(300)):col(name);unsubs.push(onSnapshot(q,{includeMetadataChanges:true},snap=>{state[name]=snap.docs.map(d=>({id:d.id,...d.data()})).filter(x=>!x.archived);meta[name]={fromCache:Boolean(snap.metadata.fromCache),pendingWrites:snap.docs.filter(d=>d.metadata.hasPendingWrites).length};publish()},err=>onError?.(name,err)))}publish();return()=>unsubs.forEach(u=>u())
}
export async function reportClientError(item,user=null){try{const id=item?.id||uid('err');await setDoc(ref('notifications',id),{...item,id,type:'client_error',userEmail:item?.userEmail||user?.email||'',userUid:user?.uid||'',userAgent:String(navigator?.userAgent||'').slice(0,300),at:item?.at||now(),createdAt:now()},{merge:false});return id}catch{return null}}
async function assertMonthOpen"""
s=sub(r"export async function subscribeCollections\(.*?\}\nasync function assertMonthOpen",subscribe,s,'subscribe')
emit="""export async function emitInvoice(invoice,user){
  if(!navigator.onLine)throw new Error('PARA EMITIR UNA FACTURA DEBES TENER CONEXIÓN A INTERNET');
  const checked=validateInvoice(invoice);if(checked.errors.length)throw new Error(checked.errors.join(' · '));
  const invoiceId=invoice.id||uid('inv'),sid=invoice.seriesId||'FA';
  return runTransaction(db,async tx=>{
    await assertMonthOpenTx(tx,invoice.date);
    const iref=ref('invoices',invoiceId),existing=await tx.get(iref),sref=ref('series',sid),ss=await tx.get(sref),settingsSnap=await tx.get(ref('settings','main'));
    if(existing.exists()&&existing.data().status!=='draft')throw new Error('ESTA FACTURA YA FUE EMITIDA');
    const unique=[...new Set((checked.invoice.lines||[]).map(l=>l.productId).filter(Boolean))],productSnaps=new Map();for(const pid of unique)productSnaps.set(pid,await tx.get(ref('products',pid)));
    const appSettings=settingsSnap.exists()?settingsSnap.data():{},vfEnabled=Boolean(appSettings.verifactuEnabled),chainSnap=vfEnabled?await tx.get(ref('fiscalChain','state')):null;
    const lines=(checked.invoice.lines||[]).map(l=>{const ps=productSnaps.get(l.productId),prod=ps?.exists()?ps.data():null;return{...l,buyPriceSnapshot:Number(l.buyPriceSnapshot??prod?.buyPrice??0)}});
    const calc=calcInvoice({...checked.invoice,lines}),series=ss.exists()?ss.data():{prefix:sid,next:1,digits:5},next=Number(series.next||1),number=`${series.prefix||sid}-${String(next).padStart(Number(series.digits||5),'0')}`,stamp=now(),issuer=invoice.issuerSnapshot||{companyName:appSettings.companyName||'',companyNif:appSettings.companyNif||'',companyAddress:appSettings.companyAddress||'',companyPhone:appSettings.companyPhone||'',companyEmail:appSettings.companyEmail||''};
    let emitted={...calc,id:invoiceId,number,status:'issued',issuedAt:stamp,createdAt:existing.exists()?existing.data().createdAt||stamp:stamp,updatedAt:stamp,issuerSnapshot:issuer,clientSnapshot:invoice.clientSnapshot||null};
    let fiscal=null;
    if(vfEnabled){const c=chainSnap?.exists()?chainSnap.data():{},previous=c.lastHash?{hash:c.lastHash,invoiceNumber:c.lastInvoiceNumber,invoiceDate:c.lastInvoiceDate}:null;fiscal=await buildAltaRecord(emitted,emitted.clientSnapshot||{},appSettings,previous);fiscal={...fiscal,id:`vf_${invoiceId}_alta`,invoiceId,sequence:Number(c.sequence||0)+1,status:appSettings.verifactuBackendReady?'pending_submission':'prepared',createdAt:stamp};emitted={...emitted,verifactuRecordId:fiscal.id,verifactuHash:fiscal.hash,verifactuQrUrl:fiscal.qrUrl,verifactuStatus:fiscal.status};}
    tx.set(iref,emitted,{merge:false});tx.set(sref,{...series,id:sid,next:next+1,updatedAt:stamp},{merge:true});
    if(fiscal){tx.set(ref('fiscalRecords',fiscal.id),fiscal,{merge:false});tx.set(ref('fiscalChain','state'),{id:'state',sequence:fiscal.sequence,lastHash:fiscal.hash,lastInvoiceNumber:fiscal.invoiceNumber,lastInvoiceDate:fiscal.invoiceDate,lastRecordId:fiscal.id,updatedAt:stamp},{merge:true})}
    for(const line of emitted.lines){const qty=stockMovementQty(line);if(qty<=0)continue;const mid=uid('sm');tx.set(ref('stockMoves',mid),{id:mid,productId:line.productId,qty:-qty,type:'sale',location:invoice.stockLocation||'ALMACEN',sourceId:invoiceId,note:`FACTURA ${number}`,date:invoice.date,createdAt:stamp})}
    for(const orderId of invoice.sourceOrderIds||[])tx.set(ref('orders',orderId),{status:'invoiced',invoiceId,updatedAt:stamp},{merge:true});
    const docMap={quote:'quotes',proforma:'proformas',delivery:'deliveryNotes'};if(invoice.sourceDocument?.kind&&invoice.sourceDocument?.id&&docMap[invoice.sourceDocument.kind])tx.set(ref(docMap[invoice.sourceDocument.kind],invoice.sourceDocument.id),{invoiceId,status:'invoiced',updatedAt:stamp},{merge:true});
    if(Number(emitted.paid||0)>0){const pid=uid('pay');tx.set(ref('payments',pid),{id:pid,clientId:invoice.clientId,date:invoice.date,amount:Number(emitted.paid),method:invoice.paymentMethod||'efectivo',allocations:[{invoiceId,amount:Number(emitted.paid)}],createdAt:stamp})}
    const aid=uid('a');tx.set(ref('audit',aid),{id:aid,action:'INVOICE_ISSUE',entity:'invoices',entityId:invoiceId,number,fiscalRecordId:fiscal?.id||'',userEmail:user?.email||'',userUid:user?.uid||'',at:stamp});return emitted;
  });
}
export async function recordPayment"""
s=sub(r"export async function emitInvoice\(.*?\n\}\nexport async function recordPayment",emit,s,'emit')
voidf="""export async function voidInvoice(invoice,{returnStock=false,reason=''},user){await runTransaction(db,async tx=>{const ir=ref('invoices',invoice.id),snap=await tx.get(ir);if(!snap.exists())throw new Error('FACTURA NO ENCONTRADA');const current=snap.data();if(current.status==='void')throw new Error('FACTURA YA ANULADA');const settingsSnap=await tx.get(ref('settings','main')),cfg=settingsSnap.exists()?settingsSnap.data():{},vfEnabled=Boolean(cfg.verifactuEnabled),chainSnap=vfEnabled?await tx.get(ref('fiscalChain','state')):null,paid=Number(current.paid||0),stamp=now();let fiscal=null;if(vfEnabled){const c=chainSnap?.exists()?chainSnap.data():{},previous=c.lastHash?{hash:c.lastHash,invoiceNumber:c.lastInvoiceNumber,invoiceDate:c.lastInvoiceDate}:null;fiscal=await buildAnulacionRecord(current,cfg,previous);fiscal={...fiscal,id:`vf_${invoice.id}_anul_${Date.now()}`,invoiceId:invoice.id,sequence:Number(c.sequence||0)+1,status:cfg.verifactuBackendReady?'pending_submission':'prepared',createdAt:stamp};}tx.set(ir,{status:'void',paid:0,voidReason:String(reason||'').toUpperCase(),voidedAt:stamp,updatedAt:stamp,verifactuCancellationRecordId:fiscal?.id||''},{merge:true});if(fiscal){tx.set(ref('fiscalRecords',fiscal.id),fiscal,{merge:false});tx.set(ref('fiscalChain','state'),{id:'state',sequence:fiscal.sequence,lastHash:fiscal.hash,lastInvoiceNumber:fiscal.invoiceNumber,lastInvoiceDate:fiscal.invoiceDate,lastRecordId:fiscal.id,updatedAt:stamp},{merge:true})}if(returnStock)for(const line of calcInvoice(current).lines){const mid=uid('sm');tx.set(ref('stockMoves',mid),{id:mid,productId:line.productId,qty:stockMovementQty(line),type:'void_return',location:current.stockLocation||'ALMACEN',sourceId:invoice.id,note:`ANULADA ${invoice.number}`,date:today(),createdAt:stamp})}if(paid>0){const pid=uid('pay');tx.set(ref('payments',pid),{id:pid,clientId:current.clientId,date:today(),amount:-paid,method:'reversal',allocations:[{invoiceId:invoice.id,amount:-paid}],note:`REVERSIÓN POR ANULACIÓN ${invoice.number}`,createdAt:stamp})}const aid=uid('a');tx.set(ref('audit',aid),{id:aid,action:'INVOICE_VOID',entity:'invoices',entityId:invoice.id,reason,paidReversed:paid,fiscalRecordId:fiscal?.id||'',userEmail:user?.email||'',userUid:user?.uid||'',at:stamp})})}
export async function createRectification"""
s=sub(r"export async function voidInvoice\(.*?\}\nexport async function createRectification",voidf,s,'void')
rect="""export async function createRectification(original,newLines,reason,user,direction='credit',opts={}){if(!navigator.onLine)throw new Error('SE NECESITA CONEXIÓN PARA RECTIFICAR');const sid=original.seriesId||'FA',id=uid('inv');return runTransaction(db,async tx=>{await assertMonthOpenTx(tx,today());const sref=ref('series',sid),ss=await tx.get(sref),settingsSnap=await tx.get(ref('settings','main')),cfg=settingsSnap.exists()?settingsSnap.data():{},vfEnabled=Boolean(cfg.verifactuEnabled),chainSnap=vfEnabled?await tx.get(ref('fiscalChain','state')):null,series=ss.exists()?ss.data():{prefix:sid,next:1,digits:5},next=Number(series.next||1),number=`${series.prefix||sid}-R${String(next).padStart(Number(series.digits||5),'0')}`,stamp=now();let credit=calcInvoice({id,clientId:original.clientId,date:today(),type:direction==='debit'?'debit':'credit',status:'issued',seriesId:sid,number,originalInvoiceId:original.id,originalInvoiceNumber:original.number,reason:String(reason||'').toUpperCase(),verifactuType:opts.verifactuType||'R4',verifactuRectificationType:opts.verifactuRectificationType||'I',transportType:opts.transportType||'fixed',transportValue:Number(opts.transportValue||0),discount:Number(opts.discount??0),equivalenceSurcharge:Boolean(original.equivalenceSurcharge),lines:newLines,clientSnapshot:original.clientSnapshot,issuerSnapshot:original.issuerSnapshot||null});let fiscal=null;if(vfEnabled){const c=chainSnap?.exists()?chainSnap.data():{},previous=c.lastHash?{hash:c.lastHash,invoiceNumber:c.lastInvoiceNumber,invoiceDate:c.lastInvoiceDate}:null;fiscal=await buildAltaRecord(credit,credit.clientSnapshot||{},cfg,previous);fiscal={...fiscal,id:`vf_${id}_alta`,invoiceId:id,sequence:Number(c.sequence||0)+1,status:cfg.verifactuBackendReady?'pending_submission':'prepared',createdAt:stamp};credit={...credit,verifactuRecordId:fiscal.id,verifactuHash:fiscal.hash,verifactuQrUrl:fiscal.qrUrl,verifactuStatus:fiscal.status};}tx.set(ref('invoices',id),{...credit,issuedAt:stamp,createdAt:stamp,updatedAt:stamp});tx.set(sref,{...series,next:next+1,updatedAt:stamp},{merge:true});if(fiscal){tx.set(ref('fiscalRecords',fiscal.id),fiscal,{merge:false});tx.set(ref('fiscalChain','state'),{id:'state',sequence:fiscal.sequence,lastHash:fiscal.hash,lastInvoiceNumber:fiscal.invoiceNumber,lastInvoiceDate:fiscal.invoiceDate,lastRecordId:fiscal.id,updatedAt:stamp},{merge:true})}tx.set(ref('invoices',original.id),{rectificationIds:[...(original.rectificationIds||[]),id],updatedAt:stamp},{merge:true});if(opts.returnStock&&direction!=='debit')for(const line of credit.lines){const mid=uid('sm');tx.set(ref('stockMoves',mid),{id:mid,productId:line.productId,qty:stockMovementQty(line),type:'rectification_return',location:opts.location||original.stockLocation||'ALMACEN',sourceId:id,note:`RECTIFICATIVA ${number}`,date:today(),createdAt:stamp})}const aid=uid('a');tx.set(ref('audit',aid),{id:aid,action:'RECTIFICATION',entity:'invoices',entityId:id,originalId:original.id,fiscalRecordId:fiscal?.id||'',userEmail:user?.email||'',userUid:user?.uid||'',at:stamp});return credit})}

export async function savePurchaseTransaction"""
s=sub(r"export async function createRectification\(.*?\}\n\nexport async function savePurchaseTransaction",rect,s,'rectification')
wr(p,s)

# APP
p='js/app.js';s=rd(p)
s=s.replace("import {authApi,ensureMasterData,subscribeCollections,saveEntity,userRole} from './firebase.js';", "import {authApi,ensureMasterData,subscribeCollections,saveEntity,userRole,reportClientError} from './firebase.js';")
s=s.replace("import {enhancedDashboardView,enhancedOrdersView,enhancedInvoicesView,enhancedStockView,enhancedProduct360,weekResetAction,toggleInvoiceHistory,toggleOrderHistory,pasteMultiOrders,invoiceAllDelivered,quickDeliveryModal,initEnhancements} from './enhancements.js';", "import {enhancedDashboardView,enhancedOrdersView,enhancedInvoicesView,enhancedStockView,enhancedProduct360,weekResetAction,toggleInvoiceHistory,toggleOrderHistory,pasteMultiOrders,invoiceAllDelivered,quickDeliveryModal,initEnhancements} from './enhancements.js';\nimport {monitorView,clearMonitorErrors,verifactuView,verifactuSettingsModal,verifyVerifactuChain,exportVerifactuRecords} from './views-pro.js';\nimport {installConnectivityMonitor,installGlobalErrorMonitor,recordLocalError,updateSyncMeta,syncLabel} from './pro.js';")
s=s.replace("['reports','📊','REPORTES / IVA',['owner','admin','manager','billing']],['closures'", "['reports','📊','REPORTES / IVA',['owner','admin','manager','billing']],['monitor','🩺','MONITOR PRO',['owner','admin','manager']],['verifactu','🧬','VERI*FACTU',['owner','admin','manager','billing']],['closures'")
s=s.replace("reports:reportsView,closures:closuresView", "reports:reportsView,monitor:monitorView,verifactu:verifactuView,closures:closuresView")
old="const {role,...state}=s;Runtime.state={...Runtime.state,...state};Runtime.role=role||Runtime.role;Runtime.syncReady=true;Runtime.lastSyncAt=now();cloud.innerHTML=`<span class=\"sync-ok\">● FIRESTORE · ${Runtime.state.products.filter(x=>!x.archived).length} PRODUCTOS · ${Runtime.state.clients.filter(x=>!x.archived).length} CLIENTES · ${upper(Runtime.role)}</span>`;"
new="const {role,_sync,...state}=s;Runtime.state={...Runtime.state,...state};Runtime.role=role||Runtime.role;Runtime.syncReady=true;Runtime.lastSyncAt=now();updateSyncMeta(_sync||{});cloud.innerHTML=`<span class=\"${navigator.onLine&&!Runtime.syncMeta.fromCache&&!Runtime.syncMeta.pendingWrites?'sync-ok':'sync-warn'}\">● ${syncLabel()} · ${Runtime.state.products.filter(x=>!x.archived).length} PRODUCTOS · ${Runtime.state.clients.filter(x=>!x.archived).length} CLIENTES · ${upper(Runtime.role)}</span>`;"
if old not in s: raise SystemExit('PATCH app sync pattern missing')
s=s.replace(old,new)
s=s.replace("case'container-new':return containerModal()", "case'container-new':return containerModal();case'monitor-clear-errors':return clearMonitorErrors();case'verifactu-settings':return verifactuSettingsModal();case'verifactu-verify':return verifyVerifactuChain();case'verifactu-export':return exportVerifactuRecords()")
s=s.replace("initEnhancements();const modalRoot=", "installConnectivityMonitor(()=>{if(Runtime.user&&!modalOpen())render()});installGlobalErrorMonitor(item=>reportClientError(item,Runtime.user));initEnhancements();const modalRoot=")
# enrich stateError
s=s.replace("function stateError(name,e){console.error(name,e);cloud.innerHTML=", "function stateError(name,e){console.error(name,e);const item=recordLocalError(e,`FIRESTORE_${name}`);reportClientError(item,Runtime.user).catch(()=>{});cloud.innerHTML=")
wr(p,s)

# INDEX
p='index.html';s=rd(p)
s=s.replace('<title>ARW2026</title>','<title>ARW2026 PRO</title><link rel="icon" href="assets/arw2026-icon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="assets/arw2026-icon.svg">')
s=s.replace('styles.css?v=6.0.0','styles.css?v=7.0.0').replace('extras.css?v=6.0.0','extras.css?v=7.0.0').replace('js/app.js?v=6.0.0','js/app.js?v=7.0.0').replace('ARW2026 <small>v6</small>','ARW2026 <small>PRO v7</small>')
s=s.replace('<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>','<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script><script src="https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js"></script>')
wr(p,s)

# PDF QR
p='js/pdf.js';s=rd(p)
needle="  if(internal){let iy=Math.max(y+18,250);"
qr="""  if(inv.verifactuQrUrl&&window.qrcode){try{const q=window.qrcode(0,'M');q.addData(inv.verifactuQrUrl);q.make();const img=q.createDataURL(5,0);let qy=Math.max(y+8,232);if(qy>253){doc.addPage();qy=20}doc.setFont('helvetica','bold');doc.setFontSize(8);doc.text('QR TRIBUTARIO:',15,qy);doc.addImage(img,'PNG',15,qy+3,32,32);doc.setFontSize(7);doc.text(inv.verifactuStatus==='accepted'?'VERI*FACTU · FACTURA VERIFICABLE EN LA SEDE ELECTRÓNICA DE LA AEAT':'REGISTRO VERI*FACTU PREPARADO · REMISIÓN AEAT PENDIENTE/NO CONFIRMADA',15,qy+39,{maxWidth:80});}catch(e){console.warn('QR VERI*FACTU',e)}}
  if(internal){let iy=Math.max(y+18,250);"""
if needle not in s: raise SystemExit('PATCH pdf QR needle missing')
s=s.replace(needle,qr)
wr(p,s)

# SERVICE WORKER
p='service-worker.js';s=rd(p)
new="""const CACHE='arw2026-pro-v7-20260816';
const CORE=['./','./index.html','./manifest.webmanifest','./styles.css','./extras.css','./firebase-config.js','./assets/arw2026-icon.svg','./js/data.js','./js/domain.js','./js/period.js','./js/importers.js','./js/finance.js','./js/firebase.js','./js/pdf.js','./js/app.js','./js/ui.js','./js/runtime.js','./js/views-sales.js','./js/views-master.js','./js/views-admin.js','./js/views-ops.js','./js/views-system.js','./js/views-finance.js','./js/views-pro.js','./js/permissions.js','./js/health.js','./js/enhancements.js','./js/pro.js','./js/verifactu.js'];
const STATIC_HOSTS=new Set(['unpkg.com','cdnjs.cloudflare.com','www.gstatic.com']);
self.addEventListener('install',event=>{self.skipWaiting();event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()))});
async function cachePut(req,res){if(!res)return res;try{if(res.ok||res.type==='opaque'){const c=await caches.open(CACHE);await c.put(req,res.clone())}}catch{}return res}
self.addEventListener('fetch',event=>{const req=event.request;if(req.method!=='GET')return;let u;try{u=new URL(req.url)}catch{return}if(!['http:','https:'].includes(u.protocol))return;if(u.origin===self.location.origin){event.respondWith(fetch(req).then(r=>cachePut(req,r)).catch(async()=>await caches.match(req)||((req.mode==='navigate')?caches.match('./index.html'):Promise.reject(new Error('OFFLINE')))));return}if(STATIC_HOSTS.has(u.hostname)){event.respondWith(caches.match(req).then(cached=>cached||fetch(req).then(r=>cachePut(req,r))));}});
"""
wr(p,new)

# README append/update version
p='README.md';s=rd(p).replace('# ARW2026 v5','# ARW2026 PRO v7')
if '## ARW2026 PRO v7' not in s:s += """\n\n## ARW2026 PRO v7\n- Rama estable V6 protegida antes de iniciar V7.\n- Monitor de sincronización, caché, errores y pendientes.\n- Reglas Firestore reforzadas: cobros, movimientos de stock y registros fiscales inmutables.\n- Centro VERI*FACTU con huella SHA-256, encadenamiento, QR tributario y registros locales.\n- La remisión real a AEAT solo se habilita mediante backend seguro con certificado; nunca se almacena el certificado en el navegador.\n- PWA mejorada con recursos críticos y librerías externas cacheables tras la primera carga.\n- Pruebas de dominio, finanzas, auditoría, VERI*FACTU, reglas Firestore y navegador.\n"""
wr(p,s)
print('V7 core patch OK')
