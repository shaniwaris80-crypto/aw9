import {ARW} from '../firebase-config.js';
import {authApi,col,ref,getDocs,getDoc,setDoc,deleteDoc,writeBatch,db} from './firebase.js';
import {uid,nowISO,isoDate} from './utils.js';

const COLLECTIONS=['clients','products','suppliers','orders','routes','deliveries','invoices','payments','purchases','supplierPayments','stockMovements','transfers','wastes','returns','inventoryCounts','expenses','cashMovements','bankMovements','documents','quotes','proformas','deliveryNotes','creditNotes','priceRules','communications','attachments','closures','audit','members','containers'];
const defaultSettings={id:'main',appName:'ARW2026',companyName:'MOHAMMAD ARSLAN WARIS',tradeName:'ARW2026',companyNif:'X6389988J',companyAddress:'CALLE SAN PABLO 17, 09003 BURGOS',companyPhone:'631 667 893',companyEmail:ARW.ownerEmail,invoiceSeries:'FA',nextInvoiceNumber:1,invoiceDigits:5,defaultVat:4,defaultTransport:10,currency:'EUR',locations:['ALMACEN','FURGONETA','SAN PABLO','SAN LESMES','SANTIAGO'],lockedPeriods:[],version:ARW.version};
const blank=()=>Object.fromEntries([['settings',{...defaultSettings}],...COLLECTIONS.map(c=>[c,[]])]);
let state=blank(),user=null,role='none',ready=false,online=false,lastError='';
const listeners=new Set();
const cacheKey='arw2026_cache_v1';
function emit(){listeners.forEach(fn=>fn(state,{user,role,ready,online,lastError}))}
function cache(){try{localStorage.setItem(cacheKey,JSON.stringify(state))}catch{}}
try{const c=JSON.parse(localStorage.getItem(cacheKey)||'null');if(c)state={...blank(),...c}}catch{}
async function read(name){const s=await getDocs(col(name));return s.docs.map(d=>({id:d.id,...d.data()}))}
async function audit(action,entity,entityId,details={}){if(!user)return;const a={id:uid('audit'),action,entity,entityId,details,userUid:user.uid,userEmail:user.email,at:nowISO()};await setDoc(ref('audit',a.id),a).catch(()=>{});if(['owner','admin','manager'].includes(role))state.audit.unshift(a)}
async function save(name,obj,action='update'){if(!obj.id)obj.id=uid(name.slice(0,3));obj.updatedAt=nowISO();const arr=state[name];const i=arr.findIndex(x=>x.id===obj.id);if(i<0)arr.unshift(obj);else arr[i]={...arr[i],...obj};cache();emit();if(user){await setDoc(ref(name,obj.id),obj,{merge:true});await audit(action,name,obj.id)}return obj}
async function remove(name,id){state[name]=state[name].filter(x=>x.id!==id);cache();emit();if(user){await deleteDoc(ref(name,id));await audit('delete',name,id)}}
async function bulkSave(name,items,action='bulk_update'){if(!items.length)return;const batch=writeBatch(db);for(const item of items){if(!item.id)item.id=uid(name.slice(0,3));item.updatedAt=nowISO();batch.set(ref(name,item.id),item,{merge:true});const i=state[name].findIndex(x=>x.id===item.id);i<0?state[name].push(item):state[name][i]={...state[name][i],...item}}await batch.commit();cache();emit();await audit(action,name,'multiple',{count:items.length})}
async function saveSettings(patch){state.settings={...state.settings,...patch,id:'main',updatedAt:nowISO()};cache();emit();await setDoc(ref('settings','main'),state.settings,{merge:true});await audit('settings','settings','main',Object.keys(patch));return state.settings}
function isOwnerUser(){return !!user&&(user.uid===ARW.ownerUid||String(user.email||'').toLowerCase()===String(ARW.ownerEmail).toLowerCase())}
async function ensureOwner(){
  if(isOwnerUser()){
    role='owner';
    const x={id:user.uid,email:user.email||ARW.ownerEmail,name:'ADMINISTRADOR',role:'owner',active:true,updatedAt:nowISO()};
    await setDoc(ref('members',user.uid),x,{merge:true}).catch(()=>{});
    return;
  }
  const r=ref('members',user.uid),snap=await getDoc(r);
  if(snap.exists()&&snap.data().active)role=snap.data().role||'viewer';else role='none';
}
async function seed(){if(state.products.length)return;const P=(code,name,mode,unit,kgPerBox,buy,sell,vat,minStock=0)=>({id:uid('prod'),code,name,mode,unit,kgPerBox,buyPrice:buy,sellPrice:sell,vat,minStock,active:true});const products=[P('MM','MACHO MADURO','caja_kg','kg',22,1.60,1.90,4,44),P('MV','MACHO VERDE','caja_kg','kg',22,1.25,1.55,4,44),P('BN','BANANA','caja_kg','kg',19,1,1.30,4,38),P('GU','GUINEO','caja_kg','kg',20,1.2,1.5,4,40),P('YU','YUCA','caja_kg','kg',18,1.4,1.8,4,36),P('NM','ÑAME','caja_kg','kg',20,1.99,2.4,4,20),P('ML','MALANGA','caja_kg','kg',12,3.25,3.8,4,12),P('YT','YAUTÍA','caja_kg','kg',10,3.25,3.8,4,10),P('LM','LIMA','caja_fija','caja',0,10,12.5,4,2),P('CL','CILANTRO','manojo','manojo',0,.4,.6,10,50),P('NZ','NARANJA ZUMO','kg','kg',0,.75,.99,4,20),P('CR','CEBOLLA ROJA','caja_kg','kg',10,1,1.3,4,20),P('TD','TOMATE DANIELA','caja_kg','kg',8,1.5,2.2,4,16)];await bulkSave('products',products,'seed')}
async function load(){
  const ss=await getDoc(ref('settings','main'));
  if(ss.exists())state.settings={...defaultSettings,...ss.data()};else await setDoc(ref('settings','main'),state.settings,{merge:true});
  for(const c of COLLECTIONS){
    if(c==='members'){state.members=role==='owner'?await read('members'):[];continue}
    if(c==='audit'){state.audit=['owner','admin','manager'].includes(role)?await read('audit'):[];continue}
    state[c]=await read(c);
  }
  await seed();online=true;lastError='';cache();emit();
}
authApi.onChange(async u=>{
  user=u;ready=false;online=false;lastError='';
  if(!u){role='none';ready=true;emit();return}
  try{
    await ensureOwner();
    if(role==='none')throw new Error('SIN PERMISO PARA ARW2026');
    await load();
  }catch(e){
    console.error(e);
    lastError=e?.code||e?.message||String(e);
    if(isOwnerUser())role='owner';
    online=false;
  }
  ready=true;emit();
});
export const Store={get state(){return state},get user(){return user},get role(){return role},get ready(){return ready},get online(){return online},get lastError(){return lastError},subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn)},login:authApi.login,loginGoogle:authApi.loginGoogle,logout:authApi.logout,save,remove,bulkSave,saveSettings,audit,load,uid,isoDate,can(scope){if(['owner','admin','manager'].includes(role))return true;return role===scope}};
