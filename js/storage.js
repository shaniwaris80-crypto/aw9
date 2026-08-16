import {firebaseApp} from './firebase.js';
import {getStorage,ref,uploadBytes,getDownloadURL} from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-storage.js';
import {invoicePdfBlob} from './pdf.js';
const storage=getStorage(firebaseApp);
const safe=v=>String(v||'documento').replace(/[^A-Za-z0-9._-]+/g,'_');
export async function archiveInvoicePdf(inv,client,settings){if(!inv?.id||!inv?.number)throw new Error('FACTURA SIN IDENTIFICADOR');const blob=invoicePdfBlob(inv,client,settings,false),path=`companies/arw2026/invoices/${safe(inv.id)}/${safe(inv.number)}.pdf`,r=ref(storage,path),snap=await uploadBytes(r,blob,{contentType:'application/pdf',customMetadata:{invoiceId:String(inv.id),invoiceNumber:String(inv.number),issuedAt:String(inv.issuedAt||'')}}),url=await getDownloadURL(snap.ref);return{path,url,size:blob.size}}
export async function uploadPurchaseAttachment(purchaseId,file){if(!purchaseId||!file)throw new Error('FALTA COMPRA O ARCHIVO');const path=`companies/arw2026/purchases/${safe(purchaseId)}/${Date.now()}_${safe(file.name||'adjunto')}`,r=ref(storage,path),snap=await uploadBytes(r,file,{contentType:file.type||'application/octet-stream'}),url=await getDownloadURL(snap.ref);return{path,url,name:file.name||'ADJUNTO',size:file.size||0,type:file.type||''}}
