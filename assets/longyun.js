/* D3 r3 candidate. No requests, checkout, identity or customer messages.
   Copy source of record: 00D_spec/mingge_d3_final_r3_20260911/{02,03,04}_*.md
   (D1-B/D2-B/D3-A/D4-C, Owner 2026-09-11). Exact TA copy — do not paraphrase.
   No internal review tooling ships here (S-20260911 finding): 0 published
   items means 0 item cards, 0 reference prices, no fixture switch reachable
   from any click path. Local-only QA lives outside this shipped file. */
'use strict';
const app=document.getElementById('app');
let catalogState='empty'; /* 'empty' | 'read_error' — real truth: 0 published SKU today */
const a=(route,label)=>`<a class="action" href="#${route}">${label}</a>`;
const btn=(id,label,disabled)=>`<button id="${id}" type="button"${disabled?' disabled':''}>${label}</button>`;
const section=(title,body)=>`<section><h2>${title}</h2>${body}</section>`;
const p=t=>`<p>${t}</p>`;
const quote=t=>`<blockquote>${t}</blockquote>`;
const back=(route='home',label='回龍運藏')=>a(route,label);
const details=(title,body)=>`<details><summary>${title}</summary>${body}</details>`;

function catalog(){
  if(catalogState==='read_error')return `<div class="status" role="alert">目前讀取商品資料失敗，請再試一次。</div>${btn('retry','重試')}${a('home','回命格')}`;
  return `<div class="status">實品資料正在整理，完成後才會開放。</div>${p('每一件都要先把照片、規格、來源和售後弄清楚，才會放上來。')}`;
}
function firstFoldCTA(){
  if(catalogState==='read_error')return `${a('catalog','重試')}${a('home','回命格')}`;
  return `${a('guide','先認識龍宮舍利')}${a('shutong','我想先問清楚')}${a('split','回命格')}`;
}
function teacher(){return `<h1>一位願意說清楚自己所知來源的收藏人</h1>${p('蔡銘斌老師是導引混元功老師，也是長年收藏龍宮舍利的收藏人。')}${p('依老師本人所說，收了四十多年；不是每一件都有四十年。')}${p('這次，蔡老師說明的是自己知道的收藏取得、保存與整理經過，以及哪些部分仍無法確認。')}${p('他簽的是「來源」——不是材質鑑定，也不是功效保證。')}${p('老師的收藏是來源；每一件的材質、規格和售後，還是一件一件寫清楚。')}${a('source','看收藏來源聲明')}<p class="footnote">正式協會名稱、職銜、人像使用權及年數歸屬證據，確認後才公開。</p>${a('why-limited','為什麼現在整理？')}${a('catalog','看看目前收藏')}${back('home','回上一頁')}`;}
function whyLimited(){return `<h1>收藏多年之後，現在才開始逐件整理。</h1>${p('依收藏方目前提供的說明，這批作品主要來自過去累積的既有收藏，目前沒有穩定的再次進貨管道。售出後，不能保證還能取得相同來源、相同樣貌或同一件物件。')}${quote('<strong>不是限量製造，是收藏本來就有限。</strong>')}${p('只有實品資料、照片權利、價格、可售狀態與售後條件都整理完成的作品，才會公開。頁面不得使用倒數、閃動庫存或「錯過不再」製造壓力。')}${a('source','那張來源卡是什麼？')}${a('catalog','看看目前收藏')}${a('shutong','我想先問清楚')}${back('home','回上一頁')}`;}
function source(){return `<h1>收藏來源聲明卡</h1><h2>這張卡，說清楚它能證明什麼。</h2>${p('它能說明：')}<ul><li>聲明人願意對自己所知道的收藏來源具名。</li><li>適用的是批次或哪一件商品。</li><li>聲明日期、簽署狀態與證據範圍。</li></ul>${p('它不能代替：')}<ul><li>第三方實驗室的材質鑑定。</li><li>能量或功效的檢測。</li><li>財運、改命、療癒或健康效果保證。</li></ul><div class="source-card"><p class="footnote">statement_scope 的來源主體（D1-B，Owner 2026-09-11）：蔡銘斌老師（收藏人）＋合作方（共同來源主體）。每張隨商品的卡片由蔡老師親筆簽名（Owner 已與蔡老師確認 2026-09-11）；合作方的正式名稱、保存／取得角色與公開文字，依其提供的正式資料填入，取得前頁面只寫蔡老師、合作方欄標「待核」。簽署前每張卡仍是「正在完成簽署」狀態，不預寫「親簽」。</p>${quote('這張卡正在完成簽署；簽好、核對過適用範圍後，才會隨商品一起出。')}${p('只有簽署、日期與適用範圍都核對通過後，才顯示「親簽來源聲明」。')}</div><figure class="asset-slot card-slot" aria-label="收藏卡預留空白"><div aria-hidden="true"></div><figcaption>收藏卡位置・待確認後放入</figcaption></figure>${a('guide','再看收藏說明')}${a('catalog','看看目前收藏')}${a('shutong','我想先問清楚')}${back('home','回上一頁')}`;}
function faq(){const qa=[
  ['龍宮舍利到底是什麼材質？','每件商品依現有證據個別說明。收藏人的來源說明與第三方材質檢測分開標示；未取得證據的材質、產地或形成方式不寫成確定事實。'],
  ['來源聲明卡是鑑定證書嗎？','不是。它記錄收藏人對自己所知來源的具名說明與適用範圍；另有第三方檢測時才另外標示。'],
  ['為什麼收藏有限？','依收藏方目前提供的說明，現有作品主要來自過去累積的收藏，目前沒有穩定補貨來源；售出後不能保證再取得相同來源與相同物件。'],
  ['一定要先問卦或加入 LINE 才能買嗎？','不用。公開商品、價格與來源資料可以直接查看。需要啟用命格使用權益時，再由實際使用者完成身分確認。'],
  ['買了就會改運或更健康嗎？','我們不作這類承諾。它是一件實體收藏物；是否收藏、佩戴或送禮，由您依實品資料與自己的意義判斷。'],
  ['付款後藏主時間就開始嗎？','不會。藏主時間由實際使用者自行啟用後才開始，未啟用不倒數。'],
  ['我買來送人，可以替對方啟用嗎？','不可以替對方同意。收禮者可以自己選擇現在啟用、稍後啟用、不接受或求助；購買者看不到對方的私人使用紀錄。'],
  ['啟用後能用什麼？','以啟用當時已正式開放的命格服務為準；商品頁會寫清楚使用時間，期滿後已留下的內容仍可回看。'],
  ['尺寸怎麼選？','[依正式尺寸量測、修改與費用政策填入；未確認前不得承諾]'],
  ['可以退換嗎？','[依正式 MoR、商品性質與核定退換貨政策填入；未確認前不得承諾]'],
];return `<h1>常見問題</h1>${qa.map(([q,ans])=>details(q,p(ans))).join('')}${a('shutong','我想先問清楚')}${back()}`;}
function giftSection(){return section('送禮與隨貨啟用卡',p('這件商品可以送人。商品由您購買，命格使用時間由收禮者本人決定是否啟用。您不會因為付款而看到對方的卦記、深卜、複盤或使用紀錄。')+a('activation-card','看隨貨啟用卡樣式'));}
/* checkout 全程 blocked：無有效付款入口、無訂單資料表寫入（engineering note，不進 TA 畫面）。 */
function purchaseGate(){return section('先看清楚，再決定。',p('購買前請確認實品、價格、來源與未知、照片是否為同一件或同款多件、尺寸與品相、配送、退換貨、客服與藏主期間。')+p('付款成功只表示款項已確認，不代表商品已出貨，也不代表藏主時間已啟用。實際使用者完成啟用後才開始。')+`<div class="panel">${p('付款功能尚未開放。')}${btn('checkout-disabled','付款功能尚未開放',true)}${a('support','先看完整資料')}${a('shutong','我想先問清楚')}</div>`+quote('先不買也沒關係。您的命格卦記、方案與既有權益不受影響。'));}
function support(){return `<h1>購買、配送與售後</h1>${purchaseGate()}${giftSection()}${a('faq','常見問題')}${back()}`;}
function render(){const route=location.hash.slice(1)||'split';let html='';const journey=window.renderJourney(route);
if(journey!==null)html=journey;
else if(route==='split')html=`<div class="hero"><p class="eyebrow">③ 方案・信物</p><h1>你今天想看哪一邊？</h1>${p('有一件事想繼續問，就看命格方案；想看一件可以收藏、佩戴或送人的實品，就先認識龍宮舍利。')}</div>${a('offers','繼續使用命格')}${a('home','看看龍宮舍利')}${a('index.html','回首頁')}<p class="footnote">卦象不替您挑商品。</p>`;
else if(route==='home')html=`<div class="hero"><p class="eyebrow">蔡銘斌老師長年收藏｜命格 × 龍宮舍利</p><h1>先看清一件收藏，再決定要不要留下。</h1>${section('它是什麼',p('龍宮舍利，是這批收藏沿用的名稱。材質與來源按每件證據個別說明。'))}${section('誰收藏',p('這批龍宮舍利，是蔡銘斌老師多年來一件一件留下的收藏。'))}${section('為什麼有限',p('不是限量製造，是收藏本來就有限；目前沒有穩定的再次進貨管道。'))}<div class="longyun-actions">${firstFoldCTA()}</div></div>${section('龍宮舍利是什麼',p('這個名字是收藏圈一直以來的叫法。')+a('guide','認識龍宮舍利'))}${section('蔡老師是誰',p('導引混元功老師，也是長年收藏人，願意具名說明自己所知來源。')+a('teacher','認識蔡老師'))}${section('現有實品',catalog())}${section('留下之前，先看清楚',a('support','購買、配送與售後')+a('faq','常見問題'))}`;
else if(route==='guide')html=`<h1>龍宮舍利，是這批收藏沿用的名稱。</h1>${p('這個名字是收藏圈一直以來的叫法。')}${p('[材質一句話｜待收藏方按適用商品確認；不得以傳說或推測補入]')}${p('它是什麼材質、從哪裡來，我們一件一件寫：查得到的就寫，查不到的就說查不到。')}${p('它可以收藏、佩戴、送人。我們不拿它保證招財、改運或健康。')}<p class="footnote">「部分作品由既有原礦整理加工而成」只有在原礦、加工方式及適用商品範圍被確認後，才可放入相應商品；不得套用全系列。</p>${a('teacher','認識蔡老師')}${a('why-limited','看收藏為什麼有限')}${a('source','那張來源卡是什麼？')}${a('catalog','看看目前收藏')}${a('shutong','我想先問清楚')}${back('home','回上一頁')}`;
else if(route==='teacher')html=teacher();
else if(route==='why-limited')html=whyLimited();
else if(route==='source')html=source();
else if(route==='faq')html=faq();
else if(route==='catalog')html=`<h1>龍宮舍利・實品資料</h1>${catalog()}${a('guide','先認識這批收藏')}${a('shutong','我想先問清楚')}${a('split','回命格')}${back()}`;
else if(route==='offers')html=`<h1>這次，您想怎麼繼續？</h1>${p('先看您現在需要的是一卦、把同一卦看深，還是留一段時間慢慢使用。價格和內容先說清楚，您再決定。')}${[
    ['問一件新的事｜NT$149','針對一件新的事，完成一次正式起卦與解讀。','選這一卦'],
    ['把同一卦看深｜NT$200','已有同一卦時，用互卦、綜卦、錯卦、序卦四個角度再看一次；不重新起卦。','看深這一卦'],
    ['把幾段經歷放在一起看｜NT$399','複盤功能正式開放且符合條件時，整理至少三筆不同卦記與後續。未開放時顯示「這項功能尚未開放」，不得出現付款鍵。','了解複盤'],
    ['六個月命格方案｜NT$1,490','六個月內使用當時已正式開放的期間服務。期間內不另外計次，也不顯示月配額；期滿後，已留下的內容仍可回看。','看六個月方案'],
  ].map(([t,c,cta])=>`<div class="panel"><h2>${t}</h2>${p(c)}${btn('',cta,true)}</div>`).join('')}${a('split','先不選，回方案・信物')}<div class="panel">${p('付款功能尚未開放。')}${a('offers','先看方案內容')}${a('shutong','問書僮')}${a('split','回方案・信物')}</div>`;
else if(route==='activation-card')html=`<h1>隨貨啟用卡樣式</h1>${p('數位稿見 activation-card-preview.html（gift／self 兩版）；印製規格見 plans/activation_card_print_spec_r3_20260911.md。此處僅供瀏覽，非正式印刷檔。')}<a class="action" href="./activation-card-preview.html" target="_blank" rel="noopener">看隨貨卡數位稿（新分頁）</a>${back('support','回購買與售後')}`;
else if(route==='shutong')html=`<h1>書僮在。想先問哪一件？</h1>${p('公開資料我可以直接說明；若要查訂單、付款、配送或個人權益，會先確認本人身分。')}${section('商品與來源',['這件是什麼材質？','來源依據到哪裡？','照片就是收到的這件嗎？','尺寸與品相','藏主怎麼啟用？','配送與退換'].map(q=>a('faq',q)).join(''))}${p('已確認則附來源；未知則明說仍在確認；讀取失敗不說成沒有；不使用舊方案名稱、免費次數、銅錢、Pro／Ultra 或未核政策。')}${back()}`;
else html=`<h1>此頁尚未提供</h1>${back()}`;
if(['home','support'].includes(route))html+=window.lyRights();
app.innerHTML=html;window.bindJourney();app.focus({preventScroll:true});window.scrollTo(0,0);
const retry=document.getElementById('retry');if(retry)retry.onclick=()=>{catalogState='empty';render();};
}
window.addEventListener('hashchange',render);render();
