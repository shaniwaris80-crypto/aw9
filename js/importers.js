import {normalize,round2} from './domain.js';

export function parseNumber(value){
  let s=String(value??'').trim().replace(/[€\s]/g,'');
  if(!s)return 0;
  if(s.includes(',')&&s.includes('.')){
    s=s.lastIndexOf(',')>s.lastIndexOf('.')?s.replace(/\./g,'').replace(',','.'):s.replace(/,/g,'');
  }else if(s.includes(','))s=s.replace(',','.');
  s=s.replace(/[^0-9+\-.]/g,'');
  const n=Number(s);return Number.isFinite(n)?n:0;
}

function namesAndAliases(p){return [p.name,...String(p.aliases||'').split(',')].map(x=>normalize(x)).filter(Boolean)}
export function matchProduct(text,products=[]){
  const q=normalize(text);if(!q)return null;
  const tokens=q.split(' ').filter(Boolean);
  // Los códigos cortos (MM, MA, etc.) solo se aceptan como palabra completa,
  // nunca como subcadena de MACHO/MANGO/MAMEY.
  const codeHit=products.find(p=>tokens.includes(normalize(p.code)));if(codeHit)return codeHit;
  const exact=products.find(p=>namesAndAliases(p).includes(q));if(exact)return exact;
  let best=null,bestScore=0;
  const padded=` ${q} `;
  for(const p of products){
    const primary=normalize(p.name);
    for(const a of namesAndAliases(p)){
      if(a.length<3)continue;
      const whole=padded.includes(` ${a} `)||q.startsWith(`${a} `)||q.endsWith(` ${a}`);
      if(!whole)continue;
      const score=a.length+(a===primary?30:10);
      if(score>bestScore){best=p;bestScore=score;}
    }
  }
  return best;
}
export function matchClient(text,clients=[]){
  const q=normalize(text);if(!q)return null;
  const exact=clients.find(c=>[c.name,...String(c.aliases||'').split(',')].map(normalize).includes(q));if(exact)return exact;
  return clients.find(c=>q.includes(normalize(c.name))||normalize(c.name).includes(q))||null;
}
export function matchSupplier(text,suppliers=[]){
  const q=normalize(text);if(!q)return null;
  return suppliers.find(s=>normalize(s.name)===q)||suppliers.find(s=>q.includes(normalize(s.name))||normalize(s.name).includes(q))||null;
}
function normalizeDate(v){
  const s=String(v||'').trim();if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;
  const m=s.match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/);if(!m)return s;
  const y=m[3].length===2?`20${m[3]}`:m[3];return `${y}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
}
function modeValue(v){const q=normalize(v).replace(/ /g,'_');if(q.includes('caja_kg'))return'caja_kg';if(q.includes('caja_fija'))return'caja_fija';if(q==='ud'||q.includes('unidad'))return'ud';if(q.includes('manojo'))return'manojo';return'kg';}

export function parsePurchaseText(text,products=[],suppliers=[]){
  const raw=String(text||'').trim();
  if(!raw)return {lines:[],unrecognized:['TEXTO VACÍO'],rawText:raw};
  const linesRaw=raw.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  const structured=linesRaw.some(x=>normalize(x)==='arw2026 compra v1'||x.toUpperCase()==='ARW2026_COMPRA_V1');
  if(structured)return parseStructuredPurchase(linesRaw,products,suppliers,raw);
  return parseFreePurchase(linesRaw,products,suppliers,raw);
}
function parseStructuredPurchase(linesRaw,products,suppliers,raw){
  const head={},items=[];let current=null;
  for(const line of linesRaw){
    const up=line.toUpperCase();
    if(up==='ARW2026_COMPRA_V1'||up==='FIN_ARW2026_COMPRA')continue;
    if(up==='ITEM'){current={};continue;}
    if(up==='FIN_ITEM'){if(current)items.push(current);current=null;continue;}
    const i=line.indexOf('=');if(i<0)continue;
    const k=line.slice(0,i).trim().toUpperCase(),v=line.slice(i+1).trim();
    (current||head)[k]=v;
  }
  if(current)items.push(current);
  const supplier=matchSupplier(head.PROVEEDOR,suppliers);
  const recognized=[],unrecognized=[];
  for(const it of items){
    const p=matchProduct(it.CODIGO||it.PRODUCTO,products)||matchProduct(it.PRODUCTO,products);
    if(!p){unrecognized.push(`${it.CODIGO||''} ${it.PRODUCTO||''}`.trim()||'ITEM SIN PRODUCTO');continue;}
    const qty=parseNumber(it.CANTIDAD),kgPerBox=it.KG_CAJA!==undefined?parseNumber(it.KG_CAJA):Number(p.kgPerBox||0),price=parseNumber(it.PRECIO),vat=it.IVA!==undefined&&String(it.IVA).toUpperCase()!=='DESCONOCIDO'?parseNumber(it.IVA):Number(p.vat||0),mode=it.MODO?modeValue(it.MODO):p.mode;
    recognized.push({productId:p.id,code:p.code,name:p.name,mode,qty,kgPerBox,price,vat,sourceProduct:it.PRODUCTO||p.name,baseExpected:parseNumber(it.BASE)});
  }
  return {supplierId:supplier?.id||'',supplierName:head.PROVEEDOR||supplier?.name||'',number:head.FACTURA||'',date:normalizeDate(head.FECHA)||'',transport:parseNumber(head.TRANSPORTE),discount:parseNumber(head.DESCUENTO),expectedBase:parseNumber(head.BASE_FACTURA),expectedVat:parseNumber(head.IVA_TOTAL),expectedTotal:parseNumber(head.TOTAL_FACTURA),lines:recognized,unrecognized,rawText:raw,format:'ARW2026_COMPRA_V1'};
}
function parseFreePurchase(linesRaw,products,suppliers,raw){
  let supplierName='',number='',date='';const recognized=[],unrecognized=[];
  for(const line of linesRaw){
    const n=normalize(line);
    if(n.startsWith('proveedor ')){supplierName=line.split(/[:=]/).slice(1).join(':').trim()||line.replace(/^proveedor\s*/i,'').trim();continue;}
    if(n.startsWith('factura ')){number=line.split(/[:=]/).slice(1).join(':').trim()||line.replace(/^factura\s*/i,'').trim();continue;}
    if(n.startsWith('fecha ')){date=normalizeDate(line.split(/[:=]/).slice(1).join(':').trim()||line.replace(/^fecha\s*/i,'').trim());continue;}
    const p=matchProduct(line,products);if(!p){unrecognized.push(line);continue;}
    let work=line;
    for(const a of [p.code,p.name,...String(p.aliases||'').split(',')].sort((a,b)=>String(b).length-String(a).length)){
      if(!a)continue;work=work.replace(new RegExp(String(a).replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'ig'),' ');
    }
    const nums=(work.match(/[-+]?\d+(?:[.,]\d+)?/g)||[]).map(parseNumber);
    const qty=nums[0]||0,price=nums[1]??Number(p.buyPrice||0);
    recognized.push({productId:p.id,code:p.code,name:p.name,mode:p.mode,qty,kgPerBox:Number(p.kgPerBox||0),price,vat:Number(p.vat||0),sourceProduct:p.name});
  }
  const supplier=matchSupplier(supplierName,suppliers);
  return {supplierId:supplier?.id||'',supplierName,date,number,transport:0,discount:0,expectedBase:0,expectedVat:0,expectedTotal:0,lines:recognized,unrecognized,rawText:raw,format:'LIBRE'};
}

export function parseOrderText(text,products=[],clients=[]){
  const raw=String(text||'').trim();const rows=raw.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  let detectedClient=null;const lines=[],unrecognized=[];
  for(const row of rows){
    const n=normalize(row);
    if(n.startsWith('cliente ')){
      const name=row.split(/[:=]/).slice(1).join(':').trim()||row.replace(/^cliente\s*/i,'').trim();detectedClient=matchClient(name,clients);continue;
    }
    if(n.startsWith('fecha ')||n==='pedido'||n.startsWith('observacion ')||n.startsWith('nota '))continue;
    const p=matchProduct(row,products);if(!p){unrecognized.push(row);continue;}
    let work=row;
    for(const a of [p.code,p.name,...String(p.aliases||'').split(',')].sort((a,b)=>String(b).length-String(a).length)){
      if(!a)continue;work=work.replace(new RegExp(String(a).replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'ig'),' ');
    }
    const nums=(work.match(/[-+]?\d+(?:[.,]\d+)?/g)||[]).map(parseNumber).filter(n=>Number.isFinite(n));
    const qty=nums[0]||0;if(qty<=0){unrecognized.push(row);continue;}
    lines.push({productId:p.id,code:p.code,name:p.name,qty,mode:p.mode,kgPerBox:Number(p.kgPerBox||0),raw:row});
  }
  return {clientId:detectedClient?.id||'',clientName:detectedClient?.name||'',lines,unrecognized,rawText:raw};
}

export function purchaseCalculatedTotals(lines=[],transport=0,discountPercent=0){
  const normalized=lines.map(l=>{
    const stockQty=l.mode==='caja_kg'?Number(l.qty||0)*Number(l.kgPerBox||0):Number(l.qty||0);
    const base=round2((l.mode==='caja_kg'?stockQty:Number(l.qty||0))*Number(l.price||0));return {...l,stockQty:round2(stockQty),base};
  });
  const productBase=round2(normalized.reduce((s,l)=>s+l.base,0));const discount=round2(productBase*Number(discountPercent||0)/100);const base=round2(productBase-discount+Number(transport||0));const factor=productBase?base/productBase:0;const vat=round2(normalized.reduce((s,l)=>s+round2(l.base*factor*Number(l.vat||0)/100),0));return {lines:normalized,productBase,discount,transport:round2(transport),base,vat,total:round2(base+vat)};
}

export function chatGptPurchaseInstruction(){return `INSTRUCCIÓN PARA CHATGPT — IMPORTAR COMPRA ARW2026\n\nAnaliza esta foto o PDF de una factura de compra y devuelve ÚNICAMENTE un bloque ARW2026_COMPRA_V1. No inventes datos. Usa punto decimal. Normaliza productos al catálogo ARW2026 cuando los reconozcas. Para caja por kilos usa CAJA_KG y KG_CAJA. Si no reconoces una línea, inclúyela en NO_RECONOCIDOS.\n\nFORMATO:\nARW2026_COMPRA_V1\nPROVEEDOR=\nNIF_PROVEEDOR=\nFACTURA=\nFECHA=YYYY-MM-DD\nMONEDA=EUR\n\nITEM\nCODIGO=\nPRODUCTO=\nMODO=CAJA_KG|CAJA_FIJA|KG|UD|MANOJO\nCANTIDAD=\nKG_CAJA=\nKG_TOTAL=\nPRECIO=\nPRECIO_TIPO=KG|CAJA|UD|MANOJO\nIVA=\nBASE=\nFIN_ITEM\n\nTRANSPORTE=0.00\nDESCUENTO=0.00\nBASE_FACTURA=0.00\nIVA_TOTAL=0.00\nTOTAL_FACTURA=0.00\nNO_RECONOCIDOS=\nOBSERVACIONES=\nFIN_ARW2026_COMPRA`;}
