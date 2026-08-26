// BK15/BK16 回歸閘 v3.0 — 熟齡可用性(字級/對比)機械斷言
//
// 版本教訓(全部由 fresh-context 複核抓出,PM 自驗成立):
//  v1.0 錯:BACKDROP 用 getComputedStyle(body).backgroundColor 的【宣告值】#070b07,
//          忽略 .cosmos .glow/.glow2 兩層 radial-gradient。於是印「--jade 6.31:1 AA PASS」,
//          實際渲染 3.81:1 FAIL。認證了不合格修法的閘,比沒有閘更危險。
//  v2.0 錯:四個突變體全綠 ——
//          m1 把 <p id="payRelicLiveMessage"> 改名 → CSS 失效但閘仍 13/13(從未斷言元素存在)
//          m2 所謂「反陷阱」是恆真式,且大小寫敏感,'#070B07' 可繞過;它從不讀 index.html
//          m3 GLOW_GUARD 只驗選擇器存在,改 gradient 數值(.18→.6)背景大變仍全綠
//          m4 斷言 `.lp-body p < 17px` ⇒ 若有人把它升到 17px(=符合規格)反而讓閘變紅。閘禁止規格。
//  v3.0 對策:①斷言目標元素存在 ②以雜湊鎖住整段背景定義,任何變動即強制重新取樣
//            ③把 .lp-body p 改為條件式(它自己合規時本閘自動讓路) ④取兩個獨立估計中較嚴者
//
// BACKDROP 取得方法(兩路獨立,取較嚴):
//   A. PM 於 production 凍結 glow2 於動畫峰值(opacity .85 + scale 1.12)後截圖取樣 → rgb(52,56,31)
//   B. 複核席由 gradient stops 以 premultiplied-alpha 解析合成 → rgb(57,62,34)
//   採用 B(較亮=較差)。⚠️ 禁止改用任何宣告值;BG_FINGERPRINT 變動時必須兩路重做。
//
// 判準:MINGGE_UI_INTERACTION_SCREEN_SPEC_v1_1 §0「熟齡優先:主要文字 >=17px、行高 >=1.9」
//       WCAG 2.1 AA 一般文字 4.5:1(17px 未達 large text 之 18.66px bold / 24px regular)
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  PASS  ' + m); } else { fail++; console.log('  FAIL  ' + m); } };

const BACKDROP = '#393e22';   // rgb(57,62,34) — 見上方「BACKDROP 取得方法」。禁用宣告值。
const BG_FINGERPRINT = 'e4f90a42d120b5eb';   // 由下方 bgBlock() 計算;首次執行時會印出正確值

const token = n => (html.match(new RegExp('--' + n + ':\\s*(#[0-9a-fA-F]{3,6})')) || [])[1] || null;
const lum = hex => { let h = hex.replace('#','').toLowerCase(); if (h.length===3) h=h.split('').map(c=>c+c).join('');
  return [0,2,4].map(i=>parseInt(h.slice(i,i+2),16)/255)
    .map(v=>v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4))
    .reduce((a,v,i)=>a+v*[0.2126,0.7152,0.0722][i],0); };
const cr = (a,b) => { const [x,y]=[lum(a),lum(b)]; return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05); };

// 背景合成的【全部】來源:.cosmos 底色 + glow + glow2 + 其動畫關鍵格
function bgBlock() {
  const parts = [
    /\.cosmos\{[^}]*\}/, /\.cosmos \.glow\{[\s\S]*?\}/, /\.cosmos \.glow2\{[\s\S]*?\}/,
    /@keyframes pulseGlow\{[\s\S]*?\}\}/
  ].map(re => (html.match(re) || ['MISSING'])[0]);
  return parts.join('\n');
}

console.log('BG_FINGERPRINT — 背景定義一旦變動就必須重新取樣(v2.0 的 m3 突變體由此堵死)');
const fp = createHash('sha256').update(bgBlock()).digest('hex').slice(0,16);
ok(fp === BG_FINGERPRINT,
   `背景定義雜湊 === ${BG_FINGERPRINT}(實得 ${fp})` +
   (fp !== BG_FINGERPRINT ? ' ← 背景已變,BACKDROP 必須依「取得方法」兩路重新推導後,連同本指紋一起更新' : ''));

// 不變量:glow/glow2 只會【加亮】,故合成背景必然亮於 .cosmos 宣告底色。
// 若 BACKDROP 等於或暗於宣告值,代表有人又拿 getComputedStyle().backgroundColor 當判準(v1.0 原罪)。
const DECLARED = ((html.match(/\.cosmos\{[^}]*background:\s*(#[0-9a-fA-F]{3,6})/) || [])[1]) || '#070b07';
ok(lum(BACKDROP) > lum(DECLARED) * 1.5,
   `BACKDROP ${BACKDROP} 必須明顯亮於 .cosmos 宣告底色 ${DECLARED}(疊加層只會加亮;等於宣告值=又用了宣告值當判準)`);

console.log('BK15 — safe exit「回首屏」可見性(對【合成】背景)');
const back = (html.match(/\.pay-back-link\{[\s\S]*?\}/) || [''])[0];
const bfs  = (back.match(/font-size:\s*(\d+(?:\.\d+)?)px/) || [])[1];
ok(bfs && parseFloat(bfs) >= 17, `font-size >= 17px (實得 ${bfs}px)`);
const bcol = (back.match(/color:\s*var\(--([a-z0-9-]+)\)/) || [])[1];
const bhex = bcol ? token(bcol) : null;
const real = bhex ? cr(bhex, BACKDROP) : 0;
ok(real >= 4.5, `對合成背景 ${BACKDROP} 對比 >= 4.5:1 (實得 ${real.toFixed(2)}:1, --${bcol}=${bhex})`);
ok(!/opacity\s*:/.test(back), '未以 opacity 稀釋(opacity 會讓上面的對比計算失效)');
// 三顆 .pay-back-link 共用此 class,故上列斷言涵蓋全部
ok((html.match(/class="pay-back-link"/g)||[]).length === 3,
   `.pay-back-link 使用點恰 3 顆(實得 ${(html.match(/class="pay-back-link"/g)||[]).length}) — 新增請確認其背景亦為 cosmos`);

console.log('BK16 — 句5 字級生效,且不得溢出到 mock 面');
ok(/id="payRelicLiveMessage"/.test(html),
   '目標元素 id="payRelicLiveMessage" 存在於 markup(v2.0 的 m1 突變體:改名即靜默失效)');
const rule = (html.match(/#payRelicLiveMessage\{[^}]*\}/) || [''])[0];
const lpfs = ((html.match(/\.lp-body p\{[^}]*\}/) || [''])[0].match(/font-size:\s*(\d+(?:\.\d+)?)px/) || [])[1];
const lpUnderSpec = lpfs && parseFloat(lpfs) < 17;
if (lpUnderSpec) {
  ok(/font-size:\s*17px/.test(rule), `.lp-body p 為 ${lpfs}px(<17)故需覆寫:#payRelicLiveMessage 宣告 17px`);
  ok(/line-height:\s*1\.9/.test(rule), '#payRelicLiveMessage 宣告 line-height 1.9(覆寫 .lp-body p 的 2.3)');
} else {
  ok(true, `.lp-body p 已 >= 17px(${lpfs}px)符合規格 §0,本閘讓路,覆寫非必要(v2.0 的 m4:閘不得禁止規格)`);
}
ok(!/#payRelicBranch\s+p\s*\{/.test(html),
   '不得使用 `#payRelicBranch p`(會誤中 #artifactList/#artifactDetail 內 renderer 動態 <p>)');

console.log('已知不合格 token(對合成背景)');
const bad = ['moss','moss-soft','moss-2','jade'].map(n=>[n,token(n)]).filter(([,h])=>h)
  .map(([n,h])=>`--${n} ${cr(h,BACKDROP).toFixed(2)}:1`);
ok(!['moss','moss-soft','moss-2','jade'].includes(bcol), `safe exit 未用以下任一:${bad.join(' / ')}`);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
