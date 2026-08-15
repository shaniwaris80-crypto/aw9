import {calcInvoice,lineDescription,money,upper} from './domain.js';

function getJsPDF(){if(!window.jspdf?.jsPDF)throw new Error('JSPDF NO CARGADO');return window.jspdf.jsPDF;}
function numText(n){return String(Number(n||0)).replace('.',',');}
export function invoicePdfBlob(inv,client,settings={},internal=false){
  const jsPDF=getJsPDF();const doc=new jsPDF({unit:'mm',format:'a4'});const x=calcInvoice(inv);const C=s=>upper(s||'');
  doc.setProperties({title:`FACTURA ${inv.number||'BORRADOR'}`,subject:'ARW2026',author:C(settings.companyName||'MOHAMMAD ARSLAN WARIS')});
  doc.setFont('helvetica','bold');doc.setFontSize(23);doc.text(['credit','debit'].includes(inv.type)?'FACTURA RECTIFICATIVA':'FACTURA',15,18);
  doc.setFontSize(11);doc.text(C(inv.number||'BORRADOR'),195,16,{align:'right'});doc.setFont('helvetica','normal');doc.text(C(inv.date||''),195,22,{align:'right'});
  doc.setDrawColor(30);doc.line(15,27,195,27);
  doc.setFontSize(8);doc.setFont('helvetica','bold');doc.text('PROVEEDOR',15,34);doc.text('CLIENTE',110,34);
  doc.setFont('helvetica','normal');
  const provider=[C(settings.companyName),C(settings.companyNif),C(settings.companyAddress),C(settings.companyPhone),C(settings.companyEmail)].filter(Boolean);
  const cust=[C(client?.name||inv.clientSnapshot?.name),C(client?.nif||inv.clientSnapshot?.nif),C(client?.address||inv.clientSnapshot?.address),C(client?.phone||inv.clientSnapshot?.phone)].filter(Boolean);
  provider.forEach((t,i)=>doc.text(t,15,40+i*5));cust.forEach((t,i)=>doc.text(t,110,40+i*5));
  if(x.equivalenceSurcharge){doc.setFont('helvetica','bold');doc.text('RECARGO DE EQUIVALENCIA',110,40+cust.length*5+2);doc.setFont('helvetica','normal');}
  const startY=Math.max(64,40+Math.max(provider.length,cust.length+(x.equivalenceSurcharge?1:0))*5+7);
  const body=x.lines.map(l=>[
    C(l.code),C(l.name),C(l.mode==='caja_kg'?'CAJA × KG':l.mode==='caja_fija'?'CAJA FIJA':l.mode),
    numText(l.qty),l.mode==='caja_kg'?numText(l.kgPerBox):'—',
    l.gross?numText(l.gross):'—',l.tare?numText(l.tare):'—',
    l.mode==='caja_kg'?numText(l.net):numText(l.billedQty),
    `${Number(l.price).toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2})} €`,`${l.vat}%`,money(l.base)
  ]);
  doc.autoTable({startY,head:[['CÓD.','PRODUCTO','MODO','CANT.','KG/CAJA','BRUTO','TARA','NETO','PRECIO','IVA','IMPORTE']],body,styles:{font:'helvetica',fontSize:7,cellPadding:1.6,overflow:'linebreak'},headStyles:{fontStyle:'bold'},columnStyles:{1:{cellWidth:33},2:{cellWidth:18},8:{halign:'right'},9:{halign:'center'},10:{halign:'right'}},didDrawPage:data=>{doc.setFontSize(7);doc.setTextColor(100);doc.text(`ARW2026 · ${C(inv.number||'BORRADOR')} · PÁGINA ${data.pageNumber}`,105,291,{align:'center'});doc.setTextColor(0);}});
  let y=doc.lastAutoTable.finalY+6;if(y>225){doc.addPage();y=18;}
  if(x.transport||x.globalDiscount){doc.setFontSize(8);doc.setTextColor(80);const bits=[];if(x.globalDiscount)bits.push(`DESCUENTO: ${money(x.globalDiscount)}`);if(x.transport)bits.push(`TRANSPORTE INCLUIDO EN BASE: ${money(x.transport)}`);doc.text(bits.join('   ·   '),15,y);doc.setTextColor(0);y+=6;}
  const hasRE=Number(x.equivalenceTotal||0)!==0||x.equivalenceSurcharge;
  const taxHead=hasRE?['TIPO','BASE','IVA','R.E.','CUOTA R.E.']:['TIPO','BASE','IVA'];
  const taxBody=x.vatBreakdown.map(v=>hasRE?[`IVA ${v.rate}%`,money(v.base),money(v.vat),v.reRate?`${v.reRate}%`:'—',money(v.re||0)]:[`IVA ${v.rate}%`,money(v.base),money(v.vat)]);
  doc.autoTable({startY:y,head:[taxHead],body:taxBody,theme:'plain',styles:{fontSize:8,cellPadding:1.4},headStyles:{fontStyle:'bold',fillColor:[245,247,250],textColor:[30,41,59]},columnStyles:{1:{halign:'right'},2:{halign:'right'},3:{halign:'right'},4:{halign:'right'}},margin:{left:112,right:15}});
  y=doc.lastAutoTable.finalY+5;if(y>247){doc.addPage();y=22;}
  const boxX=112,boxW=83,boxH=hasRE?35:30;
  doc.setDrawColor(15,23,42);doc.setLineWidth(.5);doc.roundedRect(boxX,y,boxW,boxH,2,2);
  doc.setFontSize(8);doc.setFont('helvetica','normal');doc.text('BASE IMPONIBLE',boxX+6,y+7);doc.text(money(x.base),boxX+boxW-6,y+7,{align:'right'});
  doc.text('IVA TOTAL',boxX+6,y+13);doc.text(money(x.vatTotal),boxX+boxW-6,y+13,{align:'right'});
  let totalBandY=y+18;
  if(hasRE){doc.text('RECARGO EQUIVALENCIA',boxX+6,y+19);doc.text(money(x.equivalenceTotal||0),boxX+boxW-6,y+19,{align:'right'});totalBandY=y+23;}
  doc.setFillColor(15,23,42);doc.roundedRect(boxX,totalBandY,boxW,boxH-(totalBandY-y),2,2,'F');doc.setTextColor(255);doc.setFont('helvetica','bold');doc.setFontSize(12);doc.text('TOTAL FACTURA',boxX+6,totalBandY+8);doc.text(money(x.total),boxX+boxW-6,totalBandY+8,{align:'right'});doc.setTextColor(0);
  y+=boxH+6;
  doc.setFont('helvetica','bold');doc.setFontSize(8);doc.text(`PAGADO: ${money(x.paid)}   ·   PENDIENTE: ${money(x.pending)}`,195,y,{align:'right'});doc.setFont('helvetica','normal');
  if(['credit','debit'].includes(inv.type)){doc.setFont('helvetica','bold');doc.text(`RECTIFICA: ${C(inv.originalInvoiceNumber||'')}`,15,y);doc.setFont('helvetica','normal');doc.text(`MOTIVO: ${C(inv.reason||'')}`,15,y+5,{maxWidth:90});}
  if(inv.notes){doc.setFontSize(8);doc.text(`OBSERVACIONES: ${C(inv.notes)}`,15,y+11,{maxWidth:90});}
  if(internal){let iy=Math.max(y+18,250);if(iy>270){doc.addPage();iy=20;}doc.setFont('helvetica','bold');doc.text('COPIA INTERNA · NO ENTREGAR AL CLIENTE',15,iy);iy+=5;doc.setFont('helvetica','normal');for(const l of x.lines){const cost=(l.mode==='caja_kg'?l.net:l.qty)*Number(l.buyPriceSnapshot||0);doc.text(`${C(l.name)} · COSTE ${money(cost)} · BASE ${money(l.base)} · ${lineDescription(l)}`,15,iy,{maxWidth:180});iy+=4;if(iy>280){doc.addPage();iy=20;}}}
  return doc.output('blob');
}
export function saveBlob(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000);}
export function invoiceFilename(inv,client){const n=upper(client?.name||inv.clientSnapshot?.name||'CLIENTE').replace(/[^A-Z0-9ÁÉÍÓÚÜÑ]+/g,'_').replace(/^_|_$/g,'');return `FACTURA_${n}_${inv.date}_${inv.number||'BORRADOR'}.pdf`;}
export function downloadInvoice(inv,client,settings,internal=false){const blob=invoicePdfBlob(inv,client,settings,internal);saveBlob(blob,invoiceFilename(inv,client));}
export async function downloadDayZip(invoices,clients,settings,date){
  if(!window.JSZip)throw new Error('JSZIP NO CARGADO');const zip=new window.JSZip();let summary=`ARW2026 · FACTURAS ${date}\n\n`;
  for(const inv of invoices){const c=clients.find(x=>x.id===inv.clientId)||inv.clientSnapshot||{};const blob=invoicePdfBlob(inv,c,settings);zip.file(invoiceFilename(inv,c),blob);const x=calcInvoice(inv);summary+=`${inv.number}\t${upper(c.name)}\t${money(x.total)}\tIVA ${money(x.vatTotal)}\tRE ${money(x.equivalenceTotal||0)}\n`;}
  zip.file('RESUMEN.txt',summary);const out=await zip.generateAsync({type:'blob'});saveBlob(out,`ARW2026_FACTURAS_${date}.zip`);
}
export function statementPdf(client,invoices,payments){const jsPDF=getJsPDF();const doc=new jsPDF();doc.setFont('helvetica','bold');doc.setFontSize(18);doc.text(`ESTADO DE CUENTA · ${upper(client.name)}`,15,18);const rows=invoices.map(i=>{const x=calcInvoice(i);return[i.date,i.number||'BORRADOR',upper(i.status),money(x.total),money(x.paid),money(x.pending)]});doc.autoTable({startY:28,head:[['FECHA','FACTURA','ESTADO','TOTAL','PAGADO','PENDIENTE']],body:rows,styles:{fontSize:8}});saveBlob(doc.output('blob'),`ESTADO_CUENTA_${upper(client.name).replace(/\W+/g,'_')}.pdf`);}
