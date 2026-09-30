// GPT R21 ruling: an unreadable classifier reply (SAFETY_CLASSIFICATION_INVALID) takes the existing safety-only
// v34 route instead of ending in no reply; provider errors and valid classifications behave exactly as before.
// Local PGlite, synthetic data, no provider calls. D4-223's pinned v34 baseline output is a red/financial [[SR]].
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {W1Store} from '../src/w1/store.js';
import {W1Service} from '../src/w1/service.js';
import {migrateW1} from '../src/w1/schema.js';
import {createSafetyClassifier,createClassifySafety,CLASSIFIER_INVALID_DETECTION} from '../src/w1/safety.js';

const engine=process.env.W1_PGLITE_MODULE??import.meta.resolve('@electric-sql/pglite');
const V34=Object.fromEntries(JSON.parse(readFileSync(new URL('../data/baseline-synthetic.json',import.meta.url))).rows.map(r=>[r.case_key,r.text]));
const S=`U${'7'.repeat(32)}`;
const BUDGET={campaign:'r21',budgetUsd:1,upperUsd:.02,hardCapUsd:1000,reviewStopUsd:1000};
const USAGE={input:101,cached:0,output:387,thinking:121};
const input=(id,q)=>({request_id:id,ben_gua:'乾為天',bian_gua:'天風姤',dong_yao:1,qigua_time:'2026-09-21T12:00:00+08:00',question_text:q});
async function db(){
  const {PGlite}=await import(engine);const d=new PGlite();
  const query=async(sql,args)=>{const r=args===undefined?(await d.exec(sql)).at(-1):await d.query(sql,args);return {...r,rowCount:r.affectedRows??r.rows.length};};
  const pool={query,connect:async()=>({query,release(){}})};await migrateW1(pool);
  const store=new W1Store(pool);
  await store.grant(S,{quota:3,expiresAt:new Date(Date.now()+3600000).toISOString(),enrollmentId:'r21-'+Math.random()});
  return {d,pool,store};
}
const invalidError=()=>Object.assign(new Error('SAFETY_CLASSIFICATION_INVALID'),{runtime:{usage:USAGE}});
const claims=async pool=>(await pool.query('SELECT result_json,runtime_json,settled_at FROM w1.safety_calls')).rows;
const audits=async(pool,code)=>(await pool.query('SELECT count(*)::int n FROM w1.audit_events WHERE code=$1',[code])).rows[0].n;

test('classifier prose reply (D4-223 shape) raises SAFETY_CLASSIFICATION_INVALID carrying the provider runtime',async()=>{
  const prose='從理性和金融安全的角度來看，這絕對不能信，且具有極高的詐騙風險。';
  const c=createSafetyClassifier(async()=>({text:prose,finishReason:'STOP',runtime:{usage:USAGE}}));
  await assert.rejects(c('synthetic'),e=>e.message==='SAFETY_CLASSIFICATION_INVALID'&&e.runtime.usage.output===387);
  const bad=createSafetyClassifier(async()=>({text:'{"self_harm":false,"imminent":true}',finishReason:'STOP',runtime:{usage:USAGE}}));
  await assert.rejects(bad('synthetic'),e=>e.message==='SAFETY_CLASSIFICATION_INVALID'&&e.runtime.usage.input===101);
});

test('INVALID -> safety-route marker; claim resolved and settled; replay routes the same without a new call',async()=>{
  const {d,pool,store}=await db();const settled=[];let calls=0;
  const cs=createClassifySafety({store,budget:BUDGET,classify:async()=>{calls++;throw invalidError();},settle:async(id,rt)=>{settled.push(rt);}});
  const body=input('inv','合成詐騙群組題');
  assert.deepEqual(await cs(S,body),CLASSIFIER_INVALID_DETECTION);
  let rows=await claims(pool);
  assert.equal(rows.length,1);assert.equal(rows[0].result_json.classification,'INVALID');
  assert.deepEqual(rows[0].result_json.detection,CLASSIFIER_INVALID_DETECTION);
  assert.deepEqual(settled,[{usage:USAGE}]);
  assert.equal(await audits(pool,'SAFETY_CLASSIFICATION_INVALID_ROUTED'),1);assert.equal(await audits(pool,'SAFETY_CLASSIFICATION_FAILED'),0);
  assert.deepEqual(await cs(S,body),CLASSIFIER_INVALID_DETECTION);assert.equal(calls,1);
  await d.close();
});

test('provider error keeps the previous behaviour: SAFETY_NO_DELIVERY, claim unresolved, no route',async()=>{
  const {d,pool,store}=await db();
  const cs=createClassifySafety({store,budget:BUDGET,classify:async()=>{throw new Error('PROVIDER_UNVERIFIED_NO_DELIVERY');},settle:async()=>{throw new Error('MUST_NOT_SETTLE');}});
  await assert.rejects(cs(S,input('prov','合成題')),/SAFETY_NO_DELIVERY/);
  assert.equal((await claims(pool))[0].result_json,null);
  assert.equal(await audits(pool,'SAFETY_CLASSIFICATION_FAILED'),1);assert.equal(await audits(pool,'SAFETY_CLASSIFICATION_INVALID_ROUTED'),0);
  await assert.rejects(cs(S,input('prov','合成題')),/SAFETY_CLASSIFICATION_UNRESOLVED/);
  await d.close();
});

test('valid classifications are unchanged (null and self-harm), resolved and settled as before',async()=>{
  const {d,pool,store}=await db();const settled=[];
  for(const [id,det] of [['ok-null',null],['ok-sh',{level:'crisis',category:'self_harm',imminent:false}]]){
    const cs=createClassifySafety({store,budget:BUDGET,classify:async()=>({detection:det,runtime:{usage:USAGE}}),settle:async(i,rt)=>{settled.push(rt);}});
    assert.deepEqual(await cs(S,input(id,'合成題')),det);
  }
  assert.equal(settled.length,2);
  assert.deepEqual((await claims(pool)).map(r=>Object.keys(r.result_json)),[['detection'],['detection']]);
  assert.equal(await audits(pool,'SAFETY_CLASSIFICATION_INVALID_ROUTED'),0);
  await d.close();
});

test('end to end: INVALID classification -> safety-only v34 route delivers D4-223 baseline SR, charge 0, no reservation',async()=>{
  const {d,pool,store}=await db();
  await pool.query('UPDATE w1.test_grants SET used=quota');                       // zero quota: route never charges
  const before=JSON.stringify((await pool.query('SELECT quota,used,reserved FROM w1.test_grants')).rows);
  const classifySafety=createClassifySafety({store,budget:BUDGET,classify:async()=>{throw invalidError();},settle:async()=>{}});
  let gen=0;
  const service=new W1Service({store,buildPrompt:async()=>({}),push:async()=>{},manifest:{source_revision:'synthetic-rev'},classifySafety,
    generate:async()=>{gen++;return {text:V34['D4-223'],finishReason:'STOP',runtime:{usage:{input:1,cached:0,output:1,thinking:1}}};}});
  const r=await service.create(S,input('d4-223','合成加密貨幣套利群組題'));
  assert.deepEqual([r.state,r.reused],['queued',false]);
  assert.equal(await store.routeOf(r.id),'SAFETY_MODEL');
  assert.equal(await store.safetySource(r.id),'classifier');
  await service.tick();
  const row=await store.get(S,r.id);
  assert.deepEqual([row.state,row.charge,row.error_code,row.runtime_json.route,gen],['completed',0,null,'SAFETY_MODEL',1]);
  assert.deepEqual(row.output_json.sections.map(s=>s.tag),['SR']);
  assert.equal((await pool.query('SELECT * FROM w1.reservations')).rows.length,0);
  assert.equal(JSON.stringify((await pool.query('SELECT quota,used,reserved FROM w1.test_grants')).rows),before);
  await d.close();
});
