export const $=(s,r=document)=>r.querySelector(s);export const $$=(s,r=document)=>[...r.querySelectorAll(s)];
export const n=v=>Number(String(v??0).replace(',','.'))||0;export const round2=v=>Math.round((n(v)+Number.EPSILON)*100)/100;export const upper=v=>String(v??'').toLocaleUpperCase('es-ES');
export const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
export const money=v=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(n(v));export const num=v=>new Intl.NumberFormat('es-ES',{maximumFractionDigits:2}).format(n(v));
export const isoDate=(d=new Date())=>{const z=new Date(d.getTime()-d.getTimezoneOffset()*60000);return z.toISOString().slice(0,10)};export const monthKey=(d=new Date())=>isoDate(d).slice(0,7);export const weekKey=(d=new Date())=>{const x=new Date(d);x.setHours(0,0,0,0);x.setDate(x.getDate()+3-(x.getDay()+6)%7);const w1=new Date(x.getFullYear(),0,4);const week=1+Math.round(((x-w1)/86400000-3+(w1.getDay()+6)%7)/7);return `${x.getFullYear()}-W${String(week).padStart(2,'0')}`};
export const uid=(p='id')=>`${p}_${Date.now().toString(36)}_${crypto.getRandomValues(new Uint32Array(1))[0].toString(36)}`;export const nowISO=()=>new Date().toISOString();export const daysBetween=(a,b=isoDate())=>Math.floor((new Date(b)-new Date(a))/86400000);
export function toast(msg,type=''){const r=$('#toastRoot');if(!r)return;const d=document.createElement('div');d.className=`toast ${type}`;d.textContent=msg;r.appendChild(d);setTimeout(()=>d.remove(),4200)}
export function modal(title,html,{small=false}={}){closeModal();const b=document.createElement('div');b.className='modal-backdrop';b.innerHTML=`<div class="modal ${small?'small':''}"><div class="modal-head"><h3>${esc(title)}</h3><button class="icon-btn" data-close>✕</button></div><div class="modal-body">${html}</div></div>`;$('#modalRoot').appendChild(b);b.addEventListener('click',e=>{if(e.target===b||e.target.closest('[data-close]'))closeModal()});return b}
export function closeModal(){const r=$('#modalRoot');if(r)r.innerHTML=''}
export function download(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),3000)}
export const debounce=(fn,ms=250)=>{let t;return(...args)=>{clearTimeout(t);t=setTimeout(()=>fn(...args),ms)}};
export function csvParse(text){const lines=text.split(/?
/).filter(Boolean);if(!lines.length)return[];const sep=lines[0].includes(';')?';':',';const headers=lines[0].split(sep).map(x=>x.trim());return lines.slice(1).map(line=>Object.fromEntries(line.split(sep).map((v,i)=>[headers[i],v.trim()]))) }
export async function fileToDataUrl(file){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file)})}
export function normalizeText(s){return upper(s).normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^A-Z0-9]+/g,' ').trim()}
export function ageBucket(date){const d=daysBetween(date);if(d<=7)return'0-7';if(d<=15)return'8-15';if(d<=30)return'16-30';if(d<=60)return'31-60';if(d<=90)return'61-90';return'+90'}
