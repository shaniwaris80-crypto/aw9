import {money,upper} from './domain.js';
export const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
export const badge=(t,type='')=>`<span class="badge ${type}">${esc(upper(t))}</span>`;
export const kpi=(l,v)=>`<div class="kpi"><small>${esc(upper(l))}</small><strong>${esc(v)}</strong></div>`;
export const section=(title,sub='',actions='')=>`<div class="section-head"><div><h1>${esc(upper(title))}</h1><p>${esc(upper(sub))}</p></div><div class="actions">${actions}</div></div>`;
export const table=(heads,rows)=>`<div class="table-wrap"><table><thead><tr>${heads.map(h=>`<th>${esc(upper(h))}</th>`).join('')}</tr></thead><tbody>${rows.join('')||`<tr><td colspan="${heads.length}" class="muted">SIN DATOS</td></tr>`}</tbody></table></div>`;
export function modal(title,html,small=false){const root=document.querySelector('#modalRoot');root.innerHTML=`<div class="modal-back"><div class="modal ${small?'small':''}"><div class="modal-head"><strong>${esc(upper(title))}</strong><button class="icon-btn" data-close>×</button></div><div class="modal-body">${html}</div></div></div>`;const back=root.firstElementChild;back.querySelector('[data-close]').onclick=()=>root.innerHTML='';back.addEventListener('click',e=>{if(e.target===back)root.innerHTML=''});return back;}
export const closeModal=()=>document.querySelector('#modalRoot').replaceChildren();
export function toast(text,type=''){const root=document.querySelector('#toastRoot');const d=document.createElement('div');d.className=type==='bad'?'danger':type==='good'?'success':'warning';d.style.cssText='position:fixed;right:16px;top:16px;z-index:200;max-width:520px;box-shadow:0 10px 40px #0003;background:white';d.textContent=upper(text);root.appendChild(d);setTimeout(()=>d.remove(),4500)}
export const fmtInput=n=>Number(n||0).toString();
export const optionList=(items,selected,label=x=>x.name)=>items.map(x=>`<option value="${esc(x.id)}" ${x.id===selected?'selected':''}>${esc(upper(label(x)))}</option>`).join('');
export function exportXlsx(rows,name){if(!window.XLSX)throw new Error('XLSX NO CARGADO');const wb=XLSX.utils.book_new(),ws=XLSX.utils.json_to_sheet(rows);XLSX.utils.book_append_sheet(wb,ws,'DATOS');XLSX.writeFile(wb,name)}
export {money};
