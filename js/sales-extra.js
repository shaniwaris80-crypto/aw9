import {Store,st,product,selectedInvoices,refresh,esc,n,round2,toast,modal,closeModal,calcLine,calcInvoice} from './context.js';
import {invoicesView as baseInvoicesView} from './sales.js';

export function invoicesViewPlus(){
  return `${baseInvoicesView()}<div class="actions" style="margin-top:12px"><button class="btn" data-act="bulkDraftLines">MODIFICAR BORRADORES SELECCIONADOS</button></div>`;
}

export function bulkDraftInvoicesModal(){
  const ids=[...selectedInvoices];
  const drafts=st().invoices.filter(i=>ids.includes(i.id)&&i.status==='draft');
  if(!drafts.length)return toast('SELECCIONA AL MENOS UN BORRADOR','bad');
  const m=modal('MODIFICAR BORRADORES SELECCIONADOS',`<form id="bulkDraftForm"><p><b>${drafts.length} BORRADORES SELECCIONADOS.</b> LAS FACTURAS EMITIDAS NO SE MODIFICAN.</p><div class="form-grid"><label>PRODUCTO<select name="productId"><option value="ALL">TODOS LOS PRODUCTOS</option>${st().products.map(p=>`<option value="${p.id}">${p.code} · ${esc(p.name)}</option>`).join('')}</select></label><label>OPERACIÓN<select name="type"><option value="add">SUMAR €</option><option value="percent">SUBIR %</option><option value="set">PRECIO EXACTO</option></select></label><label>VALOR<input name="value" type="number" step=".01" required></label></div><button class="btn primary">APLICAR A BORRADORES</button></form>`);
  m.querySelector('#bulkDraftForm').onsubmit=async e=>{
    e.preventDefault();
    const f=new FormData(e.currentTarget),pid=f.get('productId'),type=f.get('type'),v=n(f.get('value'));
    const change=old=>type==='add'?round2(old+v):type==='percent'?round2(old*(1+v/100)):v;
    let changed=0;
    const updates=drafts.map(inv=>{
      const lines=(inv.lines||[]).map(l=>{
        if(pid==='ALL'||l.productId===pid){changed++;return calcLine({...l,price:change(n(l.price))})}
        return l;
      });
      return calcInvoice({...inv,lines});
    });
    if(!changed)return toast('NO HAY LÍNEAS DE ESE PRODUCTO','bad');
    const target=pid==='ALL'?'TODOS LOS PRODUCTOS':product(pid)?.name||'PRODUCTO';
    if(!confirm(`${target}: SE MODIFICARÁN ${changed} LÍNEAS EN ${drafts.length} BORRADORES. ¿CONTINUAR?`))return;
    await Store.bulkSave('invoices',updates,'bulk_draft_prices');
    toast('BORRADORES ACTUALIZADOS');closeModal();refresh();
  };
}
