import {calcInvoice,lineDescription,money,upper} from './domain.js';

function getJsPDF(){if(!window.jspdf?.jsPDF)throw new Error('JSPDF NO CARGADO');return window.jspdf.jsPDF;}
export function invoicePdfBlob(inv,client,settings={},internal=false){
  const jsPDF=getJsPDF();const doc=new jsPDF({unit:'mm',format:'a4'});const x=calcInvoice(inv);const pageW=210;
  const C=s=>upper(s||'');
  doc.setProperties({title:`FACTURA ${inv.number||'BORRADOR'}`,subject:'ARW2026',author:C(settings.companyName||'MOHAMMAD ARSLAN WARIS')});
  doc.setFont('helvetica','bold');doc.setFontSize(23);doc.text(['credit','debit'].includes(inv.type)?'FACTURA RECTIFICATIVA':'FACTURA',15,18);
  doc.setFontSize(11);doc.text(C(inv.number||'BORRADOR'),195,16,{align:'right'});doc.setFont('helvetica','normal');doc.text(C(inv.date||''),195,22,{align:'right'});
  doc.setDrawColor(30);doc.line(15,27,195,27);
  doc.setFontSize(8);doc.setFont('helvetica','bold');doc.text('PROVEEDOR',15,34);doc.text('CLIENTE',110,34);
  doc.setFont('helvetica','normal');
  const provider=[C(settings.companyName),C(settings.companyNif),C(settings.companyAddress),C(settings.companyPhone),C(settings.companyEmail)].filter(Boolean);
  const cust=[C(client?.name||inv.clientSnapshot?.name),C(client?.nif||inv.clientSnapshot?.nif),C(client?.address||inv.clientSnapshot?.address),C(client?.phone||inv.clientSnapshot?.phone)].filter(Boolean);
  provider.forEach((t,i)=>doc.text(t,15,40+i*5));cust.forEach((t,i)=>doc.text(t,110,40+i*5));
  const startY=Math.max(62,40+Math.max(provider.length,cust.length)*5+5);
  const body=x.lines.map(l=>[
    C(l.code),C(l.name),C(l.mode==='caja_kg'?'CAJA × KG':l.mode==='caja_fija'?'CAJA FIJA':l.mode),
    String(l.qty).replace('.',','),l.mode==='caja_kg'?String(l.kgPerBox).replace('.',','):'—',
    l.gross?String(l.gross).replace('.',','):'—',l.tare?String(l.tare).replace('.',','):'—',
    l.mode==='caja_kg'?String(l.net).replace('.',','):String(l.billedQty).replace('.',','),
    `${Number(l.price).toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2})} €`,`${l.vat}%`,money(l.base)
  ]);
  doc.autoTable({startY,head:[['CÓD.','PRODUCTO','MODO','CANT.','KG/CAJA','BRUTO','TARA','NETO','PRECIO','IVA','IMPORTE']],body,styles:{font:'helvetica',fontSize:7,cellPadding:1.7,overflow:'linebreak'},headStyles:{fontStyle:'bold'},columnStyles:{1:{cellWidth:33},2:{cellWidth:18},8:{halign:'right'},9:{halign:'center'},10:{halign:'right'}},didDrawPage:()=>{doc.setFontSize(7);doc.text(`ARW2026 · ${C(inv.number||'BORRADOR')} · PÁGINA ${doc.internal.getNumberOfPages()}`,105,291,{align:'center'});}});
  let y=doc.lastAutoTable.finalY+7;if(y>242){doc.addPage();y=20;}
  doc.setFontSize(8);doc.setFont('helvetica','bold');doc.text('DESGLOSE DE IVA',15,y);y+=5;doc.setFont('helvetica','normal');
  for(const v of x.vatBreakdown){doc.text(`BASE IVA ${v.rate}%`,15,y);doc.text(money(v.base),95,y,{align:'right'});doc.text(`IVA ${v.rate}%`,105,y);doc.text(money(v.vat),150,y,{align:'right'});y+=5;}
  y+=2;const summary=[['SUBTOTAL PRODUCTOS',money(x.productBase)],['DESCUENTO',money(x.globalDiscount)],['TRANSPORTE',money(x.transport)],['BASE IMPONIBLE',money(x.base)],['IVA TOTAL',money(x.vatTotal)],['TOTAL FACTURA',money(x.total)],['PAGADO',money(x.paid)],['PENDIENTE',money(x.pending)]];
  for(const [lab,val] of summary){doc.setFont('helvetica',lab==='TOTAL FACTURA'?'bold':'normal');doc.setFontSize(lab==='TOTAL FACTURA'?12:9);doc.text(lab,125,y);doc.text(val,195,y,{align:'right'});y+=lab==='TOTAL FACTURA'?7:5;}
  if(['credit','debit'].includes(inv.type)){doc.setFont('helvetica','bold');doc.setFontSize(8);doc.text(`RECTIFICA: ${C(inv.originalInvoiceNumber||'')}`,15,y);y+=5;doc.setFont('helvetica','normal');doc.text(`MOTIVO: ${C(inv.reason||'')}`,15,y,{maxWidth:105});}
  if(inv.notes){y+=5;doc.setFontSize(8);doc.text(`OBSERVACIONES: ${C(inv.notes)}`,15,y,{maxWidth:105});}
  if(internal){y+=8;doc.setFont('helvetica','bold');doc.text('COPIA INTERNA · NO ENTREGAR AL CLIENTE',15,y);y+=5;doc.setFont('helvetica','normal');for(const l of x.lines){const cost=(l.mode==='caja_kg'?l.net:l.qty)*Number(l.buyPriceSnapshot||0);doc.text(`${C(l.name)} · COSTE ${money(cost)} · BASE ${money(l.base)}`,15,y);y+=4;if(y>280){doc.addPage();y=20;}}}
  return doc.output('blob');
}
export function saveBlob(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000);}
export function invoiceFilename(inv,client){const n=upper(client?.name||inv.clientSnapshot?.name||'CLIENTE').replace(/[^A-Z0-9ÁÉÍÓÚÜÑ]+/g,'_').replace(/^_|_$/g,'');return `FACTURA_${n}_${inv.date}_${inv.number||'BORRADOR'}.pdf`;}
export function downloadInvoice(inv,client,settings,internal=false){const blob=invoicePdfBlob(inv,client,settings,internal);saveBlob(blob,invoiceFilename(inv,client));}
export async function downloadDayZip(invoices,clients,settings,date){
  if(!window.JSZip)throw new Error('JSZIP NO CARGADO');const zip=new window.JSZip();let summary=`ARW2026 · FACTURAS ${date}\n\n`;
  for(const inv of invoices){const c=clients.find(x=>x.id===inv.clientId)||inv.clientSnapshot||{};const blob=invoicePdfBlob(inv,c,settings);zip.file(invoiceFilename(inv,c),blob);summary+=`${inv.number}\t${upper(c.name)}\t${money(calcInvoice(inv).total)}\n`;}
  zip.file('RESUMEN.txt',summary);const out=await zip.generateAsync({type:'blob'});saveBlob(out,`ARW2026_FACTURAS_${date}.zip`);
}
export function statementPdf(client,invoices,payments){const jsPDF=getJsPDF();const doc=new jsPDF();doc.setFont('helvetica','bold');doc.setFontSize(18);doc.text(`ESTADO DE CUENTA · ${upper(client.name)}`,15,18);const rows=invoices.map(i=>{const x=calcInvoice(i);return[i.date,i.number||'BORRADOR',upper(i.status),money(x.total),money(x.paid),money(x.pending)]});doc.autoTable({startY:28,head:[['FECHA','FACTURA','ESTADO','TOTAL','PAGADO','PENDIENTE']],body:rows,styles:{fontSize:8}});saveBlob(doc.output('blob'),`ESTADO_CUENTA_${upper(client.name).replace(/\W+/g,'_')}.pdf`);}
