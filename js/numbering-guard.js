import {Store} from './store.js';
import {db,ref} from './firebase.js';
import {runTransaction} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

const original=Store.saveSettings.bind(Store);
Store.saveSettings=async function(patch){
  if(Object.prototype.hasOwnProperty.call(patch||{},'nextInvoiceNumber')&&Store.user){
    const expected=Number(Store.state.settings.nextInvoiceNumber||1);
    const requested=Number(patch.nextInvoiceNumber||expected+1);
    const settingsRef=ref('settings','main');
    await runTransaction(db,async tx=>{
      const snap=await tx.get(settingsRef);
      const remote=Number(snap.exists()?(snap.data().nextInvoiceNumber||1):1);
      if(remote!==expected){
        alert(`LA NUMERACIÓN CAMBIÓ EN OTRO DISPOSITIVO.\n\nSE ESPERABA ${expected} Y FIREBASE YA ESTÁ EN ${remote}.\n\nRECARGA/REABRE LA FACTURA ANTES DE EMITIR.`);
        throw new Error('CONFLICTO DE NUMERACIÓN DE FACTURA');
      }
      tx.set(settingsRef,{nextInvoiceNumber:requested,updatedAt:new Date().toISOString()},{merge:true});
    });
  }
  return original(patch);
};
