import fs from 'node:fs';
import vm from 'node:vm';

const html=fs.readFileSync('index.html','utf8');
const data=JSON.parse(fs.readFileSync('data/artifacts_placeholder.json','utf8'));
let pass=0;
let fail=0;

function check(id,condition,detail){
  if(condition){pass++;console.log(`PASS ${id} ${detail}`);}
  else{fail++;console.error(`FAIL ${id} ${detail}`);}
}

const warning='拋棄式 mock 文案，禁止作為真品文案 seed；真品文案 = Chat 貨物，須 Owner 供料 + 過 T0 定稿';
const badge='示意畫面｜非售品｜資料為佔位';
const placeholder='這一項尚未取得';
const slots=['這是什麼物','我們知道什麼','我們不知道什麼','適合情境','不承諾什麼'];
const liveSentence='龍宮舍利尚未開放。每一件都是實品,來源、材質、已知與未知,整理清楚了才上架;您若想先認識信物文化,「易經書房」裡有得讀。';
const renderedItems=data.items.filter(item=>item.data_state!=='DELISTED');
const artifactStart=html.indexOf('var _artifactMockItems=');
const artifactBlock=html.slice(artifactStart,html.lastIndexOf('/* ====================================================',html.indexOf('086卡:格3付費卡 checkout',artifactStart)));
const artifactMarkup=html.slice(html.indexOf('<div id="payRelicBranch"'),html.indexOf('</div>\n    </div>\n  </div>',html.indexOf('<div id="payRelicBranch"')));
const artifactViewerSource=html.slice(html.indexOf('function isArtifactMockViewer(){'),html.indexOf('/* ★ v1.2.3',html.indexOf('function isArtifactMockViewer(){')));
const artifactViewerStorage=new Map();
const artifactViewerContext={URLSearchParams,decodeURIComponent,location:{search:'?artifactmock=1'},sessionStorage:{getItem:key=>artifactViewerStorage.get(key)??null,setItem:(key,value)=>artifactViewerStorage.set(key,String(value)),removeItem:key=>artifactViewerStorage.delete(key)}};
vm.runInNewContext(artifactViewerSource,artifactViewerContext);
const artifactViewerEnabled=artifactViewerContext.isArtifactMockViewer();
artifactViewerContext.location.search='';
const artifactViewerDisabled=artifactViewerContext.isArtifactMockViewer();

check('G1',html.includes(`<p id="payRelicLiveMessage">${liveSentence}</p>`) && /if\(isArtifactMockViewer\(\)\)\{ initArtifactMock\(\); \}/.test(html),'no-flag live sentence remains and mock init is flag-gated');
check('G1-persistence',artifactViewerEnabled===true&&artifactViewerDisabled===false,'same context enables the URL flag once, then disables after the flag is removed');
check('G1b',artifactMarkup.includes(badge) && artifactBlock.includes(`badge.textContent='${badge}'`) && artifactBlock.includes(`checkoutBadge.textContent='${badge}'`),'list, detail, checkout, and product-card badge coverage');
check('G1c',data._warning===warning,'exact anti-fossil warning');
check('G2',/function artifactCheckoutAllowed\(items\)\{\s*return items\.every\(function\(i\)\{return i\.data_state==='VERIFIED';\}\);\s*\}/.test(html) && /if\(artifactCheckoutAllowed\(\[item\]\)\) return;\s*openPayMock\('planSingle149'\);/.test(html),'independent VERIFIED-only guard routes placeholders to openPayMock');
check('G2-protected',!artifactBlock.includes('CHECKOUT_MODE')&&!artifactBlock.includes('PAY_PLANS')&&!artifactBlock.includes('onPayCardClick'),'artifact implementation does not enter protected checkout state machine');
check('G3',data.items.some(item=>item.id==='2nF8b4vJ'&&item.data_state==='DELISTED') && renderedItems.every(item=>item.id!=='2nF8b4vJ'),'DELISTED retained in data and filtered from render set');

check('D1',slots.every((slot,index)=>data.items.every(item=>Object.keys(item.detail_slots)[index]===slot)) && slots.every(slot=>artifactBlock.includes(`'${slot}'`)),'five ordered Product Spec slots');
check('D2',artifactBlock.includes(`||'${placeholder}'`),'empty slots remain visible with exact placeholder');
check('D3',artifactBlock.includes("'/0/1/1080x0.jpg'") && !artifactBlock.includes('800x0'),'1080x0 image source, no thumbnail source');
const redlines=['招財','開運','改善血液循環','正磁場','能量','保護圈','貴人','桃花'];
check('D4',redlines.every(word=>!artifactMarkup.includes(word)&&!artifactBlock.includes(word)&&!JSON.stringify(data).includes(word)),'artifact rendered sources contain zero redline terms');
check('D5',!artifactMarkup.includes('獨一無二')&&!artifactBlock.includes('獨一無二')&&!JSON.stringify(data).includes('獨一無二'),'artifact rendered sources contain zero banned uniqueness claim');

check('P1',renderedItems.length===2&&renderedItems.every(item=>item.price_band==='6000_14999')&&!artifactMarkup.includes('入門系列')&&!artifactBlock.includes('入門系列'),'both visible items use main price band; no entry-series wording');
check('P2',(function(){
  // BK17 藏主期間 —— 突變體硬化(依 2026-08-20 治理判例:閘必須以突變體驗證)
  // M1 fallback 改回 ||band / M2 刪 append / M3 附加 raw key,三者皆須變紅。
  var fnBody=(artifactBlock.match(/function artifactMockHolderTerm\(band\)\{[\s\S]*?\n\}/)||[''])[0];
  var m1=/\|\|'這一項尚未取得'/.test(fnBody) && !/\|\|band/.test(fnBody);          // M1
  var m2=artifactBlock.includes('body.appendChild(band);') &&
         /card\.append\([^)]*\bband\b[^)]*\)/.test(artifactBlock);                  // M2:詳情 append + 列表 append
  var exact=(artifactBlock.match(/band\.textContent=artifactMockHolderTerm\(item\.price_band\);/g)||[]).length===2 &&
            !/artifactMockHolderTerm\(item\.price_band\)\s*\+/.test(artifactBlock); // M3:賦值恰為函式回傳,不得串接
  var map=artifactBlock.includes("'6000_14999':'半年藏主'") && artifactBlock.includes("'15000_plus':'兩年藏主'");
  var gone=!artifactBlock.includes('主力') && !artifactBlock.includes('｜6 個月') &&
           !artifactBlock.includes('_artifactPriceBandLabels') && !/artifactMockBandLabel/.test(artifactBlock);
  var noRawKey=!/\+\s*item\.price_band/.test(artifactBlock) && !/item\.price_band\s*\+/.test(artifactBlock); // raw key 不得進 textContent
  return m1&&m2&&exact&&map&&gone&&noRawKey;
})(),'holder term: fail-honest fallback scoped in fn (M1), band appended in both views (M2), assignment is exactly the fn return with no concat (M3), price-band label and raw keys never reach TA (BK17)');
check('P3',renderedItems.every(item=>item.price_mingge_twd===null)&&artifactBlock.includes("'示範價 '")&&!artifactBlock.includes('命格定價'),'null Mingge prices and explicit demo-price rendering');

check('T1',/#payIntentMingge,#payIntentRelic,#payRelicBranch\{font-size:17px;\}/.test(html),'intent controls are 17px');
check('T2',/#payRelicBranch\{font-size:17px;\}/.test(html),'relic branch main text is 17px');
check('T3',/\.pc-status\{[^}]*line-height:1\.9;/.test(html),'pc-status line-height is 1.9');
check('T4',!/#pay[^,{]*Back[^}]*font-size:\s*1[7-9]px/.test(html),'back controls remain secondary');

check('N-01',!artifactBlock.includes('gua_result')&&!artifactBlock.includes('SKU'),'artifact mock has no divination-driven SKU recommendation');
check('N-03',html.indexOf('id="payIntentSplit"')<html.indexOf('示範價'),'pay first screen precedes all artifact prices and contains no price');
check('DATA',renderedItems[0].id==='XTVSSPvA'&&renderedItems[0].price_pinkoi_twd===6000&&renderedItems[1].id==='agmh9hhJ'&&renderedItems[1].price_pinkoi_twd===6800,'authorized IDs and Pinkoi prices exact');
check('TITLE',!JSON.stringify(data).includes('【示範】龍宮舍利手鍊')&&artifactBlock.includes("XTVSSPvA:'【示範】龍宮舍利手鍊 A'")&&artifactBlock.includes("agmh9hhJ:'【示範】龍宮舍利手鍊 B'"),'placeholder titles exist only at render time');

console.log(`RESULT PASS=${pass} FAIL=${fail}`);
process.exit(fail?1:0);
