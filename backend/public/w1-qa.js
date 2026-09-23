import {orderCases,caseCost,projection,summarize,HARD_CAP_USD} from './w1-qa-cost.js';
const $=id=>document.getElementById(id);
const SUITE_SHA256='dac0b95f771e539a8416431dac8a35da30e53b66bdc118621a2496f06214e8ff';
const config=await(await fetch('/ui-config',{cache:'no-store'})).json();
let token,suite,manifest,running=false,stop=false,rows=[],newCosts=[],projections=[];
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
 const limit=Math.max(1,Math.min(125,Number($('limit').value)||20));let fresh=0,halt='';
 try{
  for(const c of orderCases(suite.cases)){if(stop||fresh>=limit)break;const began=Date.now();const request_id=suite.campaign+'-'+c.case_key;
   $('status').textContent=`執行 ${rows.length+1}/125（本段新題 ${fresh}/${limit}）：${c.case_key}`;
   let created;
   try{created=await api('/gua-records',{...c.input,request_id,session_id:request_id});}
   catch(e){if(e.message==='COST_HARD_CAP_REACHED'){halt='已達 US$30 硬上限，停止並回報 Owner。';break;}throw e;}
   if(!created.id||created.readback_verified!==true)throw new Error('SAVE_UNCONFIRMED');
   // Same request_id returns the stored record: no new model or classifier call, no new spend.
   const isNew=created.state==='queued';
   let result;const until=Date.now()+750000;
   do{if(isNew)await pause(2000);result=await api('/regression/records/'+created.id);if(['completed','failed','generation_unknown'].includes(result.state))break;if(!isNew)await pause(2000);}while(Date.now()<until);
   const cc=caseCost(result.cost);
   if(isNew){fresh++;newCosts.push(cc.usd);}
   rows.push({case_key:c.case_key,new_in_this_run:isNew,case_cost_usd:cc.usd,...result});
   const remaining=125-rows.length;
   const proj=projection({totalEffectiveUsd:result.cost_total?.total_effective_usd??0,newCaseCosts:newCosts,remainingCases:remaining});
   projections.push({after:c.case_key,...proj});
   $('summary').textContent=JSON.stringify({completed:rows.length,new_this_run:fresh,states:rows.reduce((a,r)=>(a[r.state]=(a[r.state]??0)+1,a),{}),
    spent_effective_usd:result.cost_total?.total_effective_usd,...proj,baseline:summarize(rows)},null,2);$('download').disabled=false;
   if(['COST_HARD_CAP_REACHED','PROVIDER_BUDGET_EXHAUSTED'].includes(result.error_code)){halt='預算守門已停止生成，停止並回報 Owner。';break;}
   if(!['completed','failed'].includes(result.state))throw new Error('GENERATION_UNRESOLVED');
   if(proj.stop){halt=`預估總額 US$${proj.projected_total_usd} 超過 US$30，停止並回報 Owner，不自動加額。`;break;}
   if(isNew)await pause(Math.max(0,11000-(Date.now()-began)));
  }
  $('status').textContent=halt||(rows.length===125?'125 題已完成；仍須機械／語意判分，不代表 PASS。':`本段完成 ${fresh} 題新題；請下載結果，回讀成本後再決定是否續跑。`);
 }catch{$('status').textContent='結果未確認，已停止且不自動重送；請由 Codex 查 owning store。';}
 finally{running=false;$('stop').disabled=true;$('run').disabled=true;}
};
$('download').onclick=()=>{const blob=new Blob([JSON.stringify({kind:'W1_SYNTHETIC_RESULTS',manifest,verified_suite_sha256:SUITE_SHA256,source_sha256:suite.source_sha256,campaign:suite.campaign,rows,cost_baseline:summarize(rows),projections,hard_cap_usd:HARD_CAP_USD},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=suite.campaign+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
