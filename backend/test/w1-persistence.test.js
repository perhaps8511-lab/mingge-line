import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {mkdtempSync,realpathSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {W1Store} from '../src/w1/store.js';
import {migrateW1,seedYaoci} from '../src/w1/schema.js';
import {loadClassics} from '../src/w1/classics.js';
test('owning-store close/reopen, 384 seed readback, durable replay and budget guards',async()=>{
 const tempBase=realpathSync(tmpdir()),dir=mkdtempSync(path.join(tempBase,'mingge-w1-pg-'));
 const subject=`U${'d'.repeat(32)}`;let db;
 function connect(engine){
  const query=async(sql,args)=>{const r=args===undefined?(await engine.exec(sql)).at(-1):await engine.query(sql,args);return {...r,rowCount:r.affectedRows??r.rows.length};};
  return {query,connect:async()=>({query,release(){}})};
 }
 try {
  db=new PGlite(dir);const pool=connect(db),store=new W1Store(pool);
  await migrateW1(pool);
  await seedYaoci(store,loadClassics(new URL('../data/classics-candidate.json',import.meta.url)));
  await store.grant(subject,{quota:2,expiresAt:new Date(Date.now()+3600000).toISOString(),enrollmentId:'disk-enroll'});
  const input={request_id:'disk-one',ben_gua:'乾為天',bian_gua:'天風姤',dong_yao:1,qigua_time:'2026-09-21T12:00:00+08:00',question_text:'SYNTHETIC_DISK_MARKER'};
  const record=await store.create(subject,input);await store.claim();
  await store.reserveProviderCall(record.id,0,{campaign:'synthetic',budgetUsd:1,upperUsd:.5,hardCapUsd:1000});
  await assert.rejects(store.reserveProviderCall(record.id,1,{campaign:'synthetic',budgetUsd:1,upperUsd:.5,hardCapUsd:1000}),/PROVIDER_BUDGET_EXHAUSTED/);
  await store.settle(record.id,null,'SYNTHETIC_FAILURE');
  await db.close();db=new PGlite(dir);const reopened=new W1Store(connect(db));
  const read=await reopened.get(subject,record.id);assert.equal(read.input_json.question_text,'SYNTHETIC_DISK_MARKER');
  assert.equal(read.state,'failed');assert.equal(read.charge,0);
  assert.equal((await reopened.create(subject,input)).id,record.id);
  assert.equal((await reopened.quota(subject)).remaining,2);
  assert.equal(Number((await reopened.pool.query('SELECT count(*) AS n FROM w1.yaoci')).rows[0].n),384);
  assert.equal(Number((await reopened.pool.query('SELECT count(*) AS n FROM w1.provider_calls')).rows[0].n),1);
 }finally{
  await db?.close();const target=realpathSync(dir);
  if(path.dirname(target)!==tempBase||!path.basename(target).startsWith('mingge-w1-pg-'))throw new Error('UNSAFE_TEST_CLEANUP_PATH');
  rmSync(target,{recursive:true});
 }
});
