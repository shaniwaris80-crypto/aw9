import fs from 'node:fs';
import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {doc,getDoc,setDoc,updateDoc} from 'firebase/firestore';

const projectId='demo-arw2026';
const env=await initializeTestEnvironment({projectId,firestore:{rules:fs.readFileSync('firestore.rules','utf8'),host:'127.0.0.1',port:8080}});
try{
  await env.withSecurityRulesDisabled(async ctx=>{const db=ctx.firestore();for(const [uid,role] of [['bill1','billing'],['wh1','warehouse'],['del1','delivery'],['mgr1','manager']])await setDoc(doc(db,`companies/arw2026/members/${uid}`),{active:true,role,email:`${uid}@test.local`});await setDoc(doc(db,'companies/arw2026/series/FA'),{id:'FA',prefix:'FA',next:10,digits:5,active:true});});
  const billing=env.authenticatedContext('bill1',{email:'bill@test.local'}).firestore(),warehouse=env.authenticatedContext('wh1').firestore(),delivery=env.authenticatedContext('del1').firestore(),manager=env.authenticatedContext('mgr1').firestore();
  await assertSucceeds(getDoc(doc(billing,'companies/arw2026/series/FA')));
  await assertSucceeds(updateDoc(doc(billing,'companies/arw2026/series/FA'),{next:11,updatedAt:'x'}));
  await assertFails(updateDoc(doc(billing,'companies/arw2026/series/FA'),{next:20,updatedAt:'x'}));
  await assertSucceeds(setDoc(doc(billing,'companies/arw2026/invoices/inv1'),{status:'issued',number:'FA-00010',date:'2026-08-16'}));
  await assertFails(updateDoc(doc(billing,'companies/arw2026/invoices/inv1'),{number:'FA-HACK'}));
  await assertSucceeds(setDoc(doc(billing,'companies/arw2026/payments/p1'),{amount:10,date:'2026-08-16'}));
  await assertFails(updateDoc(doc(billing,'companies/arw2026/payments/p1'),{amount:999}));
  await assertSucceeds(setDoc(doc(warehouse,'companies/arw2026/stockMoves/s1'),{productId:'p1',qty:10,location:'ALMACEN'}));
  await assertFails(updateDoc(doc(warehouse,'companies/arw2026/stockMoves/s1'),{qty:999}));
  await assertFails(setDoc(doc(delivery,'companies/arw2026/invoices/x'),{status:'issued'}));
  await assertSucceeds(setDoc(doc(delivery,'companies/arw2026/notifications/e1'),{type:'client_error',message:'x'}));
  await assertSucceeds(setDoc(doc(billing,'companies/arw2026/fiscalRecords/vf1'),{hash:'A'.repeat(64),status:'prepared'}));
  await assertFails(updateDoc(doc(billing,'companies/arw2026/fiscalRecords/vf1'),{status:'accepted'}));
  await assertSucceeds(setDoc(doc(billing,'companies/arw2026/fiscalChain/state'),{sequence:1,lastHash:'A'.repeat(64),lastInvoiceNumber:'FA-1',lastInvoiceDate:'16-08-2026',lastRecordId:'vf1'}));
  await assertSucceeds(updateDoc(doc(billing,'companies/arw2026/fiscalChain/state'),{sequence:2,lastHash:'B'.repeat(64),lastInvoiceNumber:'FA-2',lastInvoiceDate:'16-08-2026',lastRecordId:'vf2',updatedAt:'x'}));
  await assertFails(updateDoc(doc(billing,'companies/arw2026/fiscalChain/state'),{sequence:4,lastHash:'C'.repeat(64)}));
  await assertSucceeds(setDoc(doc(manager,'companies/arw2026/settings/main'),{version:'7'}));
  console.log('Firestore security rules tests OK');
}finally{await env.cleanup()}
