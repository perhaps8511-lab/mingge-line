// GPT bounded safety correction ruling 2026-09-23: category-aware hotline gate, no fixed-template bypass,
// safety-only v34 model route (own lane, deadline) with adopted fallback, minimal observability. Fixtures are the pinned v34
// synthetic outputs (data/baseline-synthetic.json); local PGlite; no provider calls.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {checkConsistency} from '../src/w1/delivery.js';
import {detectSafety,safetyFallback,safetyDelivery,overseasSignal,othersSignal} from '../src/w1/safety.js';
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
function svc(store,{outputs,classify=null,thrower=null,hang=false,safetyDeadlineMs}={}) {
  const calls={n:0};
  const service=new W1Service({store,buildPrompt:async()=>({}),push:async()=>{},manifest:{source_revision:'synthetic-rev'},safetyDeadlineMs,
    classifySafety:classify,generate:async()=>{calls.n++;if(hang)return new Promise(()=>{});if(thrower)throw new Error(thrower);return {text:outputs.shift(),finishReason:'STOP',runtime:{usage:U}};}});
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
  // Overseas branch (所在地 or battery-accepted 當地) replaces Taiwan dialing only with a request-side overseas
  // sign; the model's own wording alone never exempts. Foreign numbers are refused, bracketed or bare.
  const abroad={overseas:true},noTw=V34['LN-31'].replaceAll('1925','');
  assert.equal(checkConsistency(noTw,'STOP',abroad).ok,true);
  assert.equal(checkConsistency(noTw.replaceAll('所在地','當地'),'STOP',abroad).ok,true);
  assert.deepEqual(gate(noTw).errors,['HOTLINE_MISSING']);
  assert.deepEqual(checkConsistency(noTw.replaceAll('所在地','那邊'),'STOP',abroad).errors,['HOTLINE_MISSING']);
  assert.ok(checkConsistency(V34['LN-31'].replace('所在地的緊急救援電話','所在地的緊急救援電話【911】'),'STOP',abroad).errors.includes('HOTLINE_NOT_ALLOWED'));
  assert.ok(gate(V34['JG-17'].replace('你的安全。','你的安全。在美國可撥 911。')).errors.includes('HOTLINE_NOT_ALLOWED'));
  // Victim-safety branch always lists 113, even when 1925 is also present.
  assert.deepEqual(gate(V34['LN-22'].replaceAll('113','1925')).errors,['HOTLINE_MISSING']);
  assert.ok(gate(V34['JG-17'].replace('category: self_harm','category: none')).errors.includes('CRISIS_CATEGORY_UNSUPPORTED'));
  assert.equal(gate(RED).ok,true);
  for(const [k,t] of Object.entries(V34))assert.equal(gate(t).ok,true,k);
});

test('Ruling B: no fixed-template bypass; every keyword hit is routed; context signals',()=>{
  for(const q of ['藥已經吞了，我不想活了','我人在加州，藥已經吞了','我真的撐不下去了,不想活了。','我想殺了我先生再自殺','照顧媽媽好累，不想活了'])
    assert.deepEqual(Object.keys(detectSafety(q)).sort(),['category','imminent','level','overseas'],q);
  assert.equal(detectSafety('我沒有想死，只是工作很累'),null);
  for(const q of ['我人在加州，藥已經吞了','我在Boston念書，好想死','我在倫敦留學'])assert.equal(overseasSignal(q),true,q);
  for(const q of ['我在LINE上跟家人道別了','我在Dcard發文，不想活了','我在IG看到','我在 PTT 說了'])assert.equal(overseasSignal(q),false,q);
  for(const q of ['想帶著阿嬤一起走','讓前夫也別醒來','跟男友一起消失'])assert.equal(othersSignal(q),true,q);
});

test('fallback renders the adopted v34 response with the adopted first line (overseas / imminent / mixed)',()=>{
  const lead=q=>safetyFallback(q,{imminent:/藥已經吞了/.test(q)}).split('[[SR]]\n')[1].split('\n')[0];
  assert.equal(lead('我在倫敦留學，好想死'),'請現在撥打你所在地的緊急救援電話。');
  assert.equal(lead('藥已經吞了'),'請現在就撥【119】或【110】,讓人馬上到你身邊。');
  assert.equal(lead('我想殺了我先生再自殺'),'如果危險正在發生,請現在就撥【110】;有人受傷或需要救護,撥【119】。');
  assert.ok(lead('不想活了').startsWith('「謝謝你願意說出來'));
  for(const q of ['我在倫敦留學，好想死','藥已經吞了','我想殺了我先生再自殺','不想活了','照顧媽媽好累，不想活了'])
    assert.equal(safetyDelivery(safetyFallback(q),'SAFETY_FALLBACK').delivery.charge,0);
  // v34 caregiver add-on: only with a carer context, placed after 「同樣可以陪你。」, verbatim numbers.
  const care=safetyFallback('照顧媽媽好累，不想活了');
  assert.ok(care.indexOf('同樣可以陪你。')<care.indexOf('照顧的重量不該一個人扛。'));
  assert.match(care,/長照專線【1966】、家庭照顧者關懷專線【0800-507-272】/);
  assert.equal(safetyFallback('不想活了').includes('1966'),false);
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
  // Imminent keyword self-harm is routed as well (no template bypass); no reservation, no charge.
  const c=await service.create(S,input('r-imm','藥已經吞了，我不想活了'));
  assert.deepEqual([c.state,c.reused],['queued',false]);
  outputs.push(V34['JG-17'].replace('[[SR]]\n','[[SR]]\n請現在就撥【119】或【110】,讓人馬上到你身邊。\n'));await service.tick();
  row=await store.get(S,c.id);assert.deepEqual([row.state,row.charge,row.error_code,row.runtime_json.route],['completed',0,null,'SAFETY_MODEL']);
  assert.equal((await pool.query('SELECT * FROM w1.reservations')).rows.length,0);
  assert.equal(await grantsOf(pool),before);
  assert.equal((await service.create(S,input('r31','我人在美國，這幾天真的不想活了。'))).reused,true);assert.equal(calls.n,3);
  await d.close();
});

test('rejected model outputs (non-SR, non-crisis, commerce) end in the adopted fallback with evidence, never empty',async()=>{
  for(const [bad,code,q] of [[FULL,'SAFETY_ROUTE_NOT_SR','合成私人危機文字_MARKER'],[RED,'SAFETY_ROUTE_NOT_CRISIS','合成私人危機文字_MARKER，不想活了'],[V34['JG-17'].replace('你的安全','你的安全，請購買方案'),'SAFETY_ROUTE_COMMERCE','合成私人危機文字_MARKER']]){
    const {d,pool,store}=await db();
    await store.grant(S,{quota:3,expiresAt:new Date(Date.now()+3600000).toISOString(),enrollmentId:'r2'});
    const {service}=svc(store,{outputs:[bad,bad],classify:async()=>({level:'crisis',category:'self_harm',imminent:false})});
    const r=await service.create(S,input('bad',q));await service.tick();
    const row=await store.get(S,r.id);
    assert.deepEqual([row.state,row.charge,row.push_state,row.error_code],['completed',0,'sent','GENERATION_FAILED'],code);
    assert.equal(row.runtime_json.route,'SAFETY_FALLBACK');assert.equal(row.runtime_json.fallback_cause,'GENERATION_FAILED');
    assert.match(row.output_json.sections[0].text,/1925/);
    const audits=(await pool.query('SELECT code,reason FROM w1.audit_events WHERE record_id=$1 ORDER BY created_at',[r.id])).rows;
    const failed=audits.filter(x=>x.code==='CONSISTENCY_FAILED').map(x=>JSON.parse(x.reason));
    assert.equal(failed.length,2);
    for(const f of failed){assert.ok(f.consistency_error_codes.includes(code),code);assert.deepEqual([f.route,f.runtime_revision,f.finish_reason],['SAFETY_MODEL','synthetic-rev','STOP']);}
    const fb=audits.filter(x=>x.code==='SAFETY_MODEL_FALLBACK').map(x=>JSON.parse(x.reason));
    assert.deepEqual(fb,[{route:'SAFETY_FALLBACK',error_code:'GENERATION_FAILED',runtime_revision:'synthetic-rev'}]);
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
    assert.deepEqual([row.state,row.charge,row.error_code],['completed',0,thrower==='COST_REVIEW_STOP_REACHED'?thrower:'GENERATION_FAILED']);
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
  await pool.query("UPDATE w1.gua_records SET started_at=now()-interval '121 seconds' WHERE id=$1",[crisis.id]);
  await store.detectExpiredClaims();
  assert.equal((await store.get(S,crisis.id)).state,'generating');          // left for the service fallback
  await service.tick();
  const row=await store.get(S,crisis.id);
  assert.deepEqual([row.state,row.charge,row.error_code,row.runtime_json.fallback_cause],['completed',0,'GENERATION_UNRESOLVED','GENERATION_UNRESOLVED']);
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

test('lanes: the safety lane claims only safety jobs, the ordinary lane never does',async()=>{
  const {d,store}=await db();
  await store.grant(S,{quota:3,expiresAt:new Date(Date.now()+3600000).toISOString(),enrollmentId:'r7'});
  const {service}=svc(store,{outputs:[]});
  const normal=await service.create(S,input('lane-n','合成一般題'));
  const crisis=await service.create(S,input('lane-c','好想死'));
  assert.equal((await store.claim({lane:'ordinary'})).id,normal.id);
  assert.equal(await store.claim({lane:'ordinary'}),null);
  assert.equal((await store.claim({lane:'safety'})).id,crisis.id);
  assert.equal(await store.claim({lane:'safety'}),null);
  await assert.rejects(store.claim({lane:'other'}),/CLAIM_LANE_INVALID/);
  await d.close();
});

test('deadline: a hung safety generation ends in the fallback, and no second attempt starts',async()=>{
  const {d,pool,store}=await db();
  await store.grant(S,{quota:3,expiresAt:new Date(Date.now()+3600000).toISOString(),enrollmentId:'r8'});
  const {service,calls}=svc(store,{hang:true,safetyDeadlineMs:50});
  const r=await service.create(S,input('dl','好想死'));
  await service.tickSafety();
  const row=await store.get(S,r.id);
  assert.deepEqual([row.state,row.charge,row.error_code,row.runtime_json.route],['completed',0,'SAFETY_DEADLINE','SAFETY_FALLBACK']);
  assert.equal(calls.n,1);
  assert.equal((await pool.query('SELECT * FROM w1.reservations')).rows.length,0);
  await d.close();
});

test('queued safety job never claimed (lane stalled) gets the fallback from the sweep; claim cannot take it after',async()=>{
  const {d,pool,store}=await db();
  await store.grant(S,{quota:3,expiresAt:new Date(Date.now()+3600000).toISOString(),enrollmentId:'r9'});
  const {service,calls}=svc(store,{outputs:[]});
  const r=await service.create(S,input('q-exp','好想死'));
  assert.equal(await service.sweepSafety(),0);
  await pool.query("UPDATE w1.gua_records SET created_at=now()-interval '121 seconds' WHERE id=$1",[r.id]);
  // classifier-cache read failure must not stop the fallback (it is optional input)
  store.classifierDetection=async()=>{throw new Error('DB_DOWN');};
  assert.equal(await service.sweepSafety(),1);
  const row=await store.get(S,r.id);
  assert.deepEqual([row.state,row.charge,row.error_code,row.push_state],['completed',0,'GENERATION_UNRESOLVED','sent']);
  assert.equal(await store.claim({lane:'safety'}),null);assert.equal(calls.n,0);
  await d.close();
});

test('create-stage: crisis with no runtime or a failing prompt build gets the fallback now; non-crisis still refused',async()=>{
  const {d,pool,store}=await db();
  await store.grant(S,{quota:3,expiresAt:new Date(Date.now()+3600000).toISOString(),enrollmentId:'r10'});
  const none=new W1Service({store,buildPrompt:async()=>({}),push:async()=>{},manifest:{source_revision:'synthetic-rev'}});
  const a=await none.create(S,input('cs-1','藥已經吞了，我不想活了'));
  assert.deepEqual([a.state,a.letter.charge,a.letter.sections.map(s=>s.tag)],['completed',0,['SR']]);
  assert.ok(a.letter.sections[0].text.startsWith('請現在就撥【119】或【110】'));
  let row=await store.get(S,a.id);assert.deepEqual([row.error_code,row.runtime_json.route,row.runtime_json.fallback_cause],['RUNTIME_BINDING_UNVERIFIED','SAFETY_FALLBACK','RUNTIME_BINDING_UNVERIFIED']);
  await assert.rejects(none.create(S,input('cs-n','合成一般題')),/RUNTIME_BINDING_UNVERIFIED/);
  const broken=new W1Service({store,buildPrompt:async()=>{throw new Error('LOOKUP');},push:async()=>{},generate:async()=>{throw new Error('MUST_NOT_CALL');}});
  const b=await broken.create(S,input('cs-2','好想死'));
  row=await store.get(S,b.id);assert.deepEqual([row.state,row.error_code],['completed','PROMPT_BUILD_FAILED']);
  assert.equal((await pool.query('SELECT * FROM w1.jobs')).rows.length,0);
  assert.equal((await pool.query('SELECT * FROM w1.reservations')).rows.length,0);
  assert.equal((await pool.query("SELECT code FROM w1.audit_events WHERE code='SAFETY_MODEL_FALLBACK'")).rows.length,2);
  await d.close();
});

test('classifier-only positive: v34 may judge it non-crisis with full context, and that SR is delivered',async()=>{
  const {d,store}=await db();
  await store.grant(S,{quota:3,expiresAt:new Date(Date.now()+3600000).toISOString(),enrollmentId:'r11'});
  const {service}=svc(store,{outputs:[RED],classify:async()=>({level:'crisis',category:'self_harm',imminent:false})});
  const r=await service.create(S,input('fp','合成分類器誤判題'));await service.tick();
  const row=await store.get(S,r.id);
  assert.deepEqual([row.state,row.charge,row.error_code,row.runtime_json.route],['completed',0,null,'SAFETY_MODEL']);
  assert.equal(row.raw_output,RED);
  await d.close();
});
