// Runner login recovery (Owner login diagnosis 2026-09-23: LINE in-app browser kept an expired LIFF token;
// relay answered 503 LINE_VERIFY_TOKEN_EXPIRED). Browser globals are stubbed; no network.
import test from 'node:test';
import assert from 'node:assert/strict';

const els={};globalThis.document={getElementById:id=>(els[id]??={id,textContent:'',hidden:true,disabled:false})};
const store={};globalThis.sessionStorage={getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=v;},removeItem:k=>{delete store[k];}};
let manifestStatus=503;const calls=[];
globalThis.fetch=async url=>{
  if(url==='/ui-config')return {json:async()=>({relayOrigin:'https://relay.test',liffId:'synthetic'})};
  if(url==='https://relay.test/runtime-manifest')return manifestStatus===200?
    {ok:true,json:async()=>({environment:'staging',runtime_status:'CONFIGURED_NOT_LIVE_VERIFIED',source_revision:'abcdef1'})}:
    {ok:false,json:async()=>({error:'SERVICE_UNAVAILABLE'})};
  throw new Error('UNEXPECTED_FETCH '+url);
};
globalThis.location={origin:'https://ui.test'};
globalThis.liff={init:async()=>{},isLoggedIn:()=>true,getAccessToken:()=>'cached-token',logout:()=>calls.push('logout'),login:o=>calls.push('login:'+o.redirectUri)};
await import('../public/w1-qa.js');
const click=()=>els.login.onclick();

test('expired cached LINE session: exactly one forced re-login, then a clear message instead of a loop',async()=>{
  await click();
  assert.deepEqual(calls,['logout','login:https://ui.test/w1-qa.html']);
  assert.equal(store['w1-qa-relogin'],'1');
  assert.match(els.status.textContent,/重新登入中/);
  await click();                                   // still failing after the fresh login
  assert.deepEqual(calls,['logout','login:https://ui.test/w1-qa.html']);
  assert.equal(store['w1-qa-relogin'],undefined);
  assert.match(els.status.textContent,/已重新登入仍失敗/);
});

test('successful verification clears the flag and never logs out',async()=>{
  store['w1-qa-relogin']='1';manifestStatus=200;calls.length=0;
  await click();
  assert.deepEqual(calls,[]);
  assert.equal(store['w1-qa-relogin'],undefined);
  assert.match(els.status.textContent,/已驗證 Owner；abcdef1/);
});

test('missing Owner grant still shows enrollment, never a re-login',async()=>{
  globalThis.fetch=async url=>url==='https://relay.test/runtime-manifest'?{ok:false,json:async()=>({error:'OWNER_TEST_GRANT_REQUIRED'})}:{json:async()=>({})};
  calls.length=0;els.enroll.hidden=true;
  await click();
  assert.deepEqual(calls,[]);assert.equal(els.enroll.hidden,false);
});
