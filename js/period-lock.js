import {Store} from './store.js';

const protectedCollections=new Set(['invoices','purchases','expenses','cashMovements','bankMovements']);
function isLocked(name,obj){if(!protectedCollections.has(name)||!obj?.date)return false;const period=String(obj.date).slice(0,7);return (Store.state.settings.lockedPeriods||[]).includes(period)}
const originalSave=Store.save.bind(Store);Store.save=async function(name,obj,...rest){if(isLocked(name,obj)){alert(`EL PERIODO ${String(obj.date).slice(0,7)} ESTÁ CERRADO.\nNO SE PUEDE MODIFICAR ESTE MOVIMIENTO.\nUTILIZA UNA RECTIFICATIVA EN UN PERIODO ABIERTO.`);throw new Error('PERIODO CERRADO')}return originalSave(name,obj,...rest)};
const originalBulk=Store.bulkSave.bind(Store);Store.bulkSave=async function(name,items,...rest){if((items||[]).some(x=>isLocked(name,x))){alert('LA OPERACIÓN INCLUYE MOVIMIENTOS DE UN PERIODO CERRADO.');throw new Error('PERIODO CERRADO')}return originalBulk(name,items,...rest)};
