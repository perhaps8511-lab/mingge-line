// Owner cost ruling 2026-09-23: reserve -> actual settlement -> release; one hard cap across
// provider + safety; runner projection. Synthetic data, local PGlite, no provider calls.
import test from 'node:test';
import assert from 'node:assert/strict';
import {actualCost,PRICES} from '../src/w1/cost.js';
import {W1Store} from '../src/w1/store.js';
import {W1Service} from '../src/w1/service.js';
import {migrateW1} from '../src/w1/schema.js';
import {orderCases,caseCost,projection,summarize,TARGETED_20,HARD_CAP_USD,BASELINE_CASE_USD} from '../public/w1-qa-cost.js';

const engine=process.env.W1_PGLITE_MODULE??import.meta.resolve('@electric-sql/pglite');
const A=`U${'3'.repeat(32)}`;
const input=id=>({request_id:id,ben_gua:'乾為天',bian_gua:'天風姤',dong_yao:1,qigua_time:'2026-09-21T12:00:00+08:00',question_text:'合成成本題'});
async function db(){
  const {PGlite}=await import(engine);const d=new PGlite();
  const query=async(sql,args)=>{const r=args===undefined?(await d.exec(sql)).at(-1):await d.query(sql,args);return {...r,rowCount:r.affectedRows??r.rows.length};};
  const pool={query,connect:async()=>({query,release(){}})};await migrateW1(pool);return {d,pool,store:new W1Store(pool)};
}

test('actual cost follows the official price table, including cache hits, and refuses to guess',()=>{
  // The Owner journey record: 59,013 prompt / 583 output / 874 thinking, no cache.
  assert.equal(actualCost('gemini-3.7-flash',{input:59013,cached:0,output:583,thinking:874}).usd,0.04972350);
  const cached=actualCost('gemini-3.7-flash',{input:59013,cached:50000,output:583,thinking:874});
  assert.equal(cached.usd,Math.round(((9013)*0.75e-6+50000*0.075e-6+1457*3.75e-6)*1e8)/1e8);
  assert.deepEqual([cached.prompt,cached.cached,cached.candidates,cached.thoughts],[59013,50000,583,874]);
  for(const bad of [['other-model',{input:1,output:1,thinking:0}],['gemini-3.7-flash',{output:1,thinking:0}],
    ['gemini-3.7-flash',{input:10,cached:11,output:0,thinking:0}],['gemini-3.7-flash',{input:1.5,output:0,thinking:0}],['gemini-3.7-flash',null]])
    assert.equal(actualCost(...bad),null);
  assert.equal(actualCost('gemini-3.7-flash',{input:1,output:1,thinking:0},Date.parse(PRICES['gemini-3.7-flash'].validThrough)+1),null);
});

test('settlement releases unused reserve; unsettled keeps it; settle is once-only',async()=>{
  const {d,store}=await db();
  await store.grant(A,{quota:5,expiresAt:new Date(Date.now()+3600000).toISOString(),enrollmentId:'cost-1'});
  const r=await store.create(A,input('c1'));
  const budget={campaign:'gen',budgetUsd:100,upperUsd:0.25,hardCapUsd:30};
  await store.reserveProviderCall(r.id,0,budget);
  assert.equal((await store.costTotal()).total_effective_usd,0.25);
  const cost=actualCost('gemini-3.7-flash',{input:59013,cached:0,output:583,thinking:874});
  assert.equal(await store.settleProviderCall(r.id,0,cost),true);
  assert.equal(await store.settleProviderCall(r.id,0,cost),false);
  let t=await store.costTotal();
  assert.equal(t.total_effective_usd,0.0497235);assert.equal(t.provider.open_reserve_usd,0);assert.equal(t.provider.settled,1);
  await store.reserveProviderCall(r.id,1,budget);
  assert.equal(await store.settleProviderCall(r.id,1,null),false);
  t=await store.costTotal();assert.equal(t.provider.open_reserve_usd,0.25);assert.equal(t.total_effective_usd,0.2997235);
  const rc=await store.recordCost(A,r.id);
  assert.deepEqual(Object.keys(rc.generation_attempts[0]).sort(),['actual_usd','attempt','cachedContentTokenCount','candidatesTokenCount','promptTokenCount','reserved_usd','settled','thoughtsTokenCount']);
  assert.equal(rc.generation_attempts[0].promptTokenCount,59013);assert.equal(rc.generation_attempts[1].settled,false);
  assert.equal(rc.safety_classification,null);
  await d.close();
});

test('one hard cap spans provider and safety spend; settlement frees room',async()=>{
  const {d,store}=await db();
  await store.grant(A,{quota:5,expiresAt:new Date(Date.now()+3600000).toISOString(),enrollmentId:'cost-2'});
  const r1=await store.create(A,input('h1')),r2=await store.create(A,input('h2'));
  const gen={campaign:'gen',budgetUsd:100,upperUsd:0.25,hardCapUsd:0.30};
  const safe={campaign:'safe',budgetUsd:100,upperUsd:0.02,hardCapUsd:0.30};
  await store.reserveProviderCall(r1.id,0,gen);                        // 0.25 open
  await store.reserveSafetyCall(A,safe,input('h1'));                   // 0.27 open
  await assert.rejects(store.reserveProviderCall(r2.id,0,gen),/COST_HARD_CAP_REACHED/);
  await store.reserveSafetyCall(A,safe,input('h2'));                   // 0.29
  await assert.rejects(store.reserveSafetyCall(A,safe,input('h3')),/COST_HARD_CAP_REACHED/);
  await store.settleProviderCall(r1.id,0,actualCost('gemini-3.7-flash',{input:1000,output:10,thinking:10}));
  await store.reserveProviderCall(r2.id,0,gen);                        // fits after release
  const safetyRow=(await store.recordCost(A,r1.id)).safety_classification;
  assert.equal(safetyRow.reserved_usd,0.02);assert.equal(safetyRow.settled,false);
  // Missing cap configuration is refused, never treated as unlimited.
  await assert.rejects(store.reserveProviderCall(r2.id,1,{...gen,hardCapUsd:undefined}),/PROVIDER_BUDGET_REQUIRED/);
  await assert.rejects(store.reserveSafetyCall(A,{...safe,hardCapUsd:0},input('h4')),/SAFETY_BUDGET_REQUIRED/);
  await d.close();
});

test('a budget stop during generation keeps its code instead of GENERATION_FAILED',async()=>{
  const {d,store}=await db();
  await store.grant(A,{quota:5,expiresAt:new Date(Date.now()+3600000).toISOString(),enrollmentId:'cost-3'});
  const budget={campaign:'gen',budgetUsd:100,upperUsd:0.25,hardCapUsd:0.10};
  const service=new W1Service({store,buildPrompt:async()=>({}),push:async()=>{},
    generate:async args=>{await store.reserveProviderCall(args.recordId,args.attempt,budget);throw new Error('must not reach provider');}});
  const r=await service.create(A,input('stop'));await service.tick();
  const row=await store.get(A,r.id);
  assert.deepEqual([row.state,row.error_code,row.charge],['failed','COST_HARD_CAP_REACHED',0]);
  assert.equal((await store.quota(A)).remaining,5);
  await d.close();
});

test('runner orders targeted 20 first, projects total and stops above US$30',()=>{
  const cases=[...Array.from({length:105},(_,i)=>({case_key:`X-${i}`})),...TARGETED_20.map(k=>({case_key:k}))];
  const ordered=orderCases(cases);
  assert.deepEqual(ordered.slice(0,20).map(c=>c.case_key),[...TARGETED_20]);assert.equal(ordered.length,125);
  assert.throws(()=>orderCases(cases.slice(0,110)),/TARGETED_CASE_MISSING/);
  assert.equal(projection({totalEffectiveUsd:0.3,newCaseCosts:[],remainingCases:125}).avg_case_usd,BASELINE_CASE_USD);
  const ok=projection({totalEffectiveUsd:1.5,newCaseCosts:[0.06,0.08],remainingCases:105});
  assert.equal(ok.stop,false);assert.equal(ok.projected_total_usd,Math.round((1.5+0.1+0.07*105)*1e4)/1e4);
  assert.equal(projection({totalEffectiveUsd:5,newCaseCosts:[0.3],remainingCases:100}).stop,true);
  assert.equal(projection({totalEffectiveUsd:HARD_CAP_USD-0.2,newCaseCosts:[0.05],remainingCases:1}).stop,false);
  assert.equal(projection({totalEffectiveUsd:19.95,newCaseCosts:[0.05],remainingCases:0}).warn,true);
  const unsettled=caseCost({generation_attempts:[{reserved_usd:0.25,actual_usd:null,settled:false}],safety_classification:{reserved_usd:0.02,actual_usd:0.004,settled:true}});
  assert.deepEqual(unsettled,{usd:0.254,unsettled:1,attempts:1});
  const s=summarize([{cost:{generation_attempts:[{promptTokenCount:100,cachedContentTokenCount:80,candidatesTokenCount:5,thoughtsTokenCount:7,actual_usd:0.01,settled:true},{promptTokenCount:100,cachedContentTokenCount:0,candidatesTokenCount:5,thoughtsTokenCount:7,actual_usd:0.02,settled:true}],safety_classification:{actual_usd:0.001}}}]);
  assert.deepEqual([s.cases_with_regeneration,s.cache_hit_ratio,s.generation_actual_usd,s.safety_actual_usd,s.promptTokenCount],[1,0.4,0.03,0.001,200]);
});
