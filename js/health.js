import {calcInvoice,validateInvoice,stockQuantity,round2,normalize} from './domain.js';

const issue=(severity,code,message,meta={})=>({severity,code,message,...meta});
const active=x=>x?.active!==false&&!x?.archived;
const ids=list=>new Set((list||[]).map(x=>x.id));

export function systemHealth(state={}){
  const products=(state.products||[]).filter(active),clients=(state.clients||[]).filter(active),invoices=state.invoices||[],orders=state.orders||[],payments=state.payments||[],purchases=state.purchases||[],moves=state.stockMoves||[],series=state.series||[];
  const productIds=ids(products),clientIds=ids(clients),invoiceIds=ids(invoices),issues=[];

  const codeMap=new Map();
  for(const p of products){
    const k=String(p.code||'').toUpperCase();
    if(!k)issues.push(issue('error','PRODUCT_CODE_MISSING',`PRODUCTO SIN CÓDIGO: ${p.name||p.id}`,{entityId:p.id}));
    else{const a=codeMap.get(k)||[];a.push(p);codeMap.set(k,a)}
    if(p.mode==='caja_kg'&&Number(p.kgPerBox||0)<=0)issues.push(issue('error','BOX_WEIGHT_MISSING',`${p.code||''} ${p.name||''}: CAJA × KG SIN KG/CAJA`,{entityId:p.id}));
    if(Number(p.sellPrice||0)<=0)issues.push(issue('warning','SELL_PRICE_ZERO',`${p.code||''} ${p.name||''}: PRECIO DE VENTA 0`,{entityId:p.id}));
  }
  for(const [code,list] of codeMap)if(list.length>1)issues.push(issue('error','PRODUCT_CODE_DUPLICATE',`CÓDIGO DUPLICADO ${code}: ${list.map(x=>x.name).join(' / ')}`));

  const paymentByInvoice=new Map();
  for(const pay of payments)for(const a of pay.allocations||[])if(a.invoiceId)paymentByInvoice.set(a.invoiceId,round2(Number(paymentByInvoice.get(a.invoiceId)||0)+Number(a.amount||0)));

  const numberMap=new Map();
  for(const inv of invoices){
    if(inv.number){const a=numberMap.get(inv.number)||[];a.push(inv);numberMap.set(inv.number,a)}
    if(inv.clientId&&!clientIds.has(inv.clientId)&&!inv.clientSnapshot?.name)issues.push(issue('error','INVOICE_CLIENT_ORPHAN',`${inv.number||inv.id}: CLIENTE NO EXISTE`,{entityId:inv.id}));
    for(const l of inv.lines||[])if(l.productId&&!productIds.has(l.productId))issues.push(issue('error','INVOICE_PRODUCT_ORPHAN',`${inv.number||inv.id}: PRODUCTO ${l.productId} NO EXISTE`,{entityId:inv.id}));
    if(!['draft','void'].includes(inv.status)){
      const v=validateInvoice(inv);if(v.errors.length)issues.push(issue('error','INVOICE_INVALID',`${inv.number||inv.id}: ${v.errors.join(' · ')}`,{entityId:inv.id}));
      if(inv.type!=='credit'&&inv.type!=='debit')for(const l of inv.lines||[])if(Number(l.qty||0)>0&&Number(l.buyPriceSnapshot||0)<=0)issues.push(issue('warning','COST_SNAPSHOT_MISSING',`${inv.number||inv.id}: ${l.name||l.productId} SIN COSTE CONGELADO`,{entityId:inv.id,productId:l.productId}));
      const paidDocs=round2(Number(paymentByInvoice.get(inv.id)||0)),paidField=round2(Number(inv.paid||0));if(Math.abs(paidDocs-paidField)>.06)issues.push(issue('warning','PAYMENT_BALANCE_MISMATCH',`${inv.number||inv.id}: PAGADO EN FACTURA ${paidField} ≠ MOVIMIENTOS ${paidDocs}`,{entityId:inv.id}));
    }
    if(inv.originalInvoiceId&&!invoiceIds.has(inv.originalInvoiceId))issues.push(issue('error','RECTIFICATION_ORPHAN',`${inv.number||inv.id}: FACTURA ORIGINAL NO EXISTE`,{entityId:inv.id}));
  }
  for(const [num,list] of numberMap)if(list.length>1)issues.push(issue('error','INVOICE_NUMBER_DUPLICATE',`NÚMERO DE FACTURA DUPLICADO: ${num}`));

  for(const o of orders){
    if(o.clientId&&!clientIds.has(o.clientId)&&!o.clientSnapshot?.name)issues.push(issue('error','ORDER_CLIENT_ORPHAN',`PEDIDO ${o.id}: CLIENTE NO EXISTE`,{entityId:o.id}));
    if(o.invoiceId&&!invoiceIds.has(o.invoiceId))issues.push(issue('error','ORDER_INVOICE_ORPHAN',`PEDIDO ${o.id}: FACTURA ${o.invoiceId} NO EXISTE`,{entityId:o.id}));
    for(const l of o.lines||[])if(l.productId&&!productIds.has(l.productId))issues.push(issue('error','ORDER_PRODUCT_ORPHAN',`PEDIDO ${o.id}: PRODUCTO ${l.productId} NO EXISTE`,{entityId:o.id}));
  }

  for(const m of moves){
    if(m.productId&&!productIds.has(m.productId))issues.push(issue('error','STOCK_PRODUCT_ORPHAN',`MOVIMIENTO STOCK ${m.id}: PRODUCTO ${m.productId} NO EXISTE`,{entityId:m.id}));
    if(m.type==='sale'&&m.sourceId&&!invoiceIds.has(m.sourceId))issues.push(issue('error','STOCK_SALE_ORPHAN',`SALIDA ${m.id}: FACTURA ${m.sourceId} NO EXISTE`,{entityId:m.id}));
  }
  const locations=[...new Set((moves||[]).map(m=>m.location||'ALMACEN'))];
  for(const p of products)for(const location of locations){const q=stockQuantity(moves,p.id,location);if(q<-.0001)issues.push(issue('error','NEGATIVE_STOCK_LOCATION',`${p.code} ${p.name}: ${round2(q)} EN ${location}`,{entityId:p.id,location,qty:q}))}

  for(const pay of payments){
    if(pay.clientId&&!clientIds.has(pay.clientId))issues.push(issue('warning','PAYMENT_CLIENT_ORPHAN',`COBRO ${pay.id}: CLIENTE ${pay.clientId} NO EXISTE`,{entityId:pay.id}));
    for(const a of pay.allocations||[])if(a.invoiceId&&!invoiceIds.has(a.invoiceId))issues.push(issue('error','PAYMENT_INVOICE_ORPHAN',`COBRO ${pay.id}: FACTURA ${a.invoiceId} NO EXISTE`,{entityId:pay.id}));
  }

  const purchaseKeys=new Map();
  for(const p of purchases){
    const supplierKey=p.supplierId||normalize(p.supplierName||'');
    if(supplierKey&&p.number){const k=`${supplierKey}|${normalize(p.number)}`,a=purchaseKeys.get(k)||[];a.push(p);purchaseKeys.set(k,a)}
    const productBase=Number(p.productBase||0),discountAmount=round2(productBase*Number(p.discount||0)/100),calcBase=round2(productBase-discountAmount+Number(p.transport||0));
    if(Number(p.base||0)&&Math.abs(Number(p.base)-calcBase)>.06&&productBase>0)issues.push(issue('warning','PURCHASE_BASE_MISMATCH',`COMPRA ${p.number||p.id}: BASE GUARDADA ${round2(p.base)} ≠ ${calcBase}`,{entityId:p.id}));
    if(Number(p.total||0)&&Math.abs(Number(p.total)-round2(Number(p.base||0)+Number(p.vatTotal||0)))>.06)issues.push(issue('warning','PURCHASE_TOTAL_MISMATCH',`COMPRA ${p.number||p.id}: TOTAL NO CUADRA CON BASE + IVA`,{entityId:p.id}));
    for(const l of p.lines||[])if(l.productId&&!productIds.has(l.productId))issues.push(issue('error','PURCHASE_PRODUCT_ORPHAN',`COMPRA ${p.number||p.id}: PRODUCTO ${l.productId} NO EXISTE`,{entityId:p.id}));
  }
  for(const [,list] of purchaseKeys)if(list.length>1)issues.push(issue('error','PURCHASE_DUPLICATE',`FACTURA DE PROVEEDOR DUPLICADA: ${list[0].number}`));

  const fa=series.find(s=>s.id==='FA'||s.prefix==='FA');
  if(fa){let max=0;for(const inv of invoices){const m=String(inv.number||'').match(/(\d+)$/);if(m)max=Math.max(max,Number(m[1]))}if(Number(fa.next||0)<=max)issues.push(issue('error','SERIES_BEHIND',`SERIE FA NEXT=${fa.next} NO SUPERA EL ÚLTIMO NÚMERO ${max}`))}

  const severityRank={error:0,warning:1,info:2};issues.sort((a,b)=>(severityRank[a.severity]??9)-(severityRank[b.severity]??9)||a.code.localeCompare(b.code));
  const counts={error:issues.filter(x=>x.severity==='error').length,warning:issues.filter(x=>x.severity==='warning').length,info:issues.filter(x=>x.severity==='info').length};
  return{ok:counts.error===0,counts,issues,checked:{products:products.length,clients:clients.length,invoices:invoices.length,orders:orders.length,payments:payments.length,purchases:purchases.length,stockMoves:moves.length}};
}

export function clientNetDebt(invoices=[],clientId){return round2((invoices||[]).filter(i=>i.clientId===clientId&&!['draft','void'].includes(i.status)).reduce((s,i)=>s+Number(calcInvoice(i).pending||0),0));}
