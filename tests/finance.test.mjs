import assert from 'node:assert/strict';
import {invoiceFinancial,financialAnalysis,costAtDate,stockResetPlan} from '../js/finance.js';

const products=[{id:'p_MM',code:'MM',name:'MACHO MADURO',mode:'caja_kg',kgPerBox:22,buyPrice:1.2,sellPrice:1.7}];
const invoice={id:'inv1',number:'FA-00001',date:'2026-08-16',issuedAt:'2026-08-16T10:00:00.000Z',status:'issued',type:'invoice',clientId:'c1',transportType:'percent',transportValue:10,discount:0,lines:[{productId:'p_MM',code:'MM',name:'MACHO MADURO',mode:'caja_kg',qty:2,kgPerBox:22,price:1.7,buyPriceSnapshot:1.2,vat:4}]};
const stockMoves=[{productId:'p_MM',location:'ALMACEN',qty:-44,sourceId:'inv1',type:'sale'}];
const f=invoiceFinancial(invoice,{products,priceHistory:[],stockMoves});
assert.equal(f.merchandise,74.8);
assert.equal(f.transport,7.48);
assert.equal(f.cogs,52.8);
assert.equal(f.merchandiseMargin,22);
assert.equal(f.grossProfit,29.48);
assert.equal(f.marginPct,35.83);
assert.equal(f.costQuality,'snapshot');

const historic=costAtDate('p_MM',{date:'2026-08-10'}, {},products,[{id:'h1',type:'cost',productId:'p_MM',date:'2026-08-01',at:'2026-08-01T08:00:00.000Z',newPrice:1.05}]);
assert.equal(historic.unitCost,1.05);assert.equal(historic.source,'history');

const reset=stockResetPlan(products,[{productId:'p_MM',location:'ALMACEN',qty:-5},{productId:'p_MM',location:'FURGONETA',qty:5}]);
assert.equal(reset.length,2);
assert.deepEqual(reset.map(x=>[x.location,x.qty,x.adjustment]).sort(),[['ALMACEN',-5,5],['FURGONETA',5,-5]].sort());

const a=financialAnalysis({invoices:[invoice],products,clients:[{id:'c1',name:'ABBAS'}],priceHistory:[],stockMoves:[...stockMoves,{productId:'p_MM',location:'ALMACEN',qty:88,type:'purchase'}],purchases:[{date:'2026-08-16',base:105.6,vatTotal:4.22,total:109.82,lines:[{productId:'p_MM',mode:'caja_kg',qty:4,kgPerBox:22,stockQty:88,adjustedBase:105.6}]}],expenses:[{amount:5}]});
assert.equal(a.totals.grossProfit,29.48);
assert.equal(a.totals.operatingProfit,24.48);
assert.equal(a.totals.purchaseBase,105.6);
assert.equal(a.totals.stockCostValue,52.8);
assert.equal(a.totals.stockPotentialSales,74.8);
assert.equal(a.totals.stockPotentialProfit,22);
assert.equal(a.clients[0].profit,29.48);
assert.equal(a.products[0].profit,29.48);
console.log('ARW2026 FINANCE + PROFIT + NEGATIVE STOCK RESET TESTS OK');
