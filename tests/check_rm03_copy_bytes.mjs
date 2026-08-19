// WP-MINGGE-RM03-INTENT-SPLIT-01 六句 byte 驗證（Node，跨平台，不依賴 PowerShell 版本）
// 用法: node tests/check_rm03_copy_bytes.mjs <index.html 路徑>
import { readFileSync } from 'node:fs';

const S = {
  1: '您今天想看哪一邊？',
  2: '命格|書房的來法',
  3: '龍宮舍利|且先看看',
  4: '付款通道整備中,眼下還付不了款;開通到哪一步了,問一聲「書僮客服」便知。',
  5: '龍宮舍利尚未開放。每一件都是實品,來源、材質、已知與未知,整理清楚了才上架;您若想先認識信物文化,「易經書房」裡有得讀。',
  6: '問道·複盤|1490(6 個月) — 問卦,是決策的前半段;拿了主意、做下去,後半段才開始。半年書房,老易陪您把做過的決定回頭複盤——這一程走到了哪,卦象當時所示的「轉」應在何處。複盤不限次,四鏡深卜一併在內;卦記隨時回看,可補記後續、蓋印留痕;逢節氣,老易捎一封信來。決策是一條路,不是一次問答。',
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
for (const k of [2,3,6]) {
  const bars = [...S[k]].filter(c => c==='|' || c==='｜');
  ok(bars.length===1 && bars[0]==='|', `句${k} 直線符恰 1 個且為 U+007C`);
}
ok([...S[6]].filter(c=>c==='·').length===1, '句6 中點為 U+00B7 ×1');
ok([...S[6]].filter(c=>c==='—').length===3, '句6 破折號 U+2014 ×3');
const you = Object.values(S).join('');
ok(!you.includes('你'), `人稱零「你」（「您」×${[...you].filter(c=>c==='您').length}）`);
for (const [n,p] of [['複盤不限次','複盤不限次'],['四鏡深卜一併在內','四鏡深卜一併在內'],
                     ['蓋印留痕','蓋印留痕'],['逢節氣捎信','逢節氣']])
  ok(S[6].includes(p), `句6 benefits：${n}`);

console.log('\n=== B. 落地檔逐字比對 ===');
const f = process.argv[2];
if (!f) { console.log('  SKIP  未提供檔案路徑（自身檢查模式）'); }
else {
  const html = readFileSync(f,'utf8');
  for (const [k,v] of Object.entries(S)) ok(html.includes(v), `句${k} 逐字出現於 ${f}`);
  ok(!html.includes('囊中銅錢'), '`囊中銅錢 399` 已自呈現層移除');
}
console.log(`\n=== ${fail===0 ? 'ALL PASS' : fail+' FAIL'} ===`);
process.exit(fail===0?0:1);
