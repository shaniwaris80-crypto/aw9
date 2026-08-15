import { firebaseConfig, AW9 } from '../firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import { getAnalytics, isSupported as analyticsSupported } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-analytics.js';
import { getAuth, setPersistence, browserLocalPersistence, browserSessionPersistence, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-storage.js';
import { getFirestore, collection, doc, getDocs, getDoc, setDoc, deleteDoc, writeBatch, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

const app = initializeApp(firebaseConfig);
analyticsSupported().then(ok=>{ if(ok) getAnalytics(app); }).catch(()=>{});
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

const LOCAL_KEY='aw9_state_v2';
const COLLECTIONS=['products','clients','suppliers','shops','invoices','purchases','stockMovements','payments','expenses','wastes','returns','transfers','orders','routes','deliveries','priceRules','closures','cashMovements','bankMovements','documents','supplierPayments'];

const uid=(p='id')=>`${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,9)}`;
const today=()=>new Date().toISOString().slice(0,10);
const now=()=>new Date().toISOString();

const seedProducts=[
  ['MM','MACHO MADURO','caja_kg','kg',22,1.60,1.90,4,15,'Plátanos López',2],
  ['MV','MACHO VERDE','caja_kg','kg',22,1.25,1.55,4,15,'Plátanos López',2],
  ['GU','GUINEO','caja_kg','kg',20,1.20,1.50,4,15,'',1],
  ['YU','YUCA','caja_kg','kg',18,1.40,1.80,4,15,'',1],
  ['NM','ÑAME','caja_kg','kg',20,1.99,2.40,4,15,'',1],
  ['ML','MALANGA','caja_kg','kg',12,3.25,3.80,4,15,'Eurobanan',1],
  ['YT','YAUTÍA','caja_kg','kg',10,3.25,3.80,4,15,'Eurobanan',1],
  ['LM','LIMA','caja_fija','caja',0,10,12.50,4,15,'',1],
  ['CL','CILANTRO','manojo','manojo',0,.40,.60,10,20,'',50],
  ['JG','JENGIBRE','kg','kg',0,2.50,2.90,10,15,'',5],
  ['AP','AGUACATE PREMIUM','caja_fija','caja',0,18,21,4,15,'Eurobanan',1],
  ['AV','AVOCADO','caja_fija','caja',0,20.4,25,4,15,'Eurobanan',1],
  ['OK','OKRA','caja_fija','caja',0,27,31,4,12,'Eurobanan',1],
  ['BN','BANANA','caja_kg','kg',19,1,1.30,4,15,'',1],
  ['NZ','NARANJA ZUMO','kg','kg',0,.75,.99,4,15,'',15],
  ['CR','CEBOLLA ROJA','caja_kg','kg',10,1,1.30,4,15,'',1],
  ['TD','TOMATE DANIELA','caja_kg','kg',8,1.50,2.20,4,15,'',1]
].map(([code,name,mode,unit,kgPerBox,buyPrice,sellPrice,vat,minMargin,supplier,minStock])=>({id:uid('prod'),code,name,mode,unit,kgPerBox,buyPrice,sellPrice,vat,minMargin,supplier,minStock,active:true,createdAt:now()}));

const seedClients=[
  ['Adnan Asif','X7128589S','C/ Padre Flórez 3, Burgos'],['ABBAS','',''],['NADEEM','',''],['BIBIANA ARBOLEDA','49540238D','ARANDA DE DUERO'],['JOSE PATXI ALIMENTACION','',''],['ROMINA-PREMIER','',''],['MUSTAFA','',''],['MALAK','',''],['DOMINGO','11139465','Plaza Santiago 2'],['COLOMBIANO','','']
].map(([name,nif,address])=>({id:uid('cli'),name,nif,address,phone:'',email:'',paymentMethod:'efectivo',paymentTerms:0,creditLimit:0,transportType:'percent',transportValue:10,notes:'',active:true,createdAt:now()}));

const seedSuppliers=['Plátanos López','Eurobanan','Fruta Viva','ESMO','Montenegro','José Antonio'].map(name=>({id:uid('sup'),name,nif:'',phone:'',email:'',address:'',paymentTerms:0,notes:'',active:true,createdAt:now()}));
const seedShops=['San Pablo','San Lesmes','Santiago'].map(name=>({id:uid('shop'),name,address:'',active:true,createdAt:now()}));

const defaultSettings=()=>({
  id:'main',version:'2.0.0',companyName:'Mohammad Arslan Waris',tradeName:'FACTUMADRID AW9',companyNif:'X6389988J',companyAddress:'Calle San Pablo 17, 09003 Burgos',companyPhone:'631 667 893',companyEmail:AW9.ownerEmail,
  invoiceSeries:'F',nextInvoiceNumber:1,invoiceNumberDigits:5,defaultVat:4,defaultMargin:15,defaultTransport:10,currency:'EUR',pin:'1234',theme:'light',lockedPeriods:[],createdAt:now(),updatedAt:now()
});

function blankState(){const o={settings:defaultSettings(),member:null,members:[],audit:[]};COLLECTIONS.forEach(c=>o[c]=[]);return o;}
let state=blankState();
let user=null;
let role='none';
let ready=false;
let cloudReady=false;
const listeners=new Set();

function emit(){listeners.forEach(fn=>{try{fn(state,{user,role,ready,cloudReady});}catch(e){console.error(e)}})}
function cache(){try{localStorage.setItem(LOCAL_KEY,JSON.stringify(state));}catch{}}
function loadCache(){try{const x=JSON.parse(localStorage.getItem(LOCAL_KEY)||'null');if(x&&x.settings){state={...blankState(),...x};COLLECTIONS.forEach(c=>{if(!Array.isArray(state[c]))state[c]=[]});}}catch{}}
loadCache();

function colRef(name){return collection(db,'companies',AW9.companyId,name)}
function docRef(name,id){return doc(db,'companies',AW9.companyId,name,id)}

async function readCollection(name){const snap=await getDocs(colRef(name));return snap.docs.map(d=>({id:d.id,...d.data()}));}
async function loadRemote(){
  const settingsSnap=await getDoc(docRef('settings','main'));
  if(settingsSnap.exists()) state.settings={...defaultSettings(),...settingsSnap.data(),id:'main'};
  else await setDoc(docRef('settings','main'),state.settings,{merge:true});
  for(const name of COLLECTIONS){ state[name]=await readCollection(name); }
  if(!state.products.length){state.products=seedProducts;await bulkSet('products',seedProducts,false)}
  if(!state.clients.length){state.clients=seedClients;await bulkSet('clients',seedClients,false)}
  if(!state.suppliers.length){state.suppliers=seedSuppliers;await bulkSet('suppliers',seedSuppliers,false)}
  if(!state.shops.length){state.shops=seedShops;await bulkSet('shops',seedShops,false)}
  cache();cloudReady=true;emit();
}

async function ensureMember(){
  if(!user)return;
  const ref=docRef('members',user.uid);const snap=await getDoc(ref);
  if(user.uid===AW9.ownerUid){
    const data={email:user.email||AW9.ownerEmail,role:'owner',active:true,name:'Administrador',updatedAt:now()};
    await setDoc(ref,data,{merge:true});state.member={id:user.uid,...data};role='owner';
  } else if(snap.exists()){state.member={id:user.uid,...snap.data()};role=state.member.active?state.member.role:'none'} else {role='none';state.member=null;}
  state.members = role==='owner' ? await readCollection('members') : (state.member?[state.member]:[]);
}

async function audit(action,entity,entityId,details={}){
  if(!user)return;
  const a={id:uid('audit'),action,entity,entityId,userUid:user.uid,userEmail:user.email||'',at:now(),details};
  try{await setDoc(docRef('audit',a.id),a)}catch(e){console.warn('audit',e)}
}

async function save(name,obj,{auditAction='update',silent=false}={}){
  if(!obj.id)obj.id=uid(name.slice(0,3));obj.updatedAt=now();
  const arr=state[name]||[];const i=arr.findIndex(x=>x.id===obj.id);if(i>=0)arr[i]={...arr[i],...obj};else arr.unshift(obj);
  cache();emit();
  if(user){await setDoc(docRef(name,obj.id),obj,{merge:true});if(!silent)await audit(auditAction,name,obj.id)}
  return obj;
}
async function remove(name,id,{auditAction='delete'}={}){
  const i=(state[name]||[]).findIndex(x=>x.id===id);if(i>=0)state[name].splice(i,1);cache();emit();
  if(user){await deleteDoc(docRef(name,id));await audit(auditAction,name,id)}
}
async function saveSettings(patch){state.settings={...state.settings,...patch,id:'main',updatedAt:now()};cache();emit();if(user){await setDoc(docRef('settings','main'),state.settings,{merge:true});await audit('settings_update','settings','main',Object.keys(patch));}return state.settings}
async function bulkSet(name,items,doAudit=true){
  if(!items.length)return;const batch=writeBatch(db);items.forEach(x=>batch.set(docRef(name,x.id),x,{merge:true}));await batch.commit();if(doAudit)await audit('bulk_update',name,'multiple',{count:items.length});
}
async function bulkSave(name,items){
  if(!items.length)return;const map=new Map((state[name]||[]).map(x=>[x.id,x]));items.forEach(x=>{x.updatedAt=now();map.set(x.id,{...map.get(x.id),...x})});state[name]=[...map.values()];cache();emit();if(user)await bulkSet(name,items,true);
}

async function login(email,password,remember=true){await setPersistence(auth,remember?browserLocalPersistence:browserSessionPersistence);return signInWithEmailAndPassword(auth,email,password)}
async function saveMember(obj){ if(role!=='owner') throw new Error('Solo el propietario puede gestionar usuarios'); if(!obj.id) throw new Error('Introduce el UID de Firebase'); obj.updatedAt=now(); const i=state.members.findIndex(x=>x.id===obj.id); if(i>=0) state.members[i]={...state.members[i],...obj}; else state.members.unshift(obj); cache(); emit(); await setDoc(docRef('members',obj.id),obj,{merge:true}); await audit('member_update','members',obj.id); return obj;}
async function removeMember(id){ if(role!=='owner') throw new Error('Solo el propietario puede gestionar usuarios'); if(id===AW9.ownerUid) throw new Error('No se puede eliminar al propietario'); state.members=state.members.filter(x=>x.id!==id); cache();emit();await deleteDoc(docRef('members',id));await audit('member_delete','members',id);}
async function loadAudit(){ if(!user||!['owner','admin','manager'].includes(role)) return []; state.audit=(await readCollection('audit')).sort((a,b)=>String(b.at||'').localeCompare(String(a.at||''))); emit(); return state.audit;}
async function uploadFile(entity,entityId,file){if(!user)throw new Error('Inicia sesión');const safe=String(file.name||'archivo').replace(/[^a-zA-Z0-9._-]/g,'_');const path=`companies/${AW9.companyId}/${entity}/${entityId}/${Date.now()}_${safe}`;const ref=storageRef(storage,path);const snap=await uploadBytes(ref,file,{contentType:file.type||'application/octet-stream'});const url=await getDownloadURL(snap.ref);await audit('file_upload',entity,entityId,{name:file.name,path});return{name:file.name,type:file.type,size:file.size,path,url,uploadedAt:now(),uploadedBy:user.email||''};}
async function logout(){cloudReady=false;return signOut(auth)}

onAuthStateChanged(auth,async u=>{
  user=u;ready=false;cloudReady=false;
  if(!u){role='none';state.member=null;ready=true;emit();return;}
  try{await ensureMember();if(role==='none')throw new Error('Usuario sin permiso activo en AW9');await loadRemote();ready=true;emit();}
  catch(e){console.error(e);ready=true;cloudReady=false;emit();if(role==='none')signOut(auth).catch(()=>{});}
});

window.addEventListener('online',()=>{if(user)loadRemote().catch(()=>{})});
window.addEventListener('offline',()=>{cloudReady=false;emit()});

export const Store={
  get state(){return state},get user(){return user},get role(){return role},get ready(){return ready},get cloudReady(){return cloudReady},
  subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn)},login,logout,uploadFile,save,remove,saveSettings,bulkSave,saveMember,removeMember,audit,loadRemote,loadAudit,
  uid,today,now,
  can(scope){if(role==='owner'||role==='admin'||role==='manager')return true;if(scope==='billing')return role==='billing';if(scope==='warehouse')return role==='warehouse';if(scope==='delivery')return role==='delivery';return false;}
};
