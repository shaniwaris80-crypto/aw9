import { Store } from './store.js';

const BOX_CLASS='aw9-box-calc';
let scheduled=false;

const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/\s+/g,' ').trim();
const num=v=>{const n=Number(String(v??'').replace(',','.'));return Number.isFinite(n)?n:0};
const money=v=>Math.round((num(v)+Number.EPSILON)*100)/100;

function products(){return (Store.state.products||[]).filter(p=>p&&p.active!==false)}
function productFrom(value){
  if(!value) return null;
  const t=norm(value);
  return products().find(p=>String(p.id)===String(value)||norm(p.code)===t||norm(p.name)===t)
    || products().find(p=>t.includes(norm(p.name))||t.includes(norm(p.code)))
    || null;
}
function productFromLine(line={}){
  return productFrom(line.productId||line.productID||line.prodId||line.code||line.productCode||line.product||line.name||line.description||'');
}
function isBoxKg(p){return p&&p.mode==='caja_kg'&&num(p.kgPerBox)>0}
function explicitBoxes(line={}){
  for(const k of ['boxes','boxQty','boxesQty','quantityBoxes','deliveredBoxes','cajas','cajasEntregadas']){
    if(line[k]!==undefined&&line[k]!==null&&line[k]!=='') return num(line[k]);
  }
  return 0;
}
function quantityValue(line={}){
  for(const k of ['qty','quantity','deliveredQty','delivered','amount','units']){
    if(line[k]!==undefined&&line[k]!==null&&line[k]!=='') return num(line[k]);
  }
  return 0;
}
function unitPrice(line={}){
  for(const k of ['unitPrice','price','sellPrice','priceUnit']) if(line[k]!==undefined) return num(line[k]);
  return 0;
}
function vatRate(line,p){return num(line.vat??line.vatRate??line.taxRate??p?.vat??0)}
function sourceSuggestsBoxes(line={}){
  const unit=norm(line.inputUnit||line.sourceUnit||line.quantityUnit||line.saleUnit||line.unit||'');
  return unit.includes('CAJA')||line.orderId||line.sourceOrderId||line.deliveryId||line.routeDeliveryId||line.fromOrder===true||line.aw9BoxMode===true;
}
function normalizeInvoiceLine(line){
  if(!line||typeof line!=='object') return line;
  const p=productFromLine(line);
  if(!isBoxKg(p)) return line;
  const kgPerBox=num(p.kgPerBox);
  let boxes=explicitBoxes(line);
  let qty=quantityValue(line);

  if(!boxes){
    if(sourceSuggestsBoxes(line)) boxes=qty;
    else if(qty>0&&Math.abs((qty/kgPerBox)-Math.round(qty/kgPerBox))<0.000001) boxes=qty/kgPerBox;
  }
  if(boxes>0){
    const kg=money(boxes*kgPerBox);
    const price=unitPrice(line);
    const vat=vatRate(line,p);
    const base=money(kg*price);
    line.boxes=boxes;
    line.kgPerBox=kgPerBox;
    line.weightKg=kg;
    line.billQtyKg=kg;
    line.quantityKg=kg;
    line.qty=kg;
    if('quantity' in line) line.quantity=kg;
    line.unit='kg';
    line.inputUnit='caja';
    line.aw9BoxMode=true;
    line.boxDisplay=`${boxes} caja${boxes===1?'':'s'} × ${kgPerBox} kg = ${kg} kg`;
    if(price){
      line.base=base;
      if('subtotal' in line) line.subtotal=base;
      if('lineBase' in line) line.lineBase=base;
      const vatAmount=money(base*vat/100);
      if('vatAmount' in line) line.vatAmount=vatAmount;
      if('taxAmount' in line) line.taxAmount=vatAmount;
      if('total' in line) line.total=money(base+vatAmount);
      if('lineTotal' in line) line.lineTotal=money(base+vatAmount);
    }
  }
  return line;
}
function normalizeInvoice(inv){
  if(!inv||typeof inv!=='object') return inv;
  for(const key of ['lines','items','products']) if(Array.isArray(inv[key])) inv[key].forEach(normalizeInvoiceLine);
  inv.aw9BoxConversion=true;
  return inv;
}

// Protección a nivel de datos: cualquier factura que pase por Store queda normalizada.
const originalSave=Store.save.bind(Store);
Store.save=async function(name,obj,opts){
  if(name==='invoices') normalizeInvoice(obj);
  return originalSave(name,obj,opts);
};
const originalBulkSave=Store.bulkSave.bind(Store);
Store.bulkSave=async function(name,items){
  if(name==='invoices'&&Array.isArray(items)) items.forEach(normalizeInvoice);
  return originalBulkSave(name,items);
};

function ensureStyles(){
  if(document.getElementById('aw9-box-styles')) return;
  const s=document.createElement('style');
  s.id='aw9-box-styles';
  s.textContent=`
    .${BOX_CLASS}{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:7px 0;padding:8px 10px;border:1px solid #bfdbfe;background:#eff6ff;border-radius:10px;font-size:12px;color:#1e3a8a}
    .${BOX_CLASS} strong{font-weight:850}.aw9-box-input{width:78px!important;min-width:78px!important;padding:6px 8px!important}.aw9-box-result{font-weight:800;color:#0f172a}.aw9-box-rule{font-size:11px;color:#475569}
    .aw9-box-pdf-note{font-size:11px}.aw9-kg-readonly{background:#f8fafc!important}
  `;
  document.head.appendChild(s);
}
function selectedProduct(select){
  const opt=select?.selectedOptions?.[0];
  return productFrom(select?.value)||productFrom(opt?.textContent||'');
}
function fieldMeta(input){
  const label=input.closest('label')?.textContent||'';
  return norm(`${input.name||''} ${input.id||''} ${input.placeholder||''} ${input.getAttribute('aria-label')||''} ${label}`);
}
function findQtyInput(container){
  const inputs=[...container.querySelectorAll('input[type="number"]')];
  return inputs.find(i=>/(CANT|QTY|QUANTITY|ENTREG|UNIDAD|KG)/.test(fieldMeta(i))&&!/(PREC|PRICE|COST|IVA|VAT|MARG|DESC|DISCOUNT|TOTAL)/.test(fieldMeta(i)))||null;
}
function fire(input){input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));}
function inferBoxes(qty,kgPerBox){
  qty=num(qty);kgPerBox=num(kgPerBox);
  if(!qty||!kgPerBox) return qty||0;
  const div=qty/kgPerBox;
  if(Math.abs(div-Math.round(div))<0.000001) return money(div); // ya venía en kg
  return qty; // se interpreta como cajas entregadas
}
function attachBoxCalculator(select){
  const p=selectedProduct(select);
  const container=select.closest('tr,.invoice-line,.line-item,.form-row,.form-grid,.card,fieldset')||select.parentElement;
  if(!container) return;
  const old=container.querySelector(`.${BOX_CLASS}`);
  if(!isBoxKg(p)){if(old) old.remove();return;}
  const qty=findQtyInput(container);
  if(!qty) return;
  const kgPerBox=num(p.kgPerBox);
  let box=old;
  if(!box){
    box=document.createElement('div');box.className=BOX_CLASS;
    box.innerHTML='<strong>📦 Cajas entregadas</strong><input class="aw9-box-input" type="number" min="0" step="1"><span class="aw9-box-result"></span><span class="aw9-box-rule"></span>';
    qty.insertAdjacentElement('afterend',box);
  }
  const boxInput=box.querySelector('.aw9-box-input');
  const result=box.querySelector('.aw9-box-result');
  const rule=box.querySelector('.aw9-box-rule');
  const currentProduct=box.dataset.productId;
  if(currentProduct!==String(p.id)){
    box.dataset.productId=String(p.id);
    boxInput.value=String(inferBoxes(qty.value,kgPerBox)||'');
  }
  const sync=()=>{
    const boxes=num(boxInput.value);
    const kg=money(boxes*kgPerBox);
    result.textContent=`${boxes||0} caja${boxes===1?'':'s'} × ${kgPerBox} kg = ${kg} kg`;
    rule.textContent=`Se facturan ${kg} kg al precio €/kg del cliente`;
    qty.value=boxes?String(kg):'';
    qty.dataset.aw9Boxes=String(boxes||0);
    qty.dataset.aw9KgPerBox=String(kgPerBox);
    qty.dataset.aw9BoxMode='1';
    qty.readOnly=true;
    qty.classList.add('aw9-kg-readonly');
    fire(qty);
  };
  if(!boxInput.dataset.bound){boxInput.addEventListener('input',sync);boxInput.dataset.bound='1';}
  sync();
}
function decorate(){
  scheduled=false;ensureStyles();
  const title=norm(document.getElementById('pageTitle')?.textContent||'');
  if(!/(FACTUR|PEDIDO|REPART|ENTREGA|RUTA)/.test(title)) return;
  document.querySelectorAll('#view select,#modalRoot select').forEach(sel=>{
    const p=selectedProduct(sel);
    if(p&&isBoxKg(p)) attachBoxCalculator(sel);
    if(!sel.dataset.aw9BoxChange){sel.addEventListener('change',()=>attachBoxCalculator(sel));sel.dataset.aw9BoxChange='1';}
  });
}
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(decorate)}
Store.subscribe(schedule);
new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
window.addEventListener('load',schedule);

// PDF: muestra cajas + kilos cuando la línea es un producto caja_kg.
function patchPdf(){
  const api=window.jspdf?.jsPDF?.API;
  if(!api?.autoTable||api.autoTable.__aw9BoxPatched) return;
  const original=api.autoTable;
  function wrapped(options,...rest){
    try{
      if(options&&Array.isArray(options.head)&&Array.isArray(options.body)&&options.head[0]){
        const labels=options.head[0].map(x=>norm(typeof x==='object'?(x.content??''):x));
        const pi=labels.findIndex(x=>x.includes('PRODUCT')||x.includes('DESCRIP'));
        const qi=labels.findIndex(x=>x.includes('CANT')||x==='QTY'||x.includes('UNIDAD'));
        if(pi>=0&&qi>=0){
          const clone={...options,body:options.body.map(row=>{
            if(!Array.isArray(row)) return row;
            const p=productFrom(row[pi]);if(!isBoxKg(p)) return row;
            const q=num(typeof row[qi]==='object'?(row[qi].content??''):row[qi]);
            const kgPerBox=num(p.kgPerBox);if(!q||!kgPerBox) return row;
            let boxes=q/kgPerBox;
            if(Math.abs(boxes-Math.round(boxes))>0.000001) boxes=q;
            else boxes=money(boxes);
            const kg=money(boxes*kgPerBox);
            const copy=[...row];copy[qi]=`${boxes} caja${boxes===1?'':'s'} × ${kgPerBox} kg = ${kg} kg`;return copy;
          })};
          return original.call(this,clone,...rest);
        }
      }
    }catch(e){console.warn('AW9 caja/kg PDF',e)}
    return original.call(this,options,...rest);
  }
  wrapped.__aw9BoxPatched=true;api.autoTable=wrapped;
}
const pdfTimer=setInterval(()=>{patchPdf();if(window.jspdf?.jsPDF?.API?.autoTable?.__aw9BoxPatched)clearInterval(pdfTimer)},250);

window.AW9BOX={normalizeInvoice,normalizeInvoiceLine,kgForBoxes:(product,boxes)=>isBoxKg(product)?money(num(boxes)*num(product.kgPerBox)):num(boxes)};
schedule();
