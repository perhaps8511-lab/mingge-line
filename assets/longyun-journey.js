/* Inert product rehearsal: memory-only synthetic state, no identity/token/network/store.
   Copy source of record: 00D_spec/mingge_d3_final_r3_20260911/{03,04}_*.md
   (R1-S00 五態、R6-LY-00/01/02、LP-S07=Offer Copy Master v1.0 §3 exact). Do not paraphrase. */
'use strict';
window.lyJourney={verified:false,consent:false,submitted:false,status:'unactivated',months:null,eligibility:'error',freeRemaining:null};
const jl=(r,t)=>`<a class="action" href="#${r}">${t}</a>`;
const jb=(id,t,disabled)=>`<button id="${id}" type="button"${disabled?' disabled':''}>${t}</button>`;
const jp=t=>`<p>${t}</p>`;
/* §9 LP-S07／藏主共同權益 — MINGGE_TA_OFFER_COPY_MASTER_v1_0_20260824.md §3 逐字，
   不改寫、不加新數字。相應功能與 entitlement 未 live readback 前，仍是產品說明，非已開通服務。 */
window.lyRights=()=>`<section><h2>實品與命格使用期間｜藏主共同權益</h2>${jp('三個月、半年、兩年，每一個有效月都有相同的藏主權益。差別只有陪伴多久，不是每個月拿到不同次數。')}${jp('這段時間裡，新的事情都可以問；自己的每一筆卦記都能往下深看；累積三筆卦記後，也能把一路的變化放在一起複盤。')}<ul><li><strong>三個月藏主</strong> — 適用於 NT$3,000–5,999 的龍宮舍利；從您完成啟用那一天起，連續三個月享有完整藏主權益。</li><li><strong>半年藏主</strong> — 適用於 NT$6,000–14,999 的龍宮舍利；數位權益與命格 1490 半年方案相同，從您完成啟用那一天起算。</li><li><strong>兩年藏主</strong> — 適用於 NT$15,000 以上的龍宮舍利；每一個有效月享有相同權益，從您完成啟用那一天起連續兩年。</li></ul>${jp('藏主時間從實際使用者完成啟用那一天開始，不從付款或出貨那一天算。東西還在路上的日子，不算進去。')}${jp('如果是送禮，由收禮者自己啟用；購買的人不會因此看見對方的卦記或複盤。')}${jp('如果您已經在使用命格半年方案，可以等現有方案結束後再啟用藏主權益。還沒有啟用以前，藏主時間不會開始倒數。')}${jp('這是產品權益說明。只有相應功能與 entitlement 已 live readback 後，對應句子才可公開；本候選僅展示流程，並未開通正式問卦、深卜、複盤或領取服務。')}${jl('parcel','閱讀隨貨卡與啟用說明')}</section>`;
window.renderJourney=function(route){const s=window.lyJourney;const notice='<div class="status">離線示意・沒有真實領取能力。本人驗證與權益結果皆為合成情境，不代表正式服務通過。</div>';const nav=jl('home','回龍運藏')+jl('shutong','問書僮');let content;
switch(route){
/* R6-LY-00：隨貨入口。只驗 claim 參考有效性，不讀私人資料；驗本人後才進 R6-LY-01。 */
case 'parcel':content=`<h1>這件實品附有一段命格的使用時間。</h1>${jp('命格：一件掛心的事，用一卦看清楚。')}${jp('「藏主」就是這件實品的實際使用者。是否啟用、什麼時候開始，由您自己決定；沒有啟用不會倒數。')}${jl('verify','我要看啟用說明')}${jl('home','先放著')}${jp('隨貨卡樣式見 activation-card-preview.html；此處沒有 QR token 或真正領取連結。')}`;break;
case 'rights':content='<h1>藏主使用權益</h1>'+window.lyRights();break;
/* 本人驗證（進入 R6-LY-01 前的必要步驟）。 */
case 'verify':content=`<h1>由您決定何時開始</h1>${jp('先確認您是實際使用者。送禮買家不能代替收禮者啟用；驗證不代表已同意啟用。')}${jp(s.verified?'本人驗證：示意已完成。':'本人驗證：尚未完成。')}${jp(s.months?`示意權益：${s.months} 個月（純合成，未綁定任何商品）。`:'本件期間尚未核實；可以先閱讀，不能完成啟用。')}${jb('verify-holder','本人驗證（示意）')}${jl('gift-buyer','我是送禮買家')}${s.verified?jl('activate','查看並決定是否現在啟用'):''}${jl('activation-fixtures','審閱：選擇合成狀態')}`;break;
case 'gift-buyer':content=`<h1>把選擇留給收禮者</h1>${jp('請將實品與隨貨卡交給收禮者。您不能代替其本人驗證、同意或啟用，也不能讀取其私人紀錄。')}${jl('parcel','回隨貨說明')}`;break;
/* R6-LY-01：啟用選擇。 */
case 'activate':content=`<h1>要現在開始您的藏主時間嗎？</h1>${jp('啟用前，請確認這件商品、使用時間與隱私說明。啟用成功後才開始計時。')}${jp(s.months?`示意期間：${s.months} 個月；確認成功後起算。`:'本件期間待核實，暫不能啟用。')}${jl('rights','閱讀完整權益')}<label class="consent-row"><input id="holder-consent" type="checkbox" ${s.consent?'checked':''}>我是實際使用者，已閱讀權益，願意現在啟用。</label>${jb('activate-now','現在啟用')}${jl('later','稍後再說')}${jl('declined','不接受這份權益')}${jl('shutong','問書僮')}`;break;
/* R6-LY-02：deferred／declined 直接呈現結果（doc04 §11 四態之二），不重播已離開的中繼文字。 */
case 'later':s.status='deferred';s.consent=false;content=`<h1>好。想啟用的時候，從「書僮客服」進來就可以。</h1>${jl('home','回首頁')}`;break;
case 'declined':s.status='declined';s.consent=false;content=`<h1>好的，這份權益不會啟用。實品和訂單不受影響。</h1>${jl('home','回首頁')}`;break;
/* R6-LY-02：active／pending-read_error（doc04 §11 四態之一、之三）。invalid／claimed 為入口 claim 參考安全性補充態，非 doc04 四態本身，另標。 */
case 'activation-result':{
  if(s.status==='confirmed')content=`<h1>藏主時間已開始。</h1>${jp(`示意使用期間：${s.months} 個月，自本次合成確認起算；不是真實生效日期。`)}${jl('eligibility','開始問卦')}${jl('read','先自己讀一篇')}`;
  else if(s.status==='deferred')content=`<h1>好。想啟用的時候，從「書僮客服」進來就可以。</h1>${jl('home','回首頁')}`;
  else if(s.status==='declined')content=`<h1>好的，這份權益不會啟用。實品和訂單不受影響。</h1>${jl('home','回首頁')}`;
  else if(s.status==='invalid')content=`<h1>入口已失效（補充態・非 R6-LY-02 四態）</h1>${jp('請核對隨貨入口，保留實品與隨貨卡，向書僮詢問。不要公開領取碼。')}${jl('shutong','問書僮')}${jl('home','回首頁')}`;
  else if(s.status==='claimed')content=`<h1>這份權益已有領取紀錄（補充態・非 R6-LY-02 四態）</h1>${jp('先核對是否使用原領取帳號；本頁不顯示領取人的身分或私人紀錄。')}${jl('shutong','問書僮')}${jl('home','回首頁')}`;
  else content=`<h1>目前還無法確認啟用結果，請再查一次。</h1>${jb('query-result','再查一次')}${jl('shutong','問書僮')}${jl('activation-fixtures','審閱：模擬查詢回覆')}`;
  break;}
case 'activation-help':content=`<h1>啟用需要協助</h1>${jp('請說明目前看到「失效」、「已有領取紀錄」或「結果待確認」，並先核對原來使用的帳號。不要提供密碼、完整領取碼、付款資料或私人卦記。')}${jp('本頁只整理求助文字，不送出訊息、不建立案件，也不承諾即時回覆。正式申請請回原 LINE 對話。')}${jl('shutong','整理詢問文字')}${jl('activation-result','回查詢結果')}`;break;
case 'activation-fixtures':content=`<h1>啟用情境・審閱工具</h1>${jp('所有選項都是合成資料，與待核商品無關。重新載入即清空；不保存身分、同意或權益。')}<label for="fixture-months">合成期間</label><select id="fixture-months"><option value="">未核實</option><option value="3">3 個月示意</option><option value="6">6 個月示意</option><option value="24">24 個月示意</option></select>${jb('set-months','套用並返回本人驗證')}${jb('fixture-invalid','模擬入口失效')}${jb('fixture-claimed','模擬已領取')}${jb('fixture-pending','模擬結果待確認')}${jb('fixture-confirmed','模擬權益查詢確認成功')}${jp('只有已完成本人驗證、同意、有效合成期間及送出啟用後，才可模擬確認成功。')}`;break;
/* R1-S00：起卦前資格五態（doc04 §B，D4-C 已拍板：免費 3 次，remaining 由 truth 讀回）。 */
case 'eligibility':{const kind=s.status==='confirmed'?'period':s.eligibility;
  let body;
  if(kind==='period')body=jp('這一卦在您的方案期間內，不另計費。')+jl('ask','開始問卦');
  else if(kind==='single')body=jp('您有一次可用的問卦。')+jl('ask','使用這一次');
  else if(kind==='free'){const n=s.freeRemaining;const text=n===1?'這一卦不收費。這是最後一次不收費的問卦。':`這一卦不收費。您還有 ${n==null?'{n}':n} 次不收費的問卦。`;body=jp(text)+jl('ask','開始問卦');}
  else if(kind==='none')body=jp('要問這一卦，先選一個方案。')+jp('您可以先看看方案，也可以先不問。這裡不會用卦象替您推薦商品。')+jl('offers','看命格方案');
  else body=jp('目前無法確認您的資格，不代表沒有。')+jb('retry-eligibility','再試一次')+jl('shutong','問書僮');
  content=`<h1>起卦前，先看清楚</h1><div class="status">${body}</div>${jl('home','先不問')}${jl('eligibility-fixtures','審閱：切換资格情境')}`;break;}
case 'eligibility-fixtures':content='<h1>資格情境・審閱工具</h1>'+['period','single','free','none','error'].map((k,i)=>jb('elig-'+k,['有效期間','可用單次','已核實免費','無可用權益','資格讀取失敗'][i])).join('')+'<label for="fixture-free-n">免費剩餘次數（D4-C＝3）</label><select id="fixture-free-n"><option value="3">3</option><option value="2">2</option><option value="1">1</option><option value="0">0</option></select>';break;
case 'ask':{const allowed=s.status==='confirmed'||['period','single','free'].includes(s.eligibility);content=`<h1>問一件具體的事</h1>${allowed?`${jp('資格已在合成情境確認。這裡只預演寫下問題，不扣次、不收費、不送出問卦。')}<label for="question-draft">此刻想問的事（請勿填私人資料）</label><textarea id="question-draft" placeholder="寫一段示意問題"></textarea>${jb('preview-question','預覽這次問題')}<p id="question-feedback" role="status"></p>`:jp('尚未確認可用資格，請先查詢。')}${jl('eligibility','回資格與費用')}`;break;}
case 'read':content='<h1>時候到了沒——潛龍與見龍</h1>'+window.lyStarterArticle+jl('eligibility','想問一件事，先查資格');break;
default:return null;
}return notice+content+nav;};
window.bindJourney=function(){const s=window.lyJourney;const on=(id,fn)=>{const e=document.getElementById(id);if(e)e.onclick=fn;};const go=r=>{if(location.hash==='#'+r)window.dispatchEvent(new HashChangeEvent('hashchange'));else location.hash=r;};
on('verify-holder',()=>{s.verified=true;go('verify');});
const consent=document.getElementById('holder-consent');if(consent)consent.onchange=()=>{s.consent=consent.checked;const b=document.getElementById('activate-now');b.disabled=!(s.verified&&s.months&&s.consent&&s.status==='unactivated');};
const activate=document.getElementById('activate-now');if(activate)activate.disabled=!(s.verified&&s.months&&s.consent&&s.status==='unactivated');
on('activate-now',()=>{if(s.verified&&s.months&&s.consent&&s.status==='unactivated'){s.submitted=true;s.status='pending';go('activation-result');}});
on('set-months',()=>{s.months=Number(document.getElementById('fixture-months').value)||null;s.status='unactivated';s.verified=false;s.consent=false;s.submitted=false;go('verify');});
for(const k of ['invalid','claimed','pending'])on('fixture-'+k,()=>{s.status=k;go('activation-result');});
on('fixture-confirmed',()=>{if(s.verified&&s.submitted&&s.months&&s.status==='pending'){s.status='confirmed';s.eligibility='period';go('activation-result');}});
const confirm=document.getElementById('fixture-confirmed');if(confirm)confirm.disabled=!(s.verified&&s.submitted&&s.months&&s.status==='pending');
on('query-result',()=>go('activation-result'));on('retry-eligibility',()=>go('eligibility'));
for(const k of ['period','single','free','none','error'])on('elig-'+k,()=>{s.status='unactivated';s.eligibility=k;go('eligibility');});
const freeN=document.getElementById('fixture-free-n');if(freeN)freeN.onchange=()=>{s.freeRemaining=Number(freeN.value);};
on('preview-question',()=>{const t=document.getElementById('question-draft').value.trim();document.getElementById('question-feedback').textContent=t?'問題預覽：'+t+'（僅在本頁顯示，未送出、未保存、未扣次）':'請先寫下示意問題。';});
};

window.lyStarterArticle="<p>老易在書房，答一件常被問起的事。</p><p>有人找您接一個位置：主持社區的事、回老東家幫忙、或跟人合夥開一家小店。心動，又怕撐不起來；問的人常說：這個年紀，還接不接得住？這一問，卡的不是能力，是「時候」。</p><p>乾卦六條爻，講的正是一件事從「還沒到時候」走到「可以出手」的過程。初九說：「潛龍勿用。」九二說：「見龍在田，利見大人。」\n（乾卦・爻辭）</p><p>潛龍，不是沒本事，是本事還在水底；時候未到，硬要出頭，先傷的是自己。見龍在田，是本事已經露出地面，站在人看得見的地方——這時遇上肯幫您的人，事就順。同一條龍，差的只是位置。所以卦不問您敢不敢，它問您準備到哪裡了：手上的本事、身邊的人、能撐的時間。三樣都有，就是在田裡；缺一樣，就還在水底。</p><p>小觀察：接不接，先別問「敢不敢」，問「我這條龍現在在水底，還是已經在田裡？」在水底，就再養一養，不丟人；在田裡了，就別再往水裡縮——那是另一種浪費。</p><p>—— 書房常開。</p>";
