import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
let pass = 0;
let fail = 0;
const check = (condition, id, detail) => {
  console.log(`${condition ? '[PASS]' : '[FAIL]'} ${id} ${detail}`);
  condition ? pass++ : fail++;
};
const between = (start, end) => html.slice(html.indexOf(start), html.indexOf(end));
const split = between('<div id="payIntentSplit">', '<div id="payMinggeBranch"');
const mingge = between('<div id="payMinggeBranch"', '<div id="payRelicBranch"');
const relic = between('<div id="payRelicBranch"', '<!-- P-STUDY');

check(split.includes('你今天想看哪一邊？') && !split.includes('您今天想看哪一邊？'), 'A1', 'split question === Product Basis UI Spec 逐字「你今天想看哪一邊？」');
check((split.match(/class="gate-door"/g) || []).length === 2 && split.includes('繼續使用命格') && split.includes('看看龍宮舍利'), 'A2', 'split has exactly two Product-Basis plain-language entries');
const minggeBack = '<button type="button" class="pay-back-link" id="payMinggeBack">回首屏,換一邊看看</button>';
const relicBack = '<button type="button" class="pay-back-link" id="payRelicBack">回首屏,換一邊看看</button>';
check((mingge.match(/回首屏,換一邊看看/g) || []).length === 1 && (relic.match(/回首屏,換一邊看看/g) || []).length === 1 && /^\s*<\/div>/.test(mingge.slice(mingge.indexOf(minggeBack) + minggeBack.length)) && /^\s*<\/div>/.test(relic.slice(relic.indexOf(relicBack) + relicBack.length)), 'A2b', '返回鍵文案 === 「回首屏,換一邊看看」，且在各分支之【最後】一個子元素');
check(!/id="pay(?:Mingge|Relic)Back"[^>]*class="[^"]*gate-door|class="[^"]*gate-door[^"]*"[^>]*id="pay(?:Mingge|Relic)Back"/.test(html), 'A2c', '返回鍵 class 不含 gate-door');
check(!/(1490|149|200|399)/.test(split), 'A3/N-03', 'split contains no price');
check(mingge.includes('id="payMinggeBack"') && relic.includes('id="payRelicBack"') && (html.match(/_showPayView\('split'\)/g) || []).length === 2, 'A4', 'both branches return to split');
check(html.includes("_showPayView(_payCtxMap[_src]?'mingge':'split')"), 'A1/R302-a/N-04', 'no src stays split; known src enters Mingge directly');
check((mingge.match(/role="button" tabindex="0"/g) || []).length === 3 && mingge.includes('向天問卦|149') && mingge.includes('四鏡·深卜|+200') && mingge.includes('問道·複盤|1490(6 個月)') && !mingge.includes('id="planPack399"'), 'R302-b', 'Mingge branch has exactly three paid canonical offers (Copy Master v1.0 bytes)');
check((mingge.match(/role="button" tabindex="0"/g) || []).length === 3 && html.includes("card.addEventListener('click',showPending)") && html.includes("e.key==='Enter'||e.key===' '"), 'R302-c', 'all offers expose pointer and keyboard purchase intent');
check(html.includes("status.classList.add('pc-status--activated');status.focus()") && /\.pc-status--activated\s*\{[^}]*border:[^;}]+;[^}]*background:[^;}]+;/.test(html), 'R302-c/R302-d behavior', 'activation adds a distinct, visibly styled fail-honest response state');
check((mingge.match(/付款通道整備中,眼下還付不了款;開通到哪一步了,問一聲「書僮客服」便知。/g) || []).length === 3, 'R302-d', 'all offers expose exact fail-honest next step');
check(relic.includes('龍宮舍利尚未開放。每一件都是實品,來源、材質、已知與未知,整理清楚了才上架;您若想先認識信物文化,「易經書房」裡有得讀。') && !relic.includes('pay-plan'), 'B1/B2', 'relic branch distinguishes unavailable inventory without fake products');
check(!relic.includes('示範') && !relic.includes('佔位') && !relic.includes('pinkoi'), 'B3', 'relic branch carries no mock/placeholder/source-platform residue');
check(html.includes("var _payScrollMap={zero:'planSingle149',deepdive:'planDeepdive200',fupan:'planFupan1490'}") && html.includes("_showPayView(_payCtxMap[_src]?'mingge':'split')"), 'C1-C3', 'known src enters Mingge and preserves target mapping');
check(html.includes("var _payCtxMap={zero:'下卦已立,要往上建嗎?要緊的事還在,上卦的來法都在這裡。',deepdive:'方才那一卦,若想再往深處讀——深卜的來法在這裡。',fupan:'想把走過的決定回頭看——問道·複盤的來法在這裡。'}"), 'C4', 'live context map remains exact');
check(html.includes("var pageMap = {ask:'page-about', about:'page-about', log:'page-log', study:'page-study', pay:'page-pay'}"), 'C5', 'pageMap remains exact');
const payPresentation = split + mingge + relic;
check(!/(倒數|不買就錯過|負面卦象)/.test(payPresentation) && !/(^|[^不])限時/.test(payPresentation), 'C6', 'pay presentation has no coercive promotion terms');
check(!/(gua_result|卦象結果).*(plan|product|商品)/i.test(html), 'C7', 'no divination-result product derivation found');
check((mingge.match(/初訪\(免費\)/g) || []).length === 0 && (mingge.match(/pay-plan-free/g) || []).length === 0 && (mingge.match(/3 枚(問卦)?銅錢/g) || []).length === 0, 'A5', 'RM03 呈現層無免費三枚銅錢 offer（Offer v1.2 未採納為 current truth）');
check((mingge.match(/四鏡·深卜\|\+200/g) || []).length === 1 && (mingge.match(/四鏡·深卜 200/g) || []).length === 0, 'A6', 'Copy Master v1.0：「四鏡·深卜|+200」×1，v1.1 的「四鏡·深卜 200」×0');
check(/id="planDeepdive200"[\s\S]*?不重新起卦[\s\S]*?同一件事[\s\S]*?<\/div>/.test(mingge), 'A7', '深卜卡語意：「不重新起卦…同一件事」在位（Copy Master §1.2）');
const fupanStrong = mingge.match(/id="planFupan1490"[\s\S]*?<strong>([^<]*)<\/strong>/)?.[1];
check(fupanStrong === '問道·複盤|1490(6 個月)' && !fupanStrong.includes('問卦,是決策'), 'A8', '1490 卡 <strong> 內容 === 「問道·複盤|1490(6 個月)」（不得包含「問卦,是決策」）');

console.log(`PASS=${pass} FAIL=${fail}`);
process.exit(fail === 0 ? 0 : 1);
