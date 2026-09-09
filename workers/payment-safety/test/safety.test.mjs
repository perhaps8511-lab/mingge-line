import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {boundedBody,digest,validateEvidence,transition,serviceJSON,seal,unseal} from '../core.mjs';
const env={INGRESS_PROFILE:'oen-reviewed-v1',PROVIDER_ENVIRONMENT:'synthetic',MERCHANT_ALIAS:'test-merchant',INBOX_KEY_ID:'test-v1',INBOX_KEY:'01'.repeat(32)};
const paid={contract:'mingge-provider-readback-v1',verified:true,orderId:'synthetic-order',eventId:'event-paid',subjectRef:'opaque-test-subject',evidenceRef:'test-query',revision:1,amountMinor:14900,currency:'TWD',merchant:'test-merchant',environment:'synthetic',state:'paid'};
const order={...paid,contract:'mingge-order-snapshot-v1'};
const json=x=>new Response(JSON.stringify(x),{headers:{'content-type':'application/json'}});
const root=fileURLToPath(new URL('../',import.meta.url));
async function runtime(overrides={}) {
 return new Miniflare(convertV4MiniflareOptions({modules:['test/runtime-worker.mjs','worker.mjs','core.mjs'].map(p=>({type:'ESModule',path:join(root,p)})),modulesRoot:root,compatibilityDate:'2026-09-09',compatibilityFlags:['nodejs_compat'],durableObjects:{RECEIPTS:{className:'TestReceipt',useSQLite:true},ORDERS:{className:'TestOrder',useSQLite:true}},bindings:env,serviceBindings:{VERIFIER:()=>json(paid),ORDER_STORE:()=>json(order),CONSUMER:async req=>json({...(await req.json()),applied:true})},...overrides}));
}
async function inspect(mf,kind,name,operation='inspect',event){const r=await mf.dispatchFetch('http://localhost/__test',{method:'POST',body:JSON.stringify({kind,name,operation,event})});assert.equal(r.status,200);const text=await r.text();assert.notEqual(text,'undefined',kind+':'+operation);return JSON.parse(text);}
const callback='{"synthetic":true,"paid":true}';
const callbackId=await digest(new TextEncoder().encode('synthetic:test-merchant:'+callback));
const orderId=await digest(new TextEncoder().encode('synthetic:test-merchant:synthetic-order'));
const post=mf=>mf.dispatchFetch('http://localhost/webhooks/oen',{method:'POST',headers:{'content-type':'application/json'},body:callback});

test('ACK follows encrypted durable receipt; duplicate and process restart preserve one record',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'mingge-inbox-'));
 let mf=await runtime({resourcePersistencePath:dir});
 try {
   let r=await post(mf);assert.equal(r.status,200);assert.equal(await r.text(),'ok');
   const first=await inspect(mf,'receipt',callbackId);assert.equal(first.state,'pending');assert.ok(first.ciphertext);assert.equal(first.callback,undefined);
   assert.equal((await post(mf)).status,200);assert.equal((await inspect(mf,'receipt',callbackId)).createdAt,first.createdAt);
   await mf.dispose();mf=await runtime({resourcePersistencePath:dir});
   const reopened=await inspect(mf,'receipt',callbackId);assert.equal(reopened.receiptId,callbackId);assert.equal(new TextDecoder().decode(await unseal(reopened,env.INBOX_KEY,callbackId)),callback);
 } finally {await mf.dispose();await rm(dir,{recursive:true,force:true});}
});
test('receipt failure cannot ACK; disabled ingress and refund initiation fail closed',async()=>{
 const mf=await runtime({bindings:{...env,FAIL_RECEIPT:true}});
 try{assert.equal((await post(mf)).status,503);assert.equal((await mf.dispatchFetch('http://localhost/refunds',{method:'POST',body:'{}'})).status,403);}finally{await mf.dispose();}
 const off=await runtime({bindings:{...env,INGRESS_PROFILE:'disabled'}});try{assert.equal((await post(off)).status,503);}finally{await off.dispose();}
});
test('provider verification failure leaves receipt recoverable, not paid',async()=>{
 const mf=await runtime({serviceBindings:{VERIFIER:()=>new Response('synthetic error',{status:503})}});
 try{await post(mf);const r=await inspect(mf,'receipt',callbackId,'run');assert.equal(r.state,'pending');assert.ok(r.ciphertext);assert.equal((await inspect(mf,'order',orderId)).current,undefined);}finally{await mf.dispose();}
});
test('verified event queues once; downstream non-2xx and generic 2xx do not count as applied',async()=>{
 let mode=503;const seen=[];
 const mf=await runtime({serviceBindings:{VERIFIER:()=>json(paid),ORDER_STORE:()=>json(order),CONSUMER:async req=>{seen.push(await req.json());return mode===503?new Response('error',{status:503}):mode===200?json({ok:true}):json({contract:'mingge-payment-v1',eventId:paid.eventId,applicationId:seen.at(-1).applicationId,applied:true});}}});
 try{
   await post(mf);await inspect(mf,'receipt',callbackId,'run');
   let r=await inspect(mf,'order',orderId,'run');assert.equal(r.queue.length,1);assert.ok(r.alarm);
   mode=200;r=await inspect(mf,'order',orderId,'run');assert.equal(r.queue.length,1);
   mode=201;r=await inspect(mf,'order',orderId,'run');assert.equal(r.queue.length,0);
   assert.ok(seen.every(e=>e.eventId===paid.eventId));
   await inspect(mf,'order',orderId,'accept',validateEvidence(paid,order,env));assert.equal((await inspect(mf,'order',orderId)).queue.length,0);
 }finally{await mf.dispose();}
});
test('timeout is bounded even when downstream ignores abort',async()=>{
 const start=Date.now();await assert.rejects(serviceJSON({fetch:()=>new Promise(()=>{})},'apply',{}),/downstream_timeout/);assert.ok(Date.now()-start<6000);
});
test('order binding and refund evidence cannot be supplied by caller assertions',()=>{
 for(const field of ['subjectRef','amountMinor','merchant','environment','currency']) assert.throws(()=>validateEvidence(paid,{...order,[field]:'wrong'},env));
 assert.throws(()=>validateEvidence({...paid,verified:false},order,env));
 assert.throws(()=>validateEvidence({...paid,state:'refunded'},order,env));
});
test('resends, reversed arrival and stale state cannot roll payment back or authorize refund',()=>{
 const p=validateEvidence(paid,order,env),r={...p,eventId:'event-refund',revision:2,state:'refunded'};
 assert.equal(transition(p,p),'duplicate');assert.throws(()=>transition(null,r),/refund_before/);
 assert.equal(transition(p,r),'apply');assert.equal(transition(r,p),'stale');
 assert.throws(()=>transition(r,{...p,revision:3}),/state_regression/);
 assert.throws(()=>transition(p,{...p,eventId:'conflicting-event'}),/revision_conflict/);
});
test('body read failure and over-limit input reject; ciphertext is bound to receipt ID',async()=>{
 await assert.rejects(boundedBody(new Request('http://localhost',{method:'POST',duplex:'half',body:new ReadableStream({start(c){c.error(new Error('read failed'));}})})));
 await assert.rejects(boundedBody(new Response('x'.repeat(32769))));
 const data=await seal(new TextEncoder().encode('synthetic'),env.INBOX_KEY,'a');await assert.rejects(unseal(data,env.INBOX_KEY,'b'));
});
test('alarm write failure rolls receipt back; no success ACK and no orphan receipt',async()=>{
 const mf=await runtime({bindings:{...env,FAIL_ALARM:true}});
 try{assert.equal((await post(mf)).status,503);assert.equal(await inspect(mf,'receipt',callbackId),null);}finally{await mf.dispose();}
});
test('held receipt has private recovery; callback resend alone cannot turn it into verified',async()=>{
 let ready=false;const mf=await runtime({serviceBindings:{VERIFIER:()=>ready?json(paid):new Response('error',{status:503}),ORDER_STORE:()=>json(order),CONSUMER:async req=>json({...await req.json(),applied:true})}});
 try{
   await post(mf);for(let i=0;i<8;i++) await inspect(mf,'receipt',callbackId,'run');
   assert.equal((await inspect(mf,'receipt',callbackId)).state,'held');
   await post(mf);assert.equal((await inspect(mf,'receipt',callbackId)).state,'held');
   ready=true;await inspect(mf,'receipt',callbackId,'retry');
   assert.equal((await inspect(mf,'receipt',callbackId,'run')).state,'verified_queued');
 }finally{await mf.dispose();}
});
test('lost applied response replays stable application key; held outbox recovers without double credit',async()=>{
 const ledger=new Set();let credits=0;let lost=true;
 const mf=await runtime({serviceBindings:{CONSUMER:async req=>{const e=await req.json();if(!ledger.has(e.applicationId)){ledger.add(e.applicationId);credits++;}return lost?new Response('lost acknowledgment',{status:503}):json({...e,applied:true});}}});
 try{
   const p=validateEvidence(paid,order,env);
   await inspect(mf,'order',orderId,'accept',p);
   for(let i=0;i<8;i++)await inspect(mf,'order',orderId,'run');
   assert.equal((await inspect(mf,'order',orderId)).queue[0].state,'held');assert.equal(credits,1);
   lost=false;await inspect(mf,'order',orderId,'retry');assert.equal((await inspect(mf,'order',orderId,'run')).queue.length,0);
   await inspect(mf,'order',orderId,'accept',{...p,eventId:'second-paid-notice',revision:2});
   assert.equal((await inspect(mf,'order',orderId)).queue.length,0);assert.equal(credits,1);
 }finally{await mf.dispose();}
});
test('partial body timeout rejects even if the received prefix is valid JSON',async()=>{
 await assert.rejects(boundedBody(new Response(new ReadableStream({start(c){c.enqueue(new TextEncoder().encode('{}'));}}))),/body_timeout/);
});
