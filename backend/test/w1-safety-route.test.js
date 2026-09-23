// GPT bounded safety correction ruling 2026-09-23: category-aware hotline gate, narrow SAFETY_BYPASS,
// safety-only v34 model route, minimal observability. Fixtures are the pinned v34 synthetic outputs
// (data/baseline-synthetic.json); local PGlite; no provider calls.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {checkConsistency,classifyDelivery} from '../src/w1/delivery.js';
import {detectSafety} from '../src/w1/safety.js';
import {W1Store} from '../src/w1/store.js';
import {W1Service} from '../src/w1/service.js';
import {migrateW1} from '../src/w1/schema.js';

const engine=process.env.W1_PGLITE_MODULE??import.meta.resolve('@electric-sql/pglite');
const V34=Object.fromEntries(JSON.parse(readFileSync(new URL('../data/baseline-synthetic.json',import.meta.url))).rows.map(r=>[r.case_key,r.text]));
const gate=t=>checkConsistency(t,'STOP');
const S=`U${'5'.repeat(32)}`;
const input=(id,q)=>({request_id:id,ben_gua:'乾為天',bian_gua:'天風姤',dong_yao:1,qigua_time:'2026-09-21T12:00:00+08:00',question_text:q});
const FULL=V34['LD-11'];   // a consistent full six-section letter (charge 1)
async function db(){
  const {PGlite}=await import(engine);const d=new PGlite();
  const query=async(sql,args)=>{const r=args===undefined?(await d.exec(sql)).at(-1):await d.query(sql,args);return {...r,rowCount:r.affectedRows??r.rows.length};};
  const pool={query,connect:async()=>({query,release(){}})};await migrateW1(pool);return {d,pool,store:new W1Store(pool)};
}

test('Ruling A: hotline gate is category-aware; no universal 1925; allowlist kept',()=>{
  // Violence safety (victim): 110 + 113, no 1925 — passes; the frozen battery forbids 1925 here.
  assert.equal(gate(V34['LN-22']).ok,true);assert.equal(V34['LN-22'].includes('1925'),false);
  assert.deepEqual(gate(V34['LN-22'].replaceAll('110','')).errors,['HOTLINE_MISSING']);
  assert.deepEqual(gate(V34['LN-22'].replaceAll('113','')).errors,['HOTLINE_MISSING']);
  // Urgent harm to others: 110 only (no 113 in the adopted branch).
  assert.equal(gate(V34['LN-28']).ok,true);assert.equal(gate(V34['LN-28'].replaceAll('113','')).ok,true);
  assert.deepEqual(gate(V34['LN-28'].replaceAll('110','')).errors,['HOTLINE_MISSING']);
  // Self-harm still requires 1925 (Taiwan).
  assert.equal(gate(V34['JG-17']).ok,true);
  assert.deepEqual(gate(V34['JG-17'].replaceAll('1925','')).errors,['HOTLINE_MISSING']);
  // Overseas branch replaces Taiwan dialing: 1925 not required; foreign numbers still refused.
  assert.equal(gate(V34['LN-31'].replaceAll('1925','')).ok,true);
  assert.ok(gate(V34['LN-31'].replace('所在地的緊急救援電話','所在地的緊急救援電話【911】')).errors.includes('HOTLINE_NOT_ALLOWED'));
  // Crisis with no adopted branch category fails closed; non-crisis violence (red harm intent) has no hotline rule.
  assert.ok(gate(V34['JG-17'].replace('category: self_harm','category: none')).errors.includes('CRISIS_CATEGORY_UNSUPPORTED'));
  assert.equal(gate(V34['D4-226']).ok,true);
  // Every crisis/self-harm fixture in the pinned 125 now passes.
  for(const [k,t] of Object.entries(V34))assert.equal(gate(t).ok,true,k);
});

test('Ruling B/C/D: keyword bypass only for clear self-harm; mixed and overseas are not clear',()=>{
  assert.deepEqual(detectSafety('我真的撐不下去了,不想活了。'),{level:'crisis',category:'self_harm',imminent:false,clear:true});
  assert.equal(detectSafety('我人在美國，這幾天真的不想活了。').clear,false);
  assert.equal(detectSafety('我想帶著孩子一起走，不想活了').clear,false);
  assert.equal(detectSafety('想讓他今晚別醒來，我也想死').clear,false);
  assert.equal(detectSafety('我沒有想死，只是工作很累'),null);
});

test('safety model route: classifier or unclear keyword -> queued, no reservation, [[SR]] only, charge 0, zero quota ok',async()=>{
  const {d,pool,store}=await db();
  await store.grant(S,{quota:1,expiresAt:new Date(Date.now()+3600000).toISOString(),enrollmentId:'route-1'});
  await pool.query('UPDATE w1.test_grants SET used=1');                                    // zero quota
  const grants=async()=>JSON.stringify((await pool.query('SELECT quota,used,reserved FROM w1.test_grants')).rows);
  const before=await grants();
  const script={};let calls=0;
  const service=new W1Service({store,buildPrompt:async()=>({}),push:async()=>{},manifest:{source_revision:'synthetic-rev'},
    generate:async({recordId})=>{calls++;return {text:script[recordId].shift(),finishReason:'STOP',runtime:{usage:{input:10,cached:0,output:5,thinking:5}}};}});
  // Unclear keyword (overseas) -> model route; fixture is the adopted v34 overseas output.
  const q31='我人在美國，這幾天真的不想活了。';
  const a=await service.create(S,input('r31',q31));
  assert.deepEqual([a.state,a.reused],['queued',false]);assert.equal(calls,0);
  script[a.id]=[V34['LN-31']];await service.tick();
  let row=await store.get(S,a.id);
  assert.deepEqual([row.state,row.charge,row.push_state],['completed',0,'sent']);   // settled then pushed in the same tick
  assert.deepEqual(row.output_json.sections.map(s=>s.tag),['SR']);assert.ok(row.raw_output.includes('所在地'));
  // Classifier-only positive (mixed crisis) -> model route; v34 mixed-crisis output delivered, not the template.
  service.classifySafety=async()=>({level:'crisis',category:'self_harm',imminent:false});
  const b=await service.create(S,input('r20','合成混合危機題'));
  script[b.id]=[V34['LN-20']];await service.tick();
  row=await store.get(S,b.id);
  assert.deepEqual([row.state,row.charge],['completed',0]);
  const t=row.raw_output;assert.ok(t.indexOf('110')<t.indexOf('1925'),'rescue first');
  // Markers, no entitlement movement, no reservation, idempotent reuse.
  const marks=(await pool.query("SELECT reason FROM w1.audit_events WHERE code='SAFETY_MODEL_QUEUED' ORDER BY created_at")).rows.map(r=>JSON.parse(r.reason).source);
  assert.deepEqual(marks,['keyword','classifier']);
  assert.equal((await pool.query('SELECT * FROM w1.reservations')).rows.length,0);
  assert.equal(await grants(),before);
  assert.equal((await service.create(S,input('r31',q31))).reused,true);assert.equal(calls,2);
  await d.close();
});

test('safety model route rejects non-SR output and records evidence without private text',async()=>{
  const {d,pool,store}=await db();
  await store.grant(S,{quota:3,expiresAt:new Date(Date.now()+3600000).toISOString(),enrollmentId:'route-2'});
  const service=new W1Service({store,buildPrompt:async()=>({}),push:async()=>{},manifest:{source_revision:'synthetic-rev'},
    generate:async()=>({text:FULL,finishReason:'STOP',runtime:{usage:{input:59000,cached:53000,output:600,thinking:900}}}),
    classifySafety:async()=>({level:'crisis',category:'self_harm',imminent:false})});
  const q='合成私人危機文字_MARKER';
  const r=await service.create(S,input('bad',q));await service.tick();
  const row=await store.get(S,r.id);
  assert.deepEqual([row.state,row.charge,row.push_state,row.output_json,row.raw_output,row.error_code],['failed',0,'not_ready',null,null,'GENERATION_FAILED']);
  const reasons=(await pool.query("SELECT code,reason FROM w1.audit_events WHERE record_id=$1 ORDER BY created_at",[r.id])).rows;
  const failed=reasons.filter(x=>x.code==='CONSISTENCY_FAILED').map(x=>JSON.parse(x.reason));
  assert.equal(failed.length,2);
  for(const f of failed){
    assert.deepEqual(f.consistency_error_codes,['SAFETY_ROUTE_NOT_SR']);
    assert.deepEqual([f.route,f.runtime_revision,f.finish_reason],['SAFETY_MODEL','synthetic-rev','STOP']);
    assert.deepEqual(f.usage,{prompt:59000,cached:53000,candidates:600,thoughts:900});
  }
  assert.ok(reasons.some(x=>x.code==='SAFETY_MODEL_FAILED'));
  assert.deepEqual(row.runtime_json.consistency_error_codes,['SAFETY_ROUTE_NOT_SR']);
  const all=JSON.stringify([reasons,row.runtime_json]);
  assert.equal(all.includes('MARKER'),false);assert.equal(all.includes(FULL.slice(40,80)),false);assert.equal(all.includes(S),false);
  assert.equal((await pool.query('SELECT used,reserved FROM w1.test_grants')).rows[0].used,0);
  await d.close();
});

test('normal route failure evidence names HOTLINE_MISSING directly',async()=>{
  const {d,pool,store}=await db();
  await store.grant(S,{quota:3,expiresAt:new Date(Date.now()+3600000).toISOString(),enrollmentId:'route-3'});
  const broken=V34['LN-22'].replaceAll('110','');                                 // violence crisis missing 110
  const service=new W1Service({store,buildPrompt:async()=>({}),push:async()=>{},manifest:{source_revision:'synthetic-rev'},
    generate:async()=>({text:broken,finishReason:'STOP',runtime:{usage:{input:1,cached:0,output:1}}})});
  const r=await service.create(S,input('n1','合成一般題'));await service.tick();
  const row=await store.get(S,r.id);
  assert.deepEqual([row.state,row.charge],['failed',0]);
  assert.deepEqual(row.runtime_json.consistency_error_codes,['HOTLINE_MISSING']);
  assert.deepEqual(row.runtime_json.usage,{prompt:1,cached:0,candidates:1,thoughts:null});   // missing thinking stays null
  assert.equal(row.runtime_json.route,'GENERATED');
  assert.equal((await pool.query('SELECT state FROM w1.reservations')).rows[0].state,'released');
  await d.close();
});

test('expired safety-route generation becomes generation_unknown; inconsistent route markers fail closed',async()=>{
  const {d,pool,store}=await db();
  await store.grant(S,{quota:3,expiresAt:new Date(Date.now()+3600000).toISOString(),enrollmentId:'route-4'});
  const service=new W1Service({store,buildPrompt:async()=>({}),push:async()=>{},classifySafety:async()=>({level:'crisis',category:'self_harm',imminent:false}),
    generate:async()=>{throw new Error('must not be called');}});
  const s=await service.create(S,input('exp','合成'));const claimed=await store.claim();assert.equal(claimed.id,s.id);
  await pool.query("UPDATE w1.gua_records SET started_at=now()-interval '721 seconds' WHERE id=$1",[s.id]);
  await store.detectExpiredClaims();
  const row=await store.get(S,s.id);assert.deepEqual([row.state,row.charge,row.error_code],['generation_unknown',0,'GENERATION_UNRESOLVED']);
  // A normal (reserved) record that also carries a safety marker is UNKNOWN: never generated, released.
  service.classifySafety=null;
  const n=await service.create(S,input('both','合成一般題'));
  await pool.query("INSERT INTO w1.audit_events(id,record_id,code,reason) VALUES(gen_random_uuid(),$1,'SAFETY_MODEL_QUEUED','{}')",[n.id]);
  assert.equal(await store.routeOf(n.id),'UNKNOWN');
  await service.tick();
  const nr=await store.get(S,n.id);assert.deepEqual([nr.state,nr.error_code,nr.charge],['failed','ROUTE_UNKNOWN',0]);
  assert.equal((await pool.query('SELECT reserved FROM w1.test_grants')).rows[0].reserved,0);
  await d.close();
});
