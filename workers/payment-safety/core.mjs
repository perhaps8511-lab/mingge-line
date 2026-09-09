// No callback field is payment authority. Only private service bindings may supply evidence.
export const MAX_BODY = 32768;
export const TIMEOUT_MS = 4000;
export const MAX_ATTEMPTS = 8;
export async function persistReceipt(storage,envelope) {
  await storage.transaction(async tx=>{
    if(await tx.get('receipt')) return;
    await tx.put('receipt',{...envelope,state:'pending',attempts:0,createdAt:Date.now()});
    await tx.setAlarm(Date.now()+1000);
  });
}
export function response(status, code) { return new Response(code, {status, headers:{'content-type':'text/plain; charset=utf-8','cache-control':'no-store'}}); }
export async function boundedBody(request) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error('empty');
  const chunks=[]; let size=0;
  let timedOut=false;
  const timer=setTimeout(()=>{timedOut=true;reader.cancel().catch(()=>{});},1500);
  try {
    for (;;) {
      const {done,value}=await reader.read(); if(timedOut) throw new Error('body_timeout'); if(done) break;
      size+=value.byteLength; if(size>MAX_BODY) throw new Error('large');
      chunks.push(value);
    }
  } finally {clearTimeout(timer); await reader.cancel().catch(()=>{});}
  if (!size) throw new Error('empty');
  const body=new Uint8Array(size); let offset=0;
  for(const chunk of chunks){body.set(chunk,offset);offset+=chunk.length;}
  return body;
}
export async function digest(value) {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256',value))].map(x=>x.toString(16).padStart(2,'0')).join('');
}
function keyBytes(hex) {
  if(!/^[a-f0-9]{64}$/i.test(hex||'')) throw new Error('key_unavailable');
  return Uint8Array.from(hex.match(/../g),x=>parseInt(x,16));
}
export async function seal(bytes, secret, aad) {
  const key=await crypto.subtle.importKey('raw',keyBytes(secret),'AES-GCM',false,['encrypt']);
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode(aad)},key,bytes);
  return {iv:[...iv],ciphertext:[...new Uint8Array(encrypted)]};
}
export async function unseal(record, secret, aad) {
  const key=await crypto.subtle.importKey('raw',keyBytes(secret),'AES-GCM',false,['decrypt']);
  return new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:new Uint8Array(record.iv),additionalData:new TextEncoder().encode(aad)},key,new Uint8Array(record.ciphertext)));
}
export async function serviceJSON(binding, path, body) {
  if(!binding) throw new Error('binding_unavailable');
  const controller=new AbortController();
  let timer;
  const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('downstream_timeout'));},TIMEOUT_MS);});
  try {
    const res=await Promise.race([binding.fetch(new Request('https://internal.invalid/'+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),signal:controller.signal})),deadline]);
    if(!res.ok) throw new Error('downstream_status');
    return JSON.parse(new TextDecoder().decode(await boundedBody(res)));
  } finally {clearTimeout(timer);}
}
const id=x=>typeof x==='string' && /^[A-Za-z0-9_-]{1,100}$/.test(x);
export function validateEvidence(e,o,env) {
  if(e?.contract!=='mingge-provider-readback-v1' || e.verified!==true || !id(e.orderId) || !id(e.eventId) || !id(e.subjectRef) || !id(e.evidenceRef)) throw new Error('verification_required');
  if(!Number.isSafeInteger(e.revision)||e.revision<1||!Number.isSafeInteger(e.amountMinor)||e.amountMinor<=0||!['paid','refunded'].includes(e.state)) throw new Error('invalid_evidence');
  if(o?.contract!=='mingge-order-snapshot-v1'||o.orderId!==e.orderId||o.subjectRef!==e.subjectRef||o.amountMinor!==e.amountMinor||o.currency!==e.currency||o.merchant!==e.merchant||o.environment!==e.environment||e.merchant!==env.MERCHANT_ALIAS||e.environment!==env.PROVIDER_ENVIRONMENT||e.currency!=='TWD') throw new Error('order_mismatch');
  // Refunds are reconciliation of a provider-confirmed full refund, never initiation.
  if(e.state==='refunded' && (e.refundVerified!==true || e.refundAmountMinor!==e.amountMinor)) throw new Error('refund_unverified');
  return Object.fromEntries(['orderId','eventId','subjectRef','evidenceRef','revision','amountMinor','currency','merchant','environment','state'].map(k=>[k,e[k]]));
}
export function transition(previous,event) {
  if(!previous) { if(event.state!=='paid') throw new Error('refund_before_payment'); return 'apply'; }
  if(previous.subjectRef!==event.subjectRef||previous.amountMinor!==event.amountMinor||previous.currency!==event.currency||previous.merchant!==event.merchant||previous.environment!==event.environment) throw new Error('order_conflict');
  if(event.revision<previous.revision) return 'stale';
  if(event.revision===previous.revision) {
    if(event.eventId===previous.eventId&&event.state===previous.state) return 'duplicate';
    throw new Error('revision_conflict');
  }
  if(previous.state==='refunded'&&event.state!=='refunded') throw new Error('state_regression');
  if(previous.state===event.state) return 'metadata';
  return 'apply';
}
