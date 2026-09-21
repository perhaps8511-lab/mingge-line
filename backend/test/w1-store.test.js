import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {randomUUID} from 'node:crypto';
import {W1Store} from '../src/w1/store.js';
import {W1Service} from '../src/w1/service.js';
import {checkConsistency,classifyDelivery,generateChecked} from '../src/w1/delivery.js';
import {letterMessage,ALT_TEXT} from '../src/w1/line.js';
import {createW1Server} from '../src/w1/http.js';
import {migrateW1,seedYaoci} from '../src/w1/schema.js';
import {loadClassics} from '../src/w1/classics.js';

const engine=process.env.W1_PGLITE_MODULE??import.meta.resolve('@electric-sql/pglite');
const A=`U${'a'.repeat(32)}`,B=`U${'b'.repeat(32)}`;
const input=id=>({request_id:id,ben_gua:'乾為天',bian_gua:'天風姤',dong_yao:1,
  qigua_time:'2026-09-21T12:00:00+08:00',question_text:'SYNTHETIC_PRIVATE_MARKER'});
export const text=(level='green',sr=false)=>`#META_START\nzhu_li_ren: lao_yi\nmain_kaguan: A\nsub_kaguan: none\nzou_xiang: bao_shou\nredline: ${['red','crisis'].includes(level)}\nlevel: ${level}\ncategory: ${level==='crisis'?'self_harm':'none'}\nstandard_response: ${sr}\nhotline_given: ${level==='crisis'}\n#META_END\n`+
  (sr?'[[SR]]\n合成安全回應。撥打1925。\n':(level==='yellow'?'[[GZ]]\n合成範圍\n':'')+
    [1,2,3,4,5,6].map(i=>`[[J${i}]]\n合成段落${i}\n`).join('')+'[[ZY]]\n合成贈言\n[[NEXT]]\n合成下一步\n')+'[[END]]';

test('consistency gate, one regeneration, charge/notice and legacy order',async()=>{
  for(const [level,sr,charge,notice] of [['green',false,1,'none'],['yellow',false,1,'none'],
    ['green',true,0,'guidance'],['red',true,0,'boundary'],['crisis',true,0,'none']]) {
    const gate=checkConsistency(text(level,sr));assert.equal(gate.ok,true);
    const classified=classifyDelivery(gate.value);assert.equal(classified.charge,charge);assert.equal(classified.notice,notice);
    assert.equal(letterMessage(classified).altText,ALT_TEXT);
    if(!sr)assert.deepEqual(classified.sections.map(s=>s.tag),[...(level==='yellow'?['GZ']:[]),'J5','J2','J3','J4','J1','J6','ZY','NEXT']);
  }
  assert.throws(()=>classifyDelivery({j:[1,2,3,4,5,6]}),/CONSISTENCY_REQUIRED/);
  const bad=text().replace('standard_response: false','standard_response: true');
  let calls=0,alerts=0;
  await assert.rejects(generateChecked(async()=>{calls++;return {text:bad,finishReason:'STOP'};},async()=>{alerts++;}),/NO_DELIVERY/);
  assert.equal(calls,2);assert.equal(alerts,2);
  assert.equal(checkConsistency(text(),'MAX_TOKENS').ok,false);
  assert.equal(checkConsistency(text().replace('category: none','category: self_harm').replace('合成贈言','撥打1925')).ok,false);
});

test('PostgreSQL engine: grants, quota, reserve/confirm/release, HTTP readback, isolation', {skip:!engine}, async()=>{
  const {PGlite}=await import(engine.startsWith('file:')?engine:pathToFileURL(engine));
  const db=new PGlite();
  // PGlite is single-connection. Serialize transactions; this verifies SQL and
  // durable semantics, not Postgres multi-connection lock contention.
  let tail=Promise.resolve();
  const pool={query:async(sql,args)=>{
    const r=args===undefined?(await db.exec(sql)).at(-1):await db.query(sql,args);return {...r,rowCount:r.affectedRows??r.rows.length};
  },connect:async()=>{
    let release;const gate=new Promise(r=>{release=r;});const before=tail;tail=gate;await before;
    return {query:pool.query,release};
  }};
  const store=new W1Store(pool);
  await migrateW1(pool);await migrateW1(pool);
  const seed=await seedYaoci(store,loadClassics(new URL('../data/classics-candidate.json',import.meta.url)));
  assert.equal(seed.rows,384);assert.equal(seed.fieldsCompared,1152);
  const grant=await store.grant(A,{quota:1,expiresAt:new Date(Date.now()+3600000).toISOString(),enrollmentId:'synthetic-one'});
  assert.equal((await pool.query('SELECT * FROM w1.entitlements')).rows.length,0);
  const results=await Promise.allSettled([store.create(A,input('one')),store.create(A,input('two'))]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(results.filter(r=>r.status==='rejected'&&r.reason.message==='NO_QUOTA').length,1);
  const created=results.find(r=>r.status==='fulfilled').value;
  assert.equal(created.readback_verified,true);
  assert.equal((await store.create(A,input(created.request_id))).id,created.id);
  await assert.rejects(store.create(A,{...input(created.request_id),question_text:'changed'}),/REQUEST_CONTENT_CONFLICT/);
  await assert.rejects(store.get(B,created.id),/NOT_FOUND/);
  let generated=0,pushed=0;
  const service=new W1Service({store,manifest:{synthetic:true},buildPrompt:async b=>b.question_text,
    generate:async()=>{generated++;return {text:text(),finishReason:'STOP',runtime:{synthetic:true}};},
    push:async()=>{pushed++;throw new Error('SYNTHETIC_PRIVATE_MARKER');}});
  await service.tick();
  assert.equal((await store.get(A,created.id)).charge,1);
  assert.equal((await store.get(A,created.id)).push_state,'unknown');
  service.push=async()=>{pushed++;};await service.repush(A,created.id);
  assert.equal(generated,1);assert.equal(pushed,2);
  await service.repush(A,created.id);assert.equal(pushed,2);
  assert.equal((await store.quota(A)).remaining,0);
  assert.equal(await store.settle(created.id,null,'FAILED'),false);
  const second=await store.grant(A,{quota:2,expiresAt:new Date(Date.now()+3600000).toISOString(),enrollmentId:'synthetic-two'});
  const sr=await service.create(A,input('safe'));service.generate=async()=>({text:text('crisis',true),finishReason:'STOP',runtime:{synthetic:true}});
  await service.tick();assert.equal((await store.get(A,sr.id)).charge,0);
  assert.equal((await store.quota(A)).remaining,2);
  const lost=await service.create(A,input('crash'));const claimed=await store.claim();assert.equal(claimed.id,lost.id);
  await pool.query("UPDATE w1.gua_records SET started_at=now()-interval '721 seconds' WHERE id=$1",[lost.id]);
  await store.detectExpiredClaims();assert.equal((await store.get(A,lost.id)).state,'generation_unknown');
  assert.equal((await store.quota(A)).remaining,2);
  assert.equal(await store.settle(lost.id,{delivery:{charge:1}},null),false);
  const failed=await service.create(A,input('broken'));service.generate=async()=>({text:'broken',finishReason:'STOP'});
  await service.tick();assert.equal((await store.get(A,failed.id)).state,'failed');
  assert.equal((await store.quota(A)).remaining,2);
  const logs=[];
  const server=createW1Server({service,authenticate:async({token,body,query})=>{
    if(token!=='synthetic-valid')throw Object.assign(new Error('UNAUTHORIZED'),{status:401});
    if(body.subject||query.subject)throw Object.assign(new Error('BAD_FIELD'),{status:400});
    return {subject:A};
  },log:x=>logs.push(x)});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base=`http://127.0.0.1:${server.address().port}`;
  const opts={headers:{'x-mingge-subject-token':'synthetic-valid','x-mingge-request-id':'read'}};
  try {
    assert.equal((await fetch(base+'/gua-records')).status,401);
    const response=await fetch(base+'/gua-records/'+created.id,opts);assert.equal(response.headers.get('cache-control'),'no-store');
    const r=await response.json();assert.equal(r.letter.charge,1);assert.equal(r.subject,undefined);assert.equal(r.raw_output,undefined);
    assert.equal((await fetch(base+'/gua-records?subject=other',opts)).status,400);
    const list=await(await fetch(base+'/gua-records',opts)).json();assert.equal(list.legacy_status,'BLOCKED_BY_READONLY_PAT');
  } finally {await new Promise(r=>server.close(r));}
  const queues=await pool.query('SELECT * FROM w1.jobs');
  const audits=await pool.query('SELECT * FROM w1.audit_events');
  assert.equal(JSON.stringify([logs,queues.rows,audits.rows]).includes('SYNTHETIC_PRIVATE_MARKER'),false);
  await store.revoke(A,grant.id);await store.revoke(A,second.id);
  assert.equal(await store.isOwnerTestGrant(A),false);
  await assert.rejects(store.create(A,input('after-revoke')),/NO_QUOTA/);
  const expired=await store.grant(B,{quota:1,expiresAt:new Date(Date.now()+3600000).toISOString(),enrollmentId:'expired'});
  await pool.query("UPDATE w1.test_grants SET expires_at=now()-interval '1 second' WHERE id=$1",[expired.id]);
  await assert.rejects(store.create(B,input('expired-request')),/NO_QUOTA/);
  assert.equal((await pool.query('SELECT * FROM w1.entitlements')).rows.length,0);
  await db.close();
});
