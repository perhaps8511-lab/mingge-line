import pg from 'pg';
import {readFileSync} from 'node:fs';
import {W1Store} from './store.js';
import {W1Service} from './service.js';
import {createW1Server} from './http.js';
import {createSubjectVerifier,postgresJtiConsumer} from './subject.js';
import {createLegacyReader} from './legacy.js';
import {loadV34} from './registry.js';
import {loadClassics,loadPrefix,createPromptBuilder,CLASSICS_SHA,PREFIX_SHA} from './classics.js';
import {createGeminiAdapter} from './gemini.js';
import {createSafetyClassifier} from './safety.js';
import {createLinePush} from './line.js';
import {BASIS,A11} from './admission.js';
import {copy} from '../../public/copy.js';
import {randomUUID} from 'node:crypto';
const env=process.env;
const emit=error_code=>process.stdout.write(JSON.stringify({error_code})+'\n');
async function boot() {
 if(env.W1_ENVIRONMENT!=='staging'||!env.W1_DATABASE_URL||!env.W1_SUBJECT_PUBLIC_KEY||!env.W1_SUBJECT_KID)throw new Error('W1_BINDINGS_REQUIRED');
 const pool=new pg.Pool({connectionString:env.W1_DATABASE_URL,max:5});pool.on('error',()=>emit('DATABASE_UNAVAILABLE'));
 // Schema deployment is explicit, never boot-time legacy cleanup/backfill.
 await pool.query('SELECT 1 FROM w1.gua_records LIMIT 1');
 const store=new W1Store(pool);
 const prompt=loadV34(new URL('../../../prompts/jiegua/v34.md',import.meta.url));
 const prefix=loadPrefix(new URL('../../../prompts/jiegua/rag03-b.txt',import.meta.url));
 const data=loadClassics(new URL('../../data/classics-candidate.json',import.meta.url));
 let binding,generate=null,runtimeStatus='NOT_CONFIGURED';
 if(env.W1_RUNTIME_BINDING_JSON&&env.W1_GEMINI_API_KEY) {
  binding=JSON.parse(env.W1_RUNTIME_BINDING_JSON);
  const adapter=createGeminiAdapter({binding,key:env.W1_GEMINI_API_KEY});
  const budget={campaign:env.W1_PROVIDER_CAMPAIGN,budgetUsd:Number(env.W1_PROVIDER_BUDGET_USD),upperUsd:Number(env.W1_PROVIDER_CALL_UPPER_USD)};
  if(!budget.campaign||!Number.isFinite(budget.budgetUsd)||budget.budgetUsd<=0||!Number.isFinite(budget.upperUsd)||budget.upperUsd<=0)throw new Error('PROVIDER_BUDGET_REQUIRED');
  generate=async args=>{await store.reserveProviderCall(args.recordId,args.attempt,budget);return adapter(args);};
  runtimeStatus='CONFIGURED_NOT_LIVE_VERIFIED';
 }
 const push=env.W1_LINE_CHANNEL_ACCESS_TOKEN?createLinePush({token:env.W1_LINE_CHANNEL_ACCESS_TOKEN}):async()=>{throw new Error('PUSH_UNCONFIGURED');};
 const buildPrompt=createPromptBuilder({data,prefix,prompt,mode:env.W1_RETRIEVAL_MODE??'B'});
 let classifySafety;
 if(env.W1_SAFETY_BINDING_JSON&&env.W1_GEMINI_API_KEY){
  const binding=JSON.parse(env.W1_SAFETY_BINDING_JSON);
  if(binding.maxOutputTokens>512)throw new Error('SAFETY_OUTPUT_CAP_REQUIRED');
  const classify=createSafetyClassifier(createGeminiAdapter({binding,key:env.W1_GEMINI_API_KEY}));
  const budget={campaign:env.W1_SAFETY_CAMPAIGN,budgetUsd:Number(env.W1_SAFETY_BUDGET_USD),upperUsd:Number(env.W1_SAFETY_CALL_UPPER_USD)};
  classifySafety=async(subject,input)=>{const claim=await store.reserveSafetyCall(subject,budget,input);if(claim.cached)return claim.result.detection;try{const result=await classify(input.question_text);await pool.query('UPDATE w1.safety_calls SET runtime_json=$2,result_json=$3 WHERE id=$1',[claim.id,JSON.stringify(result.runtime),JSON.stringify({detection:result.detection})]);return result.detection;}catch{await store.alert(null,'SAFETY_CLASSIFICATION_FAILED');throw new Error('SAFETY_NO_DELIVERY');}};
 }
 const service=new W1Service({store,generate,push,buildPrompt,classifySafety,
  manifest:{service:'mingge-w1',environment:'staging',basis:BASIS,prompt:{id:prompt.id,sha256:prompt.sha256},
    prefix_sha256:PREFIX_SHA,classics_sha256:CLASSICS_SHA,classics_edition:'CANDIDATE_EDITION_UNVERIFIED',
    runtime_status:runtimeStatus,runtime_binding:binding??null,A11,waves:{replay:'W2',backfill:'W3'}}});
 let legacyReader=null;
 if(env.W1_LEGACY_READTHROUGH==='on')legacyReader=createLegacyReader({
   environment:'staging',evidence:JSON.parse(env.W1_LEGACY_EVIDENCE_JSON??'{}'),token:env.AIRTABLE_LEGACY_READ_PAT,
   tokenSha256:env.W1_LEGACY_PAT_SHA256,base:env.W1_LEGACY_BASE_ID,table:env.W1_LEGACY_TABLE_ID,
   isOwnerTestGrant:subject=>store.isOwnerTestGrant(subject),
 });
 const files={'/':'index.html','/app.js':'app.js','/copy.js':'copy.js','/qigua.js':'qigua.js','/w1.css':'w1.css','/typography.css':'typography.css'};
 const server=createW1Server({service,legacyReader,
  authenticate:createSubjectVerifier({publicKey:env.W1_SUBJECT_PUBLIC_KEY,kid:env.W1_SUBJECT_KID,consumeJti:postgresJtiConsumer(pool)}),
  enrollment:env.W1_ENROLLMENT_TOKEN?{token:env.W1_ENROLLMENT_TOKEN,quota:Number(env.W1_GRANT_QUOTA),
    expiresAt:env.W1_GRANT_EXPIRES_AT,enrollmentId:env.W1_ENROLLMENT_ID}:null,
  log:({error_code})=>emit(error_code),
  staticHandler:async(req,res,url)=>{
    if(req.method!=='GET')return false;
    if(url.pathname==='/ui-config'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});
      res.end(JSON.stringify({relayOrigin:env.W1_RELAY_ORIGIN,liffId:env.W1_LIFF_ID}));return true;}
    const name=files[url.pathname];if(!name)return false;
    const content=readFileSync(new URL('../../public/'+name,import.meta.url));
    res.writeHead(200,{'Content-Type':name.endsWith('.css')?'text/css':name.endsWith('.js')?'application/javascript':'text/html; charset=utf-8',
      'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer',
      'Content-Security-Policy':"default-src 'self'; script-src 'self' https://static.line-scdn.net; style-src 'self'; connect-src 'self' https://api.line.me https://access.line.me "+(env.W1_RELAY_ORIGIN??'')+"; frame-src https://access.line.me; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"});res.end(content);return true;
  },
 });
 const timer=setInterval(async()=>{if(ticking)return;ticking=true;try{await service.tick();}catch{emit('JOB_UNRESOLVED');}finally{ticking=false;}},1000);let ticking=false;
 let checkingSlow=false;
 const slowTimer=setInterval(async()=>{if(checkingSlow)return;checkingSlow=true;try{
   const row=await store.claimSlowNotice();if(row)await push({...row,push_key:randomUUID(),output_json:{sections:[{tag:'STATUS',text:copy.slow}]}});
 }catch{emit('SLOW_NOTICE_UNCONFIRMED');}finally{checkingSlow=false;}},5000);
 server.listen(Number(env.PORT??8080));
 const close=()=>{clearInterval(timer);clearInterval(slowTimer);server.close(()=>pool.end());};process.on('SIGTERM',close);process.on('SIGINT',close);
}
boot().catch(()=>{emit('W1_BOOT_FAILED');process.exitCode=1;});
