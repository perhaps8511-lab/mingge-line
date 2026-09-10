/* D3 local candidate. No requests, checkout, identity or customer messages. */
'use strict';
const app=document.getElementById('app');
const working=[{id:'XTVSSPvA',price:'NT$6,000'},{id:'agmh9hhJ',price:'NT$6,800'},{id:'S9j544BD',price:null}];
let catalogError=false;
let detailContext=null;
const a=(route,label)=>`<a class="action" href="#${route}">${label}</a>`;
const section=(title,body)=>`<section><h2>${title}</h2>${body}</section>`;
const p=t=>`<p>${t}</p>`;
const noPromise='這是一件實體收藏物。它不保證財運、改運、療癒、助眠或健康改善。';
const safe='先不買也沒關係。您的命格卦記、方案與既有權益不受影響。';
const back=(route='home',label='回龍運藏')=>a(route,label);
const details=(title,body)=>`<details><summary>${title}</summary>${body}</details>`;
function catalog(){return catalogError?`<div class="status" role="alert">目前無法讀取龍宮舍利資料，請稍後再試。</div><button id="retry">重新讀取</button>`:`<div class="status">實品資料正在整理，完成後才會開放。</div>${p('龍運藏只會開放資料已整理清楚的商品。您可以先認識龍宮舍利，或回命格。')}`;}
function source(){return `<h1>收藏來源聲明卡</h1>${p('來源聲明會標出依據；相似商品或外部平台頁面不能代替逐件事實。')}<div class="source-card"><h2>看來源，也看它的範圍</h2>${p('收藏人的來源聲明，不等於第三方材質鑑定、科學能量檢測、真品或功效保證。')}${p('正式卡片尚待簽署資料核對；此處說明閱讀方式，不展示為已完成背書。')}</div><figure class="asset-slot card-slot" aria-label="收藏卡預留空白"><div aria-hidden="true"></div><figcaption>收藏卡位置・待確認後放入</figcaption></figure>${details('收藏人聲明',p('記錄收藏人願意具名說明、能對其負責的來源內容。是否簽署、日期與聲明範圍，須逐項核對。'))}${details('供應商說明',p('材質描述與收藏來源是兩個欄位；來源聲明不能替代材質證據。'))}${details('第三方證據',p('若提供第三方報告，須標出對象、方法與範圍；不能從來源卡推成已有科學鑑定。'))}${details('可確認範圍與未知',p('整批來源聲明不代表逐件加工可追溯。只有已有依據支持無法確認的事項，才列為公開未知。'))}${section('批次與逐件，不能混用',p('批次層：收藏人能對整批收藏來源負責。')+p('逐件層：能核對這件編號與來歷，才標為逐件。')+p('僅提供收藏層來源聲明時，不上推成逐件證明。'))}${a('guide','再看收藏說明')}${back()}`;}
function support(){return `<h1>購買、配送與售後</h1>${p('購買、到貨與售後：到〔書僮客服〕說一聲。')}${details('購買前先看什麼？',p('先看照片、規格與品相、來源依據、已揭露未知，以及售後。'))}${details('現在可以付款嗎？',p('付款通道整備中，眼下還付不了款。')+p('此候選不接受付款、不提供私人轉帳替代，也不建立訂單。'))}${details('配送、運費與退換',p('配送方式、運費、出貨時間、退款與客服責任，須在購買前列明。')+p('本次來源尚不足以確認完整交易條款，因此尚未開放下單。'))}${details('保養與隨貨品',p('規劃隨附的保養油仍需核對成分、標示與安全資訊；本頁不補造使用方法。')+p('實際隨貨安排需在交易前確認，不把缺資料當成已完成交付。'))}${details('付款與藏主啟用',p('付款完成，不等於藏主權益已啟用。期間自藏主本人完成啟用起算；本人確認及實際權益狀態須另核對。'))}${details('送禮與隱私',p('收禮者會自己決定何時啟用；購買者不會因此看到對方的卦記、深卜、複盤或使用紀錄。')+p('此候選提供可操作示意，沒有真實驗證或領取能力。'))}${p(safe)}${a('contact','整理想問書僮的問題')}${back()}`;}
function render(){const route=location.hash.slice(1)||'split';let html='';const journey=window.renderJourney(route);
if(journey!==null)html=journey;
else if(route==='split')html=`<div class="hero"><p class="eyebrow">③ 方案・信物</p><h1>你今天想看哪一邊？</h1></div>${a('offers','繼續使用命格')}${a('home','看看龍宮舍利')}`;
else if(route==='home')html=`<div class="hero"><p class="eyebrow">運好氣旗下｜龍宮舍利選藏</p><h1>龍運藏</h1>${p('先看清一件物，再決定要不要留下。')}${p('龍運藏整理龍宮舍利的收藏與逐件資料。卦象不替您挑商品。')}${a('catalog','看實品資料')}${a('guide','先認識龍宮舍利')}</div>${section('蔡老師與這批收藏',p('蔡銘斌老師是導引混元功老師、長年收藏人，也是願意具名說明自己所知來源的人。'))}${section('收藏的時間',p('供應商表示，相關收藏累積約四十多年。')+p('這是收藏人的回憶與說明，不代表每一件物件都已收藏四十年。'))}${section('來源，不只是一張卡',p('來源卡記錄聲明者、日期、範圍及批次或逐件關係。')+a('source','怎麼閱讀來源聲明卡'))}${section('現有實品',catalog()+a('catalog','查看實品資料狀態'))}${section('收藏與補貨',p('現有商品主要來自供應商長年留下的收藏，目前沒有穩定的再次進貨管道。售出後，未必能再找到相同物件。')+p('這是來源現況，不是限時促銷。'))}${section('留下之前，先看清楚',a('support','購買與售後說明'))}`;
else if(route==='guide')html=`<h1>龍宮舍利，是這批收藏沿用的名稱。</h1>${p('龍運藏把資料分成三類：')}${details('可以確認的實品資料',p('正式公開時，只列出有依據的照片、規格、品相、價格與售後資料。'))}${details('供應商提供的來源說明',p('来源與材質各有依據，不以來源聲明代替材質鑑定。'))}${details('目前仍無法確認的部分',p('只有已有證據支持「目前無法確認」的內容，才會公開列為未知。'))}${section('看一件實品時',p('先看照片與規格、品相、來源依據、仍無法確認的地方，以及保養與售後。'))}${section('不承諾什麼',p(noPromise)+p('它可以被收藏、佩戴或送禮；要不要留下，仍由您自己決定。'))}${a('source','看來源卡的界線')}${a('catalog','看實品資料')}${back()}`;
else if(route==='source')html=source();
else if(route==='catalog')html=`<h1>龍宮舍利・實品資料</h1>${catalog()}${a('guide','先認識龍宮舍利')}${a('support','購買與售後說明')}${back()}`;
else if(route==='support')html=p('藏主，就是留下實品、可由本人自行啟用附帶命格使用期間的人。')+support();
else if(route==='offers')html=`<h1>繼續使用命格</h1>${[['向天問卦｜149','問一件新的、明確的事，正式起一卦；解讀與卦記留下，之後可以回看、補記後續。'],['四鏡・深卜｜200','不重新起卦；從互卦、綜卦、錯卦、序卦再看同一件事，結果留在原來的卦記裡。'],['複盤｜399','跨越至少三筆不同卦記及後續，回看事情如何演變。再次複盤需有新卦或新後續。'],['問道・複盤｜1490（6個月）','單買按次；期間方案按時間。期間內每一個月使用同一套完整權益，不發放月額度、不累積次數。']].map(([t,c])=>`<div class="panel"><h2>${t}</h2>${p(c)}</div>`).join('')}${p('到期後，既有卦記、深卜、複盤與後續仍保留可讀。')}${p('以上為產品方案說明，不代表本候選已提供正式服務；付款及尚未就緒的功能維持未開放。')}${a('support','購買與權益說明')}${back('split','回首屏，換一邊看看')}`;
else if(route==='contact')html=`<h1>整理給書僮的問題</h1>${p('這裡只整理文字，不會自動傳送，也不代表已建立客服案件。')}<label for="inquiry">想詢問的內容</label><textarea id="inquiry">我想了解龍宮舍利的實品資料、來源卡，以及購買與售後安排。</textarea><button id="copy">複製詢問文字</button><p role="status" id="copy-status"></p>${back('support','回購買與售後')}`;
else if(route==='review')html=`<h1>待核商品・Owner 審閱</h1><div class="status">內部資料審閱，不是公開商品目錄。以下沿用來源中的工作編號，沒有編造品名、照片、材質或庫存。</div>${working.map(x=>`<article class="panel"><h2>手鍊・${x.id}</h2>${p('狀態：needs_supplier，未上架')}${p(x.price?'來源參考價格：'+x.price+'（不是本次可交易報價）':'新台幣價格：待核，未自行換算')}${a('item/'+x.id,'審閱這件的五層資料')}</article>`).join('')}${section('鍊墜',p('本期產品方向含鍊墜；目前可用逐件來源未提供可確認的SKU、實價與權益，不創造新商品卡。'))}${a('missing','一次查看所有待補資料')}${back()}`;
else if(route.startsWith('item/')){const item=working.find(x=>x.id===route.slice(5));if(item)detailContext=route;html=item?`<h1>手鍊・${item.id}</h1><div class="status">待核詳情・非公開商品。以下空缺是供審閱的資料缺项，不是對實品「無法確認」的公開聲明。</div><figure class="asset-slot photo-slot" aria-label="實品照片預留空白"><div aria-hidden="true"></div><figcaption>實品照片位置・待提供</figcaption></figure>${section('一｜物件、規格與品相',p('來源支持類別：手鍊。正式品名、實拍使用權、珠徑／手圍、重量、品相與一件／多件仍待補。')+p(item.price?'來源參考價格：'+item.price+'；待正式價格與供貨核對。':'價格待核。'))}${section('二｜已知與來源依據',p('此工作編號來自既有首批來源登錄。尚未提供本件可核對的材質原話與簽署來源卡。')+a('source','閱讀來源卡界線'))}${section('三｜有依據的未知',p('尚無可逐件引用的已揭露未知證據；不將尚未取得資料改寫成實品未知。'))}${section('四｜文化與收藏',p('收藏、佩戴或送禮由自己決定；不根據卦象推薦這件商品。'))}${section('五｜不承諾什麼',p(noPromise))}${section('購買與售後',p('資料未核齊，這件尚不能下單。')+'<button disabled>尚未開放購買</button>'+a('support','查看購買與售後說明'))}${a('missing','看本批待補清單')}${back('review','回待核商品列表')}`:`<h1>找不到這件資料</h1>${p('沒有以示範商品取代。')}${back('review','回待核商品列表')}`;}
else if(route==='missing')html=`<h1>一次補齊的商品資料</h1>${p('優先首件 XTVSSPvA；不要求重寫整份品牌規格。')}<ol><li>首件實物交接與正式品名；逐件實拍及照片使用授權。</li><li>供應商願意負責的材質原話，或有依據的未經第三方材質鑑定說明。</li><li>收藏來源聲明：至少批次層，含真正簽署、日期、issuer、範圍；逐件層不能上推。</li><li>一件／多件、尺寸、珠徑／手圍、重量、品相、目前售價與供貨資料。</li><li>配送、運費、退款、客服責任及非LINE售後管道。</li><li>保養油的實際隨货安排、完整標示與安全資訊。</li><li>鍊墜的逐件編號、價格及適用權益。</li></ol>${p('其他兩件沿同一張逐件表補齊。首發前另核對相關既有listing的宣稱一致性；本候選不更改外部listing。')}${back('review','回待核商品列表')}`;
else html=`<h1>此頁尚未提供</h1>${back()}`;
if(detailContext&&['source','support','contact'].includes(route))html+=a(detailContext,'回剛才的待核商品');
if(['home','support'].includes(route)||route.startsWith('item/')&&working.some(x=>'item/'+x.id===route))html+=window.lyRights();
if(route==='catalog')html+=a('source','先閱讀來源說明')+a('contact','詢問實品資料');
app.innerHTML=html;window.bindJourney();app.focus({preventScroll:true});window.scrollTo(0,0);
const retry=document.getElementById('retry');if(retry)retry.onclick=()=>{catalogError=false;render();};
const copy=document.getElementById('copy');if(copy)copy.onclick=async()=>{const text=document.getElementById('inquiry');try{await Promise.race([navigator.clipboard.writeText(text.value),new Promise((_,reject)=>setTimeout(()=>reject(new Error('clipboard_unavailable')),1000))]);document.getElementById('copy-status').textContent='已複製；尚未傳送給客服。';}catch{ text.focus();text.select();document.getElementById('copy-status').textContent='請手動複製所選文字；尚未傳送。';}};
}
document.querySelector('[data-route]').onclick=()=>{location.hash='review';};
document.getElementById('toggle-error').onclick=()=>{catalogError=true;location.hash='catalog';render();};
document.getElementById('reset').onclick=()=>{catalogError=false;detailContext=null;Object.assign(window.lyJourney,{verified:false,consent:false,submitted:false,status:'unactivated',months:null,eligibility:'error'});location.hash='split';render();};
window.addEventListener('hashchange',render);render();
