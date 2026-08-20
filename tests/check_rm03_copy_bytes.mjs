// WP-MINGGE-RM03-INTENT-SPLIT-01｜七句 byte-master 驗證（Node，跨平台，不依賴 PowerShell 版本）
// v2.0 — 句7 併入；「囊中銅錢」改為分層檢查（v1.0 的全檔禁詞會誤判受保護區）
// 用法: node tests/check_rm03_copy_bytes.mjs <index.html 路徑>
import { readFileSync } from 'node:fs';

const S = {
  1: '您今天想看哪一邊？',
  2: '命格|書房的來法',
  3: '龍宮舍利|且先看看',
  4: '付款通道整備中,眼下還付不了款;開通到哪一步了,問一聲「書僮客服」便知。',
  5: '龍宮舍利尚未開放。每一件都是實品,來源、材質、已知與未知,整理清楚了才上架;您若想先認識信物文化,「易經書房」裡有得讀。',
  6: '問道·複盤|1490(6 個月) — 問卦,是決策的前半段;拿了主意、做下去,後半段才開始。半年書房,老易陪您把做過的決定回頭複盤——這一程走到了哪,卦象當時所示的「轉」應在何處。複盤不限次,四鏡深卜一併在內;卦記隨時回看,可補記後續、蓋印留痕;逢節氣,老易捎一封信來。決策是一條路,不是一次問答。',
  7: '回首屏,換一邊看看',
};
const cp = s => [...s].map(c => 'U+' + c.codePointAt(0).toString(16).toUpperCase().padStart(4,'0'));
const BANNED = { '・':'U+30FB 片假名中點', '｜':'U+FF5C 全形|', '，':'U+FF0C 全形,',
                 '；':'U+FF1B 全形;', '（':'U+FF08 全形(', '）':'U+FF09 全形)' };
let fail = 0;
const ok = (c,m) => { console.log((c?'  PASS  ':'  FAIL  ')+m); if(!c) fail++; };

console.log('=== A. byte-master 七句自身檢查 ===');
for (const [k,v] of Object.entries(S)) {
  const bad = Object.keys(BANNED).filter(c => v.includes(c)).map(c => BANNED[c]);
  ok(bad.length===0, `句${k} 無禁用字元${bad.length?' → '+bad.join('、'):''}`);
}
ok([...S[1]].pop().codePointAt(0)===0xFF1F, `句1 末字為 U+FF1F（實際 ${cp(S[1]).pop()}）`);
for (const k of [2,3,6]) {
  const bars = [...S[k]].filter(c => c==='|' || c==='｜');
  ok(bars.length===1 && bars[0]==='|', `句${k} 直線符恰 1 個且為 U+007C`);
}
ok([...S[6]].filter(c=>c==='·').length===1, '句6 中點為 U+00B7 ×1');
ok([...S[6]].filter(c=>c==='—').length===3, '句6 破折號 U+2014 ×3');
ok([...S[7]].filter(c=>c===',').length===1, '句7 逗號為 U+002C 半形 ×1');
const all = Object.values(S).join('');
ok(!all.includes('你'), `七句人稱零「你」（「您」×${[...all].filter(c=>c==='您').length}）`);
for (const [n,p] of [['複盤不限次','複盤不限次'],['四鏡深卜一併在內','四鏡深卜一併在內'],
                     ['蓋印留痕','蓋印留痕'],['逢節氣捎信','逢節氣']])
  ok(S[6].includes(p), `句6 benefits：${n}`);

console.log('\n=== B. 落地檔逐字比對 ===');
const f = process.argv[2];
if (!f) { console.log('  SKIP  未提供檔案路徑（自身檢查模式）'); }
else {
  const html = readFileSync(f,'utf8');
  // 句 1-5,7：原始碼連續比對。句 6 例外 —— BK9 要求 </strong> 收在卡名後，
  // 使句 6 在原始碼中被標籤切斷；byte-master 管的是 TA 看到的字，故改比對「去標籤後的文字」。
  for (const k of [1,2,3,4,5,7]) {
    const n = html.split(S[k]).length - 1;
    ok(n >= 1, `句${k} 逐字出現（×${n}）`);
  }
  {
    const i6 = html.indexOf('id="planFupan1490"');
    const m6 = /<p class="pl-copy">([\s\S]*?)<\/p>/.exec(html.slice(i6));
    const text6 = m6 ? m6[1].replace(/<[^>]+>/g,'').trim() : '';
    ok(text6 === S[6], `句6 去標籤文字逐字相符（${text6.length}/${S[6].length} 字）`);
  }
  ok(html.split(S[1]).length-1 === 1, '句1 恰 1 次（不得被挪用為按鈕標籤）');
  ok(html.split(S[7]).length-1 === 2, '句7 恰 2 次（兩分支各一）');
  ok(!html.includes('付款通道整備中;銅錢尚在,不急。'), '舊 .pc-status 句已清除');

  console.log('\n=== C. 399 分層檢查（取代 v1.0 全檔禁詞）===');
  // 呈現層：399 卡的 DOM 必須不存在
  ok(!/<div[^>]*id="planPack399"/.test(html), '399 offer 卡 DOM 不存在（呈現層已移除）');
  ok((html.match(/class="pay-plan[^"]*"/g)||[]).length === 4,
     'pay-plan 卡片恰 4 張（初訪免費 ×1 + 付費 ×3）');
  // 命格分支 offer 卡區（pay-note 之前）不得出現「囊中銅錢」
  const i = html.indexOf('id="payMinggeBranch"'), j = html.indexOf('id="payRelicBranch"');
  const br = html.slice(i, j), k2 = br.indexOf('class="pay-note"');
  ok(br.slice(0,k2).includes('囊中銅錢') === false, '命格分支 offer 卡區無「囊中銅錢」');
  // 全檔僅允許 2 處：退費段（BK5-A 保留）+ PAY_PLANS 常數（protected，禁動）
  ok((html.match(/囊中銅錢/g)||[]).length === 2,
     '全檔「囊中銅錢」恰 2 處＝退費段(BK5-A) + PAY_PLANS 常數(protected)');
  ok(br.slice(k2).includes('囊中銅錢'), '  └ 其一在退費段（BK5-A 明文保留）');
  ok(/planPack399:\s*\{[^}]*囊中銅錢/.test(html), '  └ 其二在 PAY_PLANS 常數（protected，禁動）');

  console.log('\n=== D. BK7/BK8/BK9 還原檢查 ===');
  ok(html.includes('初訪(免費)') && html.includes('pay-plan-free')
     && html.includes('您的 3 枚銅錢已在囊中'), 'BK7 初訪免費卡完整在位');
  ok(html.includes('四鏡·深卜 200') && !html.includes('四鏡·深卜 +200'),
     'BK8 深卜為 live bytes「200」（無 "+"）');
  ok(html.includes('同一卦'), 'BK8 語意：「同一卦」語境在位');
  ok(html.includes('<strong>問道·複盤|1490(6 個月)</strong>'),
     'BK9 <strong> 只包卡名，未包整段');
}
console.log(`\n=== ${fail===0 ? 'ALL PASS' : fail+' FAIL'} ===`);
process.exit(fail===0?0:1);
