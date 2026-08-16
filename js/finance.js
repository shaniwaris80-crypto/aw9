import {calcInvoice,calcLine,stockQuantity,round2} from './domain.js';

const n=v=>Number(v||0);
const invoiceSign=inv=>inv?.type==='credit'?-1:1;
const stampOf=x=>String(x?.at||x?.issuedAt||x?.createdAt||x?.date||'');

export function costAtDate(productId,invoice={},line={},products=[],priceHistory=[]){
  const snap=n(line.buyPriceSnapshot??line.buyCostSnapshot??line.costSnapshot);
  if(snap>0)return{unitCost:snap,source:'snapshot'};
  const target=String(invoice.issuedAt||invoice.createdAt||(invoice.date?`${invoice.date}T23:59:59.999Z`:''));
  const hist=(priceHistory||[])
    .filter(h=>h.productId===productId&&(h.type==='cost'||h.source==='COMPRA')&&n(h.newPrice)>0)
    .filter(h=>!target||stampOf(h)<=target)
    .sort((a,b)=>stampOf(b).localeCompare(stampOf(a)))[0];
  if(hist)return{unitCost:n(hist.newPrice),source:'history'};
  const p=(products||[]).find(x=>x.id===productId);
  return{unitCost:n(p?.buyPrice),source:'current'};
}

export function stockResetPlan(products=[],moves=[],baseLocations=[]){
  const locations=[...new Set(['ALMACEN','FURGONETA','SAN PABLO','SAN LESMES','SANTIAGO',...(baseLocations||[]),...(moves||[]).map(m=>m.location||'ALMACEN')])],out=[];
  for(const p of products||[])for(const location of locations){const qty=stockQuantity(moves,p.id,location);if(Math.abs(qty)>.0001)out.push({productId:p.id,product:p,location,qty,adjustment:round2(-qty)})}
  return out;
}

function stockCostDirection(invoice,stockMoves=[]){
  const related=(stockMoves||[]).filter(m=>m.sourceId===invoice.id);
  if(invoice.type==='credit')return related.some(m=>n(m.qty)>0)?-1:0;
  if(invoice.type==='debit')return related.some(m=>n(m.qty)<0)?1:0;
  return 1;
}

export function invoiceFinancial(invoice,ctx={}){
  const products=ctx.products||[],priceHistory=ctx.priceHistory||[],stockMoves=ctx.stockMoves||[];
  const x=calcInvoice(invoice),sign=invoiceSign(invoice),costDirection=stockCostDirection(invoice,stockMoves);
  const merchandise=round2(sign*n(x.netMerchandise)),transport=round2(sign*n(x.transport)),revenueExTax=round2(merchandise+transport);
  const allocations=[];let cogs=0,estimated=0,history=0,snapshot=0;
  for(const raw of x.lines||[]){
    const l=calcLine(raw),share=x.productBase>0?n(l.base)/n(x.productBase):0,cost=costAtDate(l.productId,invoice,raw,products,priceHistory),absCost=round2(n(l.billedQty)*cost.unitCost),lineCost=round2(absCost*costDirection);
    if(cost.source==='current')estimated++;else if(cost.source==='history')history++;else snapshot++;
    cogs=round2(cogs+lineCost);
    const lineMerchandise=round2(sign*(n(l.base)-n(x.globalDiscount)*share)),lineTransport=round2(sign*n(x.transport)*share),lineRevenue=round2(lineMerchandise+lineTransport),profit=round2(lineRevenue-lineCost),soldQty=costDirection===1?n(l.billedQty):costDirection===-1?-n(l.billedQty):0;
    allocations.push({productId:l.productId,code:l.code,name:l.name,qty:round2(soldQty),billedQty:n(l.billedQty),unitCost:cost.unitCost,costSource:cost.source,cost:lineCost,merchandise:lineMerchandise,transport:lineTransport,revenue:lineRevenue,profit,marginPct:lineRevenue?round2(profit/lineRevenue*100):0});
  }
  const merchandiseMargin=round2(merchandise-cogs),grossProfit=round2(revenueExTax-cogs),marginPct=revenueExTax?round2(grossProfit/revenueExTax*100):0;
  return{invoice,calc:x,sign,merchandise,transport,revenueExTax,cogs,merchandiseMargin,grossProfit,marginPct,total:n(x.total),vat:round2(sign*n(x.vatTotal)),re:round2(sign*n(x.equivalenceTotal)),pending:n(x.pending),allocations,costQuality:estimated?'estimated':history?'history':'snapshot',estimatedLines:estimated,historyLines:history,snapshotLines:snapshot};
}

function purchaseLineQty(line={}){if(line.stockQty!=null)return n(line.stockQty);if(line.mode==='caja_kg')return round2(n(line.qty)*n(line.kgPerBox));return n(line.qty)}

export function financialAnalysis({invoices=[],products=[],clients=[],priceHistory=[],stockMoves=[],purchases=[],expenses=[]}={}){
  const ctx={products,priceHistory,stockMoves},invoiceRows=(invoices||[]).filter(i=>!['draft','void'].includes(i.status)).map(i=>invoiceFinancial(i,ctx));
  const totals=invoiceRows.reduce((a,r)=>{a.merchandise=round2(a.merchandise+r.merchandise);a.transport=round2(a.transport+r.transport);a.revenue=round2(a.revenue+r.revenueExTax);a.cogs=round2(a.cogs+r.cogs);a.grossProfit=round2(a.grossProfit+r.grossProfit);a.invoiceTotal=round2(a.invoiceTotal+r.total);a.vat=round2(a.vat+r.vat);a.re=round2(a.re+r.re);a.pending=round2(a.pending+r.pending);return a},{merchandise:0,transport:0,revenue:0,cogs:0,grossProfit:0,invoiceTotal:0,vat:0,re:0,pending:0});
  totals.marginPct=totals.revenue?round2(totals.grossProfit/totals.revenue*100):0;
  totals.expenses=round2((expenses||[]).reduce((s,e)=>s+n(e.amount),0));
  totals.operatingProfit=round2(totals.grossProfit-totals.expenses);
  totals.purchaseBase=round2((purchases||[]).reduce((s,p)=>s+n(p.base??p.productBase),0));
  totals.purchaseVat=round2((purchases||[]).reduce((s,p)=>s+n(p.vatTotal),0));
  totals.purchaseTotal=round2((purchases||[]).reduce((s,p)=>s+n(p.total),0));

  const productMap=new Map();
  const productRow=pid=>{if(!productMap.has(pid)){const p=(products||[]).find(x=>x.id===pid)||{id:pid,name:pid,code:''};productMap.set(pid,{product:p,qtySold:0,merchandise:0,transport:0,revenue:0,cogs:0,profit:0,purchasedQty:0,purchaseSpend:0})}return productMap.get(pid)};
  for(const r of invoiceRows)for(const l of r.allocations){const x=productRow(l.productId);x.qtySold=round2(x.qtySold+l.qty);x.merchandise=round2(x.merchandise+l.merchandise);x.transport=round2(x.transport+l.transport);x.revenue=round2(x.revenue+l.revenue);x.cogs=round2(x.cogs+l.cost);x.profit=round2(x.profit+l.profit)}
  for(const pch of purchases||[])for(const l of pch.lines||[]){const x=productRow(l.productId);x.purchasedQty=round2(x.purchasedQty+purchaseLineQty(l));x.purchaseSpend=round2(x.purchaseSpend+n(l.adjustedBase??l.base))}
  let stockCostValue=0,stockPotentialSales=0,stockPotentialProfit=0,negativeStockCount=0;
  for(const p of products||[]){const x=productRow(p.id),qty=stockQuantity(stockMoves,p.id),positive=Math.max(0,qty),stockCost=round2(positive*n(p.buyPrice)),potential=round2(positive*n(p.sellPrice)),potentialProfit=round2(potential-stockCost);x.stockQty=qty;x.stockCost=stockCost;x.stockPotentialSales=potential;x.stockPotentialProfit=potentialProfit;x.marginPct=x.revenue?round2(x.profit/x.revenue*100):0;x.avgSellQty=x.qtySold?round2(x.merchandise/x.qtySold):0;x.currentBuy=n(p.buyPrice);x.currentSell=n(p.sellPrice);stockCostValue=round2(stockCostValue+stockCost);stockPotentialSales=round2(stockPotentialSales+potential);stockPotentialProfit=round2(stockPotentialProfit+potentialProfit);if(qty<-.0001)negativeStockCount++}
  totals.stockCostValue=stockCostValue;totals.stockPotentialSales=stockPotentialSales;totals.stockPotentialProfit=stockPotentialProfit;totals.negativeStockCount=negativeStockCount;totals.totalPotentialGrossProfit=round2(totals.grossProfit+stockPotentialProfit);

  const clientMap=new Map();
  for(const r of invoiceRows){const c=(clients||[]).find(x=>x.id===r.invoice.clientId)||r.invoice.clientSnapshot||{id:r.invoice.clientId,name:'SIN CLIENTE'},key=c.id||c.name;if(!clientMap.has(key))clientMap.set(key,{client:c,invoices:0,merchandise:0,transport:0,revenue:0,cogs:0,profit:0,pending:0,total:0});const x=clientMap.get(key);x.invoices++;x.merchandise=round2(x.merchandise+r.merchandise);x.transport=round2(x.transport+r.transport);x.revenue=round2(x.revenue+r.revenueExTax);x.cogs=round2(x.cogs+r.cogs);x.profit=round2(x.profit+r.grossProfit);x.pending=round2(x.pending+r.pending);x.total=round2(x.total+r.total)}
  for(const x of clientMap.values()){x.marginPct=x.revenue?round2(x.profit/x.revenue*100):0;x.avgTicket=x.invoices?round2(x.total/x.invoices):0}
  return{totals,invoices:invoiceRows,products:[...productMap.values()],clients:[...clientMap.values()]};
}
