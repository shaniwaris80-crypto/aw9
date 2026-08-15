(() => {
  'use strict';
  const AW=window.AW;
  const $=s=>document.querySelector(s);
  const view=$('#view');
  let current='dashboard';
  let clientDetailId='';
  let reportMode='month';
  let reportYear=Number(AW.today().slice(0,4));
  let reportMonth=Number(AW.today().slice(5,7));
  let reportQuarter=AW.quarterOf(AW.today());
  const selectedInvoices=new Set();

  const pages={
    dashboard:['⌂','Inicio','Panel general'],
    invoices:['▤','Facturas','Crear, revisar y cobrar'],
    clients:['◉','Clientes','Historial, IVA, pagados y pendientes'],
    stock:['▧','Stock','Cajas, kilos y valor de mercancía'],
    reports:['◌','Reportes','Mensual, trimestral y listado de facturas'],
    settings:['⚙','Ajustes','Empresa, Firebase y copias']
  };

  function toast(msg){const e=document.createElement('div');e.className='toast';e.textContent=msg;$('#toastRoot').appendChild(e);setTimeout(()=>e.remove(),2600)}
  function statusLabel(s){return ({paid:'PAGADA',partial:'PARCIAL',pending:'PENDIENTE',overdue:'VENCIDA',draft:'BORRADOR',cancelled:'ANULADA'})[s]||s.toUpperCase()}
  function statusPill(inv){const s=AW.invoiceStatus(inv);return `<span class="status ${s}">${statusLabel(s)}</span>`}
  function modal(html){$('#modalRoot').innerHTML=`<div class="modal-backdrop" data-close-modal><section class="modal" onclick="event.stopPropagation()">${html}</section></div>`}
  function closeModal(){$('#modalRoot').innerHTML=''}

  function showApp(){
    $('#loginView').hidden=true;$('#appShell').hidden=false;
    buildNav();render();
    $('#cloudBadge').textContent=AW.cloud.enabled?'☁ Cloud':'Local';
  }
  function showLogin(){
    $('#loginView').hidden=false;$('#appShell').hidden=true;
  }
  function buildNav(){
    $('#nav').innerHTML=Object.entries(pages).map(([id,[icon,label]])=>`<button class="nav-btn ${current===id?'active':''}" data-page="${id}">${icon}<span>${label}</span></button>`).join('');
  }
  function goto(id){current=id;clientDetailId='';buildNav();render();$('#sidebar').classList.remove('open');$('#scrim').hidden=true}

  function render(){
    const p=pages[current];$('#pageTitle').textContent=p[1];$('#pageSubtitle').textContent=p[2];
    if(current==='dashboard')renderDashboard();
    if(current==='invoices')renderInvoices();
    if(current==='clients')renderClients();
    if(current==='stock')renderStock();
    if(current==='reports')renderReports();
    if(current==='settings')renderSettings();
  }

  function renderDashboard(){
    const month=AW.periodStats(Number(AW.today().slice(0,4)),Number(AW.today().slice(5,7)));
    const stock=AW.stockTotals();
    const overdue=AW.state.invoices.filter(i=>AW.invoiceStatus(i)==='overdue').reduce((a,i)=>a+AW.invoiceCalc(i).pending,0);
    view.innerHTML=`
      <div class="grid stats">
        ${stat('Facturado mes',AW.money(month.total),`${month.count} facturas`)}
        ${stat('IVA mes',AW.money(month.vat),'IVA repercutido')}
        ${stat('Cobrado',AW.money(month.paid),'Este mes')}
        ${stat('Pendiente',AW.money(month.pending),overdue?`${AW.money(overdue)} vencido`:'Sin vencidos')}
        ${stat('Valor stock',AW.money(stock.cost),`${Math.floor(stock.boxes)} cajas completas`)}
      </div>
      <div class="split" style="margin-top:14px">
        <section class="card">
          <div class="section-head"><div><h2>Acciones rápidas</h2><p>Lo más usado en el día a día</p></div></div>
          <div class="toolbar">
            <button class="primary" data-new-invoice>Nueva factura</button>
            <button class="secondary" data-page="stock">Ver stock</button>
            <button class="secondary" data-page="reports">Reporte mensual</button>
          </div>
        </section>
        <section class="card">
          <div class="section-head"><div><h2>Atención</h2><p>Control de cobros y documentos</p></div></div>
          ${alertsHtml()}
        </section>
      </div>`;
  }
  function stat(label,value,sub){return `<article class="card stat"><div class="label">${label}</div><div class="value">${value}</div><div class="sub">${sub}</div></article>`}
  function alertsHtml(){
    const pending=AW.state.invoices.filter(i=>['pending','partial','overdue'].includes(AW.invoiceStatus(i)));
    const drafts=AW.state.invoices.filter(i=>i.status==='draft');
    const overdue=pending.filter(i=>AW.invoiceStatus(i)==='overdue');
    const items=[];
    if(overdue.length)items.push(`🔴 ${overdue.length} facturas vencidas`);
    if(pending.length)items.push(`💶 ${pending.length} facturas con saldo pendiente`);
    if(drafts.length)items.push(`📝 ${drafts.length} borradores sin emitir`);
    if(!items.length)items.push('✅ Sin incidencias importantes');
    return `<div class="grid">${items.map(x=>`<div class="mini"><strong>${x}</strong></div>`).join('')}</div>`;
  }

  function renderInvoices(){
    const rows=AW.state.invoices.map(inv=>{
      const c=AW.invoiceCalc(inv),cl=AW.findClient(inv.clientId),checked=selectedInvoices.has(inv.id);
      return `<tr>
        <td><input type="checkbox" data-select-invoice="${inv.id}" ${checked?'checked':''}></td>
        <td><strong>${AW.esc(inv.number||'BORRADOR')}</strong><small>${AW.esc(inv.date)}</small></td>
        <td>${AW.esc(cl?.name||'Sin cliente')}</td>
        <td>${AW.money(c.base)}</td><td>${AW.money(c.vat)}</td><td><strong>${AW.money(c.total)}</strong></td>
        <td>${AW.money(c.pending)}</td><td>${statusPill(inv)}</td>
        <td><div class="toolbar">
          ${inv.status==='draft'?`<button class="primary" data-emit="${inv.id}">Emitir</button><button class="danger-btn" data-delete-draft="${inv.id}">Borrar</button>`:
          inv.status!=='cancelled'?`<button class="secondary" data-paid="${inv.id}">Pagada</button><button class="warning-btn" data-cancel="${inv.id}">Anular</button>`:''}
        </div></td>
      </tr>`;
    }).join('');
    view.innerHTML=`
      <section class="card">
        <div class="section-head">
          <div><h2>Facturas</h2><p>Los cambios masivos de precios solo afectan a borradores.</p></div>
          <button class="primary" data-new-invoice>Nueva factura</button>
        </div>
        <div class="toolbar" style="margin-bottom:12px">
          <button class="secondary" data-select-drafts>Seleccionar borradores</button>
          <button class="secondary" data-clear-selection>Quitar selección</button>
          <button class="primary" data-bulk-price>Modificar precios seleccionadas</button>
          <span class="muted">${selectedInvoices.size} seleccionadas</span>
        </div>
        <div class="table-wrap"><table class="table"><thead><tr><th></th><th>Factura</th><th>Cliente</th><th>Base</th><th>IVA</th><th>Total</th><th>Pendiente</th><th>Estado</th><th>Acciones</th></tr></thead>
        <tbody>${rows||`<tr><td colspan="9" class="empty">Aún no hay facturas.</td></tr>`}</tbody></table></div>
      </section>`;
  }

  function invoiceModal(){
    const productOptions=AW.state.products.filter(p=>p.active!==false).map(p=>`<option value="${p.id}">${AW.esc(p.code)} · ${AW.esc(p.name)}</option>`).join('');
    const clientOptions=AW.state.clients.filter(c=>c.active!==false).map(c=>`<option value="${c.id}">${AW.esc(c.name)}</option>`).join('');
    modal(`<div class="section-head"><div><h2>Nueva factura</h2><p>Se guarda primero como borrador.</p></div><button class="secondary" data-close-modal>✕</button></div>
      <form id="invoiceForm">
        <div class="form-grid">
          <label>Cliente<select id="invClient" required>${clientOptions}</select></label>
          <label>Fecha<input id="invDate" type="date" value="${AW.today()}" required></label>
          <div class="wide">
            <div class="section-head"><div><h2>Líneas</h2></div><button class="secondary" type="button" data-add-line>Añadir producto</button></div>
            <div id="invoiceLines"></div>
          </div>
          <label class="wide">Notas<textarea id="invNotes" rows="2"></textarea></label>
        </div>
        <div class="toolbar" style="margin-top:14px"><button class="primary" type="submit">Guardar borrador</button><button class="secondary" type="button" data-close-modal>Cancelar</button></div>
      </form>
      <template id="lineTpl"><div class="line-editor">
        <select class="line-product">${productOptions}</select>
        <input class="line-qty" inputmode="decimal" value="1">
        <input class="line-price" inputmode="decimal" placeholder="Precio">
        <input class="line-vat vat" inputmode="decimal" value="4">
        <button class="danger-btn remove" type="button" data-remove-line>×</button>
      </div></template>`);
    addInvoiceLine();
  }
  function addInvoiceLine(){
    const tpl=$('#lineTpl');if(!tpl)return;
    const node=tpl.content.cloneNode(true);$('#invoiceLines').appendChild(node);
    hydrateLine($('#invoiceLines .line-editor:last-child'));
  }
  function hydrateLine(row){
    const p=AW.findProduct(row.querySelector('.line-product').value);
    if(p){row.querySelector('.line-price').value=p.sellPrice||0;row.querySelector('.line-vat').value=p.vat||0}
  }

  function renderClients(){
    if(clientDetailId)return renderClientDetail(clientDetailId);
    const cards=AW.state.clients.map(c=>{
      const s=AW.clientStats(c.id);
      return `<article class="card client-card">
        <div class="section-head"><div><h3>${AW.esc(c.name)}</h3><p>${AW.esc(c.nif||'Sin NIF')} · ${AW.esc(c.address||'')}</p></div><button class="secondary" data-client-detail="${c.id}">Abrir</button></div>
        <div class="client-kpis">${mini('Facturado',AW.money(s.total))}${mini('IVA',AW.money(s.vat))}${mini('Cobrado',AW.money(s.paid))}${mini('Pendiente',AW.money(s.pending))}</div>
      </article>`;
    }).join('');
    view.innerHTML=`<div class="section-head"><div><h2>Clientes</h2><p>Historial completo de facturación y cobros.</p></div><button class="primary" data-new-client>Nuevo cliente</button></div><div class="client-grid">${cards}</div>`;
  }
  function mini(label,value){return `<div class="mini"><span>${label}</span><strong>${value}</strong></div>`}
  function renderClientDetail(id){
    const c=AW.findClient(id);if(!c){clientDetailId='';return renderClients()}
    const s=AW.clientStats(id);
    const invs=AW.state.invoices.filter(i=>i.clientId===id).sort((a,b)=>String(b.date).localeCompare(String(a.date)));
    view.innerHTML=`
      <div class="section-head"><div><button class="secondary" data-back-clients>← Clientes</button><h2 style="margin-top:12px">${AW.esc(c.name)}</h2><p>${AW.esc(c.nif||'Sin NIF')} · ${AW.esc(c.address||'')}</p></div><button class="primary" data-new-invoice-client="${c.id}">Nueva factura</button></div>
      <div class="grid stats">${stat('Facturado',AW.money(s.total),`${s.count} facturas`)}${stat('IVA',AW.money(s.vat),'Histórico')}${stat('Cobrado',AW.money(s.paid),'Histórico')}${stat('Pendiente',AW.money(s.pending),'Saldo actual')}${stat('Base',AW.money(s.base),'Sin IVA')}</div>
      <section class="card" style="margin-top:14px">
        <div class="section-head"><div><h2>Historial de facturas</h2><p>Pagadas, pendientes, parciales y anuladas.</p></div></div>
        <div class="table-wrap"><table class="table"><thead><tr><th>Nº</th><th>Fecha</th><th>Base</th><th>IVA</th><th>Total</th><th>Pagado</th><th>Pendiente</th><th>Estado</th></tr></thead>
          <tbody>${invs.map(i=>{const x=AW.invoiceCalc(i);return `<tr><td>${AW.esc(i.number||'BORRADOR')}</td><td>${i.date}</td><td>${AW.money(x.base)}</td><td>${AW.money(x.vat)}</td><td>${AW.money(x.total)}</td><td>${AW.money(x.paid)}</td><td>${AW.money(x.pending)}</td><td>${statusPill(i)}</td></tr>`}).join('')||`<tr><td colspan="8" class="empty">Sin facturas</td></tr>`}</tbody>
        </table></div>
      </section>`;
  }

  function clientModal(){
    modal(`<div class="section-head"><div><h2>Nuevo cliente</h2></div><button class="secondary" data-close-modal>✕</button></div>
      <form id="clientForm"><div class="form-grid">
      <label>Nombre<input id="clName" required></label><label>NIF<input id="clNif"></label>
      <label class="wide">Dirección<input id="clAddress"></label><label>Teléfono<input id="clPhone"></label><label>Email<input id="clEmail" type="email"></label>
      </div><div class="toolbar" style="margin-top:14px"><button class="primary">Guardar cliente</button></div></form>`);
  }

  function renderStock(){
    const total=AW.stockTotals();
    const cards=AW.state.products.filter(p=>p.active!==false).map(p=>{
      const s=AW.stockDisplay(p);
      return `<article class="card stock-card"><div class="section-head"><div><h2>${AW.esc(p.name)}</h2><p>${AW.esc(p.code)} · Coste ${AW.money(p.buyPrice)}/${AW.esc(p.unit)}</p></div><button class="secondary" data-adjust-stock="${p.id}">Ajustar</button></div>
      <div class="stock-main"><div class="stock-boxes">${s.main}</div></div><div class="stock-kg">${s.sub}</div>
      <div class="stock-meta">${mini('Valor a coste',AW.money(s.cost))}${mini('Venta potencial',AW.money(s.sale))}${mini('Beneficio potencial',AW.money(s.sale-s.cost))}${mini('Precio venta',AW.money(p.sellPrice))}</div></article>`;
    }).join('');
    view.innerHTML=`
      <div class="grid stats">${stat('Valor stock',AW.money(total.cost),'Dinero inmovilizado')}${stat('Venta potencial',AW.money(total.sale),'Si se vende todo')}${stat('Beneficio potencial',AW.money(total.sale-total.cost),'Estimado')}${stat('Cajas completas',AW.num(total.boxes,0),'Productos por caja')}${stat('Productos',AW.state.products.length,'Activos y configurados')}</div>
      <div class="stock-grid" style="margin-top:14px">${cards}</div>`;
  }

  function renderReports(){
    const stats=reportMode==='month'?AW.periodStats(reportYear,reportMonth):AW.periodStats(reportYear,null,reportQuarter);
    const periodLabel=reportMode==='month'?`${String(reportMonth).padStart(2,'0')}/${reportYear}`:`${reportQuarter}T ${reportYear}`;
    view.innerHTML=`
      <section class="card">
        <div class="section-head"><div><h2>Reportes ${periodLabel}</h2><p>Todas las facturas del periodo, importes e IVA.</p></div><button class="secondary" onclick="window.print()">Imprimir / PDF</button></div>
        <div class="toolbar" style="margin-bottom:13px">
          <button class="tab ${reportMode==='month'?'active':''}" data-report-mode="month">Mensual</button>
          <button class="tab ${reportMode==='quarter'?'active':''}" data-report-mode="quarter">Trimestral</button>
          <input id="reportYear" type="number" value="${reportYear}" min="2020" max="2100">
          ${reportMode==='month'?`<select id="reportMonth">${Array.from({length:12},(_,i)=>`<option value="${i+1}" ${reportMonth===i+1?'selected':''}>${String(i+1).padStart(2,'0')}</option>`).join('')}</select>`:
          `<select id="reportQuarter">${[1,2,3,4].map(q=>`<option value="${q}" ${reportQuarter===q?'selected':''}>${q}T</option>`).join('')}</select>`}
        </div>
        <div class="report-grid">${mini('Facturas',stats.count)}${mini('Base imponible',AW.money(stats.base))}${mini('IVA',AW.money(stats.vat))}${mini('Total',AW.money(stats.total))}${mini('Cobrado',AW.money(stats.paid))}${mini('Pendiente',AW.money(stats.pending))}</div>
        <div class="table-wrap"><table class="table"><thead><tr><th>Nº</th><th>Fecha</th><th>Cliente</th><th>NIF</th><th>Base</th><th>IVA</th><th>Total</th><th>Estado</th></tr></thead>
        <tbody>${stats.invoices.sort((a,b)=>String(a.date).localeCompare(String(b.date))).map(i=>{const x=AW.invoiceCalc(i),c=AW.findClient(i.clientId);return `<tr><td>${AW.esc(i.number)}</td><td>${i.date}</td><td>${AW.esc(c?.name||'')}</td><td>${AW.esc(c?.nif||'')}</td><td>${AW.money(x.base)}</td><td>${AW.money(x.vat)}</td><td>${AW.money(x.total)}</td><td>${statusPill(i)}</td></tr>`}).join('')||`<tr><td colspan="8" class="empty">Sin facturas emitidas en este periodo.</td></tr>`}</tbody></table></div>
      </section>`;
  }

  function renderSettings(){
    view.innerHTML=`<div class="split">
      <section class="card"><div class="section-head"><div><h2>Empresa</h2><p>Datos generales de AW9.</p></div></div>
        <form id="settingsForm" class="stack">
          <label>Nombre<input id="setCompany" value="${AW.esc(AW.state.settings.companyName||'')}"></label>
          <label>NIF<input id="setNif" value="${AW.esc(AW.state.settings.companyNif||'')}"></label>
          <label>Dirección<input id="setAddress" value="${AW.esc(AW.state.settings.companyAddress||'')}"></label>
          <button class="primary">Guardar</button>
        </form>
      </section>
      <section class="card"><div class="section-head"><div><h2>Datos y Firebase</h2><p>${AW.firebaseConfigured()?'Firebase configurado':'Firebase nuevo pendiente de configurar'}</p></div></div>
        <div class="stack">
          <div class="mini"><span>Cuenta principal</span><strong>${AW.esc(AW.DEFAULT_EMAIL)}</strong></div>
          <div class="mini"><span>Modo actual</span><strong>${AW.cloud.enabled?'☁ Firebase Cloud':'Local'}</strong></div>
          <button class="secondary" data-backup>Descargar backup JSON</button>
          <label class="secondary" style="text-align:center">Importar backup<input id="backupInput" type="file" accept="application/json" hidden></label>
        </div>
      </section></div>`;
  }

  function bulkPriceModal(){
    const draftIds=[...selectedInvoices].filter(id=>AW.state.invoices.find(i=>i.id===id)?.status==='draft');
    modal(`<div class="section-head"><div><h2>Cambio masivo de precios</h2><p>${draftIds.length} borradores válidos seleccionados. Las facturas emitidas no se modifican.</p></div><button class="secondary" data-close-modal>✕</button></div>
      <form id="bulkPriceForm" class="stack">
        <label>Tipo de cambio<select id="bulkMode"><option value="fixed">Sumar cantidad fija (€)</option><option value="percent">Subir porcentaje (%)</option></select></label>
        <label>Valor<input id="bulkValue" inputmode="decimal" value="0.10"></label>
        <button class="primary">Previsualizar y aplicar</button>
      </form>`);
  }

  document.addEventListener('click',e=>{
    const t=e.target.closest('[data-page]');if(t){goto(t.dataset.page);return}
    if(e.target.closest('[data-close-modal]')){closeModal();return}
    if(e.target.matches('[data-new-invoice]')){invoiceModal();return}
    if(e.target.closest('[data-new-client]')){clientModal();return}
    if(e.target.closest('[data-back-clients]')){clientDetailId='';render();return}
    const cd=e.target.closest('[data-client-detail]');if(cd){clientDetailId=cd.dataset.clientDetail;render();return}
    const emit=e.target.closest('[data-emit]');if(emit){AW.emitInvoice(emit.dataset.emit);toast('Factura emitida');render();return}
    const paid=e.target.closest('[data-paid]');if(paid){AW.markPaid(paid.dataset.paid);toast('Factura marcada como pagada');render();return}
    const del=e.target.closest('[data-delete-draft]');if(del&&confirm('¿Borrar este borrador?')){AW.deleteDraft(del.dataset.deleteDraft);selectedInvoices.delete(del.dataset.deleteDraft);render();return}
    const can=e.target.closest('[data-cancel]');if(can){const reason=prompt('Motivo de anulación:','Operación anulada')||'';if(reason&&confirm('La factura quedará ANULADA y conservará su número.')){AW.cancelInvoice(can.dataset.cancel,reason);render()}return}
    const sel=e.target.closest('[data-select-invoice]');if(sel){sel.checked?selectedInvoices.add(sel.dataset.selectInvoice):selectedInvoices.delete(sel.dataset.selectInvoice);render();return}
    if(e.target.closest('[data-select-drafts]')){AW.state.invoices.filter(i=>i.status==='draft').forEach(i=>selectedInvoices.add(i.id));render();return}
    if(e.target.closest('[data-clear-selection]')){selectedInvoices.clear();render();return}
    if(e.target.closest('[data-bulk-price]')){bulkPriceModal();return}
    const adj=e.target.closest('[data-adjust-stock]');if(adj){const p=AW.findProduct(adj.dataset.adjustStock);const v=prompt(`Stock actual de ${p.name}\nIntroduce ${p.mode==='box_kg'?'kg totales':p.unit}:`,String(p.stockQty||0));if(v!==null&&!isNaN(Number(String(v).replace(',','.')))){p.stockQty=Number(String(v).replace(',','.'));AW.addAudit('stock_adjusted',{productId:p.id,qty:p.stockQty});AW.save();render()}return}
    if(e.target.closest('[data-backup]')){AW.exportBackup();return}
    const rm=e.target.closest('[data-remove-line]');if(rm){rm.closest('.line-editor').remove();return}
    if(e.target.closest('[data-add-line]')){addInvoiceLine();return}
    const tab=e.target.closest('[data-report-mode]');if(tab){reportMode=tab.dataset.reportMode;render();return}
  });

  document.addEventListener('change',e=>{
    if(e.target.matches('.line-product'))hydrateLine(e.target.closest('.line-editor'));
    if(e.target.id==='reportYear'){reportYear=Number(e.target.value);render()}
    if(e.target.id==='reportMonth'){reportMonth=Number(e.target.value);render()}
    if(e.target.id==='reportQuarter'){reportQuarter=Number(e.target.value);render()}
    if(e.target.id==='backupInput'&&e.target.files[0])AW.importBackup(e.target.files[0]).then(()=>{toast('Backup importado');render()}).catch(()=>toast('Backup no válido'));
  });

  document.addEventListener('submit',e=>{
    if(e.target.id==='invoiceForm'){
      e.preventDefault();
      const lines=[...document.querySelectorAll('#invoiceLines .line-editor')].map(r=>{
        const product=AW.findProduct(r.querySelector('.line-product').value);
        return {productId:product.id,productName:product.name,qty:Number(r.querySelector('.line-qty').value.replace(',','.'))||0,price:Number(r.querySelector('.line-price').value.replace(',','.'))||0,vat:Number(r.querySelector('.line-vat').value.replace(',','.'))||0}
      }).filter(l=>l.qty>0);
      if(!lines.length)return toast('Añade al menos una línea');
      AW.createInvoice({clientId:$('#invClient').value,date:$('#invDate').value,lines,notes:$('#invNotes').value,status:'draft'});
      closeModal();toast('Borrador guardado');goto('invoices');return;
    }
    if(e.target.id==='clientForm'){
      e.preventDefault();AW.state.clients.push({id:AW.uid('cli'),name:$('#clName').value.trim(),nif:$('#clNif').value.trim(),address:$('#clAddress').value.trim(),phone:$('#clPhone').value.trim(),email:$('#clEmail').value.trim(),active:true});AW.addAudit('client_created',{});AW.save();closeModal();render();return;
    }
    if(e.target.id==='bulkPriceForm'){
      e.preventDefault();const mode=$('#bulkMode').value,value=Number($('#bulkValue').value.replace(',','.'))||0;
      const valid=[...selectedInvoices].filter(id=>AW.state.invoices.find(i=>i.id===id)?.status==='draft');
      if(!valid.length)return toast('Selecciona borradores');
      if(confirm(`Aplicar ${mode==='fixed'?`${value} €`:`${value}%`} a ${valid.length} borradores?`)){const r=AW.applyBulkPriceChange(valid,mode,value);closeModal();toast(`${r.lines} líneas modificadas`);render()}return;
    }
    if(e.target.id==='settingsForm'){e.preventDefault();AW.state.settings.companyName=$('#setCompany').value;AW.state.settings.companyNif=$('#setNif').value;AW.state.settings.companyAddress=$('#setAddress').value;AW.save();toast('Ajustes guardados');return}
    if(e.target.id==='loginForm'){
      e.preventDefault();const msg=$('#loginMsg');msg.hidden=false;msg.textContent='Entrando…';
      AW.login($('#loginEmail').value,$('#loginPassword').value,$('#rememberSession').checked).then(()=>{msg.hidden=true;showApp()}).catch(err=>{msg.textContent=err.message});return;
    }
  });

  $('#changeAccountBtn').addEventListener('click',()=>{const x=$('#loginEmail');x.readOnly=false;x.focus();x.select()});
  $('#localModeBtn').addEventListener('click',()=>{AW.cloud.enabled=false;AW.cloud.mode='local';showApp()});
  $('#logoutBtn').addEventListener('click',()=>AW.logout().then(showLogin));
  $('#menuBtn').addEventListener('click',()=>{$('#sidebar').classList.toggle('open');$('#scrim').hidden=!$('#sidebar').classList.contains('open')});
  $('#scrim').addEventListener('click',()=>{$('#sidebar').classList.remove('open');$('#scrim').hidden=true});
  window.addEventListener('aw:saving',()=>{$('#saveStatus').textContent='Guardando…'});
  window.addEventListener('aw:saved',e=>{$('#saveStatus').textContent=e.detail.mode==='cloud'?'Guardado en Cloud':'Guardado local';$('#cloudBadge').textContent=e.detail.mode==='cloud'?'☁ Cloud':'Local'});
  window.addEventListener('aw:error',e=>toast(e.detail.message));

  (async()=>{
    $('#loginEmail').value=AW.DEFAULT_EMAIL;
    if(AW.firebaseConfigured()){
      try{const user=await AW.restoreSession();if(user)return showApp()}catch(e){}
    }
    showLogin();
  })();
})();
