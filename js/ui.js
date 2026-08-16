export const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
export const money=n=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(n||0));
export const badge=(txt,cls='')=>`<span class="badge ${cls}">${esc(String(txt??'').toUpperCase())}</span>`;
export const kpi=(label,value)=>`<div class="kpi"><small>${esc(label)}</small><strong>${value}</strong></div>`;
export const section=(title,sub='',actions='')=>`<div class="section-head"><div><h1>${esc(title)}</h1>${sub?`<p>${esc(sub)}</p>`:''}</div><div class="actions">${actions}</div></div>`;
export const table=(heads,rows)=>`<div class="table-wrap"><table><thead><tr>${heads.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
export function optionList(items,selected='',label=x=>x.name){return items.map(x=>`<option value="${esc(x.id)}" ${x.id===selected?'selected':''}>${esc(label(x))}</option>`).join('')}
export function toast(text,type=''){const root=document.getElementById('toastRoot'),el=document.createElement('div');el.className=`toast ${type}`;el.textContent=text;root.appendChild(el);setTimeout(()=>el.remove(),3600)}
export function modal(title,body,small=false){closeModal();const root=document.getElementById('modalRoot');root.innerHTML=`<div class="modal-back"><div class="modal ${small?'small':''}"><div class="modal-head"><b>${esc(title)}</b><button class="icon-btn" data-close-modal>×</button></div><div class="modal-body">${body}</div></div></div>`;root.querySelector('[data-close-modal]').onclick=closeModal;return root.querySelector('.modal')}
export function closeModal(){const root=document.getElementById('modalRoot');if(root)root.innerHTML=''}
export function exportXlsx(rows,filename='ARW2026.xlsx'){if(!window.XLSX)throw new Error('XLSX NO DISPONIBLE');const ws=XLSX.utils.json_to_sheet(rows),wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'ARW2026');XLSX.writeFile(wb,filename)}
