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
