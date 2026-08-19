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

check(split.includes('您今天想看哪一邊？'), 'A1', 'no-src split question is exact');
check((split.match(/class="gate-door"/g) || []).length === 2 && split.includes('命格|書房的來法') && split.includes('龍宮舍利|且先看看'), 'A2', 'split has exactly two frozen entries');
check(!/(1490|149|200|399)/.test(split), 'A3/N-03', 'split contains no price');
check(mingge.includes('id="payMinggeBack"') && relic.includes('id="payRelicBack"') && (html.match(/_showPayView\('split'\)/g) || []).length === 2, 'A4', 'both branches return to split');
check(html.includes("_showPayView(_payCtxMap[_src]?'mingge':'split')"), 'A1/R302-a/N-04', 'no src stays split; known src enters Mingge directly');
check((mingge.match(/class="pay-plan/g) || []).length === 3 && mingge.includes('問一卦|149') && mingge.includes('四鏡·深卜 +200') && mingge.includes('問道·複盤|1490(6 個月)') && !mingge.includes('id="planPack399"'), 'R302-b', 'Mingge branch has exactly three canonical offers');
check((mingge.match(/role="button" tabindex="0"/g) || []).length === 3 && html.includes("card.addEventListener('click',showPending)") && html.includes("e.key==='Enter'||e.key===' '"), 'R302-c', 'all offers expose pointer and keyboard purchase intent');
check(html.includes("status.classList.add('pc-status--activated');status.focus()") && /\.pc-status--activated\s*\{[^}]*border:[^;}]+;[^}]*background:[^;}]+;/.test(html), 'R302-c/R302-d behavior', 'activation adds a distinct, visibly styled fail-honest response state');
check((mingge.match(/付款通道整備中,眼下還付不了款;開通到哪一步了,問一聲「書僮客服」便知。/g) || []).length === 3, 'R302-d', 'all offers expose exact fail-honest next step');
check(relic.includes('龍宮舍利尚未開放。每一件都是實品,來源、材質、已知與未知,整理清楚了才上架;您若想先認識信物文化,「易經書房」裡有得讀。') && !relic.includes('pay-plan'), 'B1/B2', 'relic branch distinguishes unavailable inventory without fake products');
check(html.includes("var _payScrollMap={zero:'planSingle149',deepdive:'planDeepdive200',fupan:'planFupan1490'}") && html.includes("_showPayView(_payCtxMap[_src]?'mingge':'split')"), 'C1-C3', 'known src enters Mingge and preserves target mapping');
check(html.includes("var _payCtxMap={zero:'下卦已立,要往上建嗎?要緊的事還在,上卦的來法都在這裡。',deepdive:'方才那一卦,若想再往深處讀——深卜的來法在這裡。',fupan:'想把走過的決定回頭看——問道·複盤的來法在這裡。'}"), 'C4', 'live context map remains exact');
check(html.includes("var pageMap = {ask:'page-about', about:'page-about', log:'page-log', study:'page-study', pay:'page-pay'}"), 'C5', 'pageMap remains exact');
const payPresentation = split + mingge + relic;
check(!/(倒數|不買就錯過|負面卦象)/.test(payPresentation) && !/(^|[^不])限時/.test(payPresentation), 'C6', 'pay presentation has no coercive promotion terms');
check(!/(gua_result|卦象結果).*(plan|product|商品)/i.test(html), 'C7', 'no divination-result product derivation found');

console.log(`PASS=${pass} FAIL=${fail}`);
process.exit(fail === 0 ? 0 : 1);
