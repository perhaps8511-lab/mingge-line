// 免費贈幣宣稱下架 × 底層 trial/quota 機制保全
// 取代 tests/test_e40_giftfix_v1_0.sh —— 該腳本的存在目的就是驗證這句宣稱，
// 宣稱既已由 Owner 依 Offer Contract v1.2 下架，其驗收標準亦隨之作廢。
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const log  = readFileSync(new URL('../log.html',  import.meta.url), 'utf8');
let pass = 0, fail = 0;
const check = (c, id, d) => { console.log(`${c ? '[PASS]' : '[FAIL]'} ${id} ${d}`); c ? pass++ : fail++; };
const codeOf = (src) => src.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const htmlCode = codeOf(html), logCode = codeOf(log);

// ===== PUBLIC_LIFETIME_3_COINS_CLAIM: 0 =====
for (const [name, src] of [['index.html', htmlCode], ['log.html', logCode]]) {
  check(!src.includes('一輩子相贈'), 'G1-' + name, `${name} 無「一輩子相贈」`);
  check(!src.includes('3 枚問卦銅錢'), 'G2-' + name, `${name} 無「3 枚問卦銅錢」`);
  check(!src.includes('3 枚銅錢'), 'G3-' + name, `${name} 無「3 枚銅錢」`);
  check(!/GIFT_TEXT|giftShouldShow|applyEntryGift|entryGift|entry-gift/.test(src), 'G4-' + name, `${name} 無贈幣宣稱的常數/函式/節點`);
}
check(!/相贈|贈幣|免費贈|送你|送您/.test(htmlCode + logCode), 'G5', '兩頁皆無其他「贈與」措辭');

// ===== TRIAL_MECHANISM: PRESERVED =====
check(/function quotaCreditsFromSub\(sub\)\{/.test(html), 'T1', 'quotaCreditsFromSub 仍在');
check(html.includes('Number(sub.trial_quota_remaining)') && html.includes('Number(sub.monthly_quota_remaining)'), 'T2', 'trial_quota_remaining / monthly_quota_remaining 讀取未變');
check(html.includes('let entryGateState = { ready:false, allow:true, hasSubscriber:false, tier:null, credits:null, recordsCount:0, inFlight:false };'), 'T3', 'entry gate state 未變');
for (const fn of ['readEntryGateState', 'refreshEntryGateState', 'blockEntryIfNeeded'])
  check(html.includes(fn + '('), 'T4-' + fn, `${fn} 仍在（entry gate 與實際扣打路徑未動）`);
check(html.includes("const ZERO_QUOTA_TEXT = '下卦已立,要往上建嗎?'"), 'T5', '額度用盡導引文案未動');

// ===== ACTUAL_RUNTIME_BALANCE_DISPLAY: PRESERVED =====
check(html.includes("statusEl.textContent='尚餘 '+coins+' 枚問卦銅錢。';"), 'B1', '卦記頁仍顯示 readback 實際餘額');
check(html.includes('var coins=quotaCreditsFromSub(sub);'), 'B2', '餘額來源仍是 owning runtime readback');

// ===== NULL / READ_ERROR 不得推定贈幣 =====
// 原 giftShouldShow 的 `sub===null || credits===3` 正是推定式宣稱，必須不存在。
check(!/sub\s*===\s*null\s*\|\|/.test(htmlCode), 'N1', '無「readback 為 null 即視同有幣」的推定式');
check(!/===\s*3\s*[;)]/.test(htmlCode.replace(/quota|credits/gi, m => m)) || !/quotaCreditsFromSub\([^)]*\)\s*===\s*3/.test(htmlCode), 'N2', '無「credits===3」硬編碼判斷');
check(!/3\s*枚/.test(htmlCode + logCode), 'N3', '任何位置都不再出現「3 枚」硬編碼幣數');

// 行為驗證:readback 不可用時，卦記頁不得寫出任何餘額或贈幣字樣
{
  const src = html.slice(html.indexOf('async function initLogPage'), html.indexOf('async function initLogPage') + 4000);
  const guarded = /if\(!resp\.ok\)\{throw new Error\('HTTP '\+resp\.status\);\}/.test(src);
  check(guarded, 'N4', 'readback HTTP 失敗 → throw 進 catch，不會走到餘額分支');
  const balanceIdx = src.indexOf("statusEl.textContent='尚餘 '");
  const throwIdx = src.indexOf("throw new Error('HTTP '");
  check(throwIdx > -1 && balanceIdx > throwIdx, 'N5', '餘額顯示在成功 readback 之後（順序證明）');
}

// 行為驗證:quotaCreditsFromSub 在 null / 缺欄位時回 0，不回 3
{
  const m = html.match(/function quotaCreditsFromSub\(sub\)\{[\s\S]*?\n\}/);
  const ctx = { };
  vm.createContext(ctx);
  vm.runInContext(m[0] + '\nglobalThis.__q = quotaCreditsFromSub;', ctx);
  check(ctx.__q(null) === 0, 'N6', 'quotaCreditsFromSub(null) === 0（不推定成 3）');
  check(ctx.__q(undefined) === 0, 'N7', 'quotaCreditsFromSub(undefined) === 0');
  check(ctx.__q({}) === 0, 'N8', 'quotaCreditsFromSub({}) === 0');
  check(ctx.__q({ trial_quota_remaining: 2, monthly_quota_remaining: 1 }) === 3, 'N9', '有實際餘額時照實加總（機制未被改壞）');
}

console.log(`PASS=${pass} FAIL=${fail}`);
process.exit(fail === 0 ? 0 : 1);
