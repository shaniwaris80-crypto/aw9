// FACTUMADRID AW9 · Facturas PDF en mayúsculas
// Mantiene números, importes, NIF y email. Convierte a mayúsculas el texto visible
// únicamente cuando se genera un PDF desde el módulo de facturación.

const FLAG='__AW9_INVOICE_PDF_UPPERCASE';
let timer=null;

const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/\s+/g,' ').trim();

function isInvoiceScreen(){
  const title=norm(document.getElementById('pageTitle')?.textContent||'');
  return title.includes('FACTUR');
}

function activate(){
  window[FLAG]=true;
  clearTimeout(timer);
  timer=setTimeout(()=>{window[FLAG]=false;},7000);
}

// Detecta clics de PDF/IMPRIMIR dentro del módulo Facturas.
document.addEventListener('click',e=>{
  const btn=e.target.closest('button,a,[role="button"]');
  if(!btn||!isInvoiceScreen()) return;
  const t=norm(`${btn.textContent||''} ${btn.getAttribute('title')||''} ${btn.getAttribute('aria-label')||''}`);
  if(t.includes('PDF')||t.includes('IMPRIM')) activate();
},true);

function looksLikeEmail(text){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(String(text).trim());}
function upperText(value){
  if(Array.isArray(value)) return value.map(upperText);
  if(value&&typeof value==='object'&&'content' in value) return {...value,content:upperText(value.content)};
  if(typeof value!=='string') return value;
  if(looksLikeEmail(value)) return value;
  return value.toLocaleUpperCase('es-ES');
}

function patchText(){
  const api=window.jspdf?.jsPDF?.API;
  if(!api?.text||api.text.__aw9UpperInvoice) return false;
  const original=api.text;
  function wrapped(text,...args){
    if(window[FLAG]) text=upperText(text);
    return original.call(this,text,...args);
  }
  wrapped.__aw9UpperInvoice=true;
  api.text=wrapped;
  return true;
}

function patchAutoTable(){
  const api=window.jspdf?.jsPDF?.API;
  if(!api?.autoTable||api.autoTable.__aw9UpperInvoice) return false;
  const original=api.autoTable;
  function wrapped(options,...rest){
    if(window[FLAG]&&options){
      const clone={...options};
      if(Array.isArray(options.head)) clone.head=options.head.map(r=>Array.isArray(r)?r.map(upperText):upperText(r));
      if(Array.isArray(options.body)) clone.body=options.body.map(r=>Array.isArray(r)?r.map(upperText):upperText(r));
      if(Array.isArray(options.foot)) clone.foot=options.foot.map(r=>Array.isArray(r)?r.map(upperText):upperText(r));
      options=clone;
    }
    return original.call(this,options,...rest);
  }
  wrapped.__aw9UpperInvoice=true;
  api.autoTable=wrapped;
  return true;
}

function patchSave(){
  const api=window.jspdf?.jsPDF?.API;
  if(!api?.save||api.save.__aw9UpperInvoice) return false;
  const original=api.save;
  function wrapped(filename,...args){
    if(window[FLAG]&&typeof filename==='string') filename=filename.replace(/factura/ig,'FACTURA');
    return original.call(this,filename,...args);
  }
  wrapped.__aw9UpperInvoice=true;
  api.save=wrapped;
  return true;
}

function patch(){
  const a=patchText(),b=patchAutoTable(),c=patchSave();
  return a&&b&&c;
}

const iv=setInterval(()=>{if(patch()) clearInterval(iv);},200);
window.addEventListener('load',patch);

window.AW9InvoiceUppercase={activate,upperText};
