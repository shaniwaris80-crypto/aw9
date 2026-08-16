import assert from 'node:assert/strict';
import {calcLine,calcInvoice,normalizedKgPerBox,validateInvoice,stockQuantity,localDate} from '../js/domain.js';
import {parseOrderText,parsePurchaseText,matchProduct,purchaseCalculatedTotals} from '../js/importers.js';
import {MASTER_PRODUCTS,MASTER_CLIENTS,MASTER_SUPPLIERS} from '../js/data.js';
import {Runtime} from '../js/runtime.js';
import {invoiceAfterReset,paymentAfterReset} from '../js/period.js';

const mad=calcLine({productId:'p_MM',name:'MACHO MADURO',mode:'caja_kg',qty:2,kgPerBox:22,price:1.70,vat:4});
assert.equal(mad.net,44);assert.equal(mad.base,74.80);assert.equal(mad.vatAmount,2.99);assert.equal(mad.total,77.79);
const verde=calcLine({productId:'p_MV',name:'MACHO VERDE',mode:'caja_kg',qty:3,kgPerBox:22,price:1.25,vat:4});
assert.equal(verde.net,66);assert.equal(verde.base,82.50);
const banana=calcLine({productId:'p_BN',name:'BANANA',mode:'caja_kg',qty:2,kgPerBox:18.5,price:1.25,vat:4});
assert.equal(banana.net,37);assert.equal(banana.base,46.25);
assert.equal(normalizedKgPerBox({kgBox:18}),18);assert.equal(normalizedKgPerBox({pesoCaja:10}),10);

const inv=calcInvoice({transportType:'percent',transportValue:10,discount:0,lines:[mad]});
assert.equal(inv.productBase,74.80);assert.equal(inv.transport,7.48);assert.equal(inv.base,82.28);assert.equal(inv.vatTotal,3.29);assert.equal(inv.total,85.57);
const inv15=calcInvoice({transportType:'percent',transportValue:15,discount:0,lines:[mad]});
assert.equal(inv15.transport,11.22);assert.equal(inv15.base,86.02);assert.equal(inv15.vatTotal,3.44);assert.equal(inv15.total,89.46);assert.ok(inv15.total>inv.total);
const reInv=calcInvoice({transportType:'percent',transportValue:10,discount:0,equivalenceSurcharge:true,lines:[mad]});
assert.equal(reInv.base,82.28);assert.equal(reInv.vatTotal,3.29);assert.equal(reInv.equivalenceTotal,0.41);assert.equal(reInv.total,85.98);

const badZero=validateInvoice({clientId:'c_abbas',lines:[{...mad,price:0}],transportType:'fixed',transportValue:0});assert.ok(badZero.errors.some(x=>x.includes('PRECIO')));
const badBox=validateInvoice({clientId:'c_abbas',lines:[{...mad,kgPerBox:0}],transportType:'fixed',transportValue:0});assert.ok(badBox.errors.some(x=>x.includes('KG/CAJA')));
const fractional=validateInvoice({clientId:'c_abbas',lines:[{...mad,qty:1.5}],transportType:'fixed',transportValue:0});assert.ok(fractional.errors.some(x=>x.includes('ENTERAS')));

const moves=[{productId:'p_MM',location:'ALMACEN',qty:44},{productId:'p_MM',location:'FURGONETA',qty:22},{productId:'p_MM',location:'ALMACEN',qty:-4}];
assert.equal(stockQuantity(moves,'p_MM'),62);assert.equal(stockQuantity(moves,'p_MM','ALMACEN'),40);assert.equal(stockQuantity(moves,'p_MM','FURGONETA'),22);assert.match(localDate(),/^\d{4}-\d{2}-\d{2}$/);

const order=parseOrderText('CLIENTE: ABBAS\nMACHO MADURO 2\nYUCA 3\nCILANTRO 20',MASTER_PRODUCTS,MASTER_CLIENTS);assert.equal(order.clientId,'c_abbas');assert.equal(order.lines.length,3);assert.equal(order.lines[0].productId,'p_MM');assert.equal(order.lines[0].qty,2);
assert.equal(matchProduct('OKRA 2',MASTER_PRODUCTS),null);assert.equal(matchProduct('OK2 2',MASTER_PRODUCTS)?.id,'p_OK2');
const purchase=parsePurchaseText(`ARW2026_COMPRA_V1\nPROVEEDOR=EUROBANAN\nFACTURA=F-1\nFECHA=2026-08-15\nITEM\nCODIGO=MM\nPRODUCTO=MACHO MADURO\nMODO=CAJA_KG\nCANTIDAD=10\nKG_CAJA=22\nPRECIO=1.20\nPRECIO_TIPO=KG\nIVA=4\nBASE=264\nFIN_ITEM\nTRANSPORTE=0\nDESCUENTO=0\nTOTAL_FACTURA=274.56\nFIN_ARW2026_COMPRA`,MASTER_PRODUCTS,MASTER_SUPPLIERS);assert.equal(purchase.lines.length,1);assert.equal(purchase.lines[0].productId,'p_MM');assert.equal(purchase.lines[0].kgPerBox,22);assert.equal(purchase.lines[0].priceType,'KG');
const landed=purchaseCalculatedTotals([{productId:'p_MM',mode:'caja_kg',qty:10,kgPerBox:22,price:1.20,priceType:'KG',vat:4}],22,0);assert.equal(landed.productBase,264);assert.equal(landed.transport,22);assert.equal(landed.base,286);assert.equal(landed.lines[0].effectiveUnitCost,1.3);

Runtime.state.settings=[{id:'main',lastWeeklyResetAt:'2026-08-16T10:00:00.000Z'}];
assert.equal(invoiceAfterReset({status:'issued',issuedAt:'2026-08-16T09:59:59.000Z',date:'2026-08-16'}),false);
assert.equal(invoiceAfterReset({status:'issued',issuedAt:'2026-08-16T10:00:01.000Z',date:'2026-08-16'}),true);
assert.equal(paymentAfterReset({createdAt:'2026-08-16T10:00:01.000Z',date:'2026-08-16'}),true);

console.log('ARW2026 V4 DOMAIN + IMPORT + PERIOD + STOCK + VALIDATION TESTS OK');
