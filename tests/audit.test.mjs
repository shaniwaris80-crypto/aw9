import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {systemHealth,clientNetDebt} from '../js/health.js';
import {can,canAction,ACTION_CAPABILITY} from '../js/permissions.js';

const root=path.resolve(new URL('..',import.meta.url).pathname);
const text=p=>fs.readFileSync(path.join(root,p),'utf8');

// Permisos esenciales
assert.equal(can('delivery','invoiceWrite'),false);
assert.equal(can('delivery','orderWrite'),true);
assert.equal(can('delivery','clientWrite'),false);
assert.equal(can('warehouse','productWrite'),true);
assert.equal(can('warehouse','routeWrite'),true);
assert.equal(can('billing','stockReset'),false);
assert.equal(can('owner','stockReset'),true);
assert.equal(canAction('delivery','invoice-new'),false);
assert.equal(canAction('billing','invoice-new'),true);

// Diagnóstico: debe detectar errores cruzados y stock negativo por ubicación aunque el total sea 0.
const badState={
  products:[{id:'p1',code:'P1',name:'UNO',mode:'kg',sellPrice:2,active:true},{id:'p2',code:'P2',name:'DOS',mode:'caja_kg',kgPerBox:0,sellPrice:1,active:true}],
  clients:[{id:'c1',name:'CLIENTE',active:true}],
  invoices:[{id:'i1',number:'FA-00001',status:'issued',clientId:'c1',date:'2026-08-16',lines:[{productId:'p1',name:'UNO',mode:'kg',qty:1,price:2,vat:4,buyPriceSnapshot:0}]},{id:'i2',number:'FA-00001',status:'issued',clientId:'missing',date:'2026-08-16',lines:[{productId:'missing',mode:'kg',qty:1,price:2,vat:4}]}],
  orders:[],payments:[{id:'pay1',clientId:'c1',allocations:[{invoiceId:'missing',amount:1}]}],purchases:[],
  stockMoves:[{id:'m1',productId:'p1',location:'ALMACEN',qty:-5},{id:'m2',productId:'p1',location:'FURGONETA',qty:5}],
  series:[{id:'FA',prefix:'FA',next:1}]
};
const h=systemHealth(badState),codes=new Set(h.issues.map(x=>x.code));
for(const code of ['BOX_WEIGHT_MISSING','INVOICE_NUMBER_DUPLICATE','NEGATIVE_STOCK_LOCATION','PAYMENT_INVOICE_ORPHAN','SERIES_BEHIND','COST_SNAPSHOT_MISSING'])assert.ok(codes.has(code),`Falta diagnóstico ${code}`);
assert.equal(h.ok,false);

// Deuda neta descuenta una rectificativa negativa.
const debtInvoices=[
  {clientId:'c1',status:'issued',type:'invoice',lines:[{productId:'p1',mode:'kg',qty:10,price:10,vat:0}],transportType:'fixed',transportValue:0,paid:0},
  {clientId:'c1',status:'issued',type:'credit',lines:[{productId:'p1',mode:'kg',qty:2,price:10,vat:0}],transportType:'fixed',transportValue:0,paid:0}
];
assert.equal(clientNetDebt(debtInvoices,'c1'),80);

const app=text('js/app.js'),fb=text('js/firebase.js'),sales=text('js/views-sales.js'),ops=text('js/views-ops.js'),rules=text('firestore.rules'),sw=text('service-worker.js');
assert.match(app,/canAction\(Runtime\.role,name\)/);
assert.match(app,/quickInvoice\.hidden=!can\(Runtime\.role,'invoiceWrite'\)/);
assert.match(fb,/buyPriceSnapshot:Number\(l\.buyPriceSnapshot\?\?p\?\.buyPrice\?\?0\)/);
assert.match(fb,/export async function saveStockOperation/);
assert.match(sales,/#invoiceRows input,#invoiceRows select,#invoiceRows button/);
assert.match(sales,/EL COBRO .* SUPERA LA DEUDA NETA/);
assert.match(sales,/transportType,transportValue/);
assert.match(ops,/saveStockOperation/);
assert.match(ops,/function stockAt\(/);
assert.match(ops,/REABRIR MES/);
assert.match(rules,/resource\.data\.status == 'draft'/);
assert.doesNotMatch(rules,/allow update: if manager\(\) \|\|/);
assert.match(rules,/warehouse\(\).*'orders','routes'/s);
for(const f of ['permissions.js','health.js','finance.js','views-finance.js'])assert.ok(sw.includes(`./js/${f}`),`Service worker no cachea ${f}`);

// Todos los data-action literales deben existir en el switch de app.js.
const used=new Set();for(const file of fs.readdirSync(path.join(root,'js')).filter(x=>x.endsWith('.js')).concat(['index.html'])){const p=file==='index.html'?path.join(root,file):path.join(root,'js',file),s=fs.readFileSync(p,'utf8');for(const m of s.matchAll(/data-action=[\\"']([^\\"']+)[\\"']/g))used.add(m[1]);}
const handlers=new Set([...app.matchAll(/case'([^']+)'/g)].map(m=>m[1]));
const missing=[...used].filter(x=>!handlers.has(x));assert.deepEqual(missing,[],`Acciones sin handler: ${missing.join(', ')}`);

// Las capacidades declaradas para acciones deben referirse a capacidades existentes.
for(const [action] of Object.entries(ACTION_CAPABILITY))assert.ok(handlers.has(action),`Permiso definido para acción inexistente: ${action}`);

console.log('ARW2026 AUDIT / PERMISSIONS / HEALTH / STATIC INVARIANTS OK');
