import assert from 'node:assert/strict';
import {altaHashInput,anulacionHashInput,hashAlta,hashAnulacion,buildQrUrl,ddmmyyyy,aeatAmount,verifyChainRecords} from '../js/verifactu.js';

const first={issuerNif:'89890001K',invoiceNumber:'12345678/G33',invoiceDate:'01-01-2024',invoiceType:'F1',vatTotalText:'12.35',totalText:'123.45',previousHash:'',generatedAt:'2024-01-01T19:20:30+01:00'};
const firstInput='IDEmisorFactura=89890001K&NumSerieFactura=12345678/G33&FechaExpedicionFactura=01-01-2024&TipoFactura=F1&CuotaTotal=12.35&ImporteTotal=123.45&Huella=&FechaHoraHusoGenRegistro=2024-01-01T19:20:30+01:00';
assert.equal(altaHashInput(first),firstInput);
assert.equal((await hashAlta(first)).hash,'3C464DAF61ACB827C65FDA19F352A4E3BDC2C640E9E9FC4CC058073F38F12F60');

const second={issuerNif:'89890001K',invoiceNumber:'12345679/G34',invoiceDate:'01-01-2024',invoiceType:'F1',vatTotalText:'12.35',totalText:'123.45',previousHash:'3C464DAF61ACB827C65FDA19F352A4E3BDC2C640E9E9FC4CC058073F38F12F60',generatedAt:'2024-01-01T19:20:35+01:00'};
assert.equal((await hashAlta(second)).hash,'F7B94CFD8924EDFF273501B01EE5153E4CE8F259766F88CF6ACB8935802A2B97');

const cancel={issuerNif:'89890001K',invoiceNumber:'12345679/G34',invoiceDate:'01-01-2024',previousHash:'F7B94CFD8924EDFF273501B01EE5153E4CE8F259766F88CF6ACB8935802A2B97',generatedAt:'2024-01-01T19:20:40+01:00'};
const cancelInput='IDEmisorFacturaAnulada=89890001K&NumSerieFacturaAnulada=12345679/G34&FechaExpedicionFacturaAnulada=01-01-2024&Huella=F7B94CFD8924EDFF273501B01EE5153E4CE8F259766F88CF6ACB8935802A2B97&FechaHoraHusoGenRegistro=2024-01-01T19:20:40+01:00';
assert.equal(anulacionHashInput(cancel),cancelInput);
assert.equal((await hashAnulacion(cancel)).hash,'177547C0D57AC74748561D054A9CEC14B4C4EA23D1BEFD6F2E69E3A388F90C68');

assert.equal(ddmmyyyy('2026-08-16'),'16-08-2026');
assert.equal(aeatAmount(123.10),'123.1');
const qr=buildQrUrl({issuerNif:'89890001K',invoiceNumber:'12345678/G33',date:'2024-01-01',total:123.45,environment:'test'});
assert.ok(qr.startsWith('https://prewww2.aeat.es/wlpl/TIKE-CONT/ValidarQR?'));
assert.ok(qr.includes('nif=89890001K'));
assert.ok(qr.includes('numserie=12345678%2FG33'));
assert.ok(qr.includes('fecha=01-01-2024'));
assert.ok(qr.includes('importe=123.45'));
const chain=verifyChainRecords([{sequence:1,hash:'AAA',previousHash:'',invoiceNumber:'A'},{sequence:2,hash:'BBB',previousHash:'AAA',invoiceNumber:'B'}]);assert.equal(chain.ok,true);
assert.equal(verifyChainRecords([{sequence:1,hash:'AAA',previousHash:'X',invoiceNumber:'A'}]).ok,false);
console.log('VERI*FACTU hash/QR tests OK');
