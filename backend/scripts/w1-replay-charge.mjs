import {readFileSync} from 'node:fs';
import {checkConsistency,classifyDelivery} from '../src/w1/delivery.js';
const cases=JSON.parse(readFileSync(0,'utf8'));
const rows=cases.map(c=>{
 const gate=checkConsistency(c.text,c.finishReason);
 return {case_key:c.case_key,gate:gate.ok?'PASS':'NO_DELIVERY',errors:gate.errors??[],
   ...(gate.ok?classifyDelivery(gate.value):{charge:0,notice:'failure'})};
});
// Output only verdict data; no model text, metadata or private fields.
process.stdout.write(JSON.stringify(rows.map(({sections,meta,...row})=>row)));
