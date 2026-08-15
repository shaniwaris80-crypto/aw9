export const $=(s,r=document)=>r.querySelector(s);
export const $$=(s,r=document)=>[...r.querySelectorAll(s)];
export const uid=(p='id')=>`${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,9)}`;
export const isoDate=()=>new Date().toISOString().slice(0,10);
export const nowISO=()=>new Date().toISOString();
export const n=v=>{const x=Number(String(v??0).replace(',','.'));return Number.isFinite(x)?x:0};
export const round2=v=>Math.round((n(v)+Number.EPSILON)*100)/100;
export const money=v=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(n(v));
export const num=v=>new Intl.NumberFormat('es-ES',{maximumFractionDigits:2}).format(n(v));
export const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
export const upper=s=>String(s??'').toLocaleUpperCase('es-ES');
export const norm=s=>upper(String(s??'')).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();
export const download=(blob,name)=>{const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
export const csvEscape=v=>`"${String(v??'').replaceAll('"','""')}"`;
export function toast(msg,type='ok'){const root=$('#toastRoot');if(!root)return;const d=document.createElement('div');d.className=`toast ${type}`;d.textContent=msg;root.appendChild(d);setTimeout(()=>d.remove(),3500)}
export function modal(title,html,{wide=false}={}){const root=$('#modalRoot');root.innerHTML=`<div class="modal-backdrop"><div class="modal ${wide?'wide':''}"><div class="modal-head"><h3>${esc(title)}</h3><button class="icon-btn" data-close>✕</button></div><div class="modal-body">${html}</div></div></div>`;root.querySelector('[data-close]').onclick=()=>root.innerHTML='';root.querySelector('.modal-backdrop').addEventListener('click',e=>{if(e.target===e.currentTarget)root.innerHTML=''});return root.querySelector('.modal')}
export const closeModal=()=>{const r=$('#modalRoot');if(r)r.innerHTML=''};
export const fmtDate=d=>{if(!d)return'';const [y,m,day]=String(d).slice(0,10).split('-');return `${day}/${m}/${y}`};
export const daysBetween=(a,b=new Date())=>Math.floor((new Date(b)-new Date(a))/86400000);
export const monthKey=d=>String(d||isoDate()).slice(0,7);
export const quarterKey=d=>{const dt=new Date(d||isoDate());return `${dt.getFullYear()}-T${Math.floor(dt.getMonth()/3)+1}`};
