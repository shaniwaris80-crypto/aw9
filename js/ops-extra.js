import {Store,st,client,refresh,kpi,table,esc,n,money,upper,isoDate,fmtDate,toast,modal,closeModal,round2,calcInvoice,invoiceStatus,clientBalance,summaryPdf} from './context.js';
import {clientsView as baseClientsView,clientModal,suppliersView as baseSuppliersView,warehouseView as baseWarehouseView} from './ops.js';

export const clientsViewPlus=()=>baseClientsView();
export function suppliersViewPlus(){return `${baseSuppliersView()}<div class="actions" style="margin-top:12px"><button class="btn primary" data-act="supplierPayment">REGISTRAR PAGO A PROVEEDOR</button></div>`}
export function warehouseViewPlus(){return `${baseWarehouseView()}<div class="actions" style="margin-top:12px"><button class="btn" data-act="containers">CONTROL DE ENVASES / CAJAS</button></div>`}

function clientInvoices(c){return st().invoices.filter(i=>i.clientId===c.id).slice().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')))}
function statementPdf(c){const invoices=clientInvoices(c).filter(i=>i.status!=='draft'&&i.status!=='void');summaryPdf(`ESTADO DE CUENTA · ${c.name}`,['FECHA','DOCUMENTO','TIPO','TOTAL','PAGADO','SALDO'],invoices.map(i=>{const x=calcInvoice(i);return [fmtDate(i.date),i.number||'',i.type==='credit'?'RECTIFICATIVA':'FACTURA',money(x.total),money(x.paid),money(x.pending)]}),`ESTADO_CUENTA_${upper(c.name).replace(/[^A-Z0-9]+/g,'_')}.pdf`)}
function statementWhatsapp(c){const debt=clientBalance(st(),c.id);const pending=clientInvoices(c).filter(i=>i.status!=='draft'&&i.status!=='void').map(calcInvoice).filter(i=>i.pending>0);const detail=pending.slice(0,10).map(i=>`${i.number}: ${money(i.pending)}`).join('\n');const msg=encodeURIComponent(`HOLA ${upper(c.name)}, SU SALDO ACTUAL EN ARW2026 ES ${money(debt)}.${detail?`\n\nPENDIENTES:\n${detail}`:''}\n\nGRACIAS.`);const phone=String(c.phone||'').replace(/\D/g,'');if(!phone)return toast('EL CLIENTE NO TIENE TELÉFONO','bad');window.open(`https://wa.me/${phone}?text=${msg}`,'_blank')}

export function client360Modal(c){
  if(!c)return;
  const invoices=clientInvoices(c);
  const valid=invoices.filter(i=>!['void','draft'].includes(i.status)).map(calcInvoice);
  const orders=st().orders.filter(o=>o.clientId===c.id);
  const billed=round2(valid.reduce((s,x)=>s+x.total,0));
  const iva=round2(valid.reduce((s,x)=>s+x.vatTotal,0));
  const paid=round2(valid.reduce((s,x)=>s+x.paid,0));
  const debt=clientBalance(st(),c.id);
  const m=modal(`CLIENTE 360º · ${upper(c.name)}`,`<div class="kpis">${kpi('FACTURADO NETO',money(billed))}${kpi('IVA NETO',money(iva))}${kpi('COBRADO',money(paid))}${kpi('SALDO',money(debt),'','warn')}${kpi('FACTURAS',String(invoices.length))}${kpi('PEDIDOS',String(orders.length))}</div><div class="grid2"><section class="panel"><h3>DATOS</h3><p><b>${esc(c.name)}</b></p><p>NIF/CIF: ${esc(c.nif||'—')}</p><p>${esc(c.address||'')}</p><p>${esc(c.phone||'')}</p><p>${esc(c.email||'')}</p><p>FORMA PAGO: ${upper(c.paymentMethod||'')}</p><p>LÍMITE CRÉDITO: ${money(c.creditLimit||0)}</p><div class="actions"><button class="btn primary" id="editClientData">EDITAR DATOS Y PRECIOS</button><button class="btn" id="clientStatementPdf">PDF ESTADO DE CUENTA</button><button class="btn" id="clientStatementWa">WHATSAPP SALDO</button></div></section><section class="panel"><h3>PRECIOS ESPECIALES</h3>${Object.entries(c.prices||{}).length?Object.entries(c.prices||{}).map(([pid,x])=>`<p>${esc(st().products.find(p=>p.id===pid)?.name||pid)} · <b>${money(x.price)}</b></p>`).join(''):'<p>SIN PRECIOS ESPECIALES</p>'}</section></div><h3>HISTORIAL DE FACTURAS</h3>${table(['FECHA','Nº','TIPO','TOTAL','IVA','PAGADO','SALDO','ESTADO'],invoices.slice(0,40).map(i=>{const x=calcInvoice(i);return `<tr><td>${fmtDate(i.date)}</td><td>${esc(i.number||'BORRADOR')}</td><td>${i.type==='credit'?'RECTIFICATIVA':'FACTURA'}</td><td>${money(x.total)}</td><td>${money(x.vatTotal)}</td><td>${money(x.paid)}</td><td>${money(x.pending)}</td><td>${invoiceStatus(i)}</td></tr>`}))}<h3>ÚLTIMOS PEDIDOS</h3>${table(['FECHA','ESTADO','LÍNEAS'],orders.slice(0,20).map(o=>`<tr><td>${fmtDate(o.date)}</td><td>${upper(o.status||'')}</td><td>${o.lines?.length||0}</td></tr>`))}`,{wide:true});
  m.querySelector('#editClientData').onclick=()=>clientModal(c);
  m.querySelector('#clientStatementPdf').onclick=()=>statementPdf(c);
  m.querySelector('#clientStatementWa').onclick=()=>statementWhatsapp(c);
}

export function supplierPaymentModal(){
  if(!st().suppliers.length)return toast('AÑADE UN PROVEEDOR PRIMERO','bad');
  const m=modal('PAGO A PROVEEDOR',`<form id="supplierPayForm"><div class="form-grid"><label>PROVEEDOR<select name="supplierId">${st().suppliers.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select></label><label>IMPORTE €<input name="amount" type="number" step=".01" required></label><label>FECHA<input name="date" type="date" value="${isoDate()}"></label><label>FORMA<select name="method"><option>TRANSFERENCIA</option><option>EFECTIVO</option><option>TARJETA</option><option>OTRA</option></select></label></div><label>REFERENCIA / NOTA<input name="note"></label><div class="modal-actions"><button class="btn primary">REGISTRAR PAGO</button></div></form>`);
  m.querySelector('#supplierPayForm').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget);await Store.save('supplierPayments',{id:Store.uid('spp'),supplierId:f.get('supplierId'),amount:n(f.get('amount')),date:f.get('date'),method:String(f.get('method')).toLowerCase(),note:upper(f.get('note'))},'supplier_payment');toast('PAGO A PROVEEDOR REGISTRADO');closeModal();refresh()};
}

export function containersModal(){
  const balances=new Map();
  for(const x of st().containers||[]){const key=x.clientId||'SIN_CLIENTE';balances.set(key,round2((balances.get(key)||0)+n(x.delivered)-n(x.returned)))}
  const rows=[...balances.entries()].map(([cid,b])=>`<tr><td>${esc(client(cid)?.name||cid)}</td><td>${n(b)}</td></tr>`);
  const m=modal('CONTROL DE ENVASES / CAJAS',`<div class="grid2"><form id="containerForm" class="panel"><h3>NUEVO MOVIMIENTO</h3><label>CLIENTE<select name="clientId">${st().clients.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></label><label>CAJAS ENTREGADAS<input name="delivered" type="number" step="1" value="0"></label><label>CAJAS DEVUELTAS<input name="returned" type="number" step="1" value="0"></label><label>FECHA<input name="date" type="date" value="${isoDate()}"></label><label>NOTA<input name="note"></label><button class="btn primary">GUARDAR MOVIMIENTO</button></form><section class="panel"><h3>SALDO DE ENVASES</h3>${table(['CLIENTE','CAJAS PENDIENTES'],rows)}</section></div>`,{wide:true});
  m.querySelector('#containerForm').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget);await Store.save('containers',{id:Store.uid('box'),clientId:f.get('clientId'),delivered:n(f.get('delivered')),returned:n(f.get('returned')),date:f.get('date'),note:upper(f.get('note'))},'container_movement');toast('MOVIMIENTO DE ENVASES GUARDADO');closeModal();refresh()};
}
