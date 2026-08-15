import {n,round2,uid,nowISO,daysBetween} from './utils.js';

export const PRODUCT_MODES={caja_kg:'CAJA × KG',caja_fija:'CAJA FIJA',kg:'KG',ud:'UD',manojo:'MANOJO'};
export function lineFromProduct(product,client=null){
  const custom=client?.prices?.[product.id];
  return {id:uid('line'),productId:product.id,code:product.code||'',product:product.name||'',mode:product.mode||'kg',qty:0,kgPerBox:n(product.kgPerBox),gross:0,tare:0,net:0,unit:product.unit||'kg',price:n(custom?.price??product.sellPrice),vat:n(product.vat??4),discount:0,base:0,vatAmount:0,total:0};
}
export function calcLine(line){
  let billQty=0;
  const qty=n(line.qty), kg=n(line.kgPerBox), gross=n(line.gross), tare=n(line.tare);
  if(line.mode==='caja_kg'){
    const theoretical=round2(qty*kg);
    line.net=(gross>0?round2(Math.max(0,gross-tare)):theoretical);
    billQty=line.net;
    line.unit='kg';
  } else if(line.mode==='caja_fija'){line.net=qty;billQty=qty;line.unit='caja'}
  else {line.net=qty;billQty=qty;line.unit=line.mode==='ud'?'ud':line.mode==='manojo'?'manojo':'kg'}
  const grossBase=round2(billQty*n(line.price));
  const disc=round2(grossBase*n(line.discount)/100);
  line.base=round2(grossBase-disc);
  line.vatAmount=round2(line.base*n(line.vat)/100);
  line.total=round2(line.base+line.vatAmount);
  return line;
}
export function calcInvoice(inv){
  inv.lines=(inv.lines||[]).map(l=>calcLine({...l})).filter(l=>l.productId&&n(l.qty)>0);
  const productBase=round2(inv.lines.reduce((s,l)=>s+n(l.base),0));
  const transportBase=inv.transportType==='percent'?round2(productBase*n(inv.transportValue)/100):round2(n(inv.transportValue));
  const globalDiscount=round2(productBase*n(inv.discount||0)/100);
  const factor=productBase?Math.max(0,(productBase-globalDiscount+transportBase)/productBase):1;
  const vats={};
  for(const l of inv.lines){const rate=n(l.vat);const adjustedBase=round2(n(l.base)*factor);if(!vats[rate])vats[rate]={rate,base:0,vat:0};vats[rate].base=round2(vats[rate].base+adjustedBase);vats[rate].vat=round2(vats[rate].vat+adjustedBase*rate/100)}
  const base=round2(Object.values(vats).reduce((s,x)=>s+x.base,0));
  const vatTotal=round2(Object.values(vats).reduce((s,x)=>s+x.vat,0));
  const total=round2(base+vatTotal);
  const paid=round2(n(inv.paid));
  return {...inv,productBase,transportBase,globalDiscount,vatBreakdown:Object.values(vats).sort((a,b)=>a.rate-b.rate),base,vatTotal,total,paid,pending:round2(Math.max(0,total-paid)),paymentStatus:paid<=0?'pending':paid+0.009>=total?'paid':'partial'};
}
export function invoiceStatus(inv){if(inv.status==='void')return'ANULADA';if(inv.status==='draft')return'BORRADOR';const x=calcInvoice(inv);if(x.paymentStatus==='paid')return'PAGADA';if(x.paymentStatus==='partial')return'PARCIAL';if(inv.dueDate&&daysBetween(inv.dueDate)>0)return'VENCIDA';return'PENDIENTE'}
export function stockForProduct(state,productId,location='ALL'){
  const moves=(state.stockMovements||[]).filter(m=>m.productId===productId&&(location==='ALL'||m.location===location));
  const physical=round2(moves.reduce((s,m)=>s+n(m.qty),0));
  const product=(state.products||[]).find(p=>p.id===productId);
  const reserved=round2((state.orders||[]).filter(o=>!['delivered','cancelled','invoiced'].includes(o.status)).flatMap(o=>o.lines||[]).filter(l=>l.productId===productId).reduce((s,l)=>{const q=n(l.requestedQty||l.qty);return s+(product?.mode==='caja_kg'?q*n(product.kgPerBox):q)},0));
  return {physical,reserved,available:round2(physical-reserved)};
}
export function stockDisplay(product,qty){if(product.mode==='caja_kg'&&n(product.kgPerBox)>0){const boxes=round2(n(qty)/n(product.kgPerBox));return `${boxes} CAJAS · ${round2(qty)} KG`}return `${round2(qty)} ${String(product.unit||product.mode).toUpperCase()}`}
export function clientBalance(state,clientId){const inv=(state.invoices||[]).filter(x=>x.clientId===clientId&&x.status!=='void'&&x.status!=='draft');return round2(inv.reduce((s,x)=>s+calcInvoice(x).pending,0))}
export function marginLine(line,product){const q=line.mode==='caja_kg'?n(line.net):n(line.qty);const revenue=n(line.base);const cost=q*n(product?.buyPrice);return {revenue:round2(revenue),cost:round2(cost),profit:round2(revenue-cost),margin:revenue?round2((revenue-cost)/revenue*100):0}}
export function makeStockMove({productId,qty,location='ALMACEN',type='adjustment',sourceId='',note=''}){return {id:uid('mov'),productId,qty:round2(qty),location,type,sourceId,note,date:new Date().toISOString().slice(0,10),createdAt:nowISO()}}
export function nextInvoiceNo(settings){const n0=n(settings.nextInvoiceNumber||1);return `${settings.invoiceSeries||'FA'}-${String(n0).padStart(n(settings.invoiceDigits||5),'0')}`}
