import { Store } from './store.js';

const VAT_CLASS='aw9-vat-badge';
const FLOW_ID='aw9-billing-flow';
let scheduled=false;

const norm=v=>String(v??'')
  .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  .toUpperCase().replace(/\s+/g,' ').trim();

function products(){ return (Store.state.products||[]).filter(p=>p&&p.active!==false); }
function vatLabel(v){
  const n=Number(v||0);
  return `IVA ${Number.isFinite(n)?n:0}%`;
}
function vatClass(v){
  const n=Number(v||0);
  return n===4?'vat4':n===10?'vat10':n===21?'vat21':'vatother';
}
function productForText(text){
  const t=norm(text);
  if(!t) return null;
  const list=products();
  // Primero coincidencia por nombre completo, después por código delimitado.
  let p=list.find(x=>x.name&&t.includes(norm(x.name)));
  if(p) return p;
  p=list.find(x=>x.code&&new RegExp(`(^|[^A-Z0-9])${norm(x.code).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}([^A-Z0-9]|$)`).test(t));
  return p||null;
}
function makeBadge(vat){
  const s=document.createElement('span');
  s.className=`${VAT_CLASS} ${vatClass(vat)}`;
  s.textContent=vatLabel(vat);
  s.title=`Tipo impositivo del producto: ${vatLabel(vat)}`;
  return s;
}
function ensureStyles(){
  if(document.getElementById('aw9-iva-styles')) return;
  const style=document.createElement('style');
  style.id='aw9-iva-styles';
  style.textContent=`
    .${VAT_CLASS}{display:inline-flex;align-items:center;justify-content:center;white-space:nowrap;font-size:11px;font-weight:800;line-height:1;padding:5px 7px;border-radius:999px;margin-left:7px;border:1px solid currentColor;vertical-align:middle}
    .${VAT_CLASS}.vat4{color:#166534;background:#f0fdf4}.aw9-vat-badge.vat10{color:#92400e;background:#fffbeb}.aw9-vat-badge.vat21{color:#991b1b;background:#fef2f2}.aw9-vat-badge.vatother{color:#374151;background:#f3f4f6}
    td.aw9-vat-cell,th.aw9-vat-head{white-space:nowrap;text-align:center}.aw9-vat-cell .${VAT_CLASS}{margin-left:0}
    #${FLOW_ID}{margin:0 0 14px;padding:12px 14px;border:1px solid #dbe3ee;border-radius:14px;background:#fff;box-shadow:0 3px 12px rgba(15,23,42,.04)}
    #${FLOW_ID} .aw9-flow-title{display:flex;gap:8px;align-items:center;font-weight:800;margin-bottom:9px}
    #${FLOW_ID} .aw9-flow{display:flex;gap:6px;align-items:center;overflow-x:auto;padding-bottom:2px;scrollbar-width:thin}
    #${FLOW_ID} .aw9-step{flex:0 0 auto;padding:7px 9px;border-radius:10px;background:#f8fafc;border:1px solid #e2e8f0;font-size:12px;font-weight:700}
    #${FLOW_ID} .aw9-arrow{color:#64748b;font-size:12px}.aw9-flow-note{font-size:12px;color:#475569;margin-top:8px}
    .aw9-iva-legend{display:flex;gap:7px;flex-wrap:wrap;align-items:center;margin:8px 0 12px;font-size:12px;color:#475569}.aw9-iva-legend .${VAT_CLASS}{margin-left:0}
    @media(max-width:700px){#${FLOW_ID}{padding:10px}.aw9-vat-badge{font-size:10px;padding:4px 6px}}
  `;
  document.head.appendChild(style);
}

function decorateSelects(root=document){
  root.querySelectorAll('select option').forEach(opt=>{
    if(opt.dataset.aw9VatDecorated==='1') return;
    const p=productForText(opt.textContent);
    if(!p) return;
    if(!/IVA\s*\d+%/i.test(opt.textContent)) opt.textContent=`${opt.textContent} · ${vatLabel(p.vat)}`;
    opt.dataset.aw9VatDecorated='1';
  });
  root.querySelectorAll('datalist option').forEach(opt=>{
    if(opt.dataset.aw9VatDecorated==='1') return;
    const p=productForText(`${opt.value||''} ${opt.label||''}`);
    if(!p) return;
    opt.label=`${opt.label||opt.value||p.name} · ${vatLabel(p.vat)}`;
    opt.dataset.aw9VatDecorated='1';
  });
}

function decorateTables(root=document){
  root.querySelectorAll('table').forEach(table=>{
    const rows=[...table.querySelectorAll('tbody tr')];
    let decorated=0;
    rows.forEach(tr=>{
      if(tr.querySelector('.aw9-vat-cell')) return;
      const p=productForText(tr.textContent);
      if(!p) return;
      const td=document.createElement('td');
      td.className='aw9-vat-cell';
      td.appendChild(makeBadge(p.vat));
      tr.appendChild(td);
      tr.dataset.aw9ProductVat=String(p.vat??'');
      decorated++;
    });
    if(decorated){
      const hr=table.querySelector('thead tr');
      if(hr&&!hr.querySelector('.aw9-vat-head')){
        const th=document.createElement('th');th.className='aw9-vat-head';th.textContent='IVA';hr.appendChild(th);
      }
    }
  });
}

function decorateProductBlocks(root=document){
  const candidates=root.querySelectorAll('[data-product-id], .product-card, .product-row, .invoice-line, .line-item');
  candidates.forEach(el=>{
    if(el.querySelector(`.${VAT_CLASS}`)) return;
    const p=productForText(el.textContent);
    if(!p) return;
    el.appendChild(makeBadge(p.vat));
  });
}

function ensureLegend(root=document){
  const title=norm(document.getElementById('pageTitle')?.textContent||'');
  if(!(title.includes('PRODUCT')||title.includes('FACTUR'))) return;
  const view=document.getElementById('view');
  if(!view||view.querySelector('.aw9-iva-legend')) return;
  const legend=document.createElement('div');
  legend.className='aw9-iva-legend';
  legend.innerHTML='<strong>IVA por producto:</strong>';
  [4,10,21].forEach(v=>legend.appendChild(makeBadge(v)));
  view.prepend(legend);
}

function ensureBillingFlow(){
  const title=norm(document.getElementById('pageTitle')?.textContent||'');
  if(!(title.includes('FACTUR')||title.includes('PEDIDO')||title.includes('RUTA'))) return;
  const view=document.getElementById('view');
  if(!view||document.getElementById(FLOW_ID)) return;
  const box=document.createElement('div');
  box.id=FLOW_ID;
  const steps=['Pedido','Preparación / compra','Reparto real','Precio cliente','Revisar factura','PDF','Historial'];
  box.innerHTML=`<div class="aw9-flow-title"><span>🧾</span><span>Flujo FACTUMADRID</span></div><div class="aw9-flow">${steps.map((s,i)=>`${i?'<span class="aw9-arrow">→</span>':''}<span class="aw9-step">${s}</span>`).join('')}</div><div class="aw9-flow-note"><strong>Se factura lo realmente entregado</strong>, no lo inicialmente pedido. Cada línea conserva su tipo de IVA y el precio específico del cliente.</div>`;
  view.prepend(box);
}

function patchPdfAutoTable(){
  const api=window.jspdf?.jsPDF?.API;
  if(!api?.autoTable||api.autoTable.__aw9VatPatched) return;
  const original=api.autoTable;
  function wrapped(options,...rest){
    try{
      if(options&&Array.isArray(options.head)&&Array.isArray(options.body)&&options.head[0]){
        const head=options.head[0];
        const labels=head.map(x=>norm(typeof x==='object'?(x.content??''):x));
        const productIndex=labels.findIndex(x=>x.includes('PRODUCT')||x.includes('DESCRIP'));
        const hasVat=labels.some(x=>x==='IVA'||x.includes('IVA %'));
        if(productIndex>=0&&!hasVat&&options.body.some(r=>Array.isArray(r)&&productForText(r[productIndex]))){
          const clone={...options,head:options.head.map((r,i)=>i===0?[...r,'IVA']:r),body:options.body.map(r=>{
            if(!Array.isArray(r)) return r;
            const p=productForText(r[productIndex]);
            return [...r,p?`${Number(p.vat||0)}%`:''];
          })};
          return original.call(this,clone,...rest);
        }
      }
    }catch(e){ console.warn('AW9 IVA PDF',e); }
    return original.call(this,options,...rest);
  }
  wrapped.__aw9VatPatched=true;
  api.autoTable=wrapped;
}

function run(){
  scheduled=false;
  ensureStyles();
  patchPdfAutoTable();
  const root=document.getElementById('appShell')||document;
  decorateSelects(root);
  decorateTables(root);
  decorateProductBlocks(root);
  ensureBillingFlow();
  ensureLegend();
}
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(run);}

Store.subscribe(schedule);
new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
window.addEventListener('load',schedule);
window.AW9IVA={vatForProduct:text=>productForText(text)?.vat??null,vatLabel};
schedule();
