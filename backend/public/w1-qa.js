import {phasePlan,isNewWork,caseCost,projection,summarize,HARD_CAP_USD,REVIEW_STOP_USD,COST_STOP_CODES} from './w1-qa-cost.js';
const $=id=>document.getElementById(id);
const SUITE_SHA256='dac0b95f771e539a8416431dac8a35da30e53b66bdc118621a2496f06214e8ff';
// Run namespace (GPT R8 re-review + Codex 5272047 amendment): the frozen suite bytes/campaign stay unchanged;
// each deployed revision AND each effective safety binding gets its own request_id space, so a rerun never
// reuses records produced under another revision or classifier configuration.
// Same stable serialization as src/w1/start.js computes the manifest fingerprint with.
const stable=v=>Array.isArray(v)?'['+v.map(stable).join(',')+']':v&&typeof v==='object'?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+stable(v[k])).join(',')+'}':JSON.stringify(v);
const sha256Hex=async text=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),x=>x.toString(16).padStart(2,'0')).join('');
// Fail closed unless the classifier is configured and the published fingerprint matches its effective binding.
export async function safetyFingerprintOf(manifest){
 if(manifest?.safety_binding_status!=='CONFIGURED'||!manifest.safety_binding)throw new Error('SAFETY_BINDING_NOT_CONFIGURED');
 const fp=manifest.safety_binding_fingerprint;
 if(typeof fp!=='string'||!/^[0-9a-f]{64}$/.test(fp))throw new Error('SAFETY_BINDING_FINGERPRINT_INVALID');
 if(await sha256Hex(stable(manifest.safety_binding))!==fp)throw new Error('SAFETY_BINDING_FINGERPRINT_MISMATCH');
 return fp;
}
export async function runCampaignOf(suite,manifest){
 const rev=manifest?.source_revision;
 if(typeof rev!=='string'||!/^[0-9a-f]{7,40}$/.test(rev))throw new Error('SOURCE_REVISION_UNVERIFIED');
 return suite.campaign+'-r'+rev.slice(0,7)+'-s'+(await safetyFingerprintOf(manifest)).slice(0,12);
}
// The runtime identity a run is bound to; any case served under a different one ends the run (no mixed PASS).
export const runtimeIdentity=m=>({source_revision:m?.source_revision??null,safety_binding_fingerprint:m?.safety_binding_fingerprint??null,
 runtime_binding:stable(m?.runtime_binding??null)});
export const sameRuntime=(a,b)=>['source_revision','safety_binding_fingerprint','runtime_binding'].every(k=>a[k]===b[k]);
// A fallback is never a model-route result: it is MODEL_ROUTE_FAIL and never counts toward A4 PASS.
export const modelRouteFail=result=>result?.runtime?.route==='SAFETY_FALLBACK';
const config=await(await fetch('/ui-config',{cache:'no-store'})).json();
let token,suite,manifest,running=false,stop=false,rows=[],newCosts=[],projections=[],phase='',runCampaign='',runRuntime=null,mixedRuntime=false;
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function api(path,body,headers={}){
 const response=await fetch(config.relayOrigin+path,{method:body?'POST':'GET',cache:'no-store',headers:{'X-Line-AccessToken':token,'Content-Type':'application/json',...headers},body:body?JSON.stringify(body):undefined});
 const value=await response.json();if(!response.ok)throw new Error(value.error??'UNCONFIRMED');return value;
}
function ready(){ $('run').disabled=running||!suite||!manifest; }
async function owner(){manifest=await api('/runtime-manifest');if(manifest.environment!=='staging'||manifest.runtime_status!=='CONFIGURED_NOT_LIVE_VERIFIED')throw new Error('WRONG_RUNTIME');$('status').textContent='已驗證 Owner；'+manifest.source_revision;ready();}
$('login').onclick=async()=>{try{await liff.init({liffId:config.liffId});if(!liff.isLoggedIn()){liff.login({redirectUri:location.origin+'/w1-qa.html'});return;}token=liff.getAccessToken();await owner();}catch(e){if(e.message==='OWNER_TEST_GRANT_REQUIRED')$('enroll').hidden=false;else $('status').textContent='登入／runtime 未確認';}};
$('enroll').onsubmit=async event=>{event.preventDefault();const secret=$('enrollment-token').value;$('enrollment-token').value='';try{await api('/test-grants/enroll',{}, {'X-W1-Enrollment-Token':secret});$('enroll').hidden=true;await owner();}catch{$('status').textContent='授權尚未確認，不重送。';}};
$('suite').onchange=async()=>{try{
 const file=$('suite').files[0];if(!file||file.size>1000000)throw new Error();
 const bytes=await file.arrayBuffer();const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');
 if(digest!==SUITE_SHA256)throw new Error('SUITE_SHA_MISMATCH');
 const candidate=JSON.parse(new TextDecoder().decode(bytes));
 if(candidate.kind!=='W1_FROZEN_SYNTHETIC_125'||candidate.cases?.length!==125||!/^w1-regress-[a-zA-Z0-9_-]{1,40}$/.test(candidate.campaign)||!candidate.source_sha256?.match(/^[a-f0-9]{64}$/))throw new Error();
 const ids=new Set();for(const c of candidate.cases){if(!c.case_key?.match(/^[A-Z0-9-]{1,24}$/)||ids.has(c.case_key)||!c.input||typeof c.input.question_text!=='string'||c.input.question_text.length>4000||Object.keys(c.input).some(k=>!['ben_gua','bian_gua','dong_yao','qigua_time','question_text'].includes(k)))throw new Error();ids.add(c.case_key);}
 suite=candidate;$('status').textContent='已載入 125 題合成題庫。';ready();
}catch{suite=null;$('status').textContent='題庫格式不符，未執行。';ready();}};
$('stop').onclick=()=>{stop=true;};
$('run').onclick=async()=>{
 if(!suite||!manifest||running||rows.length)return;running=true;stop=false;ready();$('stop').disabled=false;$('suite').disabled=true;
 let halt='',fresh=0;
 try{
  // Scope is the fixed phase list; new-vs-reused comes from the server's reused flag.
  const plan=phasePlan(suite.cases,$('phase').value);phase=$('phase').value;
  // Fresh-read the runtime at every start (a reload/resume is a new start) and bind the run to it.
  manifest=await api('/runtime-manifest');if(manifest.environment!=='staging'||manifest.runtime_status!=='CONFIGURED_NOT_LIVE_VERIFIED')throw new Error('WRONG_RUNTIME');
  runCampaign=await runCampaignOf(suite,manifest);runRuntime=runtimeIdentity(manifest);
  for(const [i,c] of plan.cases.entries()){if(stop)break;const began=Date.now();const request_id=runCampaign+'-'+c.case_key;
   $('status').textContent=`${phase==='targeted'?'第一階段 targeted':'第二階段 remaining'} ${i+1}/${plan.cases.length}：${c.case_key}`;
   // End-to-end timing from this phone: LIFF token -> Worker LINE verify -> backend (+ classifier) -> saved.
   let created;const t0=performance.now();
   try{created=await api('/gua-records',{...c.input,request_id,session_id:request_id});}
   catch(e){if(COST_STOP_CODES.includes(e.message)){halt=`成本守門停止（${e.message}），停止並回報 Owner。`;break;}throw e;}
   if(!created.id||created.readback_verified!==true)throw new Error('SAVE_UNCONFIRMED');
   const submitMs=Math.round(performance.now()-t0);
   const isNew=isNewWork(created);
   let result;const until=Date.now()+750000;
   do{await pause(isNew?2000:0);result=await api('/regression/records/'+created.id);if(['completed','failed','generation_unknown'].includes(result.state))break;if(!isNew)await pause(2000);}while(Date.now()<until);
   const terminalMs=Math.round(performance.now()-t0);
   const cc=caseCost(result.cost);
   if(isNew){fresh++;newCosts.push(cc.usd);}
   const routeFail=modelRouteFail(result);
   rows.push({case_key:c.case_key,phase,new_in_this_run:isNew,case_cost_usd:cc.usd,submit_ms:submitMs,terminal_ms:terminalMs,...result,...(routeFail?{verdict:'MODEL_ROUTE_FAIL',a4_countable:false}:{})});
   const proj=projection({totalEffectiveUsd:result.cost_total?.total_effective_usd??0,newCaseCosts:newCosts,remainingCases:plan.remainingAfter(i)});
   projections.push({after:c.case_key,...proj});
   $('summary').textContent=JSON.stringify({phase,processed:rows.length,new_this_run:fresh,states:rows.reduce((a,r)=>(a[r.state]=(a[r.state]??0)+1,a),{}),
    ...proj,baseline:summarize(rows)},null,2);$('download').disabled=false;
   if(COST_STOP_CODES.includes(result.error_code)){halt=`成本守門已停止生成（${result.error_code}），停止並回報 Owner。`;break;}
   if(!sameRuntime(runRuntime,runtimeIdentity(result.manifest))){mixedRuntime=true;rows[rows.length-1].runtime_mismatch=true;halt=`${c.case_key} 的 runtime（revision／binding）與本 run 不符，停止；本 run 結果不得合併判 PASS。`;break;}
   if(routeFail&&phase==='targeted'){halt=`${c.case_key} 為 SAFETY_FALLBACK（MODEL_ROUTE_FAIL），targeted 階段停止，不計 A4 PASS。`;break;}
   if(!['completed','failed'].includes(result.state))throw new Error('GENERATION_UNRESOLVED');
   if(proj.stop){halt=`預估總額 US$${proj.projected_total_usd} 超過 US$30，停止並回報 Owner，不自動加額。`;break;}
   if(proj.review_stop){halt=`累積成本 US$${proj.spent_incl_canary_usd} 已達 US$20 且尚未跑完，停止回審。`;break;}
   if(isNew)await pause(Math.max(0,11000-(Date.now()-began)));
  }
  const done=rows.length===plan.cases.length;
  $('status').textContent=halt||(!done?`已停止：本階段 ${rows.length}/${plan.cases.length} 題；請下載結果，依實際清單判定完整性。`:phase==='targeted'?`第一階段 targeted 20 題已處理（新題 ${fresh}）；請下載結果，待回讀成本後再執行第二階段。`:'第二階段已處理；仍須機械／語意判分，不代表 PASS。');
 }catch{$('status').textContent='結果未確認，已停止且不自動重送；請由 Codex 查 owning store。';}
 finally{running=false;$('stop').disabled=true;$('run').disabled=true;}
};
$('download').onclick=()=>{const blob=new Blob([JSON.stringify({kind:'W1_SYNTHETIC_RESULTS',manifest,verified_suite_sha256:SUITE_SHA256,suite_sha256:SUITE_SHA256,source_sha256:suite.source_sha256,campaign:suite.campaign,suite_campaign:suite.campaign,run_campaign:runCampaign,source_revision:runRuntime?.source_revision??null,
  safety_binding_fingerprint:runRuntime?.safety_binding_fingerprint??null,safety_binding:manifest?.safety_binding??null,
  fingerprint_scope:'safety_binding_fingerprint = sha256(stable effective safety binding: provider,model,temperature,maxOutputTokens,thinking,safety,timeoutMs); not the adapter requested_config.config_fingerprint (which omits model/timeout)',
  mixed_runtime:mixedRuntime,model_route_fail:rows.filter(r=>r.verdict==='MODEL_ROUTE_FAIL').map(r=>r.case_key),phase,rows,cost_baseline:summarize(rows),projections,hard_cap_usd:HARD_CAP_USD,review_stop_usd:REVIEW_STOP_USD},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=(runCampaign||suite.campaign)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
