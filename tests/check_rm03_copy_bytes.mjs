// RM03 byte-master 驗證 v3.0
// 真相源更新：TA Offer Copy Master v1.0 (2026-08-24, product_truth = OFFER_CONTRACT_v1.2)
//   取代 WP-MINGGE-RM03-INTENT-SPLIT-01 v2.0 的句2/句3/句6 —— 那三句係 v1.1 時期定稿，
//   其中句6 含 Copy Master §2.5 明列「不得出現」的「不限次」與「逢節氣捎信」。
// 句1/句4/句5/句7 未受 offer 修正影響，維持原 byte-master。
// 用法: node tests/check_rm03_copy_bytes.mjs <index.html 路徑>
import { readFileSync } from 'node:fs';

const S = {
  1: '你今天想看哪一邊？',
  2: '繼續使用命格',
  3: '看看龍宮舍利',
  4: '付款通道整備中,眼下還付不了款;開通到哪一步了,問一聲「書僮客服」便知。',
  5: '龍宮舍利尚未開放。每一件都是實品,來源、材質、已知與未知,整理清楚了才上架;您若想先認識信物文化,「易經書房」裡有得讀。',
  6: '問道·複盤|1490(6 個月) — 半年內,新的事都可以問;自己的每一筆卦記都能往下深看。累積三筆後可跨卦複盤;卦記、後續與蓋印到期後仍在。',
  7: '回首屏,換一邊看看',
  8: '向天問卦|149 — 問一件現在掛心的事,正式起一卦;解讀與卦記都會留下,之後可以回看、補記後續。',
  9: '四鏡·深卜|+200 — 不重新起卦,從互卦、綜卦、錯卦、序卦再看同一件事;結果留在原來的卦記裡。',
};
const cp = s => [...s].map(c => 'U+' + c.codePointAt(0).toString(16).toUpperCase().padStart(4,'0'));
const BANNED = { '・':'U+30FB 片假名中點', '｜':'U+FF5C 全形|', '，':'U+FF0C 全形,',
                 '；':'U+FF1B 全形;', '（':'U+FF08 全形(', '）':'U+FF09 全形)' };
let fail = 0;
const ok = (c,m) => { console.log((c?'  PASS  ':'  FAIL  ')+m); if(!c) fail++; };

console.log('=== A. byte-master 自身檢查 ===');
for (const [k,v] of Object.entries(S)) {
  const bad = Object.keys(BANNED).filter(c => v.includes(c)).map(c => BANNED[c]);
  ok(bad.length===0, `句${k} 無禁用字元${bad.length?' → '+bad.join('、'):''}`);
}
ok([...S[1]].pop().codePointAt(0)===0xFF1F, `句1 末字為 U+FF1F（實際 ${cp(S[1]).pop()}）`);
for (const k of [6,8,9]) {
  const bars = [...S[k]].filter(c => c==='|' || c==='｜');
  ok(bars.length===1 && bars[0]==='|', `句${k} 直線符恰 1 個且為 U+007C`);
}
ok([...S[6]].filter(c=>c==='·').length===1, '句6 中點為 U+00B7 ×1');
ok([...S[9]].filter(c=>c==='·').length===1, '句9 中點為 U+00B7 ×1');
ok([...S[7]].filter(c=>c===',').length===1, '句7 逗號為 U+002C 半形 ×1');
// v3.0 人稱規則：句1 為 Product Basis / TA Experience UI Spec 逐字定稿，用「你」；
// 其餘句沿用書房「您」。v2.0 的「全檔零你」斷言係 offer 修正前的產物，已作廢，
// 不得反過來覆蓋 Product Basis。
ok(S[1].includes('你') && !S[1].includes('您'), '句1 依 UI Spec 用「你」');
const others = Object.entries(S).filter(([k]) => k !== '1').map(([, v]) => v).join('');
ok(!others.includes('你'), `句1 以外人稱維持「您」（「您」×${[...others].filter(c=>c==='您').length}）`);

console.log('\n=== A2. Copy Master §2.5「不得出現」 ===');
for (const banned of ['無限問卦','不限次','吃到飽','深卜額度','每月幾卦','逢節氣'])
  ok(!S[6].includes(banned), `句6 不含「${banned}」`);

console.log('\n=== B. 落地檔逐字比對 ===');
const f = process.argv[2];
if (!f) { console.log('  SKIP  未提供檔案路徑（自身檢查模式）'); }
else {
  const html = readFileSync(f,'utf8');
  for (const k of [1,2,3,4,5,7]) {
    const n = html.split(S[k]).length - 1;
    ok(n >= 1, `句${k} 逐字出現（×${n}）`);
  }
  const stripped = (id) => {
    const i = html.indexOf(`id="${id}"`);
    const m = /<p class="pl-copy">([\s\S]*?)<\/p>/.exec(html.slice(i));
    return m ? m[1].replace(/<[^>]+>/g,'').trim() : '';
  };
  ok(stripped('planFupan1490') === S[6], '句6 去標籤文字逐字相符');
  ok(stripped('planSingle149') === S[8], '句8 去標籤文字逐字相符');
  ok(stripped('planDeepdive200') === S[9], '句9 去標籤文字逐字相符');
  ok(html.split(S[1]).length-1 === 1, '句1 恰 1 次（不得被挪用為按鈕標籤）');
  ok(html.split(S[7]).length-1 === 2, '句7 恰 2 次（兩分支各一）');

  console.log('\n=== B2. 舊 offer 語言已清除（Offer v1.2 / Copy Master v1.0）===');
  // 範圍＝TA 可見的付費頁區塊。PAY_PLANS 常數（checkout payload 名稱）屬 protected 凍結區，
  // 由付款工作流負責，本卡不動 —— 故 B2 只掃呈現層，不掃全檔。
  const payScreen = html.slice(html.indexOf('id="payIntentSplit"'), html.indexOf('<!-- P-STUDY'));
  for (const stale of ['複盤不限次','四鏡深卜一併在內','逢節氣,老易捎一封信來','問一卦|149','四鏡·深卜 200','命格|書房的來法','龍宮舍利|且先看看'])
    ok(!payScreen.includes(stale), `呈現層舊語言「${stale}」已清除`);

  console.log('\n=== C. 399 分層檢查 ===');
  ok(!/<div[^>]*id="planPack399"/.test(html), '399 offer 卡 DOM 不存在（呈現層已移除）');
  ok((html.match(/class="pay-plan[^"]*"/g)||[]).length === 3,
     'pay-plan 卡片恰 3 張（Offer v1.2 三項單買/期間方案；免費卡已下架）');
  const i = html.indexOf('id="payMinggeBranch"'), j = html.indexOf('id="payRelicBranch"');
  const br = html.slice(i, j), k2 = br.indexOf('class="pay-note"');
  ok(br.slice(0,k2).includes('囊中銅錢') === false, '命格分支 offer 卡區無「囊中銅錢」');
  ok((html.match(/囊中銅錢/g)||[]).length === 2,
     '全檔「囊中銅錢」恰 2 處＝退費段(BK5-A) + PAY_PLANS 常數(protected)');
  ok(br.slice(k2).includes('囊中銅錢'), '  └ 其一在退費段（BK5-A 明文保留）');
  ok(/planPack399:\s*\{[^}]*囊中銅錢/.test(html), '  └ 其二在 PAY_PLANS 常數（protected，禁動）');

  console.log('\n=== D. 誠實整備態 ===');
  // Offer Contract v1.2 未採納「初訪免費 3 枚銅錢」為 current offer truth → 呈現層下架。
  // 底層 trial 機制（GIFT_TEXT / entry gate credits / log 頁餘額）不動，只是不再以 offer 卡對外宣稱。
  // 範圍＝RM03 付費頁呈現層。GIFT_TEXT 常數供 log/entry 兩頁使用，屬底層 trial 機制，本卡不動。
  const rm03 = html.slice(html.indexOf('id="payIntentSplit"'), html.indexOf('<!-- P-STUDY'));
  for (const claim of ['初訪(免費)', 'pay-plan-free', '您的 3 枚銅錢已在囊中', '3 枚問卦銅錢', '3 枚銅錢'])
    ok(!rm03.includes(claim), `RM03 呈現層免費銅錢宣稱「${claim}」已下架`);
  // GIFT_TEXT 是「一輩子相贈 3 枚」這句宣稱本身，已依 Owner 裁決自兩個 surface 下架；
  // 底層 trial/quota 機制另有其真相源（quotaCreditsFromSub + 兩個 quota 欄位），必須完好。
  // 只掃程式碼與 markup;說明「為何移除」的註解允許提及舊名。
  const htmlCode = html.replace(/<!--[\s\S]*?-->/g,'').replace(/\/\*[\s\S]*?\*\//g,'').replace(/^\s*\/\/.*$/gm,'');
  ok(!htmlCode.includes('GIFT_TEXT'), '贈幣宣稱常數 GIFT_TEXT 已自程式碼移除');
  ok(!htmlCode.includes('一輩子相贈'), '「一輩子相贈」字面已自程式碼與 markup 移除');
  ok(html.includes('quotaCreditsFromSub'), '底層 credits 讀取路徑仍在');
  ok(html.includes('trial_quota_remaining') && html.includes('monthly_quota_remaining'), '底層 quota 欄位讀取仍在');
  ok(html.includes("statusEl.textContent='尚餘 '+coins+' 枚問卦銅錢。';"), '實際餘額顯示仍在（事實陳述，非宣稱）');
  ok(html.includes('<strong>問道·複盤|1490(6 個月)</strong>'), '<strong> 只包卡名，未包整段');
  ok(html.includes('跨卦複盤仍在整備中,尚未開放使用;方案內容以實際開通為準。'),
     '複盤能力未 live → 卡上有誠實 gate 註記');
  ok(!/<div[^>]*id="planFupan399"/.test(html),
     'fupan_399 未曝光（無 runtime 購買路徑，Copy Master §7 退款文案待 compliance_03）');
}
console.log(`\n=== ${fail===0 ? 'ALL PASS' : fail+' FAIL'} ===`);
process.exit(fail===0?0:1);
