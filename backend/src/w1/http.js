import http from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { recordView } from './service.js';
import { mergeRecords } from './legacy.js';
import { isAuthReasonCode } from './subject.js';
const json=(res,status,body)=>{
  res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',
    'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});res.end(JSON.stringify(body));
};
const allowedCodes=new Set(['UNAUTHORIZED','BAD_FIELD','NOT_FOUND','REQUEST_CONTENT_CONFLICT','NO_QUOTA',
  'WRITE_UNCONFIRMED','RUNTIME_BINDING_UNVERIFIED','ENROLLMENT_ALREADY_USED','GRANT_INVALID',
  'OWNER_TEST_GRANT_REQUIRED','NEEDS_BOUNDED_CHANGE','LEGACY_READ_UNAVAILABLE','NOT_DELIVERABLE','COST_HARD_CAP_REACHED']);
async function bodyOf(req) {
  let size=0; const parts=[];
  for await(const chunk of req){size+=chunk.length;if(size>20000)throw new Error('BAD_FIELD');parts.push(chunk);}
  try {const value=parts.length?JSON.parse(Buffer.concat(parts).toString('utf8')):{};
    if(!value||Array.isArray(value)||typeof value!=='object')throw new Error();return value;
  } catch {throw Object.assign(new Error('BAD_FIELD'),{status:400});}
}
function equalSecret(actual,expected) {
  if(typeof actual!=='string'||typeof expected!=='string'||expected.length<32)return false;
  const a=Buffer.from(actual),b=Buffer.from(expected);return a.length===b.length&&timingSafeEqual(a,b);
}
export function createW1Server({service,authenticate,legacyReader=null,enrollment=null,log=()=>{},staticHandler}) {
  return http.createServer(async(req,res)=>{
    try {
      const url=new URL(req.url,'http://localhost');
      if(req.method==='GET'&&url.pathname==='/health')return json(res,200,{service:'mingge-w1',environment:'staging',source_revision:service.manifest?.source_revision??'LOCAL_UNPACKAGED',runtime_status:service.manifest?.runtime_status??'UNKNOWN'});
      if(staticHandler && await staticHandler(req,res,url))return;
      const body=await bodyOf(req);
      const auth=await authenticate({token:req.headers['x-mingge-subject-token'],
        requestId:req.headers['x-mingge-request-id'],body,query:Object.fromEntries(url.searchParams)});
      if(!await service.store.hasOwnerBinding(auth.subject) && url.pathname!=='/test-grants/enroll') {
        return json(res,403,{error:'OWNER_TEST_GRANT_REQUIRED'});
      }
      let result;
      if(req.method==='GET'&&url.pathname==='/runtime-manifest') result=service.manifest;
      else if(req.method==='POST'&&url.pathname==='/test-grants/enroll') {
        if(!enrollment || Date.parse(enrollment.expiresAt)<=Date.now() || !equalSecret(req.headers['x-w1-enrollment-token'],enrollment.token)) {
          return json(res,403,{error:'OWNER_ENROLLMENT_REQUIRED'});
        }
        result=await service.store.grant(auth.subject,enrollment);
      } else if(req.method==='POST'&&/^\/test-grants\/[0-9a-f-]{36}\/revoke$/.test(url.pathname)) {
        result=await service.store.revoke(auth.subject,url.pathname.split('/')[2]);
      } else if(req.method==='GET'&&url.pathname==='/quota')result=await service.store.quota(auth.subject);
      else if(req.method==='POST'&&url.pathname==='/gua-records') result=await service.create(auth.subject,body);
      else if(req.method==='GET'&&url.pathname==='/gua-records') {
        const current=await service.store.list(auth.subject);
        let legacy=[],legacyStatus='BLOCKED_BY_READONLY_PAT';
        if(legacyReader) {try{legacy=await legacyReader(auth);legacyStatus='READ';}catch{legacyStatus='UNAVAILABLE';}}
        const merged=mergeRecords(current,legacy);
        result={records:merged.map(r=>r.origin==='legacy'?r:recordView(r)),legacy_status:legacyStatus};
      } else if(req.method==='GET'&&/^\/gua-records\/[0-9a-f-]{36}$/.test(url.pathname)) {
        result=recordView(await service.store.get(auth.subject,url.pathname.split('/')[2]));
      } else if(req.method==='GET'&&/^\/regression\/records\/[0-9a-f-]{36}$/.test(url.pathname)) {
        const row=await service.store.get(auth.subject,url.pathname.split('/')[3]);
        if(!row.request_id.startsWith('w1-regress-'))return json(res,404,{error:'NOT_FOUND'});
        result={id:row.id,state:row.state,error_code:row.error_code,raw_output:row.raw_output,runtime:row.runtime_json,charge:row.charge,manifest:service.manifest,
          cost:await service.store.recordCost(auth.subject,row.id),cost_total:await service.store.costTotal()};
      } else if(req.method==='POST'&&/^\/gua-records\/[0-9a-f-]{36}\/repush$/.test(url.pathname)) {
        result=await service.repush(auth.subject,url.pathname.split('/')[2]);
      } else return json(res,404,{error:'NOT_FOUND'});
      return json(res,200,result);
    } catch(e) {
      const code=allowedCodes.has(e.message)?e.message:'SERVICE_UNAVAILABLE';
      const status=Number.isInteger(e.status)&&e.status>=400&&e.status<=599?e.status:503;
      const logCode=isAuthReasonCode(e.authReasonCode)?e.authReasonCode:code;
      log({error_code:logCode,status});
      return json(res,status,{error:code});
    }
  });
}
