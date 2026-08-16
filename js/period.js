import {Runtime} from './runtime.js';
import {today} from './domain.js';

export function operationalResetAt(){return Runtime.settings().lastWeeklyResetAt||''}
export function operationalWeekStart(){
  const stamp=operationalResetAt();if(stamp)return stamp.slice(0,10);
  const configured=Runtime.settings().operationalWeekStart;if(configured)return configured;
  const d=new Date(),day=(d.getDay()+6)%7;d.setDate(d.getDate()-day);
  const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),n=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${n}`;
}
export function afterBoundary(stamp,date=''){
  const boundary=operationalResetAt();
  if(!boundary)return String(date||'')>=operationalWeekStart();
  if(stamp)return String(stamp)>boundary;
  return String(date||'')>boundary.slice(0,10);
}
export function invoiceAfterReset(inv){
  const stamp=inv?.status==='draft'?(inv?.updatedAt||inv?.createdAt||''):(inv?.issuedAt||inv?.createdAt||'');
  return afterBoundary(stamp,inv?.date||'');
}
export function orderAfterReset(o){return afterBoundary(o?.deliveredAt||o?.updatedAt||o?.createdAt||'',o?.date||'')}
export function paymentAfterReset(p){return afterBoundary(p?.createdAt||p?.updatedAt||'',p?.date||'')}
export function genericAfterReset(x){return afterBoundary(x?.createdAt||x?.updatedAt||'',x?.date||'')}
export function resetLabel(){const x=operationalResetAt();return x?new Date(x).toLocaleString('es-ES'):`${operationalWeekStart()} 00:00`}
export const currentOperationalDate=()=>today();
