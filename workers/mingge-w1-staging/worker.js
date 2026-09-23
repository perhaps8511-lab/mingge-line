const encoder=new TextEncoder();
const b64=bytes=>btoa(String.fromCharCode(...new Uint8Array(bytes)));
const b64url=bytes=>b64(bytes).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
const unbase64=value=>Uint8Array.from(atob(value),c=>c.charCodeAt(0));
const AUTH_CODES=new Set(['MISSING_LINE_TOKEN','LINE_CONFIG_MISSING','LINE_VERIFY_HTTP_REJECTED','LINE_AUDIENCE_MISMATCH',
  'LINE_EXPIRED','LINE_PROFILE_HTTP_REJECTED','LINE_PROFILE_INVALID','SIGNING_FAILED','API_FORWARD_FAILED','API_FORWARD_SUCCEEDED',
  'API_RESPONSE_UNAUTHORIZED','API_RESPONSE_REJECTED','AUTH_INTERNAL']);
function authError(code){const error=new Error(code);error.authCode=code;return error;}
function routeClass(path){
  if(path==='/quota')return 'QUOTA';
  if(path==='/test-grants/enroll'||/^\/test-grants\/[0-9a-f-]{36}\/revoke$/.test(path))return 'ENROLL';
  if(path==='/gua-records'||/^\/gua-records\//.test(path))return 'HISTORY';
  return 'OTHER';
}
function logAuth(env,route,code,status){
  if(env.W1_ENVIRONMENT!=='staging')return;
  const safeCode=AUTH_CODES.has(code)?code:'AUTH_INTERNAL';
  const safeRoute=['QUOTA','ENROLL','HISTORY','OTHER'].includes(route)?route:'OTHER';
  console.info(JSON.stringify({event:'W1_AUTH_DIAG',route_class:safeRoute,code:safeCode,status:Number.isInteger(status)?status:503}));
}
const reply=(body,status=200,origin)=>new Response(JSON.stringify(body),{status,headers:{
  'Content-Type':'application/json','Cache-Control':'no-store','Referrer-Policy':'no-referrer',
  ...(origin?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{}),
}});
export async function subjectToken(subject,requestId,source,env) {
  if(!/^U[0-9a-f]{32}$/.test(subject)||!env.W1_SUBJECT_KID||!env.W1_SUBJECT_PRIVATE_KEY_PKCS8)throw authError('SIGNING_FAILED');
  let key;try{key=await crypto.subtle.importKey('pkcs8',unbase64(env.W1_SUBJECT_PRIVATE_KEY_PKCS8),{name:'Ed25519'},false,['sign']);}
  catch{throw authError('SIGNING_FAILED');}
  const now=Math.floor(Date.now()/1000);
  const head=b64url(encoder.encode(JSON.stringify({alg:'EdDSA',typ:'JWT',kid:env.W1_SUBJECT_KID})));
  const claims=b64url(encoder.encode(JSON.stringify({sub:subject,iss:'mingge-relay',aud:'mingge-api',
    iat:now,exp:now+120,jti:crypto.randomUUID(),src:source,req:requestId})));
  try{return `${head}.${claims}.${b64url(await crypto.subtle.sign('Ed25519',key,encoder.encode(`${head}.${claims}`)))}`;}
  catch{throw authError('SIGNING_FAILED');}
}
export async function verifyAccessToken(token,channelId,fetchImpl=fetch) {
  if(!token)throw authError('MISSING_LINE_TOKEN');if(!channelId)throw authError('LINE_CONFIG_MISSING');
  const verifyUrl=new URL('https://api.line.me/oauth2/v2.1/verify');verifyUrl.searchParams.set('access_token',token);
  let a;try{a=await fetchImpl(verifyUrl,{redirect:'error',signal:AbortSignal.timeout(10000)});}catch{throw authError('LINE_VERIFY_HTTP_REJECTED');}
  if(!a.ok)throw authError('LINE_VERIFY_HTTP_REJECTED');
  let info;try{info=await a.json();}catch{throw authError('LINE_VERIFY_HTTP_REJECTED');}
  if(info.client_id!==channelId)throw authError('LINE_AUDIENCE_MISMATCH');if(!(info.expires_in>0))throw authError('LINE_EXPIRED');
  let p;try{p=await fetchImpl('https://api.line.me/v2/profile',{headers:{Authorization:`Bearer ${token}`},redirect:'error',signal:AbortSignal.timeout(10000)});}catch{throw authError('LINE_PROFILE_HTTP_REJECTED');}
  if(!p.ok)throw authError('LINE_PROFILE_HTTP_REJECTED');let profile;try{profile=await p.json();}catch{throw authError('LINE_PROFILE_INVALID');}
  if(!/^U[0-9a-f]{32}$/.test(profile.userId))throw authError('LINE_PROFILE_INVALID');return profile.userId;
}
export async function verifyWebhook(raw,signature,secret) {
  if(!secret||!signature||!/^[A-Za-z0-9+/]{43}=$/.test(signature))return false;
  const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);
  return crypto.subtle.verify('HMAC',key,unbase64(signature),raw);
}
function identityField(body) {
  return body&&typeof body==='object'&&Object.entries(body).some(([k,v])=>
    ['subject','line_user_id','line_user_id_raw','user','userId'].includes(k)||identityField(v));
}
async function forward(subject,requestId,source,method,path,body,env,extra={}) {
  const target=new URL(env.W1_API_ORIGIN);
  if(target.protocol!=='https:'||target.pathname!=='/'||target.username||target.password)throw authError('API_FORWARD_FAILED');
  const signed=await subjectToken(subject,requestId,source,env);
  try{return await fetch(new URL(path,target),{method,redirect:'error',signal:AbortSignal.timeout(20000),
    headers:{'Content-Type':'application/json','X-Mingge-Subject-Token':signed,'X-Mingge-Request-Id':requestId,...extra},
    ...(method==='POST'?{body:JSON.stringify(body)}:{}),
  });}catch{throw authError('API_FORWARD_FAILED');}
}
export default {async fetch(request,env) {
  const origin=request.headers.get('origin');
  const permitted=origin===env.W1_UI_ORIGIN?origin:undefined;
  if(env.W1_ENVIRONMENT!=='staging'||!env.W1_API_ORIGIN||!env.W1_UI_ORIGIN)return reply({error:'UNCONFIGURED'},503);
  if(origin&&!permitted)return reply({error:'ORIGIN_REJECTED'},403);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{
    'Access-Control-Allow-Origin':permitted??env.W1_UI_ORIGIN,'Access-Control-Allow-Methods':'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers':'Content-Type,X-Line-AccessToken,X-W1-Enrollment-Token','Vary':'Origin','Cache-Control':'no-store',
  }});
  try {
    const url=new URL(request.url);
    const route=routeClass(url.pathname);
    if(Number(request.headers.get('content-length')||0)>20000)return reply({error:'BAD_FIELD'},400,permitted);
    const raw=await request.arrayBuffer();if(raw.byteLength>20000)return reply({error:'BAD_FIELD'},400,permitted);
    if(url.pathname==='/webhook'&&request.method==='POST') {
      if(!await verifyWebhook(raw,request.headers.get('x-line-signature'),env.LINE_CHANNEL_SECRET))return reply({error:'UNAUTHORIZED'},400);
      const data=JSON.parse(new TextDecoder().decode(raw));
      if(!Array.isArray(data.events)||data.events.length>20)return reply({error:'BAD_FIELD'},400);
      for(const event of data.events) {
        if(event.type!=='postback'||!/^w1-repush:[0-9a-f-]{36}$/.test(event.postback?.data??''))continue;
        const id=event.postback.data.slice(10);
        const r=await forward(event.source?.userId,event.webhookEventId,'line_webhook','POST',`/gua-records/${id}/repush`,{},env);
        if(!r.ok)return reply({error:'SERVICE_UNAVAILABLE'},503);
      }
      return reply({ok:true});
    }
    if(!['GET','POST'].includes(request.method)||url.search)return reply({error:'BAD_FIELD'},400,permitted);
    if(!/^\/(quota|runtime-manifest|regression\/records\/[0-9a-f-]{36}|test-grants\/enroll|test-grants\/[0-9a-f-]{36}\/revoke|gua-records(?:\/[0-9a-f-]{36}(?:\/repush)?)?)$/.test(url.pathname))return reply({error:'NOT_FOUND'},404,permitted);
    const body=raw.byteLength?JSON.parse(new TextDecoder().decode(raw)):{};
    if(identityField(body))return reply({error:'BAD_FIELD'},400,permitted);
    const subject=await verifyAccessToken(request.headers.get('X-Line-AccessToken'),env.LINE_CHANNEL_ID);
    const requestId=body.request_id??crypto.randomUUID();
    const extra=url.pathname==='/test-grants/enroll'?{'X-W1-Enrollment-Token':request.headers.get('X-W1-Enrollment-Token')??''}:{};
    const result=await forward(subject,requestId,'liff',request.method,url.pathname,body,env,extra);
    if(result.status===401)logAuth(env,route,'API_RESPONSE_UNAUTHORIZED',401);
    else if(!result.ok)logAuth(env,route,'API_RESPONSE_REJECTED',result.status);
    else logAuth(env,route,'API_FORWARD_SUCCEEDED',result.status);
    return new Response(await result.arrayBuffer(),{status:result.status,headers:{'Content-Type':'application/json','Cache-Control':'no-store',
      ...(permitted?{'Access-Control-Allow-Origin':permitted,'Vary':'Origin'}:{})}});
  } catch(error) {
    const route=routeClass(new URL(request.url).pathname);
    logAuth(env,route,AUTH_CODES.has(error?.authCode)?error.authCode:'AUTH_INTERNAL',503);
    return reply({error:'SERVICE_UNAVAILABLE'},503,permitted);
  }
}};
