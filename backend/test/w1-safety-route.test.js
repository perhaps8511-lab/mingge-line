// GPT bounded safety correction ruling 2026-09-23: category-aware hotline gate, narrow SAFETY_BYPASS,
// safety-only v34 model route with adopted fallback, minimal observability. Fixtures are the pinned v34
// synthetic outputs (data/baseline-synthetic.json); local PGlite; no provider calls.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {checkConsistency} from '../src/w1/delivery.js';
import {detectSafety,safetyFallback,safetyDelivery} from '../src/w1/safety.js';
import {W1Store} from '../src/w1/store.js';
import {W1Service} from '../src/w1/service.js';
import {migrateW1} from '../src/w1/schema.js';

const engine=process.env.W1_PGLITE_MODULE??import.meta.resolve('@electric-sql/pglite');
const V34=Object.fromEntries(JSON.parse(readFileSync(new URL('../data/baseline-synthetic.json',import.meta.url))).rows.map(r=>[r.case_key,r.text]));
const gate=t=>checkConsistency(t,'STOP');
const S=`U${'5'.repeat(32)}`;
const input=(id,q)=>({request_id:id,ben_gua:'乾為天',bian_gua:'天風姤',dong_yao:1,qigua_time:'2026-09-21T12:00:00+08:00',question_text:q});
const FULL=V34['LD-11'];   // a consistent full six-section letter (charge 1)
const RED=V34['D4-226'];   // consistent non-crisis red SR (harm intent), no hotline
const U={input:10,cached:0,output:5,thinking:5};
async function db(){
  const {PGlite}=await import(engine);const d=new PGlite();
  const query=async(sql,args)=>{const r=args===undefined?(await d.exec(sql)).at(-1):await d.query(sql,args);return {...r,rowCount:r.affectedRows??r.rows.length};};
  const pool={query,connect:async()=>({query,release(){}})};await migrateW1(pool);return {d,pool,store:new W1Store(pool)};
}
function svc(store,{outputs,classify=null,thrower=null}={}) {
  const calls={n:0};
  const service=new W1Service({store,buildPrompt:async()=>({}),push:async()=>{},manifest:{source_revision:'synthetic-rev'},
    classifySafety:classify,generate:async()=>{calls.n++;if(thrower)throw new Error(thrower);return {text:outputs.shift(),finishReason:'STOP',runtime:{usage:U}};}});
  return {service,calls};
}
const grantsOf=async pool=>JSON.stringify((await pool.query('SELECT quota,used,reserved FROM w1.test_grants')).rows);

test('Ruling A: category-aware hotline gate; no universal 1925; allowlist kept',()=>{
  assert.equal(gate(V34['LN-22']).ok,true);assert.equal(V34['LN-22'].includes('1925'),false);
  assert.deepEqual(gate(V34['LN-22'].replaceAll('110','')).errors,['HOTLINE_MISSING']);
  assert.deepEqual(gate(V34['LN-22'].replaceAll('113','')).errors,['HOTLINE_MISSING']);
  assert.equal(gate(V34['LN-28']).ok,true);assert.equal(gate(V34['LN-28'].replaceAll('113','')).ok,true);
  assert.deepEqual(gate(V34['LN-28'].replaceAll('110','')).errors,['HOTLINE_MISSING']);
  // Mixed crisis labelled violence (battery LN-20 allows {self_harm,violence}): 110 + 1925, no 113 needed.
  assert.equal(gate(V34['LN-20'].replace('category: self_harm','category: violence')).ok,true);
  assert.equal(gate(V34['JG-17']).ok,true);
  assert.deepEqual(gate(V34['JG-17'].replaceAll('1925','')).errors,['HOTLINE_MISSING']);
  // Overseas branch (所在地 or battery-accepted 當地) replaces Taiwan dialing; foreign numbers still refused.
  assert.equal(gate(V34['LN-31'].replaceAll('1925','')).ok,true);
  assert.equal(gate(V34['LN-31'].replaceAll('1925','').replaceAll('所在地','當地')).ok,true);
  assert.ok(gate(V34['LN-31'].replace('所在地的緊急救援電話','所在地的緊急救援電話【911】')).errors.includes('HOTLINE_NOT_ALLOWED'));
  assert.ok(gate(V34['JG-17'].replace('category: self_harm','category: none')).errors.includes('CRISIS_CATEGORY_UNSUPPORTED'));
  assert.equal(gate(RED).ok,true);
  for(const [k,t] of Object.entries(V34))assert.equal(gate(t).ok,true,k);
});

test('Ruling B: fixed template only for imminent keyword self-harm without overseas signs',()=>{
  assert.equal(detectSafety('藥已經吞了，我不想活了').clear,true);
  assert.equal(detectSafety('我人在美國，藥已經吞了').clear,false);
  for(const q of ['我真的撐不下去了,不想活了。','我在倫敦留學，好想死','我想殺了我先生再自殺','照顧媽媽好累，不想活了','我想把孩子也帶走，然後自殺'])
    assert.equal(detectSafety(q).clear,false,q);
  assert.equal(detectSafety('我沒有想死，只是工作很累'),null);
});

test('fallback renders the adopted v34 response with the adopted first line (overseas / imminent / mixed)',()=>{
  const lead=q=>safetyFallback(q,{imminent:/藥已經吞了/.test(q)}).split('[[SR]]\n')[1].split('\n')[0];
  assert.equal(lead('我在倫敦留學，好想死'),'請現在撥打你所在地的緊急救援電話。');
  assert.equal(lead('藥已經吞了'),'請現在就撥【119】或【110】,讓人馬上到你身邊。');
  assert.equal(lead('我想殺了我先生再自殺'),'如果危險正在發生,請現在就撥【110】;有人受傷或需要救護,撥【119】。');
  assert.ok(lead('不想活了').startsWith('「謝謝你願意說出來'));
  for(const q of ['我在倫敦留學，好想死','藥已經吞了','我想殺了我先生再自殺','不想活了'])
    assert.equal(safetyDelivery(safetyFallback(q),'SAFETY_FALLBACK').delivery.charge,0);
});

test('safety model route: unclear keyword / classifier -> queued, no reservation, v34 SR delivered, charge 0 at zero quota',async()=>{
  const {d,pool,store}=await db();
  await store.grant(S,{quota:1,expiresAt:new Date(Date.now()+3600000).toISOString(),enrollmentId:'r1'});
  await pool.query('UPDATE w1.test_grants SET used=1');
  const before=await grantsOf(pool);
  const outputs=[];const {service,calls}=svc(store,{outputs});
  const a=await service.create(S,input('r31','我人在美國，這幾天真的不想活了。'));
  assert.deepEqual([a.state,a.reused],['queued',false]);assert.equal(calls.n,0);
  outputs.push(V34['LN-31']);await service.tick();
  let row=await store.get(S,a.id);
  assert.deepEqual([row.state,row.charge,row.push_state],['completed',0,'sent']);
  assert.deepEqual(row.output_json.sections.map(s=>s.tag),['SR']);
  assert.deepEqual([row.runtime_json.route,row.runtime_json.runtime_revision],['SAFETY_MODEL','synthetic-rev']);
  service.classifySafety=async()=>({level:'crisis',category:'self_harm',imminent:false});
  const b=await service.create(S,input('r20','合成混合危機題'));
  outputs.push(V34['LN-20']);await service.tick();
  row=await store.get(S,b.id);assert.deepEqual([row.state,row.charge],['completed',0]);
  assert.ok(row.raw_output.indexOf('110')<row.raw_output.indexOf('1925'),'rescue first');
  const marks=(await pool.query("SELECT reason FROM w1.audit_events WHERE code='SAFETY_MODEL_QUEUED' ORDER BY created_at")).rows.map(r=>JSON.parse(r.reason).source);
  assert.deepEqual(marks,['keyword','classifier']);
  assert.equal((await pool.query('SELECT * FROM w1.reservations')).rows.length,0);
  assert.equal(await grantsOf(pool),before);
  assert.equal((await service.create(S,input('r31','我人在美國，這幾天真的不想活了。'))).reused,true);assert.equal(calls.n,2);
  await d.close();
});

test('rejected model outputs (non-SR, non-crisis, commerce) end in the adopted fallback with evidence, never empty',async()=>{
  for(const [bad,code] of [[FULL,'SAFETY_ROUTE_NOT_SR'],[RED,'SAFETY_ROUTE_NOT_CRISIS'],[V34['JG-17'].replace('你的安全','你的安全，請購買方案'),'SAFETY_ROUTE_COMMERCE']]){
    const {d,pool,store}=await db();
    await store.grant(S,{quota:3,expiresAt:new Date(Date.now()+3600000).toISOString(),enrollmentId:'r2'});
    const {service}=svc(store,{outputs:[bad,bad],classify:async()=>({level:'crisis',category:'self_harm',imminent:false})});
    const r=await service.create(S,input('bad','合成私人危機文字_MARKER'));await service.tick();
    const row=await store.get(S,r.id);
    assert.deepEqual([row.state,row.charge,row.push_state],['completed',0,'sent'],code);
    assert.equal(row.runtime_json.route,'SAFETY_FALLBACK');assert.equal(row.runtime_json.fallback_cause,'GENERATION_FAILED');
    assert.match(row.output_json.sections[0].text,/1925/);
    const audits=(await pool.query('SELECT code,reason FROM w1.audit_events WHERE record_id=$1 ORDER BY created_at',[r.id])).rows;
    const failed=audits.filter(x=>x.code==='CONSISTENCY_FAILED').map(x=>JSON.parse(x.reason));
    assert.equal(failed.length,2);
    for(const f of failed){assert.ok(f.consistency_error_codes.includes(code),code);assert.deepEqual([f.route,f.runtime_revision,f.finish_reason],['SAFETY_MODEL','synthetic-rev','STOP']);}
    assert.ok(audits.some(x=>x.code==='SAFETY_MODEL_FALLBACK'));
    const all=JSON.stringify([audits,row.runtime_json]);
    assert.equal(all.includes('MARKER'),false);assert.equal(all.includes(S),false);
    assert.equal((await pool.query('SELECT used FROM w1.test_grants')).rows[0].used,0);
    await d.close();
  }
});

test('provider error or budget stop on the safety route still delivers the fallback with the failure code recorded',async()=>{
  for(const thrower of ['PROVIDER_UNVERIFIED_NO_DELIVERY','COST_REVIEW_STOP_REACHED']){
    const {d,store}=await db();
    await store.grant(S,{quota:3,expiresAt:new Date(Date.now()+3600000).toISOString(),enrollmentId:'r3'});
    const {service}=svc(store,{thrower});
    const r=await service.create(S,input('p','我在倫敦留學，好想死'));await service.tick();
    const row=await store.get(S,r.id);
    assert.deepEqual([row.state,row.charge],['completed',0]);
    assert.equal(row.runtime_json.failure_code,thrower);
    assert.ok(row.output_json.sections[0].text.startsWith('請現在撥打你所在地的緊急救援電話'));
    await d.close();
  }
});

test('normal route failure evidence names HOTLINE_MISSING directly; missing thinking stays null',async()=>{
  const {d,pool,store}=await db();
  await store.grant(S,{quota:3,expiresAt:new Date(Date.now()+3600000).toISOString(),enrollmentId:'r4'});
  const broken=V34['LN-22'].replaceAll('110','');
  const service=new W1Service({store,buildPrompt:async()=>({}),push:async()=>{},manifest:{source_revision:'synthetic-rev'},
    generate:async()=>({text:broken,finishReason:'STOP',runtime:{usage:{input:1,cached:0,output:1}}})});
  const r=await service.create(S,input('n1','合成一般題'));await service.tick();
  const row=await store.get(S,r.id);
  assert.deepEqual([row.state,row.charge],['failed',0]);
  assert.deepEqual(row.runtime_json.consistency_error_codes,['HOTLINE_MISSING']);
  assert.deepEqual(row.runtime_json.usage,{prompt:1,cached:0,candidates:1,thoughts:null});
  assert.deepEqual([row.runtime_json.route,row.runtime_json.failure_code],['GENERATED','NO_DELIVERY']);
  assert.equal((await pool.query('SELECT state FROM w1.reservations')).rows[0].state,'released');
  await d.close();
});

test('crisis jobs are claimed first, get no generic slow notice, and expiry delivers the fallback',async()=>{
  const {d,pool,store}=await db();
  await store.grant(S,{quota:3,expiresAt:new Date(Date.now()+3600000).toISOString(),enrollmentId:'r5'});
  const {service}=svc(store,{outputs:[],thrower:'MUST_NOT_CALL'});
  const normal=await service.create(S,input('a-normal','合成一般題'));
  const crisis=await service.create(S,input('z-crisis','我在倫敦留學，好想死'));
  await pool.query("UPDATE w1.jobs SET record_id=record_id");
  const first=await store.claim();assert.equal(first.id,crisis.id);
  await pool.query("UPDATE w1.gua_records SET started_at=now()-interval '100 seconds' WHERE id=$1",[crisis.id]);
  assert.equal(await store.claimSlowNotice(),null);
  await pool.query("UPDATE w1.gua_records SET started_at=now()-interval '721 seconds' WHERE id=$1",[crisis.id]);
  await store.detectExpiredClaims();
  assert.equal((await store.get(S,crisis.id)).state,'generating');          // left for the service fallback
  await service.tick();
  const row=await store.get(S,crisis.id);
  assert.deepEqual([row.state,row.charge,row.runtime_json.fallback_cause],['completed',0,'GENERATION_UNRESOLVED']);
  assert.equal((await store.get(S,normal.id)).charge,0);
  await d.close();
});

test('inconsistent route markers always reach a terminal state and never move entitlement',async()=>{
  const {d,pool,store}=await db();
  await store.grant(S,{quota:3,expiresAt:new Date(Date.now()+3600000).toISOString(),enrollmentId:'r6'});
  const {service}=svc(store,{outputs:[],thrower:'MUST_NOT_CALL'});
  const n=await service.create(S,input('both','合成一般題'));
  await pool.query("INSERT INTO w1.audit_events(id,record_id,code,reason) VALUES(gen_random_uuid(),$1,'SAFETY_MODEL_QUEUED','{}')",[n.id]);
  assert.equal(await store.routeOf(n.id),'UNKNOWN');
  await service.tick();
  let row=await store.get(S,n.id);assert.deepEqual([row.state,row.error_code,row.charge],['failed','ROUTE_UNKNOWN',0]);
  assert.equal((await pool.query('SELECT reserved FROM w1.test_grants')).rows[0].reserved,0);
  // Marker + already-released reservation: neither settlement accepts it; failStuck terminates it.
  const m=await service.create(S,input('stuck','合成一般題'));
  await pool.query("INSERT INTO w1.audit_events(id,record_id,code,reason) VALUES(gen_random_uuid(),$1,'SAFETY_MODEL_QUEUED','{}')",[m.id]);
  await pool.query("UPDATE w1.reservations SET state='released' WHERE record_id=$1",[m.id]);
  await pool.query("UPDATE w1.test_grants SET reserved=reserved-1");
  const grants=await grantsOf(pool);
  await service.tick();
  row=await store.get(S,m.id);assert.deepEqual([row.state,row.error_code],['failed','ROUTE_UNKNOWN']);
  assert.equal(await grantsOf(pool),grants);
  await d.close();
});
