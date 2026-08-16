from pathlib import Path
import re
R=Path('.')
def rd(p): return (R/p).read_text()
def wr(p,s): (R/p).write_text(s)
def rep(p,a,b,n=1):
    s=rd(p)
    if a not in s: raise SystemExit(f'NO ENCONTRADO {p}: {a[:100]!r}')
    wr(p,s.replace(a,b,n))
def sub(p,pat,repl,n=1):
    s=rd(p);out,c=re.subn(pat,repl,s,count=n,flags=re.S)
    if c!=n: raise SystemExit(f'REGEX {p}: {c}/{n} {pat[:80]}')
    wr(p,out)

# enhancements.js
rep('js/enhancements.js',"can(Runtime.role,'weekReset')?'${can(Runtime.role,'weekReset')?'<button class=\"btn\" data-action=\"week-reset\">↻ PONER CONTADORES A 0</button>':''}':'',", "can(Runtime.role,'weekReset')?'<button class=\"btn\" data-action=\"week-reset\">↻ PONER CONTADORES A 0</button>':'',")
old="`<button class=\"btn primary\" data-action=\"invoice-new\">＋ FACTURA</button><button class=\"btn\" data-action=\"paste-order\">PEGAR PEDIDO → FACTURA</button><button class=\"btn\" data-action=\"bulk-drafts\">PRECIOS MASIVOS BORRADORES</button><button class=\"btn\" data-action=\"bulk-issued\">RECTIFICAR PRECIOS EMITIDAS</button><button class=\"btn\" data-action=\"invoice-history-toggle\">${window.ARW_INVOICE_HISTORY?'SOLO PERIODO':'VER HISTÓRICO'}</button><button class=\"btn\" data-action=\"week-reset\">↻ PONER CONTADORES A 0</button>`"
new="`<button class=\"btn primary\" data-action=\"invoice-new\">＋ FACTURA</button><button class=\"btn\" data-action=\"paste-order\">PEGAR PEDIDO → FACTURA</button><button class=\"btn\" data-action=\"bulk-drafts\">PRECIOS MASIVOS BORRADORES</button><button class=\"btn\" data-action=\"bulk-issued\">RECTIFICAR PRECIOS EMITIDAS</button><button class=\"btn\" data-action=\"invoice-history-toggle\">${window.ARW_INVOICE_HISTORY?'SOLO PERIODO':'VER HISTÓRICO'}</button>${can(Runtime.role,'weekReset')?'<button class=\"btn\" data-action=\"week-reset\">↻ PONER CONTADORES A 0</button>':''}`"
rep('js/enhancements.js',old,new)
zero="""export async function zeroStockAction(){
  const locations=[...new Set(['ALMACEN','FURGONETA','SAN PABLO','SAN LESMES','SANTIAGO',...st().stockMoves.map(m=>m.location||'ALMACEN')])],nonZero=[];for(const p of products())for(const location of locations){const q=stockQuantity(st().stockMoves,p.id,location);if(Math.abs(q)>.0001)nonZero.push({p,location,q})}if(!nonZero.length)return toast('TODO EL STOCK, INCLUIDOS NEGATIVOS, YA ESTÁ A 0','good');
  if(!confirm(`SE PONDRÁ A 0 EL STOCK DE ${nonZero.length} PRODUCTO/UBICACIÓN. EL HISTÓRICO SE CONSERVARÁ. ¿CONTINUAR?`))return;const typed=prompt('ESCRIBE PONER STOCK A 0 PARA CONFIRMAR');if(upper(typed)!=='PONER STOCK A 0')return;
  try{const n=await zeroAllStockCloud(products(),st().stockMoves,Runtime.user,'REINICIO MANUAL DE STOCK');toast(`${n} AJUSTES CREADOS · POSITIVOS Y NEGATIVOS A 0`,'good')}catch(e){toast(e.message,'bad')}
}
"""
sub('js/enhancements.js',r'export async function zeroStockAction\(\)\{.*?\n\}\n\nexport async function weekResetAction',zero+'\nexport async function weekResetAction')
rep('js/enhancements.js',"issuerSnapshot:{...Runtime.settings()},date:o.date||today(),seriesId:'FA'", "issuerSnapshot:{...Runtime.settings()},date:o.date||today(),stockLocation:Runtime.settings().routeStockLocation||'FURGONETA',seriesId:'FA'")

# views-sales: locations + guards + role-sensitive paste
rep('js/views-sales.js',"const activeClients=()=>st().clients.filter(c=>c.active!==false&&!c.archived).sort((a,b)=>String(a.name).localeCompare(String(b.name)));", "const activeClients=()=>st().clients.filter(c=>c.active!==false&&!c.archived).sort((a,b)=>String(a.name).localeCompare(String(b.name)));\nconst STOCK_LOCATIONS=['ALMACEN','FURGONETA','SAN PABLO','SAN LESMES','SANTIAGO'];\nconst stockLocationOpts=sel=>STOCK_LOCATIONS.map(x=>`<option value=\"${x}\" ${x===(sel||'ALMACEN')?'selected':''}>${x}</option>`).join('');")
rep('js/views-sales.js','export function orderModal(existing=null){',"export function orderModal(existing=null){if(!can(Runtime.role,'orderWrite'))return toast('SIN PERMISO PARA EDITAR PEDIDOS','bad');")
rep('js/views-sales.js','export function pasteOrderInvoiceModal(){',"export function pasteOrderInvoiceModal(){if(!can(Runtime.role,'orderWrite'))return toast('SIN PERMISO PARA CREAR PEDIDOS','bad');")
rep('js/views-sales.js',"  let parsed=null;const preview=()=>", "  if(!can(Runtime.role,'invoiceWrite'))m.querySelector('#openPastedInvoice')?.remove();\n  let parsed=null;const preview=()=>")
rep('js/views-sales.js',"m.querySelector('#openPastedInvoice').disabled=!ok", "{const b=m.querySelector('#openPastedInvoice');if(b)b.disabled=!ok}")
rep('js/views-sales.js',"  m.querySelector('#openPastedInvoice').onclick=()=>", "  if(m.querySelector('#openPastedInvoice'))m.querySelector('#openPastedInvoice').onclick=()=>")
rep('js/views-sales.js',"function blankInvoice(){return {id:uid('inv'),clientId:'',date:today(),seriesId:'FA'", "function blankInvoice(){return {id:uid('inv'),clientId:'',date:today(),stockLocation:settings().defaultStockLocation||'ALMACEN',seriesId:'FA'")
rep('js/views-sales.js',"date:m.querySelector('[name=date]').value,transportType:", "date:m.querySelector('[name=date]').value,stockLocation:m.querySelector('[name=stockLocation]')?.value||base.stockLocation||'ALMACEN',transportType:")
rep('js/views-sales.js',"export function invoiceModal(existing=null,preset=null){\n  const locked=", "export function invoiceModal(existing=null,preset=null){\n  if(existing&&existing.status!=='draft'){if(!can(Runtime.role,'invoiceRead'))return toast('SIN PERMISO PARA VER FACTURAS','bad')}else if(!can(Runtime.role,'invoiceWrite'))return toast('SIN PERMISO PARA CREAR O EDITAR FACTURAS','bad');\n  const locked=")
rep('js/views-sales.js',"<label>FECHA<input name=\"date\" type=\"date\" value=\"${inv.date}\" ${locked?'disabled':''}></label><label>TRANSPORTE", "<label>FECHA<input name=\"date\" type=\"date\" value=\"${inv.date}\" ${locked?'disabled':''}></label><label>SALIDA DE STOCK<select name=\"stockLocation\" ${locked?'disabled':''}>${stockLocationOpts(inv.stockLocation||settings().defaultStockLocation||'ALMACEN')}</select></label><label>TRANSPORTE")
rep('js/views-sales.js','export function invoiceFromOrder(order){',"export function invoiceFromOrder(order){if(!can(Runtime.role,'invoiceWrite'))return toast('SIN PERMISO PARA FACTURAR','bad');")
rep('js/views-sales.js','export function bulkDraftPrices(){',"export function bulkDraftPrices(){if(!can(Runtime.role,'invoiceWrite'))return toast('SIN PERMISO PARA MODIFICAR BORRADORES','bad');")
rep('js/views-sales.js','export function bulkIssuedPrices(){',"export function bulkIssuedPrices(){if(!can(Runtime.role,'invoiceWrite'))return toast('SIN PERMISO PARA RECTIFICAR','bad');")
rep('js/views-sales.js','export function rectificationModal(inv){',"export function rectificationModal(inv){if(!can(Runtime.role,'invoiceWrite'))return toast('SIN PERMISO PARA RECTIFICAR','bad');")
rep('js/views-sales.js','export async function handleVoid(inv){',"export async function handleVoid(inv){if(!can(Runtime.role,'invoiceWrite'))return toast('SIN PERMISO PARA ANULAR','bad');")
rep('js/views-sales.js','export function paymentModal(){',"export function paymentModal(){if(!can(Runtime.role,'invoiceWrite'))return toast('SIN PERMISO PARA REGISTRAR COBROS','bad');")

# client360: delivery gets operational view, not misleading financial zeroes
rep('js/views-master.js',"export function client360(c) {\n  const canEditClient=can(Runtime.role,'clientWrite');", "export function client360(c) {\n  const canEditClient=can(Runtime.role,'clientWrite'),canSeeFinance=can(Runtime.role,'invoiceRead');")
marker="""  const pays = (st().payments || [])
    .filter(p => p.clientId === c.id)
    .sort((a, b) => String(b.createdAt || b.date).localeCompare(String(a.createdAt || a.date)));

"""
branch="""  if(!canSeeFinance){
    const byProduct=new Map();for(const o of orders)for(const l of o.lines||[]){const old=byProduct.get(l.productId)||{count:0,qty:0};old.count++;old.qty+=Number(l.deliveredQty||l.requestedQty||0);byProduct.set(l.productId,old)}
    const orderRows=orders.slice(0,50).map(o=>`<tr><td>${esc(o.date||'')}</td><td>${badge(o.status||'')}</td><td>${o.lines?.length||0}</td></tr>`),productRows=[...byProduct].sort((a,b)=>b[1].count-a[1].count).slice(0,20).map(([pid,v])=>`<tr><td><b>${esc(product(pid)?.name||pid)}</b></td><td>${v.count}</td><td>${round2(v.qty)}</td></tr>`);
    modal(`CLIENTE 360º · ${c.name}`,`<div class=\"panel\"><h3>CONTACTO</h3><p><b>${esc(c.name||'')}</b></p><p>${esc(c.address||'')}</p><p>${esc(c.phone||c.whatsapp||'')}</p></div><div class=\"grid2\"><div><h3>PEDIDOS RECIENTES</h3>${table(['FECHA','ESTADO','LÍNEAS'],orderRows)}</div><div><h3>PRODUCTOS HABITUALES SEGÚN PEDIDOS</h3>${table(['PRODUCTO','PEDIDOS','CANT.'],productRows)}</div></div>`);return;
  }

"""
rep('js/views-master.js',marker,marker+branch)

# views-admin: settings for stock source
rep('js/views-admin.js',"export function settingsView(){const s=settings();return", "export function settingsStockModal(){if(!can(Runtime.role,'settingsWrite'))return toast('SIN PERMISO PARA CAMBIAR CONFIGURACIÓN','bad');const s=settings(),loc=['ALMACEN','FURGONETA','SAN PABLO','SAN LESMES','SANTIAGO'],opts=v=>loc.map(x=>`<option ${x===(v||'ALMACEN')?'selected':''}>${x}</option>`).join(''),m=modal('UBICACIONES DE SALIDA DE STOCK',`<form id=\"stockSettings\"><label class=\"field\">FACTURA MANUAL POR DEFECTO<select name=\"defaultStockLocation\">${opts(s.defaultStockLocation||'ALMACEN')}</select></label><label class=\"field\">FACTURAR TODA LA RUTA<select name=\"routeStockLocation\">${opts(s.routeStockLocation||'FURGONETA')}</select></label><button class=\"btn primary\">GUARDAR</button></form>`,true);m.querySelector('#stockSettings').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget);await saveEntity('settings',{id:'main',defaultStockLocation:f.get('defaultStockLocation'),routeStockLocation:f.get('routeStockLocation')},'SETTINGS_STOCK_LOCATIONS',Runtime.user);toast('UBICACIONES GUARDADAS','good');closeModal()}}\nexport function settingsView(){const s=settings();return")
old_action="Runtime.role==='owner'?`<button class=\"btn\" data-action=\"master-reload\">RECARGAR CATÁLOGO MAESTRO</button>`:''"
new_action="`${can(Runtime.role,'settingsWrite')?'<button class=\"btn\" data-action=\"settings-stock\">UBICACIONES STOCK</button>':''}${Runtime.role==='owner'?'<button class=\"btn\" data-action=\"master-reload\">RECARGAR CATÁLOGO MAESTRO</button>':''}`"
rep('js/views-admin.js',old_action,new_action)
rep('js/views-admin.js','<div class="success">V4 PROTEGE NUMERACIÓN, COSTES EDITADOS, PERIODOS CERRADOS Y SINCRONIZACIÓN POR ROL.</div>', '<div class="success">V6 · AUDITORÍA ACTIVA · NUMERACIÓN, COSTES, STOCK, ROLES Y PERIODOS PROTEGIDOS.</div>')

# permissions + app action
rep('js/permissions.js',"  masterReload:['owner']", "  masterReload:['owner'],\n  settingsWrite:['owner','admin','manager']")
rep('js/permissions.js',"'finance-export':'financeRead','master-reload':'masterReload',", "'finance-export':'financeRead','master-reload':'masterReload','settings-stock':'settingsWrite',")
rep('js/app.js',"auditView,settingsView,masterReload} from './views-admin.js';", "auditView,settingsView,settingsStockModal,masterReload} from './views-admin.js';")
rep('js/app.js',"case'master-reload':return masterReload();", "case'master-reload':return masterReload();case'settings-stock':return settingsStockModal();")

# financial labels clarify current/last-cost valuation
for a,b in [
('VALOR STOCK A COSTE','VALOR STOCK ACTUAL · ÚLTIMO COSTE'),
('VENTA POTENCIAL STOCK','VENTA POTENCIAL STOCK ACTUAL'),
("'VALOR STOCK','VENTA POT.'","'VALOR STOCK ÚLT. COSTE','VENTA POT.'"),
('LA VENTA POTENCIAL DEL STOCK USA EL PRECIO GENERAL ACTUAL','EL STOCK MOSTRADO ES EL STOCK ACTUAL VALORADO AL ÚLTIMO COSTE Y LA VENTA POTENCIAL USA EL PRECIO GENERAL ACTUAL')]:
    s=rd('js/views-finance.js')
    if a in s: wr('js/views-finance.js',s.replace(a,b))

# manifest/readme wording
rep('manifest.webmanifest','ARW2026 V4 · Facturación, clientes, stock, compras, cobros y reportes en tiempo real.','ARW2026 V6 · Facturación, clientes, stock, compras, cobros, finanzas y auditoría en tiempo real.')
readme=rd('README.md').replace('# ARW2026 v4','# ARW2026 v6').replace('## Principios de v4','## Principios de v6').replace('v4 no reinicia','v6 no reinicia')
readme += "\n\n## Auditoría v6\n- Diagnóstico de integridad en tiempo real desde el módulo AUDITORÍA.\n- Permisos centralizados y alineados con Firestore.\n- Facturas emitidas bloqueadas; borradores editables.\n- Coste congelado al emitir cualquier factura, incluida facturación masiva.\n- Operaciones de stock atómicas.\n- Cierre mensual con stock y coste a fecha de cierre.\n- Selección de ubicación de salida de stock; ruta configurable por defecto.\n- Pruebas automáticas de dominio, finanzas, permisos, salud e invariantes.\n"
wr('README.md',readme)
print('FINAL AUDIT V6 PATCH APPLIED')
