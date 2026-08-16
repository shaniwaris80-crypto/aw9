import {firebaseApp} from './firebase.js';
import {getFunctions,httpsCallable} from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-functions.js';
const functions=getFunctions(firebaseApp,'europe-west1');
const submit=httpsCallable(functions,'submitVerifactu',{timeout:60000}),statusCall=httpsCallable(functions,'verifactuBackendStatus',{timeout:20000});
export async function submitFiscalRecord(recordId){const r=await submit({recordId});return r.data||{}}
export async function submitFiscalRecords(recordIds=[],onProgress=()=>{}){const results=[];let done=0;for(const id of recordIds){try{const data=await submitFiscalRecord(id);results.push({id,ok:Boolean(data.ok),...data})}catch(error){results.push({id,ok:false,error:String(error?.message||error),code:String(error?.code||'')})}done++;onProgress({done,total:recordIds.length,last:results.at(-1)})}return results}

export async function checkFiscalBackend(){const r=await statusCall({});return r.data||{}}
