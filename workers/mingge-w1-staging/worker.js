const encoder=new TextEncoder();
const b64=bytes=>btoa(String.fromCharCode(...new Uint8Array(bytes)));
const b64url=bytes=>b64(bytes).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
const unbase64=value=>Uint8Array.from(atob(value),c=>c.charCodeAt(0));
const reply=(body,status=200,origin)=>new Response(JSON.stringify(body),{status,headers:{
  'Content-Type':'application/json','Cache-Control':'no-store','Referrer-Policy':'no-referrer',
  ...(origin?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{}),
}});
export async function subjectToken(subject,requestId,source,env) {
  if(!/^U[0-9a-f]{32}$/.test(subject)||!env.W1_SUBJECT_KID||!env.W1_SUBJECT_PRIVATE_KEY_PKCS8)throw new Error('AUTH_UNCONFIGURED');
  const key=await crypto.subtle.importKey('pkcs8',unbase64(env.W1_SUBJECT_PRIVATE_KEY_PKCS8),{name:'Ed25519'},false,['sign']);
  const now=Math.floor(Date.now()/1000);
  const head=b64url(encoder.encode(JSON.stringify({alg:'EdDSA',typ:'JWT',kid:env.W1_SUBJECT_KID})));
  const claims=b64url(encoder.encode(JSON.stringify({sub:subject,iss:'mingge-relay',aud:'mingge-api',
    iat:now,exp:now+120,jti:crypto.randomUUID(),src:source,req:requestId})));
  return `${head}.${claims}.${b64url(await crypto.subtle.sign('Ed25519',key,encoder.encode(`${head}.${claims}`)))}`;
}
export async function verifyAccessToken(token,channelId,fetchImpl=fetch) {
  if(!token||!channelId)throw new Error('UNAUTHORIZED');
  const verifyUrl=new URL('https://api.line.me/oauth2/v2.1/verify');verifyUrl.searchParams.set('access_token',token);
  const a=await fetchImpl(verifyUrl,{redirect:'error',signal:AbortSignal.timeout(10000)});
  if(!a.ok)throw new Error('UNAUTHORIZED');
  const info=await a.json();if(info.client_id!==channelId||!(info.expires_in>0))throw new Error('UNAUTHORIZED');
  const p=await fetchImpl('https://api.line.me/v2/profile',{headers:{Authorization:`Bearer ${token}`},redirect:'error',signal:AbortSignal.timeout(10000)});
  if(!p.ok)throw new Error('UNAUTHORIZED');const profile=await p.json();
  if(!/^U[0-9a-f]{32}$/.test(profile.userId))throw new Error('UNAUTHORIZED');return profile.userId;
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
  if(target.protocol!=='https:'||target.pathname!=='/'||target.username||target.password)throw new Error('TARGET_INVALID');
  const signed=await subjectToken(subject,requestId,source,env);
  return fetch(new URL(path,target),{method,redirect:'error',signal:AbortSignal.timeout(20000),
    headers:{'Content-Type':'application/json','X-Mingge-Subject-Token':signed,'X-Mingge-Request-Id':requestId,...extra},
    ...(method==='POST'?{body:JSON.stringify(body)}:{}),
  });
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
    return new Response(await result.arrayBuffer(),{status:result.status,headers:{'Content-Type':'application/json','Cache-Control':'no-store',
      ...(permitted?{'Access-Control-Allow-Origin':permitted,'Vary':'Origin'}:{})}});
  } catch {return reply({error:'SERVICE_UNAVAILABLE'},503,permitted);}
}};
