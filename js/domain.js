export const round2=n=>Math.round((Number(n||0)+Number.EPSILON)*100)/100;
export const money=n=>round2(n).toLocaleString('es-ES',{style:'currency',currency:'EUR'});
export const upper=s=>String(s??'').toUpperCase();
export const today=()=>new Date().toISOString().slice(0,10);
export const now=()=>new Date().toISOString();
export const uid=p=>`${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,9)}`;
export const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export const slug=s=>normalize(s).replace(/ /g,'-')||uid('id');

export function normalizedKgPerBox(p={}){
  const v=Number(p.kgPerBox ?? p.kgBox ?? p.pesoCaja ?? 0);
  return Number.isFinite(v)?v:0;
}
export function normalizeProduct(p={}){
  return {...p,kgPerBox:normalizedKgPerBox(p),mode:p.mode||'kg',vat:Number(p.vat??4),buyPrice:Number(p.buyPrice||0),sellPrice:Number(p.sellPrice||0),recommended:Number(p.recommended||0)};
}
export function clientPrice(client,product){
  const entry=client?.prices?.[product.id] ?? client?.prices?.[product.code];
  if(entry==null)return {price:Number(product.sellPrice||0),source:'GENERAL'};
  return {price:Number(typeof entry==='number'?entry:entry.price||0),source:'CLIENTE'};
}
export function newLine(product,client=null,overrides={}){
  const p=normalizeProduct(product);const cp=clientPrice(client,p);
  return calcLine({
    id:uid('line'),productId:p.id,code:p.code,name:p.name,mode:p.mode,qty:0,kgPerBox:p.kgPerBox,
    gross:0,tare:0,price:cp.price,priceSource:cp.source,vat:p.vat,discount:0,buyPriceSnapshot:p.buyPrice,
    ...overrides
  });
}
export function calcLine(line={}){
  const l={...line};
  const q=Math.max(0,Number(l.qty||0));
  const kg=Math.max(0,Number(l.kgPerBox||0));
  const gross=Math.max(0,Number(l.gross||0));
  const tare=Math.max(0,Number(l.tare||0));
  let billedQty=0,net=0,unit='kg';
  if(l.mode==='caja_kg'){
    net=gross>0?Math.max(0,gross-tare):q*kg;
    billedQty=net;unit='kg';
  }else if(l.mode==='caja_fija'){
    net=q;billedQty=q;unit='caja';
  }else if(l.mode==='ud'){
    net=q;billedQty=q;unit='ud';
  }else if(l.mode==='manojo'){
    net=q;billedQty=q;unit='manojo';
  }else{
    net=q;billedQty=q;unit='kg';
  }
  const before=round2(billedQty*Number(l.price||0));
  const discountAmount=round2(before*Math.max(0,Number(l.discount||0))/100);
  const base=round2(before-discountAmount);
  const vatAmount=round2(base*Number(l.vat||0)/100);
  return {...l,qty:q,kgPerBox:kg,gross,tare,net:round2(net),billedQty:round2(billedQty),unit,base,vatAmount,total:round2(base+vatAmount)};
}
export function calcInvoice(invoice={}){
  let lines=(invoice.lines||[]).map(calcLine).filter(l=>l.productId&&l.qty>0);
  const productBase=round2(lines.reduce((s,l)=>s+l.base,0));
  const globalDiscount=round2(productBase*Math.max(0,Number(invoice.discount||0))/100);
  const transport=invoice.transportType==='fixed'?round2(Number(invoice.transportValue||0)):round2((productBase-globalDiscount)*Number(invoice.transportValue||0)/100);
  const after=round2(productBase-globalDiscount+transport);
  const factor=productBase?after/productBase:0;
  const vats={};
  for(const l of lines){
    const rate=Number(l.vat||0);vats[rate]??={rate,base:0,vat:0};
    const b=round2(l.base*factor);vats[rate].base=round2(vats[rate].base+b);vats[rate].vat=round2(vats[rate].vat+b*rate/100);
  }
  const sign=invoice.type==='credit'?-1:1;
  const vatBreakdown=Object.values(vats).sort((a,b)=>a.rate-b.rate).map(v=>({rate:v.rate,base:round2(v.base*sign),vat:round2(v.vat*sign)}));
  if(sign<0)lines=lines.map(l=>({...l,base:-Math.abs(l.base),vatAmount:-Math.abs(l.vatAmount),total:-Math.abs(l.total)}));
  const base=round2(vatBreakdown.reduce((s,v)=>s+v.base,0));
  const vatTotal=round2(vatBreakdown.reduce((s,v)=>s+v.vat,0));
  const total=round2(base+vatTotal);
  const paid=sign<0?0:round2(Number(invoice.paid||0));
  const pending=sign<0?total:round2(Math.max(0,total-paid));
  return {...invoice,lines,productBase:round2(productBase*sign),globalDiscount:round2(globalDiscount*sign),transport:round2(transport*sign),vatBreakdown,base,vatTotal,total,paid,pending};
}
export function lineDescription(l){
  const x=calcLine(l);
  if(x.mode==='caja_kg')return `${x.qty} CAJAS × ${x.kgPerBox} KG = ${x.net} KG`;
  if(x.mode==='caja_fija')return `${x.qty} CAJAS`;
  if(x.mode==='ud')return `${x.qty} UD`;
  if(x.mode==='manojo')return `${x.qty} MANOJOS`;
  return `${x.qty} KG`;
}
export function validateInvoice(invoice,products=[],clients=[]){
  const errors=[],warnings=[];const x=calcInvoice(invoice);
  if(!invoice.clientId||!clients.some(c=>c.id===invoice.clientId))errors.push('FALTA CLIENTE VÁLIDO');
  if(!x.lines.length)errors.push('NO HAY LÍNEAS FACTURABLES');
  for(const l of x.lines){
    if(l.mode==='caja_kg'&&l.kgPerBox<=0)errors.push(`${l.name||l.code}: FALTA KG/CAJA`);
    if(l.price<0)errors.push(`${l.name||l.code}: PRECIO INVÁLIDO`);
    if(![0,4,10,21].includes(Number(l.vat)))warnings.push(`${l.name||l.code}: REVISAR IVA ${l.vat}%`);
    if(Number(l.buyPriceSnapshot)>0&&Number(l.price)<Number(l.buyPriceSnapshot))warnings.push(`${l.name||l.code}: PRECIO BAJO COSTE`);
  }
  return {errors,warnings,invoice:x};
}
export function stockQuantity(moves=[],productId,location='ALL'){
  return round2(moves.filter(m=>m.productId===productId&&(location==='ALL'||m.location===location)).reduce((s,m)=>s+Number(m.qty||0),0));
}
export function stockText(product,qty){
  const p=normalizeProduct(product);
  if(p.mode==='caja_kg'&&p.kgPerBox>0)return `${round2(qty/p.kgPerBox)} CAJAS · ${round2(qty)} KG`;
  return `${round2(qty)} ${upper(p.unit||p.mode)}`;
}
export function stockMovementQty(line){const l=calcLine(line);return l.mode==='caja_kg'?l.net:l.qty;}
export function invoiceStatus(inv){if(inv.status==='void')return'ANULADA';if(inv.status==='draft')return'BORRADOR';if(['credit','debit'].includes(inv.type))return'RECTIFICATIVA';const x=calcInvoice(inv);if(x.pending<=0)return'PAGADA';if(x.paid>0)return'PARCIAL';if(inv.dueDate&&inv.dueDate<today())return'VENCIDA';return'PENDIENTE';}
