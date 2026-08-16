from pathlib import Path
import re
R=Path('.')
def rd(p): return (R/p).read_text()
def wr(p,s): (R/p).write_text(s)
def replace(p,old,new):
    s=rd(p)
    if old not in s: raise SystemExit(f'NO ENCONTRADO {p}: {old[:120]}')
    wr(p,s.replace(old,new,1))
def rex(p,pat,repl,count=1):
    s=rd(p);o,n=re.subn(pat,repl,s,count=count,flags=re.S)
    if n!=count: raise SystemExit(f'REGEX {p}: {n}/{count} {pat[:120]}')
    wr(p,o)

# ENHANCEMENTS: dashboard limpio, facturas owner-only reset, reset real por ubicación, ruta desde furgoneta/config.
e=rd('js/enhancements.js')
dashboard_actions="  const actions=[can(Runtime.role,'invoiceWrite')?'<button class=\"btn primary\" data-action=\"invoice-new\">＋ FACTURA</button>':'',can(Runtime.role,'orderWrite')?'<button class=\"btn\" data-action=\"paste-order\">PEGAR PEDIDO</button>':'',can(Runtime.role,'invoiceWrite')?'<button class=\"btn\" data-action=\"invoice-all-delivered\">⚡ FACTURAR TODA LA RUTA</button>':'',can(Runtime.role,'weekReset')?'<button class=\"btn\" data-action=\"week-reset\">↻ PONER CONTADORES A 0</button>':''].join('');\n  return"
e,n=re.subn(r"  const actions=\[.*?\]\.join\(''\);\n  return",dashboard_actions,e,count=1,flags=re.S)
if n!=1: raise SystemExit('No se pudo normalizar acciones dashboard')
needle='<button class="btn" data-action="invoice-history-toggle">${window.ARW_INVOICE_HISTORY?\'SOLO PERIODO\':\'VER HISTÓRICO\'}</button><button class="btn" data-action="week-reset">↻ PONER CONTADORES A 0</button>'
if needle in e:e=e.replace(needle,'<button class="btn" data-action="invoice-history-toggle">${window.ARW_INVOICE_HISTORY?\'SOLO PERIODO\':\'VER HISTÓRICO\'}</button>${can(Runtime.role,\'weekReset\')?\'<button class="btn" data-action="week-reset">↻ PONER CONTADORES A 0</button>\':\'\'}',1)
zero="""export async function zeroStockAction(){
  const locations=[...new Set(['ALMACEN','FURGONETA','SAN PABLO','SAN LESMES','SANTIAGO',...st().stockMoves.map(m=>m.location||'ALMACEN')])],nonZero=[];
  for(const p of products())for(const location of locations){const q=stockQuantity(st().stockMoves,p.id,location);if(Math.abs(q)>.0001)nonZero.push({p,location,q})}
  if(!nonZero.length)return toast('TODO EL STOCK, INCLUIDOS NEGATIVOS, YA ESTÁ A 0','good');
  if(!confirm(`SE PONDRÁ A 0 EL STOCK DE ${nonZero.length} PRODUCTO/UBICACIÓN. EL HISTÓRICO SE CONSERVARÁ. ¿CONTINUAR?`))return;
  const typed=prompt('ESCRIBE PONER STOCK A 0 PARA CONFIRMAR');if(upper(typed)!=='PONER STOCK A 0')return;
  try{const n=await zeroAllStockCloud(products(),st().stockMoves,Runtime.user,'REINICIO MANUAL DE STOCK');toast(`${n} AJUSTES CREADOS · POSITIVOS Y NEGATIVOS A 0`,'good')}catch(err){toast(err.message,'bad')}
}
"""
e,n=re.subn(r'export async function zeroStockAction\(\)\{.*?\n\}\n\nexport async function weekResetAction',zero+'\nexport async function weekResetAction',e,count=1,flags=re.S)
if n!=1: raise SystemExit('No se pudo reemplazar zeroStockAction')
if "issuerSnapshot:{...Runtime.settings()},date:o.date||today(),seriesId:'FA'" in e:e=e.replace("issuerSnapshot:{...Runtime.settings()},date:o.date||today(),seriesId:'FA'","issuerSnapshot:{...Runtime.settings()},date:o.date||today(),stockLocation:Runtime.settings().routeStockLocation||'FURGONETA',seriesId:'FA'",1)
wr('js/enhancements.js',e)

# SALES: permisos internos, ubicación de salida, pegar pedido sin facturar para delivery.
s=rd('js/views-sales.js')
s=s.replace("const activeClients=()=>st().clients.filter(c=>c.active!==false&&!c.archived).sort((a,b)=>String(a.name).localeCompare(String(b.name)));","const activeClients=()=>st().clients.filter(c=>c.active!==false&&!c.archived).sort((a,b)=>String(a.name).localeCompare(String(b.name)));\nconst STOCK_LOCATIONS=['ALMACEN','FURGONETA','SAN PABLO','SAN LESMES','SANTIAGO'];\nconst stockLocationOpts=sel=>STOCK_LOCATIONS.map(x=>`<option value=\"${x}\" ${x===(sel||'ALMACEN')?'selected':''}>${x}</option>`).join('');",1)
s=s.replace('export function orderModal(existing=null){',"export function orderModal(existing=null){if(!can(Runtime.role,'orderWrite'))return toast('SIN PERMISO PARA EDITAR PEDIDOS','bad');",1)
s=s.replace('export function pasteOrderInvoiceModal(){',"export function pasteOrderInvoiceModal(){if(!can(Runtime.role,'orderWrite'))return toast('SIN PERMISO PARA CREAR PEDIDOS','bad');",1)
s=s.replace('  let parsed=null;const preview=()=>',"  if(!can(Runtime.role,'invoiceWrite'))m.querySelector('#openPastedInvoice')?.remove();\n  let parsed=null;const preview=()=>",1)
s=s.replace("m.querySelector('#openPastedInvoice').disabled=!ok","{const b=m.querySelector('#openPastedInvoice');if(b)b.disabled=!ok}",1)
s=s.replace("  m.querySelector('#openPastedInvoice').onclick=()=>","  if(m.querySelector('#openPastedInvoice'))m.querySelector('#openPastedInvoice').onclick=()=>",1)
s=s.replace("function blankInvoice(){return {id:uid('inv'),clientId:'',date:today(),seriesId:'FA'","function blankInvoice(){return {id:uid('inv'),clientId:'',date:today(),stockLocation:settings().defaultStockLocation||'ALMACEN',seriesId:'FA'",1)
s=s.replace("date:m.querySelector('[name=date]').value,transportType:","date:m.querySelector('[name=date]').value,stockLocation:m.querySelector('[name=stockLocation]')?.value||base.stockLocation||'ALMACEN',transportType:",1)
s=s.replace("export function invoiceModal(existing=null,preset=null){\n  const locked=","export function invoiceModal(existing=null,preset=null){\n  if(existing&&existing.status!=='draft'){if(!can(Runtime.role,'invoiceRead'))return toast('SIN PERMISO PARA VER FACTURAS','bad')}else if(!can(Runtime.role,'invoiceWrite'))return toast('SIN PERMISO PARA CREAR O EDITAR FACTURAS','bad');\n  const locked=",1)
needle='<label>FECHA<input name="date" type="date" value="${inv.date}" ${locked?\'disabled\':\'\'}></label><label>TRANSPORTE'
if needle not in s: raise SystemExit('No se encontró inserción de salida stock en factura')
s=s.replace(needle,'<label>FECHA<input name="date" type="date" value="${inv.date}" ${locked?\'disabled\':\'\'}></label><label>SALIDA DE STOCK<select name="stockLocation" ${locked?\'disabled\':\'\'}>${stockLocationOpts(inv.stockLocation||settings().defaultStockLocation||\'ALMACEN\')}</select></label><label>TRANSPORTE',1)
for old,new in [
('export function invoiceFromOrder(order){',"export function invoiceFromOrder(order){if(!can(Runtime.role,'invoiceWrite'))return toast('SIN PERMISO PARA FACTURAR','bad');"),
('export function bulkDraftPrices(){',"export function bulkDraftPrices(){if(!can(Runtime.role,'invoiceWrite'))return toast('SIN PERMISO PARA MODIFICAR BORRADORES','bad');"),
('export function bulkIssuedPrices(){',"export function bulkIssuedPrices(){if(!can(Runtime.role,'invoiceWrite'))return toast('SIN PERMISO PARA RECTIFICAR','bad');"),
('export function rectificationModal(inv){',"export function rectificationModal(inv){if(!can(Runtime.role,'invoiceWrite'))return toast('SIN PERMISO PARA RECTIFICAR','bad');"),
('export async function handleVoid(inv){',"export async function handleVoid(inv){if(!can(Runtime.role,'invoiceWrite'))return toast('SIN PERMISO PARA ANULAR','bad');"),
('export function paymentModal(){',"export function paymentModal(){if(!can(Runtime.role,'invoiceWrite'))return toast('SIN PERMISO PARA REGISTRAR COBROS','bad');")]:
    if old in s:s=s.replace(old,new,1)
wr('js/views-sales.js',s)

# MASTER: cliente delivery no debe ver falsos saldos financieros.
m=rd('js/views-master.js')
m=m.replace("export function client360(c) {\n  const canEditClient=can(Runtime.role,'clientWrite');","export function client360(c) {\n  const canEditClient=can(Runtime.role,'clientWrite'),canSeeFinance=can(Runtime.role,'invoiceRead');",1)
marker="""  const pays = (st().payments || [])
    .filter(p => p.clientId === c.id)
    .sort((a, b) => String(b.createdAt || b.date).localeCompare(String(a.createdAt || a.date)));

"""
if marker not in m: raise SystemExit('No se encontró punto de cliente360')
branch="""  if(!canSeeFinance){
    const byProduct=new Map();for(const o of orders)for(const l of o.lines||[]){const old=byProduct.get(l.productId)||{count:0,qty:0};old.count++;old.qty+=Number(l.deliveredQty||l.requestedQty||0);byProduct.set(l.productId,old)}
    const orderRows=orders.slice(0,50).map(o=>`<tr><td>${esc(o.date||'')}</td><td>${badge(o.status||'')}</td><td>${o.lines?.length||0}</td></tr>`),productRows=[...byProduct].sort((a,b)=>b[1].count-a[1].count).slice(0,20).map(([pid,v])=>`<tr><td><b>${esc(product(pid)?.name||pid)}</b></td><td>${v.count}</td><td>${round2(v.qty)}</td></tr>`);
    modal(`CLIENTE 360º · ${c.name}`,`<div class="panel"><h3>CONTACTO</h3><p><b>${esc(c.name||'')}</b></p><p>${esc(c.address||'')}</p><p>${esc(c.phone||c.whatsapp||'')}</p></div><div class="grid2"><div><h3>PEDIDOS RECIENTES</h3>${table(['FECHA','ESTADO','LÍNEAS'],orderRows)}</div><div><h3>PRODUCTOS HABITUALES SEGÚN PEDIDOS</h3>${table(['PRODUCTO','PEDIDOS','CANT.'],productRows)}</div></div>`);return;
  }

"""
m=m.replace(marker,marker+branch,1)
wr('js/views-master.js',m)

# SETTINGS: configuración explícita de ubicación.
a=rd('js/views-admin.js')
insert="""export function settingsStockModal(){if(!can(Runtime.role,'settingsWrite'))return toast('SIN PERMISO PARA CAMBIAR CONFIGURACIÓN','bad');const s=settings(),loc=['ALMACEN','FURGONETA','SAN PABLO','SAN LESMES','SANTIAGO'],opts=v=>loc.map(x=>`<option ${x===(v||'ALMACEN')?'selected':''}>${x}</option>`).join(''),m=modal('UBICACIONES DE SALIDA DE STOCK',`<form id="stockSettings"><label class="field">FACTURA MANUAL POR DEFECTO<select name="defaultStockLocation">${opts(s.defaultStockLocation||'ALMACEN')}</select></label><label class="field">FACTURAR TODA LA RUTA<select name="routeStockLocation">${opts(s.routeStockLocation||'FURGONETA')}</select></label><button class="btn primary">GUARDAR</button></form>`,true);m.querySelector('#stockSettings').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget);await saveEntity('settings',{id:'main',defaultStockLocation:f.get('defaultStockLocation'),routeStockLocation:f.get('routeStockLocation')},'SETTINGS_STOCK_LOCATIONS',Runtime.user);toast('UBICACIONES GUARDADAS','good');closeModal()}}
"""
a=a.replace('export function settingsView(){const s=settings();return',insert+'export function settingsView(){const s=settings();return',1)
old="Runtime.role==='owner'?`<button class=\"btn\" data-action=\"master-reload\">RECARGAR CATÁLOGO MAESTRO</button>`:''"
if old not in a: raise SystemExit('No se encontró actions settings')
a=a.replace(old,"`${can(Runtime.role,'settingsWrite')?'<button class=\"btn\" data-action=\"settings-stock\">UBICACIONES STOCK</button>':''}${Runtime.role==='owner'?'<button class=\"btn\" data-action=\"master-reload\">RECARGAR CATÁLOGO MAESTRO</button>':''}`",1)
a=a.replace('V4 PROTEGE NUMERACIÓN, COSTES EDITADOS, PERIODOS CERRADOS Y SINCRONIZACIÓN POR ROL.','V6 · AUDITORÍA ACTIVA · NUMERACIÓN, COSTES, STOCK, ROLES Y PERIODOS PROTEGIDOS.',1)
wr('js/views-admin.js',a)

# permisos + app
p=rd('js/permissions.js').replace("  masterReload:['owner']","  masterReload:['owner'],\n  settingsWrite:['owner','admin','manager']",1).replace("'finance-export':'financeRead','master-reload':'masterReload',","'finance-export':'financeRead','master-reload':'masterReload','settings-stock':'settingsWrite',",1);wr('js/permissions.js',p)
app=rd('js/app.js').replace("auditView,settingsView,masterReload} from './views-admin.js';","auditView,settingsView,settingsStockModal,masterReload} from './views-admin.js';",1).replace("case'master-reload':return masterReload();","case'master-reload':return masterReload();case'settings-stock':return settingsStockModal();",1);wr('js/app.js',app)

# Finanzas: etiquetar inventario actual/último coste.
f=rd('js/views-finance.js')
for x,y in [('VALOR STOCK A COSTE','VALOR STOCK ACTUAL · ÚLTIMO COSTE'),('VENTA POTENCIAL STOCK','VENTA POTENCIAL STOCK ACTUAL'),('LA VENTA POTENCIAL DEL STOCK USA EL PRECIO GENERAL ACTUAL','EL STOCK MOSTRADO ES EL STOCK ACTUAL VALORADO AL ÚLTIMO COSTE Y LA VENTA POTENCIAL USA EL PRECIO GENERAL ACTUAL')]:f=f.replace(x,y)
wr('js/views-finance.js',f)

# docs/version
man=rd('manifest.webmanifest').replace('ARW2026 V4 · Facturación, clientes, stock, compras, cobros y reportes en tiempo real.','ARW2026 V6 · Facturación, clientes, stock, compras, cobros, finanzas y auditoría en tiempo real.');wr('manifest.webmanifest',man)
r=rd('README.md').replace('# ARW2026 v4','# ARW2026 v6').replace('## Principios de v4','## Principios de v6').replace('v4 no reinicia','v6 no reinicia')
if '## Auditoría v6' not in r:r+='''\n\n## Auditoría v6\n- Diagnóstico de integridad en tiempo real desde AUDITORÍA.\n- Permisos centralizados y alineados con Firestore.\n- Facturas emitidas bloqueadas; borradores editables.\n- Coste congelado al emitir cualquier factura.\n- Operaciones de stock atómicas.\n- Cierre mensual con stock y coste a fecha de cierre.\n- Ubicación de salida de stock configurable.\n- Pruebas automáticas de dominio, finanzas, permisos, salud e invariantes.\n'''
wr('README.md',r)
print('FINAL AUDIT V6 APPLIED')
