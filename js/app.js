import {ARW} from '../firebase-config.js';
import {Runtime} from './runtime.js';
import {authApi,ensureMasterData,subscribeCollections,saveEntity} from './firebase.js';
import {today,upper} from './domain.js';
import {toast} from './ui.js';
import {dashboardView,ordersView,orderModal,invoiceFromOrder,invoicesView,invoiceModal,bulkDraftPrices,bulkIssuedPrices,rectificationModal,handleVoid,sendView,zipDay,paymentsView,paymentModal} from './views-sales.js';
import {productsView,productModal,product360,clientsView,clientModal,client360,stockView,stockAdjustModal,suppliersView,supplierModal,purchasesView,purchaseModal,exportProducts,exportClients,exportStock} from './views-master.js';
import {reportsView,reportSales,reportPurchases,expensesView,expenseModal,priceManagerView,massPriceModal,routesView,routeModal,auditView,settingsView,masterReload} from './views-admin.js';
import {warehouseOpsView,transferModal,wasteModal,returnModal,inventoryModal,documentsView,documentModal,convertDocument,closuresView,closeMonth} from './views-ops.js';
import {downloadInvoice} from './pdf.js';

const login=document.querySelector('#login'),app=document.querySelector('#app'),content=document.querySelector('#content'),nav=document.querySelector('#nav'),viewTitle=document.querySelector('#viewTitle'),cloud=document.querySelector('#cloudState'),userInfo=document.querySelector('#userInfo');
let unsubscribe=null,booting=false;
const NAV=[
['dashboard','⌂','INICIO'],['orders','🛒','PEDIDOS / REPARTO'],['invoices','🧾','FACTURACIÓN'],['send','📤','ENVÍO DEL DÍA'],['payments','💶','COBROS'],
['clients','👤','CLIENTES 360º'],['products','🍌','PRODUCTOS'],['stock','📦','STOCK'],['purchases','📥','COMPRAS'],['suppliers','🏭','PROVEEDORES'],
['operations','🔄','OPERACIONES STOCK'],['documents','📄','PRESUPUESTOS / ALBARANES'],['routes','🚚','RUTAS'],['prices','📈','PRECIOS MASIVOS'],['expenses','💸','GASTOS'],
['reports','📊','REPORTES / IVA'],['closures','🔒','CIERRES'],['audit','📜','AUDITORÍA'],['settings','⚙','CONFIGURACIÓN']
];
const VIEWS={dashboard:dashboardView,orders:ordersView,invoices:invoicesView,send:sendView,payments:paymentsView,clients:clientsView,products:productsView,stock:stockView,purchases:purchasesView,suppliers:suppliersView,operations:warehouseOpsView,documents:documentsView,routes:routesView,prices:priceManagerView,expenses:expensesView,reports:reportsView,closures:closuresView,audit:auditView,settings:settingsView};
function navHtml(){return NAV.map(([id,ico,label])=>`<button class="nav-btn ${Runtime.view===id?'active':''}" data-view="${id}"><span>${ico}</span><span class="nav-label">${label}</span></button>`).join('')}
function mobileNav(){const items=[['dashboard','🏠','INICIO'],['orders','🛒','PEDIDOS'],['invoices','🧾','FACTURAR'],['stock','📦','STOCK'],['settings','•••','MÁS']];return items.map(([id,ico,l])=>`<button data-view="${id}"><b>${ico}</b>${l}</button>`).join('')}
function render(){if(!Runtime.user)return;nav.innerHTML=navHtml();document.querySelector('#mobileNav').innerHTML=mobileNav();const item=NAV.find(x=>x[0]===Runtime.view);viewTitle.textContent=item?.[2]||'ARW2026';try{content.innerHTML=(VIEWS[Runtime.view]||dashboardView)()}catch(e){console.error(e);content.innerHTML=`<div class="danger">ERROR DE PANTALLA: ${String(e.message||e)}</div>`}bindDynamic();}
Runtime.render=render;
function go(v){Runtime.view=v;document.querySelector('#app').classList.remove('side-open');render()}
function stateError(name,e){console.error(name,e);cloud.innerHTML=`<span class="sync-bad">ERROR FIRESTORE · ${upper(e.code||e.message)}</span>`}
async function startUser(user){if(booting)return;booting=true;try{Runtime.user=user;login.classList.add('hidden');app.classList.remove('hidden');userInfo.textContent=user.email||'';cloud.textContent='CARGANDO FIRESTORE…';await ensureMasterData(user);if(unsubscribe)unsubscribe();unsubscribe=subscribeCollections(s=>{Runtime.state=s;cloud.innerHTML=`<span class="sync-ok">● FIRESTORE EN TIEMPO REAL · ${s.products.filter(x=>!x.archived).length} PRODUCTOS · ${s.clients.filter(x=>!x.archived).length} CLIENTES</span>`;render()},stateError);render()}catch(e){console.error(e);cloud.innerHTML=`<span class="sync-bad">ERROR: ${upper(e.code||e.message)}</span>`;content.innerHTML=`<div class="danger"><b>NO SE PUDO CONECTAR A FIRESTORE.</b><br>${String(e.code||e.message)}<br><br>COMPRUEBA LAS REGLAS DE FIRESTORE Y QUE ESTE DOMINIO ESTÉ AUTORIZADO EN FIREBASE.</div>`}finally{booting=false}}
function stopUser(){Runtime.user=null;unsubscribe?.();unsubscribe=null;app.classList.add('hidden');login.classList.remove('hidden')}

authApi.on(user=>user?startUser(user):stopUser());
document.querySelector('#loginForm').onsubmit=async e=>{e.preventDefault();const er=document.querySelector('#loginError');er.classList.add('hidden');try{await authApi.email(document.querySelector('#email').value,document.querySelector('#password').value)}catch(x){er.textContent=upper(x.code||x.message);er.classList.remove('hidden')}};
document.querySelector('#googleLogin').onclick=async()=>{const er=document.querySelector('#loginError');try{await authApi.google()}catch(x){er.textContent=upper(x.code||x.message);er.classList.remove('hidden')}};
document.querySelector('#logout').onclick=()=>authApi.logout();

document.querySelector('#collapseSide').onclick=()=>{app.classList.toggle('side-collapsed');localStorage.setItem('arw_side_collapsed',app.classList.contains('side-collapsed')?'1':'0')};if(localStorage.getItem('arw_side_collapsed')==='1')app.classList.add('side-collapsed');
document.querySelector('#mobileMenu').onclick=()=>app.classList.add('side-open');document.querySelector('#overlay').onclick=()=>app.classList.remove('side-open');
document.body.addEventListener('click',e=>{const b=e.target.closest('[data-view]');if(b){go(b.dataset.view);return}const a=e.target.closest('[data-go]');if(a?.dataset.go==='invoice-new')invoiceModal()});

function selectedInvoice(id){return Runtime.state.invoices.find(x=>x.id===id)}
function bindDynamic(){
  content.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>action(b.dataset.action,b));
  content.querySelectorAll('[data-order-edit]').forEach(b=>b.onclick=()=>orderModal(stFind('orders',b.dataset.orderEdit)));
  content.querySelectorAll('[data-order-invoice]').forEach(b=>b.onclick=()=>invoiceFromOrder(stFind('orders',b.dataset.orderInvoice)));
  content.querySelectorAll('[data-inv-open]').forEach(b=>b.onclick=()=>invoiceModal(selectedInvoice(b.dataset.invOpen)));
  content.querySelectorAll('[data-inv-pdf]').forEach(b=>b.onclick=()=>{const i=selectedInvoice(b.dataset.invPdf),c=Runtime.client(i.clientId)||i.clientSnapshot;downloadInvoice(i,c,Runtime.settings())});
  content.querySelectorAll('[data-inv-rect]').forEach(b=>b.onclick=()=>rectificationModal(selectedInvoice(b.dataset.invRect)));
  content.querySelectorAll('[data-inv-void]').forEach(b=>b.onclick=()=>handleVoid(selectedInvoice(b.dataset.invVoid)));
  content.querySelectorAll('[data-product-edit]').forEach(b=>b.onclick=()=>productModal(Runtime.product(b.dataset.productEdit)));
  content.querySelectorAll('[data-product-360]').forEach(b=>b.onclick=()=>product360(Runtime.product(b.dataset.product360)));
  content.querySelectorAll('[data-client-edit]').forEach(b=>b.onclick=()=>clientModal(Runtime.client(b.dataset.clientEdit)));
  content.querySelectorAll('[data-client-360]').forEach(b=>b.onclick=()=>client360(Runtime.client(b.dataset.client360)));
  content.querySelectorAll('[data-supplier-edit]').forEach(b=>b.onclick=()=>supplierModal(Runtime.supplier(b.dataset.supplierEdit)));
  content.querySelectorAll('[data-mass-product]').forEach(b=>b.onclick=()=>massPriceModal(b.dataset.massProduct));
  content.querySelectorAll('[data-doc-invoice]').forEach(b=>b.onclick=()=>{const [kind,id]=b.dataset.docInvoice.split(':');convertDocument(kind,id)});
  content.querySelectorAll('[data-wa]').forEach(b=>b.onclick=async()=>{const i=selectedInvoice(b.dataset.wa),c=Runtime.client(i.clientId)||i.clientSnapshot||{},phone=String(c.whatsapp||c.phone||'').replace(/\D/g,'');if(!phone)return toast('EL CLIENTE NO TIENE WHATSAPP','bad');const msg=`HOLA ${upper(c.name)}, ADJUNTAMOS SU FACTURA ${i.number} DEL ${i.date}. TOTAL ${calcTotal(i)}. GRACIAS.`;window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`,'_blank');await saveEntity('invoices',{id:i.id,sentAt:new Date().toISOString()},'INVOICE_SENT',Runtime.user)});
  const ps=content.querySelector('#productSearch');if(ps)ps.oninput=e=>{window.ARW_PRODUCT_Q=e.target.value;render()};
  const cs=content.querySelector('#clientSearch');if(cs)cs.oninput=e=>{window.ARW_CLIENT_Q=e.target.value;render()};
  const sd=content.querySelector('#sendDate');if(sd)sd.onchange=e=>{window.ARW_SEND_DATE=e.target.value;render()};
  const rm=content.querySelector('#reportMonth');if(rm)rm.onchange=e=>{window.ARW_REPORT_MONTH=e.target.value;render()};
  const cm=content.querySelector('#closeMonth');if(cm)cm.onchange=e=>{window.ARW_CLOSE_MONTH=e.target.value;render()};
}
function stFind(name,id){return Runtime.state[name].find(x=>x.id===id)}
function calcTotal(i){return new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(i.total||0)||Runtime.state.invoices.find(x=>x.id===i.id)?.total||0)}
async function action(name){switch(name){
  case'invoice-new':return invoiceModal();case'order-new':return orderModal();case'bulk-drafts':return bulkDraftPrices();case'bulk-issued':return bulkIssuedPrices();case'zip-day':return zipDay();case'payment-new':return paymentModal();
  case'product-new':return productModal();case'client-new':return clientModal();case'stock-adjust':return stockAdjustModal();case'supplier-new':return supplierModal();case'purchase-new':return purchaseModal();
  case'products-export':return exportProducts();case'clients-export':return exportClients();case'stock-export':return exportStock();case'expense-new':return expenseModal();case'price-mass':return massPriceModal();case'route-new':return routeModal();
  case'report-sales':return reportSales();case'report-purchases':return reportPurchases();case'master-reload':return masterReload();case'transfer-new':return transferModal();case'waste-new':return wasteModal();case'return-new':return returnModal();case'inventory-new':return inventoryModal();
  case'doc-quote':return documentModal('quote');case'doc-proforma':return documentModal('proforma');case'doc-delivery':return documentModal('delivery');case'close-month':return closeMonth();
}}

if('serviceWorker'in navigator)addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').catch(console.warn));
