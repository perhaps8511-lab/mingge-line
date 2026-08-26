// R3｜龍宮舍利實品資料接線 — owning store = Airtable Artifacts，經 mingge-relay GET /artifacts
// 取代 test_rm03b_artifact_mock_v1_0.mjs（該卡的 hidden mock 已整段移除）。
// 驗收面：mock 不得殘留、publish_blocked 必須 fail closed、缺的事實留白、不做卦→商品推薦。
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const worker = readFileSync(new URL('../workers/mingge-relay/worker.js', import.meta.url), 'utf8');
let pass = 0, fail = 0;
const check = (c, id, d) => { console.log(`${c ? '[PASS]' : '[FAIL]'} ${id} ${d}`); c ? pass++ : fail++; };

// ---- A. mock 已徹底移除 ----
for (const dead of ['artifactMock', 'isArtifactMockViewer', '示範價', '示意畫面｜非售品｜資料為佔位',
                    'artifacts_placeholder.json', 'cdn01.pinkoi.com', '【示範】龍宮舍利手鍊', 'price_pinkoi_twd'])
  check(!html.includes(dead), 'A-' + dead, `mock 殘留「${dead}」已清除`);

// ---- B. publish gate：三道 fail-closed ----
check(worker.includes('const ARTIFACT_PUBLISHABLE = "PUBLISHABLE";'), 'B1', 'worker 以 owning store 的 PUBLISHABLE 為唯一放行值');
check(worker.includes('filterByFormula: `{publish_blocked}="${ARTIFACT_PUBLISHABLE}"`'), 'B2', '第一道：Airtable 端只撈 PUBLISHABLE');
check(worker.includes('.filter(f => f.publish_blocked === ARTIFACT_PUBLISHABLE)'), 'B3', '第二道：worker 逐列再驗一次');
check(html.includes('_artifactItems=items.filter(artifactIsPublishable);'), 'B4', '第三道：前端再驗一次');
check(/function artifactIsPublishable\(item\)\{\s*return !!item && item\.publish_blocked===ARTIFACT_PUBLISHABLE;\s*\}/.test(html), 'B5', '前端 gate 只認 PUBLISHABLE，無其他放行分支');
check(worker.includes('return json({ items: [], gate: "fail_closed", reason: "AIRTABLE_API_KEY not configured" }, 503);'), 'B6', '無金鑰 → 空清單 503，不降級');

// ---- C. 取不到就維持「尚未開放」，絕不假資料 ----
check(html.includes("if(!response.ok) return;") && html.includes("if(!_artifactItems.length) return;"), 'C1', 'HTTP 失敗或零筆 → 直接 return，維持原句');
check(html.includes("}catch(error){ console.warn('[artifacts]',error); }"), 'C2', '例外 → 靜默維持原句，不改畫面');
check(/msgEl\.hidden=true;\s*\n\s*showArtifactList\(\);/.test(html), 'C3', '只有在確有可上架列之後才隱藏「尚未開放」');
const liveSentence = '龍宮舍利尚未開放。每一件都是實品,來源、材質、已知與未知,整理清楚了才上架;您若想先認識信物文化,「易經書房」裡有得讀。';
check(html.includes(`<p id="payRelicLiveMessage">${liveSentence}</p>`), 'C4', '誠實「尚未開放」原句仍逐字在位');

// ---- D. 商品詳情結構：是什麼 → 知道 → 不知道 → 文化/收藏 → 不承諾 ----
const order = ['這是什麼物','我們知道什麼','我們不知道什麼','文化與收藏情境','不承諾什麼'];
let cursor = -1, ordered = true;
for (const label of order) { const i = html.indexOf(`'${label}'`); if (i <= cursor) ordered = false; cursor = i; }
check(ordered, 'D1', '五段結構依序出現');
for (const extra of ['尺寸','重量','品相','件數','保養與保存','藏主權益','售後與退換'])
  check(html.includes(`'${extra}'`), 'D2-' + extra, `${extra} 區段在位`);
check(html.includes('ARTIFACT_NO_PROMISE') && !html.includes("artifactAppendSection(body,'不承諾什麼',item.claims_prohibited)"), 'D3', '「不承諾什麼」用固定誠實句，不輸出 owning store 的禁詞清單');

// ---- E. 缺的事實留白，不猜、不回填 ----
check(/_artifactPlaceholderRe=\/\^\(NEEDS_\|PENDING_\|N\\\/A\)\/i/.test(html), 'E1', 'NEEDS_/PENDING_/N\\A 佔位值一律不顯示');
check(/function artifactAppendSection\([\s\S]*?if\(!text\) return;/.test(html), 'E2', '空欄位直接不渲染該段（不寫「尚未取得」冒充已查證）');
check(html.includes('if(!url) return;'), 'E3', '無自有實拍就不放圖（不 hotlink 來源平台）');
const whitelist = worker.slice(worker.indexOf('const ARTIFACT_PUBLIC_FIELDS'), worker.indexOf('export default'));
for (const internal of ['sku_source_ref','unverified_factual_claims','supplier_facts_note','data_state','evidence_grade','publish_block_reasons'])
  check(!whitelist.includes(`"${internal}"`), 'E4-' + internal, `內部欄位「${internal}」不在 TA 白名單`);

// ---- F. 藏主期間由 price_band 依 Offer v1.2 推導，不採信自由文字舊 quota ----
const bandBlock = html.slice(html.indexOf('var ARTIFACT_COLLECTOR_PERIOD='), html.indexOf('var ARTIFACT_INVENTORY_LABEL='));
check(bandBlock.includes("'3000_5999':'三個月藏主'") && bandBlock.includes("'6000_14999':'半年藏主'") && bandBlock.includes("'15000_plus':'兩年藏主'"), 'F1', '三價帶 → 3/6/24 個月（v1.2 §4）');
check(html.includes('每一個有效月權益相同,無月配額'), 'F2', '明說無月配額（v1.2 取代 v1.1 的 ×1/×3/×12 quota）');
check(!html.includes('四鏡·深卜 3 次') && !html.includes('深卜 ×3'), 'F3', '不出現 v1.1 已廢止的固定深卜次數');

// ---- G. 誠實整備態：沒有假的下單入口 ----
check(html.includes('ARTIFACT_CHECKOUT_GATE') && html.includes('付款通道整備中,眼下還付不了款'), 'G1', '詳情頁帶誠實付款整備態');
check(!/artifactAppendLine\(body,'選購'\)/.test(html) && !html.includes("buy.textContent='選購'"), 'G2', '沒有可下單的「選購」按鈕');
const relicMark = html.indexOf('MG-RM-03 · 龍宮舍利實品接線');
const relicJs = html.slice(html.lastIndexOf('/* =====', relicMark), html.indexOf('086卡:格3付費卡 checkout'));
check(!relicJs.includes('CHECKOUT_MODE') && !relicJs.includes('PAY_PLANS') && !relicJs.includes('openPayMock'), 'G3', '實品區未進入 protected checkout 狀態機');

// ---- H. 不做卦 → 商品推薦 ----
const relicCode = relicJs.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
check(!relicCode.includes('gua_result') && !relicCode.includes('lastG') && !relicCode.includes('qiGua'), 'H1', '實品區程式碼完全不讀卦象變數');
check(!/(gua_result|卦象結果)[\s\S]{0,80}(artifact|商品|舍利)/.test(html), 'H2', '全檔無卦象→商品的推導');

// ---- I. 效果紅線 ----
const relicMarkup = html.slice(html.indexOf('<div id="payRelicBranch"'), html.indexOf('<!-- P-STUDY'));
for (const w of ['招財','開運','改運','療癒','排毒','助眠','磁場','能量','保護圈','貴人','桃花','獨一無二'])
  check(!relicMarkup.includes(w) && !relicJs.replace('不宣稱它能招財、開運、改運、療癒或改善健康','').includes(w), 'I-' + w, `實品區無「${w}」正面宣稱`);

// ---- J. worker 端點可被靜態解析 ----
check(worker.includes('url.pathname === "/artifacts"') && worker.includes('request.method === "GET"'), 'J1', 'GET /artifacts 端點存在');
check(worker.includes('const AT_PRODUCT_BASE = "appfQm6On0Wp9LtL9";') && worker.includes('const AT_ARTIFACTS    = "tbllxi9NZNhsBjLxD";'), 'J2', '指向 Artifacts owning store');

console.log(`PASS=${pass} FAIL=${fail}`);
process.exit(fail === 0 ? 0 : 1);
