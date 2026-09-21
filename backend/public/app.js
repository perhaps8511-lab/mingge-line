import {qiGua} from './qigua.js';
import {copy,letterView,legacyLetterView} from './copy.js';
const $=id=>document.getElementById(id);
const config=await(await fetch('/ui-config',{cache:'no-store'})).json();
$('privacy').textContent=copy.privacy;$('login-copy').textContent=copy.beforeLogin;$('question').placeholder=copy.question;
let token,cast,requestId,pollTimer,pressedAt,remaining=0,safetyView=false;
async function api(path,body,extraHeaders={}) {
 const r=await fetch(config.relayOrigin+path,{method:body?'POST':'GET',cache:'no-store',headers:{...extraHeaders,'X-Line-AccessToken':token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
 const data=await r.json();if(!r.ok)throw new Error(data.error??'SERVICE_UNAVAILABLE');return data;
}
async function quota(){const q=await api('/quota');remaining=q.remaining;$('quota').textContent=`尚餘 ${remaining} 枚問卦銅錢。`;$('quota').hidden=safetyView;$('payment').textContent=!safetyView&&remaining<=1?copy.unavailablePayment:'';$('cast').disabled=false;}
$('login').onclick=async()=>{
 try{await liff.init({liffId:config.liffId});if(!liff.isLoggedIn()){liff.login();return;}token=liff.getAccessToken();
 $('login').hidden=true;$('login-copy').hidden=true;await quota();await history();}catch(e){if(e.message==='OWNER_TEST_GRANT_REQUIRED')$('enroll').hidden=false;else $('status').textContent=copy.unknown;}
};
$('cast').onpointerdown=e=>{if(!token)return;pressedAt=Date.now();e.target.setPointerCapture(e.pointerId);};
$('cast').onpointerup=()=>{
 if(!pressedAt||Date.now()-pressedAt<600){pressedAt=null;return;}pressedAt=null;
 // Same single-release algorithm as the existing site. Preserve original time
 // through failed submissions; never reconstruct or recast automatically.
 const instant=new Date(),tw=new Date(instant.toLocaleString('en-US',{timeZone:'Asia/Taipei'}));
 const g=qiGua(tw),pad=n=>String(n).padStart(2,'0');
 cast={ben_gua:g.ben,bian_gua:g.bian,dong_yao:g.dong,qigua_time:`${tw.getFullYear()}-${pad(tw.getMonth()+1)}-${pad(tw.getDate())}T${pad(tw.getHours())}:${pad(tw.getMinutes())}:${pad(tw.getSeconds())}+08:00`};requestId=crypto.randomUUID();
 $('gua').textContent=g.ben+' → '+g.bian;$('lines').replaceChildren();
 g.benLines.forEach((v,i)=>{const line=document.createElement('div');line.className='yao'+(i===g.dong-1?' moving':'');line.append(document.createElement('span'));if(!v)line.append(document.createElement('span'));$('lines').append(line);});$('send').disabled=false;
};
$('cast').onpointercancel=()=>{pressedAt=null;};
function show(record) {
 const view=letterView(record);safetyView=record.letter?.meta?.level==='crisis'||record.letter?.meta?.category==='self_harm';$('quota').hidden=safetyView;if(safetyView)$('payment').textContent='';$('letter').replaceChildren();
 for(const section of view.sections){const p=document.createElement('p');p.textContent=section.text;$('letter').append(p);}
 $('disclaimer').textContent=view.disclaimer??'';$('disclaimer').hidden=!view.disclaimer;
 $('status').textContent=view.notice??(record.delayed?copy.slow:record.push_state==='unknown'?copy.pushUnknown:'');
 if(view.repush){const b=document.createElement('button');b.textContent='查看我的卦記';b.onclick=()=>history();$('letter').append(b);}
 if(record.state==='failed')$('status').textContent=copy.failure;
 if(record.state==='generation_unknown')$('status').textContent=copy.unknown;
}
async function poll(id){clearTimeout(pollTimer);try{const r=await api('/gua-records/'+id);if(r.state==='completed'||r.state==='failed'||r.state==='generation_unknown'){show(r);await quota();return;}if(r.delayed)$('status').textContent=copy.slow;pollTimer=setTimeout(()=>poll(id),3000);}catch{$('status').textContent=copy.unknown;}}
$('send').onclick=async()=>{
 if(!cast||!$('question').value.trim())return;$('send').disabled=true;
 try{const r=await api('/gua-records',{...cast,request_id:requestId,session_id:requestId,question_text:$('question').value});
 if(!r.readback_verified)throw new Error();$('status').textContent=copy.saved+'\n'+copy.leave;poll(r.id);}catch{$('status').textContent=copy.unknown;$('send').disabled=false;}
};
async function history(){const data=await api('/gua-records');$('records').replaceChildren();
 $('inbox').textContent=data.records.some(r=>['unknown','failed'].includes(r.push_state))?copy.inbox:'';
 for(const r of data.records){const button=document.createElement('button');button.className='record';
 const input=r.input??r;button.textContent=[input.qigua_time,input.ben_gua,input.question_text].filter(Boolean).join(' · ');
 button.onclick=()=>{if(r.origin==='legacy'){const view=legacyLetterView(r.output_json);$('letter').textContent=view.text;$('disclaimer').textContent=view.disclaimer??'';$('disclaimer').hidden=!view.disclaimer;}else show(r);};$('records').append(button);}
}
$('history').onclick=()=>history().catch(()=>{$('status').textContent=copy.unknown;});

$('enroll').onsubmit=async e=>{e.preventDefault();const code=$('enrollment-token').value;$('enrollment-token').value='';try{await api('/test-grants/enroll',{}, {'X-W1-Enrollment-Token':code});$('enroll').hidden=true;await quota();await history();}catch{$('status').textContent=copy.unknown;}};
