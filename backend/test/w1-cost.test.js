// Owner cost ruling 2026-09-23 + Codex review 63e4973: reserve -> complete-usage settlement ->
// release; one hard cap; persistent review stop; reserve-exceeded gate; fixed runner phases.
// Synthetic data, local PGlite, no provider calls.
import test from 'node:test';
import assert from 'node:assert/strict';
import {actualCost,PRICES} from '../src/w1/cost.js';
import {W1Store} from '../src/w1/store.js';
import {W1Service} from '../src/w1/service.js';
import {migrateW1} from '../src/w1/schema.js';
import {phasePlan,isNewWork,caseCost,projection,summarize,TARGETED_20,HARD_CAP_USD,BASELINE_CASE_USD,COST_STOP_CODES} from '../public/w1-qa-cost.js';

const engine=process.env.W1_PGLITE_MODULE??import.meta.resolve('@electric-sql/pglite');
const A=`U${'3'.repeat(32)}`;
const input=(id,q='合成成本題')=>({request_id:id,ben_gua:'乾為天',bian_gua:'天風姤',dong_yao:1,qigua_time:'2026-09-21T12:00:00+08:00',question_text:q});
const FULL={input:59013,cached:0,output:583,thinking:874};
async function db(){
  const {PGlite}=await import(engine);const d=new PGlite();
  const query=async(sql,args)=>{const r=args===undefined?(await d.exec(sql)).at(-1):await d.query(sql,args);return {...r,rowCount:r.affectedRows??r.rows.length};};
  const pool={query,connect:async()=>({query,release(){}})};await migrateW1(pool);return {d,pool,store:new W1Store(pool)};
}
const grant=(store,id)=>store.grant(A,{quota:9,expiresAt:new Date(Date.now()+3600000).toISOString(),enrollmentId:id});

test('P1: only complete usage settles; missing or null never becomes zero',()=>{
  assert.equal(actualCost('gemini-3.7-flash',FULL).usd,0.04972350);
  // Partial usage must not settle (would release the reserve at an understated cost).
  for(const partial of [{input:59013},{input:59013,output:583},{input:59013,thinking:874},{output:583,thinking:874},
    {input:59013,output:null,thinking:874},{input:59013,output:583,thinking:null},{input:null,output:583,thinking:874}])
    assert.equal(actualCost('gemini-3.7-flash',partial),null,JSON.stringify(partial));
  // Legitimate zeros settle.
  assert.equal(actualCost('gemini-3.7-flash',{input:10,output:0,thinking:0}).usd,0.0000075);
  // Absent/null cache count prices every prompt token at full rate: never lower than a cached reading.
  const noCache=actualCost('gemini-3.7-flash',{input:59013,output:583,thinking:874});
  assert.equal(noCache.usd,actualCost('gemini-3.7-flash',{...FULL,cached:null}).usd);
  assert.ok(noCache.usd>=actualCost('gemini-3.7-flash',{...FULL,cached:50000}).usd);
  for(const bad of [['other-model',FULL],['gemini-3.7-flash',{...FULL,cached:60000}],['gemini-3.7-flash',{...FULL,input:1.5}],['gemini-3.7-flash',null]])
    assert.equal(actualCost(...bad),null);
  assert.equal(actualCost('gemini-3.7-flash',FULL,Date.parse(PRICES['gemini-3.7-flash'].validThrough)+1),null);
});

test('settlement releases unused reserve; unsettled keeps it; settle is once-only',async()=>{
  const {d,store}=await db();await grant(store,'cost-1');
  const r=await store.create(A,input('c1'));
  const budget={campaign:'gen',budgetUsd:100,upperUsd:0.25,hardCapUsd:30,reviewStopUsd:20};
  await store.reserveProviderCall(r.id,0,budget);
  assert.equal(await store.settleProviderCall(r.id,0,actualCost('gemini-3.7-flash',FULL)),true);
  assert.equal(await store.settleProviderCall(r.id,0,actualCost('gemini-3.7-flash',FULL)),false);
  await store.reserveProviderCall(r.id,1,budget);
  assert.equal(await store.settleProviderCall(r.id,1,actualCost('gemini-3.7-flash',{input:59013})),false);
  const t=await store.costTotal();assert.equal(t.provider.open_reserve_usd,0.25);assert.equal(t.total_effective_usd,0.2997235);
  const rc=await store.recordCost(A,r.id);
  assert.equal(rc.generation_attempts[0].promptTokenCount,59013);assert.equal(rc.generation_attempts[1].settled,false);
  await d.close();
});

test('one hard cap spans provider and safety spend; settlement frees room',async()=>{
  const {d,store}=await db();await grant(store,'cost-2');
  const r1=await store.create(A,input('h1')),r2=await store.create(A,input('h2'));
  const gen={campaign:'gen',budgetUsd:100,upperUsd:0.25,hardCapUsd:0.30,reviewStopUsd:0.30};
  const safe={campaign:'safe',budgetUsd:100,upperUsd:0.02,hardCapUsd:0.30,reviewStopUsd:0.30};
  await store.reserveProviderCall(r1.id,0,gen);
  await store.reserveSafetyCall(A,safe,input('h1'));
  await assert.rejects(store.reserveProviderCall(r2.id,0,gen),/COST_HARD_CAP_REACHED/);
  await store.reserveSafetyCall(A,safe,input('h2'));
  await assert.rejects(store.reserveSafetyCall(A,safe,input('h3')),/COST_HARD_CAP_REACHED/);
  await store.settleProviderCall(r1.id,0,actualCost('gemini-3.7-flash',{input:1000,output:10,thinking:10}));
  await store.reserveProviderCall(r2.id,0,gen);
  for(const bad of [{...gen,hardCapUsd:undefined},{...gen,reviewStopUsd:undefined},{...gen,reviewStopUsd:0.31}])
    await assert.rejects(store.reserveProviderCall(r2.id,1,bad),/PROVIDER_BUDGET_REQUIRED/);
  await assert.rejects(store.reserveSafetyCall(A,{...safe,reviewStopUsd:0},input('h4')),/SAFETY_BUDGET_REQUIRED/);
  await d.close();
});

test('US$20-style review stop is persistent in the owning store and survives a new session',async()=>{
  const {d,pool,store}=await db();await grant(store,'cost-3');
  const r1=await store.create(A,input('s1')),r2=await store.create(A,input('s2'));
  const gen={campaign:'gen',budgetUsd:100,upperUsd:0.25,hardCapUsd:30,reviewStopUsd:0.25};
  await store.reserveProviderCall(r1.id,0,gen);                   // effective 0.25 = review stop
  await assert.rejects(store.reserveProviderCall(r2.id,0,gen),/COST_REVIEW_STOP_REACHED/);
  // A fresh store (reloaded page / restarted process) reads the same ledger and stays stopped.
  await assert.rejects(new W1Store(pool).reserveSafetyCall(A,{campaign:'safe',budgetUsd:100,upperUsd:0.02,hardCapUsd:30,reviewStopUsd:0.25},input('s2')),/COST_REVIEW_STOP_REACHED/);
  await d.close();
});

test('actual above reserve is kept as-is, alerts, and blocks further paid work',async()=>{
  const {d,pool,store}=await db();await grant(store,'cost-4');
  const r1=await store.create(A,input('o1')),r2=await store.create(A,input('o2'));
  const safe={campaign:'safe',budgetUsd:100,upperUsd:0.02,hardCapUsd:30,reviewStopUsd:20};
  const claim=await store.reserveSafetyCall(A,safe,input('o1'));
  const big=actualCost('gemini-3.7-flash',{input:40000,output:0,thinking:0});  // 0.03 > 0.02 reserve
  assert.equal(await store.settleSafetyCall(claim.id,big),true);
  assert.equal((await store.recordCost(A,r1.id)).safety_classification.actual_usd,0.03);
  assert.equal((await pool.query("SELECT count(*)::int AS n FROM w1.audit_events WHERE code='COST_EXCEEDED_RESERVE'")).rows[0].n,1);
  await assert.rejects(store.reserveProviderCall(r2.id,0,{campaign:'gen',budgetUsd:100,upperUsd:0.25,hardCapUsd:30,reviewStopUsd:20}),/COST_RESERVE_EXCEEDED/);
  await d.close();
});

test('P2: created/reused flag is explicit for new generation, new crisis route, reuse and existing queued',async()=>{
  const {d,store}=await db();await grant(store,'cost-5');
  const service=new W1Service({store,buildPrompt:async()=>({}),push:async()=>{},generate:async()=>{throw new Error('not in this test');}});
  const gen=await service.create(A,input('p1'));
  assert.deepEqual([gen.state,gen.reused],['queued',false]);
  // Existing queued record repeated: reused, even though its state is still queued.
  const again=await service.create(A,input('p1'));
  assert.deepEqual([again.id,again.state,again.reused],[gen.id,'queued',true]);
  // New crisis (imminent keyword): safety model route, queued, new work (no template bypass).
  const crisis=await service.create(A,input('p2','藥已經吞了，我不想活了'));
  assert.deepEqual([crisis.state,crisis.reused],['queued',false]);
  assert.equal((await service.create(A,input('p2','藥已經吞了，我不想活了'))).reused,true);
  // Non-imminent crisis takes the safety model route: queued, new work, no reservation.
  const routed=await service.create(A,input('p3','我不想活了'));
  assert.deepEqual([routed.state,routed.reused],['queued',false]);assert.equal(isNewWork(routed),true);
  assert.equal(isNewWork(gen),true);assert.equal(isNewWork(crisis),true);assert.equal(isNewWork(again),false);
  assert.throws(()=>isNewWork({state:'queued'}),/CREATE_FLAG_MISSING/);
  await d.close();
});

test('a budget stop during generation keeps its code instead of GENERATION_FAILED',async()=>{
  const {d,store}=await db();await grant(store,'cost-6');
  const budget={campaign:'gen',budgetUsd:100,upperUsd:0.25,hardCapUsd:0.10,reviewStopUsd:0.10};
  const service=new W1Service({store,buildPrompt:async()=>({}),push:async()=>{},
    generate:async args=>{await store.reserveProviderCall(args.recordId,args.attempt,budget);throw new Error('must not reach provider');}});
  const r=await service.create(A,input('stop'));await service.tick();
  const row=await store.get(A,r.id);
  assert.deepEqual([row.state,row.error_code,row.charge],['failed','COST_HARD_CAP_REACHED',0]);
  assert.ok(COST_STOP_CODES.includes(row.error_code));
  await d.close();
});

test('runner phases are fixed lists; review stop at US$20 with cases left; projection above US$30 stops',()=>{
  const cases=[...Array.from({length:105},(_,i)=>({case_key:`X-${i}`})),...TARGETED_20.map(k=>({case_key:k}))];
  const t=phasePlan(cases,'targeted'),r=phasePlan(cases,'remaining');
  assert.deepEqual(t.cases.map(c=>c.case_key),[...TARGETED_20]);assert.equal(r.cases.length,105);
  assert.equal(r.cases.some(c=>TARGETED_20.includes(c.case_key)),false);
  assert.deepEqual([t.remainingAfter(0),t.remainingAfter(19),r.remainingAfter(0),r.remainingAfter(104)],[124,105,104,0]);
  assert.throws(()=>phasePlan(cases,'all'),/PHASE_INVALID/);
  assert.throws(()=>phasePlan(cases.slice(0,110),'targeted'),/TARGETED_CASE_MISSING/);
  assert.equal(projection({totalEffectiveUsd:0.3,newCaseCosts:[],remainingCases:125}).avg_case_usd,BASELINE_CASE_USD);
  assert.equal(projection({totalEffectiveUsd:5,newCaseCosts:[0.3],remainingCases:100}).stop,true);
  assert.equal(projection({totalEffectiveUsd:HARD_CAP_USD-0.2,newCaseCosts:[0.05],remainingCases:1}).stop,false);
  assert.equal(projection({totalEffectiveUsd:19.9,newCaseCosts:[0.05],remainingCases:3}).review_stop,true);
  assert.equal(projection({totalEffectiveUsd:19.8,newCaseCosts:[0.05],remainingCases:3}).review_stop,false);
  assert.equal(projection({totalEffectiveUsd:25,newCaseCosts:[0.05],remainingCases:0}).review_stop,false);
  assert.deepEqual(caseCost({generation_attempts:[{reserved_usd:0.25,actual_usd:null,settled:false}],safety_classification:{reserved_usd:0.02,actual_usd:0.004,settled:true}}),{usd:0.254,unsettled:1,attempts:1});
  const s=summarize([{cost:{generation_attempts:[{promptTokenCount:100,cachedContentTokenCount:80,candidatesTokenCount:5,thoughtsTokenCount:7,actual_usd:0.01,settled:true},{promptTokenCount:100,cachedContentTokenCount:0,candidatesTokenCount:5,thoughtsTokenCount:7,actual_usd:0.02,settled:true}],safety_classification:{actual_usd:0.001}}}]);
  assert.deepEqual([s.cases_with_regeneration,s.cache_hit_ratio,s.generation_actual_usd,s.safety_actual_usd],[1,0.4,0.03,0.001]);
});

test('runner run namespace (R8 + Codex 5272047): revision + effective safety binding fingerprint; fail closed; no mixed runtime',async()=>{
  // w1-qa.js is a browser module; minimal inert globals let Node import its pure helpers.
  globalThis.fetch=async()=>({json:async()=>({})});globalThis.document={getElementById:()=>({})};
  const {runCampaignOf,safetyFingerprintOf,runtimeIdentity,sameRuntime,modelRouteFail,RESUMABLE_RUNS}=await import('../public/w1-qa.js');
  const {createHash}=await import('node:crypto');const {readFileSync}=await import('node:fs');
  // Same stable serializer on both sides (server computes, runner verifies): guard against drift.
  const stableLine=f=>readFileSync(new URL(f,import.meta.url),'utf8').split(/\r?\n/).find(l=>l.startsWith('const stable='));
  assert.ok(stableLine('../src/w1/start.js'));assert.equal(stableLine('../src/w1/start.js'),stableLine('../public/w1-qa.js'));
  // Evaluate the runner's exact serializer line (recursive, so it needs its own binding).
  const stable=(0,eval)('(()=>{'+stableLine('../public/w1-qa.js')+'return stable;})()');
  const binding={provider:'gemini',model:'gemini-3.7-flash',temperature:0,maxOutputTokens:512,thinking:{mode:'low'},timeoutMs:12000,
    safety:{profile:'p',categories:[{category:'HARM_CATEGORY_HARASSMENT',threshold:'BLOCK_ONLY_HIGH'}]}};
  const fpOf=b=>createHash('sha256').update(stable(b)).digest('hex');
  const m=(b=binding,rev='63d87705aca96b0e9e9d467552aee5c5dfd6008e')=>({source_revision:rev,safety_binding_status:'CONFIGURED',safety_binding:b,safety_binding_fingerprint:fpOf(b),runtime_binding:{model:'g'}});
  const suite={campaign:'w1-regress-x1'};
  const fp=fpOf(binding);
  assert.equal(await safetyFingerprintOf(m()),fp);
  assert.equal(await runCampaignOf(suite,m()),'w1-regress-x1-r63d8770-s'+fp.slice(0,12));
  // Key order in the published binding does not change identity; any execution-affecting change does.
  assert.equal(fpOf({...binding,model:binding.model,provider:'gemini'}),fp);
  for(const change of [{model:'gemini-other'},{timeoutMs:13000},{temperature:0.1},{maxOutputTokens:256},{thinking:{mode:'medium'}}])
    assert.notEqual(await runCampaignOf(suite,m({...binding,...change})),await runCampaignOf(suite,m()),JSON.stringify(change));
  assert.notEqual(await runCampaignOf(suite,m(binding,'aaaaaaa')),await runCampaignOf(suite,m(binding,'bbbbbbb')));
  assert.equal(await runCampaignOf(suite,m()),await runCampaignOf(suite,m()));   // same binding: safe resume
  assert.equal(suite.campaign,'w1-regress-x1');
  // Fail closed: bad revision, disabled / missing / malformed / mismatched fingerprint.
  for(const rev of [undefined,'LOCAL_UNPACKAGED','abc',''])await assert.rejects(runCampaignOf(suite,{...m(),source_revision:rev}),/SOURCE_REVISION_UNVERIFIED/);
  await assert.rejects(runCampaignOf(suite,{...m(),safety_binding_status:'DISABLED'}),/SAFETY_BINDING_NOT_CONFIGURED/);
  await assert.rejects(runCampaignOf(suite,{...m(),safety_binding:null}),/SAFETY_BINDING_NOT_CONFIGURED/);
  for(const bad of [null,'','x'.repeat(64),fp.slice(0,12)])await assert.rejects(runCampaignOf(suite,{...m(),safety_binding_fingerprint:bad}),/SAFETY_BINDING_FINGERPRINT_INVALID/);
  await assert.rejects(runCampaignOf(suite,{...m(),safety_binding_fingerprint:fpOf({...binding,model:'x'})}),/SAFETY_BINDING_FINGERPRINT_MISMATCH/);
  // Longest legal campaign + case key stays inside the server's request_id limit and w1-regress- prefix.
  const id=(await runCampaignOf({campaign:'w1-regress-'+'x'.repeat(40)},m(binding,'0123456789abcdef')))+'-'+'X'.repeat(24);
  assert.ok(/^[A-Za-z0-9_-]{1,128}$/.test(id)&&id.startsWith('w1-regress-'),id.length);
  // Runtime identity: any revision / safety binding / generation binding change is a different runtime.
  const base=runtimeIdentity(m());
  assert.equal(sameRuntime(base,runtimeIdentity(m())),true);
  assert.equal(sameRuntime(base,runtimeIdentity(m(binding,'bbbbbbb'))),false);
  assert.equal(sameRuntime(base,runtimeIdentity(m({...binding,timeoutMs:1}))),false);
  assert.equal(sameRuntime(base,runtimeIdentity({...m(),runtime_binding:{model:'h'}})),false);
  assert.equal(sameRuntime(base,runtimeIdentity(undefined)),false);
  // R21 resume: the named interrupted run keeps its original namespace under a newer deployed revision.
  assert.deepEqual(RESUMABLE_RUNS['resume-91e90c2'],{revision:'91e90c2',phase:'remaining'});
  const resumed=await runCampaignOf(suite,m(binding,'feedbee0123456789'),{resumeRevision:'91e90c2'});
  assert.equal(resumed,'w1-regress-x1-r91e90c2-s'+fp.slice(0,12));
  assert.equal(resumed,(await runCampaignOf(suite,m(binding,'91e90c23722d11cc57b47c57742a889801ac4880'))));
  for(const bad of ['9ac1a53','1d60678','','91E90C2'])await assert.rejects(runCampaignOf(suite,m(),{resumeRevision:bad}),/RESUME_RUN_NOT_ALLOWED/);
  await assert.rejects(runCampaignOf(suite,{...m(),safety_binding_fingerprint:'x'.repeat(64)},{resumeRevision:'91e90c2'}),/SAFETY_BINDING_FINGERPRINT_INVALID/);
  await assert.rejects(runCampaignOf(suite,{...m(),source_revision:'LOCAL_UNPACKAGED'},{resumeRevision:'91e90c2'}),/SOURCE_REVISION_UNVERIFIED/);
  assert.equal(modelRouteFail({runtime:{route:'SAFETY_FALLBACK'}}),true);
  for(const r of [{runtime:{route:'SAFETY_MODEL'}},{runtime:{route:'GENERATED'}},{},null])assert.equal(modelRouteFail(r),false);
});
