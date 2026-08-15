import {Store} from './store.js';
import {calcInvoice,PRODUCT_MODES} from './domain.js';
import {upper,fmtDate,money,n} from './utils.js';
const {jsPDF}=window.jspdf||{};
function filename(inv,client){return `FACTURA_${upper(client?.name||'CLIENTE').replace(/[^A-Z0-9]+/g,'_')}_${inv.date||''}_${inv.number||'BORRADOR'}.pdf`}
export function buildInvoicePdf(inv,client,{blob=false}={}){
  if(!jsPDF)throw new Error('PDF NO DISPONIBLE');inv=calcInvoice(inv);const s=Store.state.settings;const doc=new jsPDF({unit:'mm',format:'a4'});doc.setProperties({title:`FACTURA ${inv.number||''}`,subject:'FACTURA ARW2026',author:upper(s.companyName)});
  doc.setFont('helvetica','bold');doc.setFontSize(21);doc.text('FACTURA',14,18);doc.setFontSize(10);doc.text(upper(inv.number||'BORRADOR'),196,16,{align:'right'});doc.setFont('helvetica','normal');doc.text(`FECHA: ${fmtDate(inv.date)}`,196,22,{align:'right'});
  doc.setDrawColor(210);doc.line(14,27,196,27);
  doc.setFont('helvetica','bold');doc.text('PROVEEDOR',14,35);doc.text('CLIENTE',110,35);doc.setFont('helvetica','normal');
  const left=[upper(s.companyName),`NIF: ${upper(s.companyNif)}`,upper(s.companyAddress),`${s.companyPhone||''} · ${s.companyEmail||''}`];const right=[upper(client?.name||''),client?.nif?`NIF: ${upper(client.nif)}`:'',upper(client?.address||''),client?.phone||''].filter(Boolean);
  left.forEach((x,i)=>doc.text(x,14,42+i*5));right.forEach((x,i)=>doc.text(x,110,42+i*5));
  const body=inv.lines.map(l=>[upper(l.code),upper(l.product),upper(PRODUCT_MODES[l.mode]||l.mode),l.mode==='caja_kg'?`${n(l.qty)} CAJAS`: `${n(l.qty)} ${upper(l.unit)}`,l.mode==='caja_kg'?`${n(l.kgPerBox)} KG`:'—',l.mode==='caja_kg'?`${n(l.net)} KG`: `${n(l.net)}`,`${n(l.price)} €`,`${n(l.vat)}%`,money(l.base)]);
  doc.autoTable({startY:66,head:[['CÓD.','PRODUCTO','MODO','CANT.','KG/CAJA','NETO','PRECIO','IVA','IMPORTE']],body,theme:'grid',styles:{font:'helvetica',fontSize:7.6,cellPadding:2},headStyles:{fontStyle:'bold',fillColor:[30,41,59],textColor:255},columnStyles:{6:{halign:'right'},7:{halign:'center'},8:{halign:'right'}},didDrawPage:()=>{doc.setFontSize(7);doc.setTextColor(100);doc.text(`${upper(inv.number||'BORRADOR')} · PÁGINA ${doc.internal.getNumberOfPages()}`,196,290,{align:'right'});doc.setTextColor(0)}});
  let y=doc.lastAutoTable.finalY+8;doc.setFontSize(9);const rows=[['SUBTOTAL PRODUCTOS',inv.productBase],['TRANSPORTE',inv.transportBase],['DESCUENTO',-inv.globalDiscount],['BASE IMPONIBLE',inv.base]];rows.forEach(([k,v])=>{if(k==='DESCUENTO'&&!v)return;doc.text(k,140,y);doc.text(money(v),196,y,{align:'right'});y+=5});
  inv.vatBreakdown.forEach(v=>{doc.text(`IVA ${v.rate}% · BASE ${money(v.base)}`,140,y);doc.text(money(v.vat),196,y,{align:'right'});y+=5});
  doc.setDrawColor(60);doc.line(140,y,196,y);y+=6;doc.setFont('helvetica','bold');doc.setFontSize(13);doc.text('TOTAL FACTURA',140,y);doc.text(money(inv.total),196,y,{align:'right'});y+=7;doc.setFontSize(9);doc.setFont('helvetica','normal');doc.text(`PAGADO: ${money(inv.paid)}`,140,y);doc.text(`PENDIENTE: ${money(inv.pending)}`,196,y,{align:'right'});y+=6;doc.text(`FORMA DE PAGO: ${upper(inv.paymentMethod||client?.paymentMethod||'PENDIENTE')}`,140,y);
  if(inv.notes){y+=8;doc.setFont('helvetica','bold');doc.text('OBSERVACIONES',14,y);doc.setFont('helvetica','normal');doc.text(doc.splitTextToSize(upper(inv.notes),120),14,y+5)}
  return blob?doc.output('blob'):(doc.save(filename(inv,client)),doc);
}
export async function invoicesZip(invoices,clients,date){const zip=new JSZip();for(const inv of invoices){const c=clients.find(x=>x.id===inv.clientId);zip.file(filename(inv,c),buildInvoicePdf(inv,c,{blob:true}))}const b=await zip.generateAsync({type:'blob'});return {blob:b,name:`FACTURAS_${date}.zip`}}
export function summaryPdf(title,headers,rows,name='INFORME.pdf'){const doc=new jsPDF();doc.setFont('helvetica','bold');doc.setFontSize(18);doc.text(upper(title),14,18);doc.autoTable({startY:25,head:[headers.map(upper)],body:rows,styles:{fontSize:8},headStyles:{fillColor:[30,41,59]}});doc.save(name)}
