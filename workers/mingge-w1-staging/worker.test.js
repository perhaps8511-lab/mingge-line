import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './worker.js';

const env={W1_ENVIRONMENT:'staging',W1_API_ORIGIN:'https://api.example.test',W1_UI_ORIGIN:'https://ui.example.test',LINE_CHANNEL_ID:'expected'};
async function withConsoleAndFetch(fetchImpl,run) {
  const originalFetch=globalThis.fetch,originalInfo=console.info,records=[];
  globalThis.fetch=fetchImpl;console.info=(line)=>records.push(JSON.parse(line));
  try{return await run(records);}finally{globalThis.fetch=originalFetch;console.info=originalInfo;}
}
function request(token='synthetic-secret-token') {
  const headers=new Headers();if(token!==null)headers.set('X-Line-AccessToken',token);
  return new Request('https://worker.example.test/quota',{headers});
}

test('staging logs fixed LINE auth reason without token and preserves rejection response',async()=>{
  await withConsoleAndFetch(async()=>{throw new Error('must not call LINE without token');},async logs=>{
    const response=await worker.fetch(request(null),env);
    assert.equal(response.status,503);
    assert.deepEqual(await response.json(),{error:'SERVICE_UNAVAILABLE'});
    assert.deepEqual(logs,[{event:'W1_AUTH_DIAG',route_class:'QUOTA',code:'MISSING_LINE_TOKEN',status:503}]);
    assert.equal(JSON.stringify(logs).includes('synthetic-secret-token'),false);
  });
});

test('staging logs LINE audience failure as a fixed code and never emits upstream data',async()=>{
  await withConsoleAndFetch(async input=>{
    assert.equal(String(input).startsWith('https://api.line.me/oauth2/v2.1/verify?'),true);
    return Response.json({client_id:'unexpected-private-value',expires_in:100});
  },async logs=>{
    const response=await worker.fetch(request(),env);
    assert.equal(response.status,503);
    assert.deepEqual(await response.json(),{error:'SERVICE_UNAVAILABLE'});
    assert.deepEqual(logs,[{event:'W1_AUTH_DIAG',route_class:'QUOTA',code:'LINE_AUDIENCE_MISMATCH',status:503}]);
    assert.equal(JSON.stringify(logs).includes('synthetic-secret-token'),false);
    assert.equal(JSON.stringify(logs).includes('unexpected-private-value'),false);
  });
});

test('auth diagnostics are silent outside staging',async()=>{
  const nonStaging={...env,W1_ENVIRONMENT:'production'};
  await withConsoleAndFetch(async()=>{throw new Error('must not call LINE without token');},async logs=>{
    const response=await worker.fetch(request(null),nonStaging);
    assert.equal(response.status,503);
    assert.deepEqual(await response.json(),{error:'UNCONFIGURED'});
    assert.deepEqual(logs,[]);
  });
});

test('LINE verify rejection is split into fixed codes without upstream text',async()=>{
  const cases=[
    [async()=>{throw new Error('synthetic network private-detail');},'LINE_VERIFY_FETCH_FAILED'],
    [async()=>Response.json({error:'invalid_request',error_description:'access token expired private-detail'},{status:400}),'LINE_VERIFY_TOKEN_EXPIRED'],
    [async()=>Response.json({error:'invalid_request',error_description:'invalid access token private-detail'},{status:400}),'LINE_VERIFY_TOKEN_INVALID'],
    [async()=>Response.json({error:'invalid_request',error_description:'The access token not JWS'},{status:400}),'LINE_VERIFY_TOKEN_INVALID'],
    [async()=>new Response('private-detail',{status:400}),'LINE_VERIFY_STATUS_400'],
    [async()=>new Response('private-detail',{status:401}),'LINE_VERIFY_STATUS_401'],
    [async()=>new Response('private-detail',{status:403}),'LINE_VERIFY_STATUS_4XX'],
    [async()=>new Response('private-detail',{status:502}),'LINE_VERIFY_STATUS_5XX'],
    [async()=>new Response('not-json private-detail',{status:200}),'LINE_VERIFY_BODY_INVALID'],
  ];
  for(const [fetchImpl,code] of cases) {
    await withConsoleAndFetch(fetchImpl,async logs=>{
      const response=await worker.fetch(request(),env);
      assert.equal(response.status,503);
      assert.deepEqual(await response.json(),{error:'SERVICE_UNAVAILABLE'});
      assert.deepEqual(logs,[{event:'W1_AUTH_DIAG',route_class:'QUOTA',code,status:503}]);
      const text=JSON.stringify(logs);
      assert.equal(text.includes('private-detail'),false);
      assert.equal(text.includes('synthetic-secret-token'),false);
    });
  }
});

// Workers runtime throws TypeError on redirect:'error' (Node does not), so lock 'manual' explicitly.
async function signedEnv() {
  const pair=await crypto.subtle.generateKey({name:'Ed25519'},true,['sign','verify']);
  const pkcs8=Buffer.from(await crypto.subtle.exportKey('pkcs8',pair.privateKey)).toString('base64');
  return {...env,W1_SUBJECT_KID:'synthetic-kid',W1_SUBJECT_PRIVATE_KEY_PKCS8:pkcs8};
}
const SUBJECT='U'+'0'.repeat(32);
function lineOk(input,init,calls,apiResponse) {
  calls.push({url:String(input),redirect:init?.redirect});
  if(String(input).startsWith('https://api.line.me/oauth2/v2.1/verify?'))return Response.json({client_id:'expected',expires_in:100});
  if(String(input)==='https://api.line.me/v2/profile')return Response.json({userId:SUBJECT});
  return apiResponse();
}

test('every upstream fetch uses redirect manual and success forwards the API response',async()=>{
  const signed=await signedEnv(),calls=[];
  await withConsoleAndFetch(async(input,init)=>lineOk(input,init,calls,()=>Response.json({remaining:3})),async logs=>{
    const response=await worker.fetch(request(),signed);
    assert.equal(response.status,200);
    assert.deepEqual(await response.json(),{remaining:3});
    assert.equal(calls.length,3);
    assert.deepEqual(calls.map(c=>c.redirect),['manual','manual','manual']);
    assert.equal(calls[2].url,'https://api.example.test/quota');
    assert.deepEqual(logs,[{event:'W1_AUTH_DIAG',route_class:'QUOTA',code:'API_FORWARD_SUCCEEDED',status:200}]);
    assert.equal(JSON.stringify(logs).includes(SUBJECT),false);
  });
});

test('API redirect is not followed or relayed',async()=>{
  const signed=await signedEnv(),calls=[];
  await withConsoleAndFetch(async(input,init)=>lineOk(input,init,calls,()=>new Response(null,{status:302,headers:{Location:'https://elsewhere.example.test/'}})),async logs=>{
    const response=await worker.fetch(request(),signed);
    assert.equal(response.status,503);
    assert.deepEqual(await response.json(),{error:'SERVICE_UNAVAILABLE'});
    assert.equal(response.headers.get('Location'),null);
    assert.equal(calls.length,3);
    assert.deepEqual(logs,[{event:'W1_AUTH_DIAG',route_class:'QUOTA',code:'API_FORWARD_FAILED',status:503}]);
  });
});

test('LINE verify redirect is rejected, not followed',async()=>{
  const calls=[];
  await withConsoleAndFetch(async(input,init)=>{calls.push(init?.redirect);return new Response(null,{status:302,headers:{Location:'https://elsewhere.example.test/'}});},async logs=>{
    const response=await worker.fetch(request(),env);
    assert.equal(response.status,503);
    assert.deepEqual(calls,['manual']);
    assert.deepEqual(logs,[{event:'W1_AUTH_DIAG',route_class:'QUOTA',code:'LINE_VERIFY_STATUS_4XX',status:503}]);
  });
});
