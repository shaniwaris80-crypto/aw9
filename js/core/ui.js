import {esc,money,num,upper} from './utils.js';
export function kpi(label,value,sub='',cls=''){return `<div class="kpi ${cls}"><small>${esc(label)}</small><strong>${esc(value)}</strong>${sub?`<span>${esc(sub)}</span>`:''}</div>`}
export function table(headers,rows,empty='SIN DATOS',cls=''){return `<div class="table-wrap"><table class="${cls}"><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.length?rows.join(''):`<tr><td colspan="${headers.length}" class="empty">${esc(empty)}</td></tr>`}</tbody></table></div>`}
export function actions(items){return `<div class="actions">${items.map(([txt,act,cls='',extra=''])=>`<button class="btn ${cls}" data-act="${act}" ${extra}>${txt}</button>`).join('')}</div>`}
export const badge=(txt,kind='')=>`<span class="badge ${kind}">${esc(txt)}</span>`;
export const yesno=v=>v?badge('SÍ','ok'):badge('NO','bad');
export function section(title,subtitle='',buttons=[]){return `<div class="section-head"><div><h2>${esc(title)}</h2>${subtitle?`<p>${esc(subtitle)}</p>`:''}</div>${buttons.length?actions(buttons):''}</div>`}
export function clientOptions(clients,selected=''){return clients.filter(c=>c.active!==false).sort((a,b)=>String(a.name).localeCompare(String(b.name))).map(c=>`<option value="${c.id}" ${c.id===selected?'selected':''}>${esc(c.name)}</option>`).join('')}
export function productOptions(products,selected=''){return products.filter(p=>p.active!==false).sort((a,b)=>String(a.name).localeCompare(String(b.name))).map(p=>`<option value="${p.id}" ${p.id===selected?'selected':''}>${esc(p.code)} · ${esc(p.name)}</option>`).join('')}
export function statusBadge(s){const u=upper(s);return badge(u,u.includes('PAG')||u.includes('ENTREG')||u==='ACTIVO'?'ok':u.includes('VENC')||u.includes('ANUL')||u.includes('ERROR')?'bad':'warn')}
export function cards(items){return `<div class="grid3">${items.map(x=>`<section class="panel">${x}</section>`).join('')}</div>`}
