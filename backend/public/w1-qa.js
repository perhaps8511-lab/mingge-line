const $=id=>document.getElementById(id);
const SUITE_SHA256='dac0b95f771e539a8416431dac8a35da30e53b66bdc118621a2496f06214e8ff';
const config=await(await fetch('/ui-config',{cache:'no-store'})).json();
let token,suite,manifest,running=false,stop=false,rows=[];
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
 try{
  for(const c of suite.cases){if(stop)break;const began=Date.now();const request_id=suite.campaign+'-'+c.case_key;
   $('status').textContent=`執行 ${rows.length+1}/125：${c.case_key}`;
   const created=await api('/gua-records',{...c.input,request_id,session_id:request_id});
   if(!created.id||created.readback_verified!==true)throw new Error('SAVE_UNCONFIRMED');
   let result;const until=Date.now()+750000;
   do{await pause(2000);result=await api('/regression/records/'+created.id);if(['completed','failed','generation_unknown'].includes(result.state))break;}while(Date.now()<until);
   rows.push({case_key:c.case_key,...result});$('summary').textContent=JSON.stringify({completed:rows.length,states:rows.reduce((a,r)=>(a[r.state]=(a[r.state]??0)+1,a),{})},null,2);$('download').disabled=false;
   if(!['completed','failed'].includes(result.state))throw new Error('GENERATION_UNRESOLVED');
   await pause(Math.max(0,11000-(Date.now()-began)));
  }
  $('status').textContent=rows.length===125?'125 題已完成；仍須機械／語意判分，不代表 PASS。':'已停止，保留已完成結果。';
 }catch{$('status').textContent='結果未確認，已停止且不自動重送；請由 Codex 查 owning store。';}
 finally{running=false;$('stop').disabled=true;$('run').disabled=true;}
};
$('download').onclick=()=>{const blob=new Blob([JSON.stringify({kind:'W1_SYNTHETIC_RESULTS',manifest,verified_suite_sha256:SUITE_SHA256,source_sha256:suite.source_sha256,campaign:suite.campaign,rows},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=suite.campaign+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
