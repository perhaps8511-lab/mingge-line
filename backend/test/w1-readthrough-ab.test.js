// A13 synthetic A/B isolation (contract v0.4 §2.1a P0-4 negative cases 1–4).
// Engineering evidence only: synthetic subjects, fake Airtable, local PGlite. It is NOT live
// read-through, NOT real LINE identity proof, and does not enable W1_LEGACY_READTHROUGH.
import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,createHash} from 'node:crypto';
import {W1Store} from '../src/w1/store.js';
import {W1Service} from '../src/w1/service.js';
import {createW1Server} from '../src/w1/http.js';
import {createSubjectVerifier} from '../src/w1/subject.js';
import {createLegacyReader} from '../src/w1/legacy.js';
import {migrateW1} from '../src/w1/schema.js';
import {subjectToken} from '../../workers/mingge-w1-staging/worker.js';

const engine=process.env.W1_PGLITE_MODULE??import.meta.resolve('@electric-sql/pglite');
const A=`U${'1'.repeat(32)}`,B=`U${'2'.repeat(32)}`;
const PAT='synthetic-readonly-token';
const evidence=Object.fromEntries(['C1','C2','C3','C4','C5'].map(id=>[id,{status:'PASS',reference:`synthetic-test-only/${id}`}]));
const legacyRow=(subject,marker)=>({id:`rec${marker}`,fields:{line_user_id_raw:subject,entry_type:'divination',
  question_text:`${marker}_PRIVATE_QUESTION`,session_id:`s-${marker}`,qigua_time:'2026-01-01T00:00:00+08:00',ben_gua:'乾為天',output_json:'[[J1]]合成'}});

test('A13 synthetic A/B: verified subject only, client ids ignored, missing binding fails closed, no leakage',async()=>{
  const {PGlite}=await import(engine);const db=new PGlite();
  const query=async(sql,args)=>{const r=args===undefined?(await db.exec(sql)).at(-1):await db.query(sql,args);return {...r,rowCount:r.affectedRows??r.rows.length};};
  const pool={query,connect:async()=>({query,release(){}})};
  await migrateW1(pool);
  const store=new W1Store(pool);
  const grantA=await store.grant(A,{quota:3,expiresAt:new Date(Date.now()+3600000).toISOString(),enrollmentId:'synthetic-a13-A'});
  const airtable=[];
  const legacyReader=createLegacyReader({evidence,token:PAT,tokenSha256:createHash('sha256').update(PAT).digest('hex'),
    environment:'staging',base:'appSynthetic',table:'tblSynthetic',isOwnerTestGrant:s=>store.isOwnerTestGrant(s),
    fetchImpl:async url=>{
      const formula=url.searchParams.get('filterByFormula');airtable.push(formula);
      // Fake upstream honours the formula exactly like Airtable would.
      const rows=[legacyRow(A,'A'),legacyRow(B,'B')].filter(r=>formula===`AND({line_user_id_raw}="${r.fields.line_user_id_raw}",{entry_type}="divination")`);
      return {ok:true,json:async()=>({records:rows})};
    }});
  const {privateKey,publicKey}=generateKeyPairSync('ed25519');
  const signer={W1_SUBJECT_KID:'synthetic-kid',W1_SUBJECT_PRIVATE_KEY_PKCS8:privateKey.export({type:'pkcs8',format:'der'}).toString('base64')};
  const seen=new Set();
  const authenticate=createSubjectVerifier({publicKey:publicKey.export({type:'spki',format:'pem'}),kid:'synthetic-kid',
    consumeJti:async jti=>seen.has(jti)?false:(seen.add(jti),true)});
  const logs=[];
  const server=createW1Server({service:new W1Service({store}),authenticate,legacyReader,log:x=>logs.push(x)});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base=`http://127.0.0.1:${server.address().port}`;
  let n=0;
  const as=async(subject,path)=>{const req=`a13-${++n}`;return fetch(base+path,{headers:{
    'x-mingge-subject-token':await subjectToken(subject,req,'liff',signer),'x-mingge-request-id':req}});};
  const bodies=[];
  const read=async r=>{const text=await r.text();bodies.push(text);return {status:r.status,cache:r.headers.get('cache-control'),json:JSON.parse(text)};};
  try {
    // 1. A's verified token sees A's legacy row and never B's.
    const a=await read(await as(A,'/gua-records'));
    assert.equal(a.status,200);assert.equal(a.cache,'no-store');assert.equal(a.json.legacy_status,'READ');
    assert.deepEqual(a.json.records.map(r=>r.id),['recA']);
    assert.equal(a.json.records[0].writable,false);
    // 2. Client-supplied identity in the query is rejected before any upstream read.
    const before=airtable.length;
    for(const key of ['subject','line_user_id','line_user_id_raw','userId','user']){
      const r=await read(await as(A,`/gua-records?${key}=${B}`));
      assert.equal(r.status,400);assert.equal(r.json.error,'BAD_FIELD');
    }
    assert.equal(airtable.length,before);
    // 3. B has a valid signature but no owner binding: refused, no upstream read, no list-all.
    const b=await read(await as(B,'/gua-records'));
    assert.equal(b.status,403);assert.equal(b.json.error,'OWNER_TEST_GRANT_REQUIRED');
    assert.equal(airtable.length,before);
    // Revoked binding: current rows still readable, legacy fails closed without upstream call.
    await store.revoke(A,grantA.id);
    const revoked=await read(await as(A,'/gua-records'));
    assert.equal(revoked.status,200);assert.equal(revoked.json.legacy_status,'UNAVAILABLE');assert.deepEqual(revoked.json.records,[]);
    assert.equal(airtable.length,before);
    // Forged signer is refused.
    const forged={...signer,W1_SUBJECT_PRIVATE_KEY_PKCS8:generateKeyPairSync('ed25519').privateKey.export({type:'pkcs8',format:'der'}).toString('base64')};
    const f=await fetch(base+'/gua-records',{headers:{'x-mingge-subject-token':await subjectToken(A,'a13-f','liff',forged),'x-mingge-request-id':'a13-f'}});
    assert.equal(f.status,401);
    // Every upstream query was bound to the verified subject A; never an unfiltered call.
    assert.ok(airtable.length>=1);
    for(const formula of airtable)assert.equal(formula,`AND({line_user_id_raw}="${A}",{entry_type}="divination")`);
  } finally {await new Promise(r=>server.close(r));}
  // 4. No subject, private text or other-subject data in logs, and B's data never left the fake upstream.
  const logText=JSON.stringify(logs);
  for(const marker of [A,B,'A_PRIVATE_QUESTION','B_PRIVATE_QUESTION'])assert.equal(logText.includes(marker),false,marker);
  assert.equal(bodies.join('').includes('B_PRIVATE_QUESTION'),false);
  assert.equal(bodies.join('').includes(B),false);
  // Zero persistence of legacy rows (C3).
  const stored=JSON.stringify((await pool.query('SELECT * FROM w1.gua_records')).rows);
  assert.equal(stored.includes('A_PRIVATE_QUESTION'),false);
  await db.close();
});
