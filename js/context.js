import {Store} from './store.js';
import {$,$$,esc,n,money,num,upper,isoDate,fmtDate,toast,modal,closeModal,download,monthKey,quarterKey,round2} from './utils.js';
import {PRODUCT_MODES,lineFromProduct,calcLine,calcInvoice,invoiceStatus,stockForProduct,stockDisplay,clientBalance,marginLine,makeStockMove,nextInvoiceNo} from './domain.js';
import {buildInvoicePdf,invoicesZip,summaryPdf} from './pdf.js';
export {Store,$,$$,esc,n,money,num,upper,isoDate,fmtDate,toast,modal,closeModal,download,monthKey,quarterKey,round2,PRODUCT_MODES,lineFromProduct,calcLine,calcInvoice,invoiceStatus,stockForProduct,stockDisplay,clientBalance,marginLine,makeStockMove,nextInvoiceNo,buildInvoicePdf,invoicesZip,summaryPdf};
export const st=()=>Store.state;
export const product=id=>st().products.find(x=>x.id===id);
export const client=id=>st().clients.find(x=>x.id===id);
export const selectedInvoices=new Set();
export const refresh=()=>window.ARW_RENDER?.();
export function kpi(label,val,sub='',cls=''){return `<div class="kpi ${cls}"><small>${esc(label)}</small><strong>${esc(val)}</strong>${sub?`<span>${esc(sub)}</span>`:''}</div>`}
export function table(headers,rows,empty='SIN DATOS'){return `<div class="table-wrap"><table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.length?rows.join(''):`<tr><td colspan="${headers.length}" class="empty">${empty}</td></tr>`}</tbody></table></div>`}
export function actions(items){return `<div class="actions">${items.map(([txt,act,cls=''])=>`<button class="btn ${cls}" data-act="${act}">${txt}</button>`).join('')}</div>`}
