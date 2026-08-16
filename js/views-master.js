import {Runtime} from './runtime.js';
import {
  section, table, kpi, badge, modal, closeModal, toast,
  optionList, money, esc, exportXlsx
} from './ui.js';
import {
  calcInvoice, stockQuantity, round2, today, now, uid, upper, normalize
} from './domain.js';
import {saveEntity, savePurchaseTransaction} from './firebase.js';
import {clientStatement} from './views-sales.js';
import {
  parsePurchaseText, purchaseCalculatedTotals, chatGptPurchaseInstruction
} from './importers.js';
import {invoiceAfterReset, resetLabel} from './period.js';
import {can} from './permissions.js';
import {uploadPurchaseAttachment} from './storage.js';

const st = () => Runtime.state;
const product = id => Runtime.product(id);
const client = id => Runtime.client(id);

const products = () => (st().products || [])
  .filter(p => p.active !== false && !p.archived)
  .sort((a, b) => String(a.code).localeCompare(String(b.code)));

const clients = () => (st().clients || [])
  .filter(c => c.active !== false && !c.archived)
  .sort((a, b) => String(a.name).localeCompare(String(b.name)));

const suppliers = () => (st().suppliers || [])
  .filter(s => s.active !== false && !s.archived)
  .sort((a, b) => String(a.name).localeCompare(String(b.name)));

const productOpts = (sel = '') =>
  `<option value="">SELECCIONAR</option>${optionList(products(), sel, p => `${p.code} · ${p.name}`)}`;

const supplierOpts = (sel = '') =>
  `<option value="">SIN PROVEEDOR</option>${optionList(suppliers(), sel)}`;

export function productsView() {
  const q = window.ARW_PRODUCT_Q || '';
  const list = products();
  const editable = can(Runtime.role,'productWrite');
  const dupeNames = new Map();

  for (const p of list) {
    const key = normalize(p.name);
    dupeNames.set(key, (dupeNames.get(key) || 0) + 1);
  }

  const rows = list.map(p => {
    const badBox = p.mode === 'caja_kg' && !Number(p.kgPerBox);
    const duplicated = dupeNames.get(normalize(p.name)) > 1;
    const noPrice = Number(p.sellPrice || 0) <= 0;
    const state = badBox
      ? badge('FALTA KG/CAJA', 'bad')
      : duplicated
        ? badge('DUPLICADO', 'warn')
        : noPrice
          ? badge('SIN PRECIO', 'warn')
          : badge('OK', 'good');

    return `<tr>
      <td><b>${esc(p.code)}</b></td>
      <td><b>${esc(p.name)}</b><br><small>${esc(p.aliases || '')}</small></td>
      <td>${badge(p.mode, badBox ? 'bad' : '')}</td>
      <td>${Number(p.kgPerBox || 0)}</td>
      <td>${money(p.buyPrice)}</td>
      <td>${money(p.sellPrice)}</td>
      <td>${money(p.recommended)}</td>
      <td><b>${Number(p.vat || 0)}%</b></td>
      <td>${esc(p.supplier || '')}</td>
      <td>${state}</td>
      <td>
        ${editable?`<button class="btn mini" data-product-edit="${p.id}">EDITAR</button>`:''}
        <button class="btn mini" data-product-360="${p.id}">360º</button>
      </td>
    </tr>`;
  });

  return `${section(
    'PRODUCTOS',
    'CATÁLOGO MAESTRO · MODO · KG/CAJA · COMPRA · VENTA · RECOMENDADO · IVA',
    `${editable?'<button class="btn primary" data-action="product-new">＋ PRODUCTO</button>':''}<button class="btn" data-action="products-export">EXPORTAR EXCEL</button>`
  )}
  <div class="panel">
    <input id="productSearch" placeholder="BUSCAR CÓDIGO, PRODUCTO O ALIAS" value="${esc(q)}" autocomplete="off">
  </div><br>
  ${table(
    ['CÓDIGO', 'PRODUCTO', 'MODO', 'KG/CAJA', 'COMPRA', 'VENTA', 'RECOMENDADO', 'IVA', 'PROVEEDOR', 'ESTADO', 'ACCIONES'],
    rows
  )}`;
}

export function productModal(existing = null) {
  if(!can(Runtime.role,'productWrite'))return toast('TU ROL SOLO PUEDE CONSULTAR PRODUCTOS','bad');
  const p = existing
    ? structuredClone(existing)
    : {
        id: uid('p'), code: '', name: '', aliases: '', mode: 'kg',
        kgPerBox: 0, buyPrice: 0, sellPrice: 0, recommended: 0,
        vat: 4, supplier: '', active: true
      };

  const m = modal(
    existing ? 'EDITAR PRODUCTO' : 'NUEVO PRODUCTO',
    `<form id="pf">
      <div class="form-grid">
        <label>CÓDIGO<input name="code" value="${esc(p.code)}" required></label>
        <label>NOMBRE<input name="name" value="${esc(p.name)}" required></label>
        <label>MODO
          <select name="mode">
            <option value="caja_kg">CAJA × KG</option>
            <option value="caja_fija">CAJA FIJA</option>
            <option value="kg">KG</option>
            <option value="ud">UD</option>
            <option value="manojo">MANOJO</option>
          </select>
        </label>
        <label>KG/CAJA<input name="kg" type="number" step=".01" value="${Number(p.kgPerBox || 0)}"></label>
        <label>COMPRA<input name="buy" type="number" step=".01" value="${Number(p.buyPrice || 0)}"></label>
        <label>VENTA<input name="sell" type="number" step=".01" value="${Number(p.sellPrice || 0)}"></label>
        <label>RECOMENDADO<input name="rec" type="number" step=".01" value="${Number(p.recommended || 0)}"></label>
        <label>IVA
          <select name="vat">
            ${[0, 4, 10, 21].map(v => `<option value="${v}" ${Number(p.vat) === v ? 'selected' : ''}>${v}%</option>`).join('')}
          </select>
        </label>
        <label>PROVEEDOR<input name="supplier" value="${esc(p.supplier || '')}"></label>
      </div>
      <label class="field">ALIAS<input name="aliases" value="${esc(p.aliases || '')}"></label>
      <button class="btn primary">GUARDAR</button>
    </form>`
  );

  m.querySelector('[name=mode]').value = p.mode;
  m.querySelector('#pf').onsubmit = async e => {
    e.preventDefault();
    try {
      const f = new FormData(e.currentTarget);
      const next = {
        ...p,
        code: upper(f.get('code')).replace(/\s/g, ''),
        name: upper(f.get('name')),
        aliases: f.get('aliases'),
        mode: f.get('mode'),
        kgPerBox: Number(f.get('kg') || 0),
        buyPrice: Number(f.get('buy') || 0),
        sellPrice: Number(f.get('sell') || 0),
        recommended: Number(f.get('rec') || 0),
        vat: Number(f.get('vat') || 0),
        supplier: f.get('supplier'),
        active: true
      };

      if (next.mode === 'caja_kg' && !next.kgPerBox) {
        throw new Error('UN PRODUCTO CAJA × KG NECESITA KG/CAJA');
      }
      if (products().some(x => x.id !== next.id && upper(x.code) === next.code)) {
        throw new Error('YA EXISTE ESE CÓDIGO');
      }

      await saveEntity('products', next, 'PRODUCT_SAVE', Runtime.user);
      toast('PRODUCTO GUARDADO Y SINCRONIZADO', 'good');
      closeModal();
    } catch (err) {
      toast(err.message, 'bad');
    }
  };
}

function clientStats(c, period = true) {
  const source = (st().invoices || [])
    .filter(i =>
      i.clientId === c.id &&
      !['draft', 'void'].includes(i.status) &&
      (period ? invoiceAfterReset(i) : true)
    )
    .map(calcInvoice);

  return {
    billed: round2(source.reduce((s, i) => s + i.total, 0)),
    pending: round2(source.reduce((s, i) => s + i.pending, 0)),
    vat: round2(source.reduce((s, i) => s + i.vatTotal, 0)),
    re: round2(source.reduce((s, i) => s + Number(i.equivalenceTotal || 0), 0)),
    count: source.length
  };
}

export function clientsView() {
  const q = window.ARW_CLIENT_Q || '';
  const list = clients();
  const editable = can(Runtime.role,'clientWrite');

  const rows = list.map(c => {
    const s = clientStats(c, true);
    return `<tr>
      <td><b>${esc(c.name)}</b></td>
      <td>${esc(c.nif || '')}</td>
      <td>${esc(c.address || '')}</td>
      <td>${c.equivalenceSurcharge ? badge('SÍ', 'warn') : 'NO'}</td>
      <td>${Number(c.transportPercent || 0) ? `${c.transportPercent}%` : 'NO'}</td>
      <td>${money(s.billed)}</td>
      <td>${money(s.pending)}</td>
      <td>
        ${editable?`<button class="btn mini" data-client-edit="${c.id}">EDITAR</button>`:''}
        <button class="btn mini primary" data-client-360="${c.id}">360º</button>
      </td>
    </tr>`;
  });

  return `${section(
    'CLIENTES 360º',
    `PERIODO DESDE ${resetLabel()} · HISTÓRICO COMPLETO DENTRO DE CADA CLIENTE`,
    `${editable?'<button class="btn primary" data-action="client-new">＋ CLIENTE</button>':''}<button class="btn" data-action="clients-export">EXPORTAR EXCEL</button>`
  )}
  <div class="panel">
    <input id="clientSearch" placeholder="BUSCAR CLIENTE, NIF O DIRECCIÓN" value="${esc(q)}" autocomplete="off">
  </div><br>
  ${table(
    ['CLIENTE', 'NIF/CIF', 'DIRECCIÓN', 'R.E.', 'TRANSPORTE', 'FACTURADO PERIODO', 'DEUDA PERIODO', 'ACCIONES'],
    rows
  )}`;
}

export function clientModal(existing = null) {
  if(!can(Runtime.role,'clientWrite'))return toast('TU ROL SOLO PUEDE CONSULTAR CLIENTES','bad');
  const c = existing
    ? structuredClone(existing)
    : {
        id: uid('c'), name: '', nif: '', address: '', transportPercent: 10,
        commissionPercent: 0, paymentMethod: 'efectivo', phone: '', whatsapp: '',
        email: '', prices: {}, dueDays: 0, creditLimit: 0, classification: 'C',
        equivalenceSurcharge: false, active: true
      };

  const m = modal(
    existing ? 'EDITAR CLIENTE' : 'NUEVO CLIENTE',
    `<form id="cf">
      <div class="form-grid">
        <label>NOMBRE / RAZÓN SOCIAL<input name="name" value="${esc(c.name)}" required></label>
        <label>NIF/CIF<input name="nif" value="${esc(c.nif || '')}"></label>
        <label>DIRECCIÓN<input name="address" value="${esc(c.address || '')}"></label>
        <label>TELÉFONO<input name="phone" value="${esc(c.phone || '')}"></label>
        <label>WHATSAPP<input name="whatsapp" value="${esc(c.whatsapp || '')}"></label>
        <label>EMAIL<input name="email" value="${esc(c.email || '')}"></label>
        <label>TRANSPORTE %<input name="transport" type="number" step=".01" value="${Number(c.transportPercent || 0)}"></label>
        <label>COMISIÓN %<input name="commission" type="number" step=".01" value="${Number(c.commissionPercent || 0)}"></label>
        <label>FORMA PAGO
          <select name="payment">
            <option value="efectivo">efectivo</option>
            <option value="transferencia">transferencia</option>
            <option value="tarjeta">tarjeta</option>
            <option value="pendiente">pendiente</option>
          </select>
        </label>
        <label>DÍAS CRÉDITO<input name="dueDays" type="number" value="${Number(c.dueDays || 0)}"></label>
        <label>LÍMITE CRÉDITO<input name="creditLimit" type="number" step=".01" value="${Number(c.creditLimit || 0)}"></label>
        <label class="check re-check">
          <input name="equivalence" type="checkbox" ${c.equivalenceSurcharge ? 'checked' : ''}> RECARGO DE EQUIVALENCIA
        </label>
      </div>
      <div class="muted">ACTIVA R.E. SOLO SI EL CLIENTE TE LO HA COMUNICADO.</div>
      <button class="btn primary">GUARDAR</button>
    </form>`
  );

  m.querySelector('[name=payment]').value = c.paymentMethod || 'efectivo';
  m.querySelector('#cf').onsubmit = async e => {
    e.preventDefault();
    try {
      const f = new FormData(e.currentTarget);
      const next = {
        ...c,
        name: upper(f.get('name')),
        nif: upper(f.get('nif')),
        address: upper(f.get('address')),
        phone: f.get('phone'),
        whatsapp: f.get('whatsapp'),
        email: f.get('email'),
        transportPercent: Number(f.get('transport') || 0),
        commissionPercent: Number(f.get('commission') || 0),
        paymentMethod: f.get('payment'),
        dueDays: Number(f.get('dueDays') || 0),
        creditLimit: Number(f.get('creditLimit') || 0),
        equivalenceSurcharge: f.get('equivalence') === 'on',
        active: true
      };

      await saveEntity('clients', next, 'CLIENT_SAVE', Runtime.user);
      toast('CLIENTE GUARDADO Y SINCRONIZADO', 'good');
      closeModal();
    } catch (err) {
      toast(err.message, 'bad');
    }
  };
}

export function client360(c) {
  const canEditClient=can(Runtime.role,'clientWrite'),canSeeFinance=can(Runtime.role,'invoiceRead');
  const period = clientStats(c, true);
  const history = clientStats(c, false);
  const invs = (st().invoices || [])
    .filter(i => i.clientId === c.id && !['draft', 'void'].includes(i.status))
    .sort((a, b) => String(b.issuedAt || b.date).localeCompare(String(a.issuedAt || a.date)));
  const orders = (st().orders || [])
    .filter(o => o.clientId === c.id)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const pays = (st().payments || [])
    .filter(p => p.clientId === c.id)
    .sort((a, b) => String(b.createdAt || b.date).localeCompare(String(a.createdAt || a.date)));

  if(!canSeeFinance){
    const byProduct=new Map();for(const o of orders)for(const l of o.lines||[]){const old=byProduct.get(l.productId)||{count:0,qty:0};old.count++;old.qty+=Number(l.deliveredQty||l.requestedQty||0);byProduct.set(l.productId,old)}
    const orderRows=orders.slice(0,50).map(o=>`<tr><td>${esc(o.date||'')}</td><td>${badge(o.status||'')}</td><td>${o.lines?.length||0}</td></tr>`),productRows=[...byProduct].sort((a,b)=>b[1].count-a[1].count).slice(0,20).map(([pid,v])=>`<tr><td><b>${esc(product(pid)?.name||pid)}</b></td><td>${v.count}</td><td>${round2(v.qty)}</td></tr>`);
    modal(`CLIENTE 360º · ${c.name}`,`<div class="panel"><h3>CONTACTO</h3><p><b>${esc(c.name||'')}</b></p><p>${esc(c.address||'')}</p><p>${esc(c.phone||c.whatsapp||'')}</p></div><div class="grid2"><div><h3>PEDIDOS RECIENTES</h3>${table(['FECHA','ESTADO','LÍNEAS'],orderRows)}</div><div><h3>PRODUCTOS HABITUALES SEGÚN PEDIDOS</h3>${table(['PRODUCTO','PEDIDOS','CANT.'],productRows)}</div></div>`);return;
  }

  const habitual = new Map();
  for (const inv of invs) {
    if (inv.type === 'credit') continue;
    for (const line of inv.lines || []) {
      const current = habitual.get(line.productId) || {count: 0, lastPrice: null};
      current.count += 1;
      if (current.lastPrice == null) current.lastPrice = Number(line.price || 0);
      habitual.set(line.productId, current);
    }
  }

  const invoiceRows = invs.slice(0, 80).map(i => {
    const x = calcInvoice(i);
    return `<tr>
      <td>${esc(i.number || '')}</td>
      <td>${esc(i.date || '')}</td>
      <td>${money(x.total)}</td>
      <td>${money(x.pending)}</td>
    </tr>`;
  });

  const paymentRows = pays.slice(0, 50).map(p => `<tr>
    <td>${esc(p.date || '')}</td>
    <td>${money(p.amount)}</td>
    <td>${esc(upper(p.method || ''))}</td>
  </tr>`);

  const habitualRows = [...habitual]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 20)
    .map(([pid, v]) => `<tr>
      <td>${esc(product(pid)?.name || pid)}</td>
      <td>${v.count}</td>
      <td>${money(v.lastPrice || 0)}</td>
    </tr>`);

  const orderRows = orders.slice(0, 30).map(o => `<tr>
    <td>${esc(o.date || '')}</td>
    <td>${badge(o.status || '')}</td>
    <td>${o.lines?.length || 0}</td>
  </tr>`);

  const priceRows = Object.entries(c.prices || {}).map(([pid, v]) => `<tr>
    <td>${esc(product(pid)?.name || pid)}</td>
    <td>${money(typeof v === 'number' ? v : v.price)}</td>
    <td>${canEditClient?`<button class="btn mini" data-price-edit="${pid}">EDITAR</button>`:'—'}</td>
  </tr>`);

  const creditWarning = Number(c.creditLimit || 0) > 0 && history.pending > Number(c.creditLimit)
    ? '<div class="danger">LÍMITE DE CRÉDITO SUPERADO</div>'
    : '';

  const m = modal(
    `CLIENTE 360º · ${c.name}`,
    `<div class="kpis">
      ${kpi('DEUDA PERIODO', money(period.pending))}
      ${kpi('DEUDA HISTÓRICA', money(history.pending))}
      ${kpi('FACTURADO HIST.', money(history.billed))}
      ${kpi('FACTURAS', String(history.count))}
    </div>
    ${c.equivalenceSurcharge ? '<div class="warning"><b>RECARGO DE EQUIVALENCIA ACTIVO</b></div>' : ''}
    ${creditWarning}
    <div class="actions">
      <button class="btn" id="statement">ESTADO DE CUENTA PDF</button>
      ${canEditClient?'<button class="btn primary" id="newSpecial">＋ PRECIO ESPECIAL</button>':''}
    </div><br>
    <div class="grid2">
      <div>
        <h3>FACTURAS</h3>
        ${table(['Nº', 'FECHA', 'TOTAL', 'PENDIENTE'], invoiceRows)}
        <h3>COBROS</h3>
        ${table(['FECHA', 'IMPORTE', 'MÉTODO'], paymentRows)}
      </div>
      <div>
        <h3>PRODUCTOS HABITUALES</h3>
        ${table(['PRODUCTO', 'VECES', 'ÚLT. PRECIO'], habitualRows)}
        <h3>PEDIDOS</h3>
        ${table(['FECHA', 'ESTADO', 'LÍNEAS'], orderRows)}
        <h3>PRECIOS ESPECIALES</h3>
        ${table(['PRODUCTO', 'PRECIO', 'ACCIONES'], priceRows)}
      </div>
    </div>`
  );

  m.querySelector('#statement').onclick = () => clientStatement(c);
  if(m.querySelector('#newSpecial'))m.querySelector('#newSpecial').onclick = () => specialPriceModal(c);
  m.querySelectorAll('[data-price-edit]').forEach(b => {
    b.onclick = () => specialPriceModal(c, b.dataset.priceEdit);
  });
}

function specialPriceModal(c, pid = '') {
  if(!can(Runtime.role,'clientWrite'))return toast('TU ROL NO PUEDE CAMBIAR TARIFAS','bad');
  const current = pid
    ? (c.prices?.[pid]?.price ?? c.prices?.[pid] ?? product(pid)?.sellPrice ?? 0)
    : 0;

  const m = modal(
    `PRECIO ESPECIAL · ${c.name}`,
    `<form id="sp">
      <label class="field">PRODUCTO<select name="pid">${productOpts(pid)}</select></label>
      <label class="field">PRECIO<input name="price" type="number" step=".01" value="${Number(current || 0)}"></label>
      <button class="btn primary">GUARDAR</button>
    </form>`,
    true
  );

  m.querySelector('[name=pid]').onchange = e => {
    const id = e.target.value;
    m.querySelector('[name=price]').value = Number(
      c.prices?.[id]?.price ?? c.prices?.[id] ?? product(id)?.sellPrice ?? 0
    );
  };

  m.querySelector('#sp').onsubmit = async e => {
    e.preventDefault();
    try {
      const f = new FormData(e.currentTarget);
      const productId = f.get('pid');
      const price = Number(f.get('price') || 0);
      if (!productId || price <= 0) throw new Error('PRODUCTO Y PRECIO > 0 OBLIGATORIOS');

      const oldPrice = Number(
        c.prices?.[productId]?.price ??
        c.prices?.[productId] ??
        product(productId)?.sellPrice ??
        0
      );

      await saveEntity(
        'clients',
        {...c, prices: {...(c.prices || {}), [productId]: {price, since: today()}}},
        'CLIENT_PRICE',
        Runtime.user
      );

      await saveEntity(
        'priceHistory',
        {
          id: uid('ph'), clientId: c.id, productId,
          date: today(), oldPrice, newPrice: price, at: now()
        },
        'PRICE_HISTORY',
        Runtime.user
      );

      toast('PRECIO PERSONALIZADO GUARDADO', 'good');
      closeModal();
    } catch (err) {
      toast(err.message, 'bad');
    }
  };
}

export function stockAdjustModal() {
  if(!can(Runtime.role,'stockAdjust'))return toast('SIN PERMISO PARA AJUSTAR STOCK','bad');
  const m = modal(
    'AJUSTE DE STOCK',
    `<form id="sa">
      <div class="form-grid three">
        <label>PRODUCTO<select name="pid">${productOpts()}</select></label>
        <label>CANTIDAD FÍSICA (+/-)<input name="qty" type="number" step=".01"></label>
        <label>UBICACIÓN
          <select name="location">
            <option>ALMACEN</option>
            <option>FURGONETA</option>
            <option>SAN PABLO</option>
            <option>SAN LESMES</option>
            <option>SANTIAGO</option>
          </select>
        </label>
      </div>
      <div id="stockAdjustHint" class="muted"></div>
      <label class="field">MOTIVO<input name="note" required></label>
      <button class="btn primary">REGISTRAR MOVIMIENTO</button>
    </form>`,
    true
  );

  const refresh = () => {
    const p = product(m.querySelector('[name=pid]').value);
    const input = m.querySelector('[name=qty]');
    m.querySelector('#stockAdjustHint').textContent = p?.mode === 'caja_kg'
      ? `INTRODUCE CAJAS. 1 CAJA = ${p.kgPerBox} KG. EL MOVIMIENTO SE GUARDARÁ EN KG.`
      : `INTRODUCE ${upper(p?.mode || 'UNIDADES')}.`;
    input.step = p?.mode?.startsWith('caja') ? '1' : '.01';
  };

  m.querySelector('[name=pid]').onchange = refresh;
  m.querySelector('#sa').onsubmit = async e => {
    e.preventDefault();
    try {
      const f = new FormData(e.currentTarget);
      const p = product(f.get('pid'));
      const inputQty = Number(f.get('qty') || 0);
      if (!p || !inputQty) throw new Error('PRODUCTO Y CANTIDAD OBLIGATORIOS');
      if (p.mode?.startsWith('caja') && !Number.isInteger(inputQty)) {
        throw new Error('LAS CAJAS DEBEN SER ENTERAS');
      }
      if (p.mode === 'caja_kg' && !Number(p.kgPerBox || 0)) {
        throw new Error('FALTA KG/CAJA');
      }

      const qty = p.mode === 'caja_kg'
        ? round2(inputQty * Number(p.kgPerBox || 0))
        : inputQty;

      await saveEntity(
        'stockMoves',
        {
          id: uid('sm'), productId: p.id, qty,
          type: 'adjustment', location: f.get('location'),
          note: upper(f.get('note')), date: today(), createdAt: now()
        },
        'STOCK_ADJUST',
        Runtime.user
      );

      toast(`STOCK ACTUALIZADO: ${qty > 0 ? '+' : ''}${qty}${p.mode === 'caja_kg' ? ' KG' : ''}`, 'good');
      closeModal();
    } catch (err) {
      toast(err.message, 'bad');
    }
  };

  refresh();
}

export function suppliersView() {
  const rows = suppliers().map(s => {
    const ps = (st().purchases || []).filter(p => p.supplierId === s.id);
    const total = ps.reduce((sum, p) => sum + Number(p.total || 0), 0);
    const last = [...ps].sort((a, b) => String(b.date).localeCompare(String(a.date)))[0];
    return `<tr>
      <td><b>${esc(s.name)}</b></td>
      <td>${esc(s.nif || '')}</td>
      <td>${ps.length}</td>
      <td>${money(total)}</td>
      <td>${esc(last?.date || '—')}</td>
      <td><button class="btn mini" data-supplier-edit="${s.id}">EDITAR</button></td>
    </tr>`;
  });

  return `${section(
    'PROVEEDORES',
    'DATOS FISCALES · COMPRAS · HISTÓRICO',
    '<button class="btn primary" data-action="supplier-new">＋ PROVEEDOR</button>'
  )}${table(['PROVEEDOR', 'NIF', 'COMPRAS', 'TOTAL', 'ÚLTIMA COMPRA', 'ACCIONES'], rows)}`;
}

export function supplierModal(existing = null) {
  if(!can(Runtime.role,'supplierWrite'))return toast('SIN PERMISO PARA EDITAR PROVEEDORES','bad');
  const s = existing || {
    id: uid('s'), name: '', nif: '', address: '', phone: '', email: '', dueDays: 0, active: true
  };

  const m = modal(
    existing ? 'EDITAR PROVEEDOR' : 'NUEVO PROVEEDOR',
    `<form id="sf">
      <div class="form-grid">
        <label>NOMBRE<input name="name" value="${esc(s.name)}" required></label>
        <label>NIF<input name="nif" value="${esc(s.nif || '')}"></label>
        <label>DIRECCIÓN<input name="address" value="${esc(s.address || '')}"></label>
        <label>TELÉFONO<input name="phone" value="${esc(s.phone || '')}"></label>
        <label>EMAIL<input name="email" value="${esc(s.email || '')}"></label>
        <label>DÍAS PAGO<input name="dueDays" type="number" value="${Number(s.dueDays || 0)}"></label>
      </div>
      <button class="btn primary">GUARDAR</button>
    </form>`,
    true
  );

  m.querySelector('#sf').onsubmit = async e => {
    e.preventDefault();
    try {
      const f = new FormData(e.currentTarget);
      await saveEntity(
        'suppliers',
        {
          ...s,
          name: upper(f.get('name')),
          nif: upper(f.get('nif')),
          address: upper(f.get('address')),
          phone: f.get('phone'),
          email: f.get('email'),
          dueDays: Number(f.get('dueDays') || 0),
          active: true
        },
        'SUPPLIER_SAVE',
        Runtime.user
      );
      toast('PROVEEDOR GUARDADO', 'good');
      closeModal();
    } catch (err) {
      toast(err.message, 'bad');
    }
  };
}

function purchaseLineRow(l = {}) {
  const unknown = Boolean(l.vatUnknown);
  return `<tr>
    <td><select class="puProd">${productOpts(l.productId)}</select></td>
    <td><input class="puQty" type="number" step="${String(l.mode||'').startsWith('caja')?'1':'.01'}" value="${Number(l.qty || 0)}"></td>
    <td><input class="puKg" type="number" step=".01" value="${Number(l.kgPerBox || 0)}"></td>
    <td><input class="puPrice" type="number" step=".01" value="${Number(l.price || 0)}"></td>
    <td>
      <select class="puPriceType">
        <option value="KG" ${l.priceType === 'KG' ? 'selected' : ''}>€/KG</option>
        <option value="CAJA" ${l.priceType === 'CAJA' ? 'selected' : ''}>€/CAJA</option>
        <option value="UD" ${l.priceType === 'UD' ? 'selected' : ''}>€/UD</option>
        <option value="MANOJO" ${l.priceType === 'MANOJO' ? 'selected' : ''}>€/MANOJO</option>
      </select>
    </td>
    <td>
      <select class="puVat">
        <option value="" ${unknown ? 'selected' : ''}>REVISAR</option>
        ${[0, 4, 10, 21].map(v => `<option value="${v}" ${!unknown && Number(l.vat ?? 4) === v ? 'selected' : ''}>${v}%</option>`).join('')}
      </select>
    </td>
    <td class="puBase money">—</td>
    <td><button class="btn mini bad" type="button" data-pu-del>×</button></td>
  </tr>`;
}

export function purchasesView() {
  const list = [...(st().purchases || [])].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const rows = list.map(p => `<tr>
    <td>${esc(p.date || '')}</td>
    <td>${esc((st().suppliers || []).find(s => s.id === p.supplierId)?.name || p.supplierName || '')}</td>
    <td>${esc(p.number || '')}</td>
    <td>${p.lines?.length || 0}</td>
    <td>${money(p.base || 0)}</td>
    <td>${money(p.vatTotal || 0)}</td>
    <td>${money(p.transport || 0)}</td>
    <td><b>${money(p.total)}</b></td>
  </tr>`);

  return `${section(
    'COMPRAS',
    'ENTRADA DE MERCANCÍA · TEXTO CHATGPT · STOCK + COSTE REAL CON PORTES',
    '<button class="btn primary" data-action="purchase-new">＋ COMPRA</button><button class="btn" data-action="purchase-import">PEGAR TEXTO CHATGPT</button><button class="btn" data-action="purchase-prompt">COPIAR INSTRUCCIÓN CHATGPT</button>'
  )}${table(['FECHA', 'PROVEEDOR', 'FACTURA', 'LÍNEAS', 'BASE', 'IVA', 'TRANSPORTE', 'TOTAL'], rows)}`;
}

export function purchaseModal(preset = null) {
  if(!can(Runtime.role,'purchaseWrite'))return toast('SIN PERMISO PARA REGISTRAR COMPRAS','bad');
  const seed = preset || {};
  const seedLines = (seed.lines || []).map(l => ({...l}));
  while (seedLines.length < 5) seedLines.push({});

  const m = modal(
    seed.rawText ? 'REVISAR COMPRA IMPORTADA' : 'REGISTRAR COMPRA',
    `<form id="puf">
      <div class="form-grid">
        <label>PROVEEDOR<select name="supplierId">${supplierOpts(seed.supplierId || '')}</select></label>
        <label>FECHA<input name="date" type="date" value="${seed.date || today()}"></label>
        <label>Nº FACTURA<input name="number" value="${esc(seed.number || '')}"></label>
        <label>TRANSPORTE / PORTES €<input name="transport" type="number" step=".01" value="${Number(seed.transport || 0)}"></label>
        <label>DESCUENTO %<input name="discount" type="number" step=".01" value="${Number(seed.discount || 0)}"></label>
        <label>TOTAL FACTURA ORIGEN €<input name="expectedTotal" type="number" step=".01" value="${Number(seed.expectedTotal || 0)}"></label><label>FACTURA ORIGINAL (PDF/FOTO)<input name="attachment" type="file" accept="application/pdf,image/*"></label>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>PRODUCTO</th><th>CANT.</th><th>KG/CAJA</th><th>PRECIO</th><th>TIPO PRECIO</th><th>IVA</th><th>BASE</th><th></th></tr></thead>
          <tbody id="puRows">${seedLines.map(purchaseLineRow).join('')}</tbody>
        </table>
      </div>
      <div id="puSummary"></div>
      ${seed.rawText ? `<details class="panel import-source"><summary>TEXTO ORIGINAL IMPORTADO</summary><pre>${esc(seed.rawText)}</pre></details>` : ''}
      <div class="actions" style="margin-top:10px">
        <button class="btn" type="button" id="puAdd">＋ LÍNEA</button>
        <button class="btn primary">GUARDAR COMPRA</button>
      </div>
    </form>`
  );

  if (seed.supplierId) m.querySelector('[name=supplierId]').value = seed.supplierId;

  const collect = () => [...m.querySelectorAll('#puRows tr')]
    .map(tr => {
      const pid = tr.querySelector('.puProd').value;
      if (!pid) return null;
      const p = product(pid);
      const vatValue = tr.querySelector('.puVat').value;
      return {
        productId: pid,
        code: p.code,
        name: p.name,
        mode: p.mode,
        qty: Number(tr.querySelector('.puQty').value || 0),
        kgPerBox: Number(tr.querySelector('.puKg').value || 0),
        price: Number(tr.querySelector('.puPrice').value || 0),
        priceType: tr.querySelector('.puPriceType').value,
        vat: vatValue === '' ? null : Number(vatValue),
        vatUnknown: vatValue === ''
      };
    })
    .filter(l => l && l.qty > 0);

  const refresh = () => {
    const totals = purchaseCalculatedTotals(
      collect(),
      Number(m.querySelector('[name=transport]').value || 0),
      Number(m.querySelector('[name=discount]').value || 0)
    );

    [...m.querySelectorAll('#puRows tr')].forEach((tr, i) => {
      tr.querySelector('.puBase').textContent = totals.lines[i] ? money(totals.lines[i].base) : '—';
    });

    const expected = Number(m.querySelector('[name=expectedTotal]').value || 0);
    const diff = expected ? round2(totals.total - expected) : 0;
    m.querySelector('#puSummary').innerHTML = `<div class="purchase-summary">
      <span>BASE <b>${money(totals.base)}</b></span>
      <span>IVA <b>${money(totals.vat)}</b></span>
      <span>TRANSPORTE <b>${money(totals.transport)}</b></span>
      <strong>TOTAL ${money(totals.total)}</strong>
      ${expected ? `<span class="${Math.abs(diff) <= .05 ? 'success-inline' : 'bad-inline'}">ORIGEN ${money(expected)} · DIF. ${money(diff)}</span>` : ''}
    </div>
    ${totals.vatUnknown ? '<div class="danger">HAY LÍNEAS CON IVA POR REVISAR. CONFIRMA EL IVA ANTES DE GUARDAR.</div>' : ''}`;

    return totals;
  };

  m.querySelector('#puAdd').onclick = () => {
    m.querySelector('#puRows').insertAdjacentHTML('beforeend', purchaseLineRow());
    refresh();
  };

  m.addEventListener('click', e => {
    if (e.target.matches('[data-pu-del]')) {
      e.target.closest('tr').remove();
      refresh();
    }
  });

  m.addEventListener('change', e => {
    if (e.target.matches('.puProd')) {
      const p = product(e.target.value);
      const tr = e.target.closest('tr');
      tr.querySelector('.puKg').value = Number(p?.kgPerBox || 0);
      tr.querySelector('.puQty').step=p?.mode?.startsWith('caja')?'1':'.01';
      tr.querySelector('.puPrice').value = Number(p?.buyPrice || 0);
      tr.querySelector('.puPriceType').value = p?.mode === 'caja_kg'
        ? 'KG'
        : p?.mode === 'caja_fija'
          ? 'CAJA'
          : p?.mode === 'manojo'
            ? 'MANOJO'
            : p?.mode === 'ud'
              ? 'UD'
              : 'KG';
      tr.querySelector('.puVat').value = Number(p?.vat ?? 4);
    }
    refresh();
  });

  m.addEventListener('input', e => {
    if (e.target.closest('#puf')) refresh();
  });

  m.querySelector('#puf').onsubmit = async e => {
    e.preventDefault();
    try {
      const f = new FormData(e.currentTarget);
      const lines = collect();
      if (!lines.length) throw new Error('AÑADE PRODUCTOS');

      for (const l of lines) {
        if (l.mode === 'caja_kg' && !l.kgPerBox) throw new Error(`${l.name}: FALTA KG/CAJA`);
        if (l.mode?.startsWith('caja') && !Number.isInteger(l.qty)) throw new Error(`${l.name}: LAS CAJAS DEBEN SER ENTERAS`);
        if (l.price <= 0) throw new Error(`${l.name}: PRECIO INVÁLIDO`);
        if (l.vatUnknown) throw new Error(`${l.name}: CONFIRMA EL IVA`);
      }

      const supplierId = f.get('supplierId');
      const number = upper(f.get('number'));
      if (
        number &&
        (st().purchases || []).some(p => p.supplierId === supplierId && upper(p.number) === number)
      ) {
        throw new Error('YA EXISTE ESA FACTURA DE PROVEEDOR');
      }

      const totals = purchaseCalculatedTotals(
        lines,
        Number(f.get('transport') || 0),
        Number(f.get('discount') || 0)
      );
      const expected = Number(f.get('expectedTotal') || 0);

      if (
        expected &&
        Math.abs(totals.total - expected) > .05 &&
        !confirm(`TOTAL CALCULADO ${money(totals.total)} ≠ FACTURA ${money(expected)}. ¿GUARDAR IGUAL?`)
      ) return;

      const supplier = (st().suppliers || []).find(s => s.id === supplierId);
      const purchase = {
        id: uid('pur'),
        supplierId,
        supplierName: supplier?.name || seed.supplierName || '',
        supplierNif: seed.supplierNif || supplier?.nif || '',
        date: f.get('date'),
        number,
        lines: totals.lines,
        productBase: totals.productBase,
        discount: Number(f.get('discount') || 0),
        transport: totals.transport,
        base: totals.base,
        vatTotal: totals.vat,
        total: totals.total,
        expectedTotal: expected,
        currency: seed.currency || 'EUR',
        observations: seed.observations || '',
        sourceText: seed.rawText || ''
      };

      await savePurchaseTransaction(purchase, Runtime.user);
      const attachment=m.querySelector('[name=attachment]')?.files?.[0];if(attachment){try{const up=await uploadPurchaseAttachment(purchase.id,attachment);await saveEntity('purchases',{id:purchase.id,attachments:[...(purchase.attachments||[]),up]},'PURCHASE_ATTACHMENT',Runtime.user);toast('COMPRA Y DOCUMENTO ORIGINAL ARCHIVADOS','good')}catch(err){toast(`COMPRA GUARDADA · ADJUNTO PENDIENTE: ${err.message||err}`,'warn')}}
      toast('COMPRA GUARDADA ATÓMICAMENTE · STOCK Y COSTE REAL ACTUALIZADOS', 'good');
      closeModal();
    } catch (err) {
      toast(err.message, 'bad');
    }
  };

  refresh();
}

export function purchaseImportModal() {
  if(!can(Runtime.role,'purchaseWrite'))return toast('SIN PERMISO PARA IMPORTAR COMPRAS','bad');
  const m = modal(
    'PEGAR COMPRA DESDE CHATGPT',
    `<div class="grid2">
      <div>
        <label class="field">PEGA AQUÍ ARW2026_COMPRA_V1
          <textarea id="purchaseImportText" class="import-text" placeholder="ARW2026_COMPRA_V1\nPROVEEDOR=...\nFACTURA=...\n..."></textarea>
        </label>
        <div class="actions">
          <button class="btn" id="pastePurchase" type="button">PEGAR PORTAPAPELES</button>
          <button class="btn" id="previewPurchase" type="button">INTERPRETAR</button>
        </div>
      </div>
      <div>
        <h3>VISTA PREVIA</h3>
        <div id="purchaseImportPreview" class="panel">PEGA EL TEXTO Y PULSA INTERPRETAR.</div>
      </div>
    </div>
    <div class="modal-actions">
      <button class="btn primary" id="reviewPurchase" disabled>ABRIR REVISIÓN</button>
    </div>`
  );

  let parsed = null;

  const preview = () => {
    parsed = parsePurchaseText(
      m.querySelector('#purchaseImportText').value,
      products(),
      suppliers()
    );

    const totals = purchaseCalculatedTotals(parsed.lines, parsed.transport, parsed.discount);
    const rows = parsed.lines.map(l => `<tr>
      <td>${esc(l.code)}</td>
      <td><b>${esc(l.name)}</b></td>
      <td>${l.qty}</td>
      <td>${l.mode === 'caja_kg' ? `${l.kgPerBox} KG/CAJA` : upper(l.mode)}</td>
      <td>${money(l.price)} / ${esc(l.priceType || '')}</td>
      <td>${l.vatUnknown ? badge('REVISAR', 'bad') : `${l.vat}%`}</td>
    </tr>`);

    const problems = [...(parsed.unrecognized || [])];
    if (parsed.declaredUnrecognized) problems.push(parsed.declaredUnrecognized);

    m.querySelector('#purchaseImportPreview').innerHTML = `
      <p><b>PROVEEDOR:</b> ${esc(parsed.supplierName || 'NO IDENTIFICADO')} ${esc(parsed.supplierNif || '')}</p>
      <p><b>FACTURA:</b> ${esc(parsed.number || '')}</p>
      ${table(['CÓD.', 'PRODUCTO', 'CANT.', 'MODO', 'PRECIO', 'IVA'], rows)}
      <div class="purchase-summary">
        <strong>TOTAL CALCULADO ${money(totals.total)}</strong>
        ${parsed.expectedTotal ? `<span>ORIGEN ${money(parsed.expectedTotal)}</span>` : ''}
      </div>
      ${problems.length
        ? `<div class="danger"><b>REVISAR:</b><br>${problems.map(esc).join('<br>')}</div>`
        : '<div class="success">PRODUCTOS RECONOCIDOS</div>'}`;

    m.querySelector('#reviewPurchase').disabled = !parsed.lines.length;
  };

  m.querySelector('#previewPurchase').onclick = preview;
  m.querySelector('#pastePurchase').onclick = async () => {
    try {
      m.querySelector('#purchaseImportText').value = await navigator.clipboard.readText();
      preview();
    } catch {
      toast('NO SE PUDO LEER EL PORTAPAPELES', 'bad');
    }
  };

  m.querySelector('#reviewPurchase').onclick = () => {
    if (!parsed?.lines.length) return;
    closeModal();
    purchaseModal(parsed);
  };
}

export async function copyPurchasePrompt() {
  try {
    await navigator.clipboard.writeText(chatGptPurchaseInstruction());
    toast('INSTRUCCIÓN PARA CHATGPT COPIADA', 'good');
  } catch {
    const m = modal(
      'INSTRUCCIÓN PARA CHATGPT',
      `<textarea class="import-text">${esc(chatGptPurchaseInstruction())}</textarea>`,
      true
    );
    m.querySelector('textarea').select();
  }
}

export function exportProducts() {
  exportXlsx(
    products().map(p => ({
      CODIGO: p.code,
      PRODUCTO: p.name,
      ALIAS: p.aliases,
      MODO: p.mode,
      KG_CAJA: p.kgPerBox,
      COMPRA: p.buyPrice,
      VENTA: p.sellPrice,
      RECOMENDADO: p.recommended,
      IVA: p.vat,
      PROVEEDOR: p.supplier
    })),
    'ARW2026_PRODUCTOS.xlsx'
  );
}

export function exportClients() {
  exportXlsx(
    clients().map(c => ({
      CLIENTE: c.name,
      NIF: c.nif,
      DIRECCION: c.address,
      RECARGO_EQUIVALENCIA: c.equivalenceSurcharge ? 'SI' : 'NO',
      TRANSPORTE: c.transportPercent,
      COMISION: c.commissionPercent,
      PAGO: c.paymentMethod,
      TELEFONO: c.phone,
      EMAIL: c.email,
      DEUDA_PERIODO: clientStats(c, true).pending,
      DEUDA_HISTORICA: clientStats(c, false).pending
    })),
    'ARW2026_CLIENTES.xlsx'
  );
}

export function exportStock() {
  const locs = ['ALMACEN', 'FURGONETA', 'SAN PABLO', 'SAN LESMES', 'SANTIAGO'];
  exportXlsx(
    products().map(p => {
      const total = stockQuantity(st().stockMoves || [], p.id);
      return {
        CODIGO: p.code,
        PRODUCTO: p.name,
        STOCK_TOTAL: total,
        ...Object.fromEntries(locs.map(l => [l, stockQuantity(st().stockMoves || [], p.id, l)])),
        MODO: p.mode,
        KG_CAJA: p.kgPerBox,
        VALOR: round2(total * Number(p.buyPrice || 0))
      };
    }),
    'ARW2026_STOCK.xlsx'
  );
}
