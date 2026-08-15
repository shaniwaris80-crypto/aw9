import {FIREBASE_CONFIG,ARW} from '../firebase-config.js';
import {MASTER_PRODUCTS,MASTER_CLIENTS,MASTER_SUPPLIERS,MASTER_VERSION} from './data.js';
import {calcInvoice,stockMovementQty,now,uid,normalize} from './domain.js';
import {initializeApp} from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js';
import {getAuth,setPersistence,browserLocalPersistence,signInWithEmailAndPassword,signInWithPopup,GoogleAuthProvider,signOut,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js';
import {getFirestore,collection,doc,getDoc,getDocs,setDoc,deleteDoc,updateDoc,onSnapshot,writeBatch,runTransaction,query,orderBy,limit,enableMultiTabIndexedDbPersistence} from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js';

const app=initializeApp(FIREBASE_CONFIG);
export const auth=getAuth(app);
export const db=getFirestore(app);
enableMultiTabIndexedDbPersistence(db).catch(()=>{});
const googleProvider=new GoogleAuthProvider();
const root=()=>doc(db,'companies',ARW.appId);
const col=name=>collection(root(),name);
const ref=(name,id)=>doc(root(),name,id);

export const COLLECTIONS=['products','clients','suppliers','orders','invoices','payments','purchases','stockMoves','expenses','routes','priceHistory','audit','settings','series','closures','transfers','wastes','returns','inventoryCounts','quotes','proformas','deliveryNotes','cashMovements','bankMovements','communications','containers','notifications'];

export const authApi={
  async email(email,password){
    await setPersistence(auth,browserLocalPersistence);
    return signInWithEmailAndPassword(auth,email,password);
  },
  async google(){
    await setPersistence(auth,browserLocalPersistence);
    return signInWithPopup(auth,googleProvider);
  },
  logout:()=>signOut(auth),
  on:callback=>onAuthStateChanged(auth,callback)
};

export const isOwner=user=>!!user&&(user.uid===ARW.ownerUid||String(user.email||'').toLowerCase()===ARW.ownerEmail.toLowerCase());

function stableClientMatch(existing,master){
  const names=[master.name,...String(master.aliases||'').split(',')].map(normalize).filter(Boolean);
  return existing.find(c=>names.includes(normalize(c.name))||names.some(n=>n&&normalize(c.name).includes(n)&&n.length>4));
}

export async function ensureMasterData(user){
  if(!isOwner(user))return;
  const settingsRef=ref('settings','main');
  const settingsSnap=await getDoc(settingsRef);
  const current=settingsSnap.exists()?settingsSnap.data():{};
  if(current.masterVersion===MASTER_VERSION)return;
  const [ps,cs,ss]=await Promise.all([getDocs(col('products')),getDocs(col('clients')),getDocs(col('suppliers'))]);
  const existingProducts=ps.docs.map(d=>({id:d.id,...d.data()}));
  const existingClients=cs.docs.map(d=>({id:d.id,...d.data()}));
  const existingSuppliers=ss.docs.map(d=>({id:d.id,...d.data()}));
  const batch=writeBatch(db);
  for(const p of MASTER_PRODUCTS){
    const old=existingProducts.find(x=>String(x.code||'').toUpperCase()===p.code);
    const merged={...(old||{}),...p,id:p.id,masterVersion:MASTER_VERSION,updatedAt:now()};
    batch.set(ref('products',p.id),merged,{merge:true});
    if(old&&old.id!==p.id)batch.set(ref('products',old.id),{archived:true,duplicateOf:p.id,updatedAt:now()},{merge:true});
  }
  for(const c of MASTER_CLIENTS){
    const old=stableClientMatch(existingClients,c);
    const merged={...(old||{}),...c,id:c.id,prices:old?.prices||c.prices||{},masterVersion:MASTER_VERSION,updatedAt:now()};
    batch.set(ref('clients',c.id),merged,{merge:true});
    if(old&&old.id!==c.id)batch.set(ref('clients',old.id),{archived:true,duplicateOf:c.id,updatedAt:now()},{merge:true});
  }
  for(const s of MASTER_SUPPLIERS){
    const old=existingSuppliers.find(x=>normalize(x.name)===normalize(s.name));
    batch.set(ref('suppliers',s.id),{...(old||{}),...s,id:s.id,updatedAt:now()},{merge:true});
    if(old&&old.id!==s.id)batch.set(ref('suppliers',old.id),{archived:true,duplicateOf:s.id,updatedAt:now()},{merge:true});
  }
  batch.set(settingsRef,{id:'main',appName:'ARW2026',companyName:'MOHAMMAD ARSLAN WARIS',companyNif:'X6389988J',companyAddress:'CALLE SAN PABLO 17, 09003 BURGOS',companyPhone:'631 667 893',companyEmail:ARW.ownerEmail,invoiceSeries:'FA',invoiceDigits:5,defaultTransport:10,defaultVat:4,masterVersion:MASTER_VERSION,version:ARW.version,updatedAt:now()},{merge:true});
  batch.set(ref('series','FA'),{id:'FA',prefix:'FA',next:1,digits:5,active:true,updatedAt:now()},{merge:true});
  await batch.commit();
}

export function subscribeCollections(onState,onError){
  const state=Object.fromEntries(COLLECTIONS.map(c=>[c,[]]));
  const unsubs=[];
  for(const name of COLLECTIONS){
    const q=name==='audit'?query(col(name),orderBy('at','desc'),limit(300)):col(name);
    unsubs.push(onSnapshot(q,snap=>{
      state[name]=snap.docs.map(d=>({id:d.id,...d.data()})).filter(x=>!x.archived);
      onState({...state});
    },err=>onError?.(name,err)));
  }
  return()=>unsubs.forEach(u=>u());
}

export async function saveEntity(name,obj,action='save',user=null){
  const id=obj.id||uid(name.slice(0,3));
  await setDoc(ref(name,id),{...obj,id,updatedAt:now()},{merge:true});
  if(user){
    const auditId=uid('a');
    await setDoc(ref('audit',auditId),{id:auditId,action,entity:name,entityId:id,userEmail:user.email||'',userUid:user.uid,at:now()});
  }
  return id;
}
export async function deleteEntity(name,id){await deleteDoc(ref(name,id));}

export async function saveDraft(invoice,user){
  const id=invoice.id||uid('inv');
  await setDoc(ref('invoices',id),{...invoice,id,status:'draft',updatedAt:now()},{merge:true});
  const auditId=uid('a');
  await setDoc(ref('audit',auditId),{id:auditId,action:'DRAFT_SAVE',entity:'invoices',entityId:id,userEmail:user?.email||'',userUid:user?.uid||'',at:now()});
  return id;
}

export async function emitInvoice(invoice,user){
  if(!navigator.onLine)throw new Error('PARA EMITIR UNA FACTURA DEBES TENER CONEXIÓN A INTERNET');
  const calc=calcInvoice(invoice);const invoiceId=invoice.id||uid('inv');const sid=invoice.seriesId||'FA';
  return runTransaction(db,async tx=>{
    const sref=ref('series',sid);const ss=await tx.get(sref);const s=ss.exists()?ss.data():{prefix:sid,next:1,digits:5};
    const next=Number(s.next||1),number=`${s.prefix||sid}-${String(next).padStart(Number(s.digits||5),'0')}`;
    const emitted={...calc,id:invoiceId,number,status:'issued',issuedAt:now(),updatedAt:now(),clientSnapshot:invoice.clientSnapshot||null};
    tx.set(ref('invoices',invoiceId),emitted,{merge:false});
    tx.set(sref,{...s,id:sid,next:next+1,updatedAt:now()},{merge:true});
    for(const line of emitted.lines){
      const qty=stockMovementQty(line);const mid=uid('sm');
      tx.set(ref('stockMoves',mid),{id:mid,productId:line.productId,qty:-qty,type:'sale',location:'ALMACEN',sourceId:invoiceId,note:`FACTURA ${number}`,date:invoice.date,createdAt:now()});
    }
    for(const orderId of invoice.sourceOrderIds||[]){tx.set(ref('orders',orderId),{status:'invoiced',invoiceId,updatedAt:now()},{merge:true});}
    if(Number(emitted.paid||0)>0){const pid=uid('pay');tx.set(ref('payments',pid),{id:pid,clientId:invoice.clientId,date:invoice.date,amount:Number(emitted.paid),method:invoice.paymentMethod||'efectivo',allocations:[{invoiceId,amount:Number(emitted.paid)}],createdAt:now()});}
    const aid=uid('a');tx.set(ref('audit',aid),{id:aid,action:'INVOICE_ISSUE',entity:'invoices',entityId:invoiceId,number,userEmail:user?.email||'',userUid:user?.uid||'',at:now()});
    return emitted;
  });
}

export async function recordPayment(payment,user){
  const id=payment.id||uid('pay');
  await runTransaction(db,async tx=>{
    const refs=(payment.allocations||[]).map(a=>({a,ir:ref('invoices',a.invoiceId)}));
    const snaps=[];for(const item of refs)snaps.push({item,snap:await tx.get(item.ir)});
    tx.set(ref('payments',id),{...payment,id,createdAt:now()});
    for(const {item,snap} of snaps){if(!snap.exists())continue;const inv=snap.data();tx.set(item.ir,{paid:Number(inv.paid||0)+Number(item.a.amount||0),updatedAt:now()},{merge:true});}
    const aid=uid('a');tx.set(ref('audit',aid),{id:aid,action:'PAYMENT',entity:'payments',entityId:id,userEmail:user?.email||'',userUid:user?.uid||'',at:now()});
  });
  return id;
}

export async function voidInvoice(invoice,{returnStock=false,reason=''},user){
  await runTransaction(db,async tx=>{
    tx.set(ref('invoices',invoice.id),{status:'void',voidReason:String(reason||'').toUpperCase(),voidedAt:now(),updatedAt:now()},{merge:true});
    if(returnStock)for(const line of calcInvoice(invoice).lines){const mid=uid('sm');tx.set(ref('stockMoves',mid),{id:mid,productId:line.productId,qty:stockMovementQty(line),type:'void_return',location:'ALMACEN',sourceId:invoice.id,note:`ANULADA ${invoice.number}`,date:new Date().toISOString().slice(0,10),createdAt:now()});}
    const aid=uid('a');tx.set(ref('audit',aid),{id:aid,action:'INVOICE_VOID',entity:'invoices',entityId:invoice.id,reason,userEmail:user?.email||'',userUid:user?.uid||'',at:now()});
  });
}

export async function createRectification(original,newLines,reason,user,direction='credit'){
  if(!navigator.onLine)throw new Error('SE NECESITA CONEXIÓN PARA RECTIFICAR');
  const sid=original.seriesId||'FA';const id=uid('inv');
  return runTransaction(db,async tx=>{
    const sref=ref('series',sid);const ss=await tx.get(sref);const s=ss.exists()?ss.data():{prefix:sid,next:1,digits:5};
    const next=Number(s.next||1),number=`${s.prefix||sid}-R${String(next).padStart(Number(s.digits||5),'0')}`;
    const credit=calcInvoice({id,clientId:original.clientId,date:new Date().toISOString().slice(0,10),type:direction==='debit'?'debit':'credit',status:'issued',seriesId:sid,number,originalInvoiceId:original.id,originalInvoiceNumber:original.number,reason:String(reason||'').toUpperCase(),transportType:'fixed',transportValue:0,discount:0,lines:newLines,clientSnapshot:original.clientSnapshot});
    tx.set(ref('invoices',id),{...credit,issuedAt:now(),updatedAt:now()});
    tx.set(sref,{...s,next:next+1,updatedAt:now()},{merge:true});
    tx.set(ref('invoices',original.id),{rectificationIds:[...(original.rectificationIds||[]),id],updatedAt:now()},{merge:true});
    const aid=uid('a');tx.set(ref('audit',aid),{id:aid,action:'RECTIFICATION',entity:'invoices',entityId:id,originalId:original.id,userEmail:user?.email||'',userUid:user?.uid||'',at:now()});
    return credit;
  });
}
export async function forceMasterData(user){if(!isOwner(user))throw new Error('SOLO PROPIETARIO');await setDoc(ref('settings','main'),{masterVersion:'',updatedAt:now()},{merge:true});await ensureMasterData(user);}
