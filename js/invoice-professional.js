import { Store } from './store.js';

const PDF_FLAG='__AW9_INVOICE_PDF_UPPERCASE';
const REVIEW_ID='aw9-invoice-professional-review';
let scheduled=false;
let pdfMeta={invoiceNo:'',client:'',date:''};

const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/\s+/g,' ').trim();
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

function isInvoiceScreen(){
  const title=norm(document.getElementById('pageTitle')?.textContent||'');
  return title.includes('FACTUR');
}
function products(){return (Store.state.products||[]).filter(x=>x&&x.active!==false)}
function productFromText(text){
  const t=norm(text); if(!t)return null;
  return products().find(p=>p.name&&t.includes(norm(p.name)))||products().find(p=>p.code&&new RegExp(`(^|[^A-Z0-9])${norm(p.code).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}([^A-Z0-9]|$)`).test(t))||null;
}
function findFieldValue(labelTerms=[]){
  const terms=labelTerms.map(norm);
  for(const lab of document.querySelectorAll('label')){
    const txt=norm(lab.textContent||'');
    if(!terms.some(t=>txt.includes(t))) continue;
    const input=lab.querySelector('input,select,textarea')||lab.parentElement?.querySelector('input,select,textarea');
    if(input){
      if(input.tagName==='SELECT') return input.selectedOptions?.[0]?.textContent?.trim()||input.value||'';
      return input.value||'';
    }
  }
  return '';
}
function captureMeta(){
  if(!isInvoiceScreen()) return;
  pdfMeta={
    invoiceNo:findFieldValue(['Nº FACTURA','N° FACTURA','NUMERO FACTURA','NÚMERO FACTURA'])||'',
    client:findFieldValue(['CLIENTE'])||'',
    date:findFieldValue(['FECHA'])||''
  };
}

document.addEventListener('click',e=>{
  const b=e.target.closest('button,a,[role="button"]'); if(!b||!isInvoiceScreen())return;
  const t=norm(`${b.textContent||''} ${b.title||''} ${b.getAttribute('aria-label')||''}`);
  if(t.includes('PDF')||t.includes('IMPRIM')) captureMeta();
},true);

function ensureStyles(){
  if(document.getElementById('aw9-invoice-professional-styles'))return;
  const s=document.createElement('style');
  s.id='aw9-invoice-professional-styles';
  s.textContent=`
    #${REVIEW_ID}{margin:0 0 14px;border:1px solid #dbe2ea;background:#fff;border-radius:14px;padding:12px 14px;box-shadow:0 2px 10px rgba(15,23,42,.04)}
    #${REVIEW_ID} .aw9-review-head{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:9px}
    #${REVIEW_ID} .aw9-review-title{font-weight:850;color:#111827;display:flex;align-items:center;gap:7px}
    #${REVIEW_ID} .aw9-review-pills{display:flex;gap:6px;flex-wrap:wrap}
    #${REVIEW_ID} .aw9-review-pill{font-size:11px;font-weight:750;border:1px solid #dbe2ea;border-radius:999px;padding:5px 8px;background:#f8fafc;color:#334155}
    #${REVIEW_ID} .ok{border-color:#bbf7d0;background:#f0fdf4;color:#166534}
    #${REVIEW_ID} .warn{border-color:#fde68a;background:#fffbeb;color:#92400e}
    #${REVIEW_ID} .bad{border-color:#fecaca;background:#fef2f2;color:#991b1b}
    #${REVIEW_ID} .aw9-review-msg{font-size:12px;color:#475569}
    #${REVIEW_ID} .aw9-review-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:9px}
    #${REVIEW_ID} .aw9-review-btn{appearance:none;border:1px solid #cbd5e1;background:#fff;color:#0f172a;border-radius:9px;padding:7px 10px;font-weight:750;font-size:12px;cursor:pointer}
    #${REVIEW_ID} .aw9-review-btn:hover{background:#f8fafc}
    @media(max-width:700px){#${REVIEW_ID}{padding:10px 11px}.aw9-review-pill{font-size:10px!important}}
  `;
  document.head.appendChild(s);
}

function inspectInvoice(){
  const result={lines:0,iva:0,boxKg:0,issues:[]};
  const tables=[...document.querySelectorAll('#view table,#modalRoot table')];
  for(const table of tables){
    for(const tr of table.querySelectorAll('tbody tr')){
      const text=tr.textContent||'';
      const p=productFromText(text);
      if(!p) continue;
      result.lines++;
      const ivaText=norm(text);
      if(new RegExp(`IVA\\s*${Number(p.vat||0)}%|(^|\\s)${Number(p.vat||0)}%(\\s|$)`).test(ivaText)||tr.querySelector('.aw9-vat-badge')) result.iva++;
      else result.issues.push(`${p.name}: NO SE VE EL IVA ${Number(p.vat||0)}%`);
      if(p.mode==='caja_kg'&&Number(p.kgPerBox)>0){
        if(tr.querySelector('.aw9-box-calc')||ivaText.includes('KG/CAJA')||ivaText.includes(`${Number(p.kgPerBox)} KG`)||tr.dataset.aw9ProductVat!==undefined) result.boxKg++;
      }
      const numericInputs=[...tr.querySelectorAll('input[type="number"]')];
      if(numericInputs.length&&numericInputs.every(i=>Number(String(i.value||0).replace(',','.'))===0)) result.issues.push(`${p.name}: REVISA LA CANTIDAD`);
    }
  }
  if(!result.lines) result.issues.push('NO SE HAN DETECTADO LÍNEAS DE PRODUCTO EN LA FACTURA');
  const client=findFieldValue(['CLIENTE']);
  if(!client) result.issues.push('FALTA CLIENTE');
  return result;
}

function renderReview(){
  if(!isInvoiceScreen()) return;
  const view=document.getElementById('view'); if(!view)return;
  let box=document.getElementById(REVIEW_ID);
  if(!box){box=document.createElement('div');box.id=REVIEW_ID;view.prepend(box)}
  const r=inspectInvoice();
  const ivaOk=r.lines>0&&r.iva===r.lines;
  const boxesTotal=products().filter(p=>p.mode==='caja_kg').length;
  const issues=r.issues.slice(0,4);
  box.innerHTML=`
    <div class="aw9-review-head">
      <div class="aw9-review-title">🧾 <span>CONTROL DE FACTURA PROFESIONAL</span></div>
      <div class="aw9-review-pills">
        <span class="aw9-review-pill ${r.lines?'ok':'warn'}">${r.lines} LÍNEA${r.lines===1?'':'S'}</span>
        <span class="aw9-review-pill ${ivaOk?'ok':'warn'}">IVA POR PRODUCTO ${ivaOk?'✓':'!'}</span>
        <span class="aw9-review-pill ok">CAJAS → KG AUTO ✓</span>
        <span class="aw9-review-pill ok">PDF MAYÚSCULAS ✓</span>
      </div>
    </div>
    <div class="aw9-review-msg">${issues.length?`⚠️ ${esc(issues.join(' · '))}`:'✅ FACTURA LISTA PARA REVISAR Y EMITIR.'}</div>
    <div class="aw9-review-actions"><button type="button" class="aw9-review-btn" data-aw9-review>REVISAR AHORA</button></div>`;
  box.querySelector('[data-aw9-review]')?.addEventListener('click',()=>{
    const x=inspectInvoice();
    box.querySelector('.aw9-review-msg').textContent=x.issues.length?`⚠️ ${x.issues.join(' · ')}`:'✅ SIN INCIDENCIAS DETECTADAS. REVISA EL TOTAL Y PUEDES EMITIR.';
  });
}

function mergeStyles(base,extra){return {...(base||{}),...extra}}
function patchAutoTable(){
  const api=window.jspdf?.jsPDF?.API; if(!api?.autoTable||api.autoTable.__aw9Professional)return false;
  const original=api.autoTable;
  function wrapped(options,...rest){
    if(window[PDF_FLAG]&&options){
      const o={...options};
      o.theme='grid';
      o.margin={left:14,right:14,...(options.margin||{})};
      o.styles=mergeStyles(options.styles,{font:'helvetica',fontSize:8.4,cellPadding:2.2,lineWidth:.08,lineColor:[218,223,230],textColor:[25,30,36],valign:'middle',overflow:'linebreak'});
      o.headStyles=mergeStyles(options.headStyles,{fillColor:[24,28,34],textColor:[255,255,255],fontStyle:'bold',fontSize:8.2,halign:'center'});
      o.bodyStyles=mergeStyles(options.bodyStyles,{fillColor:[255,255,255]});
      o.alternateRowStyles=mergeStyles(options.alternateRowStyles,{fillColor:[248,249,251]});
      o.footStyles=mergeStyles(options.footStyles,{fillColor:[245,247,250],textColor:[17,24,39],fontStyle:'bold'});
      o.rowPageBreak='avoid';
      const previousDidParse=options.didParseCell;
      o.didParseCell=function(data){
        try{
          const head=norm(data.column?.raw?.header||data.column?.dataKey||'');
          if(/PREC|IMPORTE|TOTAL|BASE|IVA|CANT|KG|TARA|NETO/.test(head)) data.cell.styles.halign='right';
          if(/PRODUCT|DESCRIP/.test(head)) data.cell.styles.fontStyle=data.section==='body'?'bold':data.cell.styles.fontStyle;
        }catch{}
        if(typeof previousDidParse==='function') previousDidParse(data);
      };
      options=o;
    }
    return original.call(this,options,...rest);
  }
  wrapped.__aw9Professional=true;api.autoTable=wrapped;return true;
}

function addProfessionalFooter(doc){
  if(!window[PDF_FLAG]||doc.__aw9FooterAdded)return;
  doc.__aw9FooterAdded=true;
  try{
    const pages=doc.getNumberOfPages();
    const w=doc.internal.pageSize.getWidth();
    const h=doc.internal.pageSize.getHeight();
    for(let i=1;i<=pages;i++){
      doc.setPage(i);
      doc.setDrawColor(205,210,218);doc.setLineWidth(.2);doc.line(14,h-13,w-14,h-13);
      doc.setFont('helvetica','normal');doc.setFontSize(7.4);doc.setTextColor(100,107,116);
      const left=[pdfMeta.invoiceNo||'FACTURA AW',pdfMeta.client].filter(Boolean).join(' · ').toUpperCase();
      doc.text(left||'FACTUMADRID',14,h-8);
      doc.text(`PÁGINA ${i}/${pages}`,w-14,h-8,{align:'right'});
    }
    if(typeof doc.setProperties==='function') doc.setProperties({title:pdfMeta.invoiceNo?`FACTURA ${pdfMeta.invoiceNo}`:'FACTURA AW',subject:'FACTURA FACTUMADRID',author:'FACTUMADRID',creator:'FACTUMADRID AW9',keywords:'factura, factumadrid'});
  }catch(e){console.warn('AW9 footer PDF',e)}
}
function patchSave(){
  const api=window.jspdf?.jsPDF?.API;if(!api?.save||api.save.__aw9Professional)return false;
  const original=api.save;
  function wrapped(filename,...args){addProfessionalFooter(this);return original.call(this,filename,...args)}
  wrapped.__aw9Professional=true;api.save=wrapped;return true;
}
function patchOutput(){
  const api=window.jspdf?.jsPDF?.API;if(!api?.output||api.output.__aw9Professional)return false;
  const original=api.output;
  function wrapped(...args){addProfessionalFooter(this);return original.apply(this,args)}
  wrapped.__aw9Professional=true;api.output=wrapped;return true;
}
function patchPdf(){return patchAutoTable()&&patchSave()&&patchOutput()}

function run(){scheduled=false;ensureStyles();renderReview();patchPdf()}
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(run)}
Store.subscribe(schedule);
new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
window.addEventListener('load',schedule);
const timer=setInterval(()=>{if(patchPdf())clearInterval(timer)},250);
schedule();
