import {Store,st,refresh,n,upper,toast,modal,closeModal,calcInvoice,makeStockMove} from './context.js';

function invoiceFromOpenModal(){const title=upper(document.querySelector('#modalRoot .modal-head h3')?.textContent||'');return st().invoices.find(i=>i.number&&title.includes(upper(i.number)))||null}

document.addEventListener('click',e=>{
  const b=e.target.closest('#voidInvoice');if(!b)return;
  e.preventDefault();e.stopImmediatePropagation();
  const inv=invoiceFromOpenModal();if(!inv)return toast('NO SE PUDO IDENTIFICAR LA FACTURA','bad');
  if(inv.status==='draft')return;
  const x=calcInvoice(inv);
  const m=modal(`ANULAR · ${upper(inv.number)}`,`<form id="safeVoidForm"><div class="warning-box">LA FACTURA QUEDARÁ EN HISTORIAL COMO ANULADA. ESTA OPERACIÓN SE AUDITA.</div><label>MOTIVO OBLIGATORIO<input name="reason" required placeholder="DUPLICADA, ERROR DE EMISIÓN, OPERACIÓN CANCELADA..."></label><label class="check"><input name="returnStock" type="checkbox"> DEVOLVER AL STOCK LA MERCANCÍA DE ESTA FACTURA</label>${x.paid>0?`<label class="check"><input name="reversePayment" type="checkbox" checked> REGISTRAR REVERSIÓN DEL COBRO DE ${x.paid.toFixed(2)} €</label>`:''}<div class="modal-actions"><button class="btn bad">CONFIRMAR ANULACIÓN</button></div></form>`);
  m.querySelector('#safeVoidForm').onsubmit=async ev=>{
    ev.preventDefault();const f=new FormData(ev.currentTarget),reason=upper(f.get('reason'));
    if(f.get('returnStock'))for(const l of x.lines){const q=l.mode==='caja_kg'?n(l.net):n(l.qty);await Store.save('stockMovements',makeStockMove({productId:l.productId,qty:q,location:'ALMACEN',type:'void_return',sourceId:inv.id,note:`ANULADA ${inv.number} · ${reason}`}),'void_stock_return')}
    if(f.get('reversePayment')&&x.paid>0)await Store.save('payments',{id:Store.uid('pay'),clientId:inv.clientId,date:new Date().toISOString().slice(0,10),amount:-x.paid,method:'reversal',invoiceId:inv.id,note:`REVERSIÓN POR ANULACIÓN ${inv.number}`},'payment_reversal');
    if(inv.sourceOrderId){const o=st().orders.find(o=>o.id===inv.sourceOrderId);if(o)await Store.save('orders',{...o,status:'delivered',invoiceId:null},'invoice_void_order_reopen')}
    await Store.save('invoices',{...inv,status:'void',voidReason:reason,voidedAt:new Date().toISOString(),voidStockReturned:!!f.get('returnStock')},'void');toast('FACTURA ANULADA CON TRAZABILIDAD');closeModal();refresh();
  };
},true);
