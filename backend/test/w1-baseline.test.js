import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {checkConsistency,classifyDelivery} from '../src/w1/delivery.js';
test('125 frozen synthetic outputs: charge parity; category-aware hotline gate admits v34 violence crisis (GPT ruling 2026-09-23)',()=>{
 const bytes=readFileSync(new URL('../data/baseline-synthetic.json',import.meta.url));
 assert.equal(createHash('sha256').update(bytes).digest('hex'),'bc0d56a073524b09e3fd4e0eb76b4fd3e6b0c24b4bed62473ff8495a7122f656');
 const data=JSON.parse(bytes),exceptions=['LN-22','LN-26','LN-27','LN-30'],withheld=[];
 assert.equal(data.rows.length,125);assert.deepEqual(data.skipped,['LN-07']);
 assert.equal(data.rows.filter(r=>r.kill).length,34);
 for(const row of data.rows){const gate=checkConsistency(row.text,row.finishReason);
  // Formerly withheld by the universal-1925 rule; v34 violence safety responses (110/113/119, no 1925) now pass.
  assert.equal(gate.ok,true,row.case_key);assert.equal(classifyDelivery(gate.value).charge,row.frozen_skeleton_count===6?1:0,row.case_key);
  if(exceptions.includes(row.case_key)){assert.equal(gate.value.meta.category,'violence');assert.equal(row.text.includes('1925'),false);withheld.push(row.case_key);}
 }
 assert.deepEqual(withheld.sort(),exceptions);
 // This test never asserts A4 live PASS or old baseline correctness.
});
