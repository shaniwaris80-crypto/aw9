import {st,client,esc,money,upper,quarterKey,calcInvoice,summaryPdf} from './context.js';
import {reportsView as baseReportsView} from './admin.js';

export function reportsViewPlus(){return `${baseReportsView()}<div class="actions" style="margin-top:12px"><button class="btn primary" data-act="reportQuarter">PDF TRIMESTRE</button><button class="btn" data-act="reportYear">PDF AÑO</button></div>`}

function periodRows(list){return list.map(i=>{const x=calcInvoice(i);return [i.number||'',i.date||'',upper(client(i.clientId)?.name||''),money(x.base),money(x.vatTotal),money(x.total),money(x.paid),money(x.pending)]})}

export function reportQuarter(){
  const q=quarterKey();const [year,t]=q.split('-T');const quarter=Number(t);const m0=(quarter-1)*3+1;const months=[m0,m0+1,m0+2].map(m=>`${year}-${String(m).padStart(2,'0')}`);
  const list=st().invoices.filter(i=>months.some(m=>i.date?.startsWith(m))&&!['draft','void'].includes(i.status));
  summaryPdf(`REPORTE ${q}`,['Nº','FECHA','CLIENTE','BASE','IVA','TOTAL','COBRADO','PENDIENTE'],periodRows(list),`REPORTE_${q}.pdf`);
}

export function reportYear(){
  const year=new Date().getFullYear().toString();
  const list=st().invoices.filter(i=>i.date?.startsWith(year)&&!['draft','void'].includes(i.status));
  summaryPdf(`REPORTE ANUAL ${year}`,['Nº','FECHA','CLIENTE','BASE','IVA','TOTAL','COBRADO','PENDIENTE'],periodRows(list),`REPORTE_ANUAL_${year}.pdf`);
}
