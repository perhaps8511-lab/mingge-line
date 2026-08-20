// BK15/BK16 回歸閘 v2.0 — 熟齡可用性(字級/對比)機械斷言
//
// v1.0 的教訓(2026-08-20,fresh-context 複核抓出):
//   v1.0 把 BACKDROP 硬寫成 #070b07,理由是「production 量得」——
//   但那是 getComputedStyle(body).backgroundColor 回傳的【宣告值】,不是【合成像素】。
//   .cosmos .glow / .glow2 在其上疊了兩層 radial-gradient(index.html ~L24-30),
//   合成後遠亮於宣告值。於是 v1.0 印出「6.31:1 AA PASS」,而實際渲染只有 3.81:1(FAIL)。
//   → 一道認證了不合格修法的閘,比沒有閘更危險。
//
// v2.0 的 BACKDROP 來源:對 production 截圖【按鈕所在座標】實際取樣像素眾數 = rgb(52,57,34)。
//   取樣點:x 690-880 / y 340-352 與 382-394(緊鄰按鈕上下的無字帶),取兩者中較亮者(最差情境)。
//   ⚠️ 若日後改動 .cosmos .glow / .glow2 / body 背景,本常數必須【重新取樣像素】後更新,
//      不得改用任何宣告值。GLOW_GUARD 會在 glow 消失時強制你回來重審。
//
// 判準:MINGGE_UI_INTERACTION_SCREEN_SPEC_v1_1 §0「熟齡優先:主要文字原則 >=17px、行高 >=1.9」
//       WCAG 2.1 AA 一般文字 4.5:1(17px 未達 large text 門檻 18.66px bold / 24px regular)
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  PASS  ' + m); } else { fail++; console.log('  FAIL  ' + m); } };

const BACKDROP = '#343922';           // rgb(52,57,34) — 實測合成像素,非宣告值
const DECLARED_TRAP = '#070b07';      // body/.cosmos 宣告值 — 禁止用它當判準

const token = n => (html.match(new RegExp('--' + n + ':\\s*(#[0-9a-fA-F]{3,6})')) || [])[1] || null;
const lum = hex => { let h = hex.replace('#',''); if (h.length===3) h=h.split('').map(c=>c+c).join('');
  return [0,2,4].map(i=>parseInt(h.slice(i,i+2),16)/255)
    .map(v=>v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4))
    .reduce((a,v,i)=>a+v*[0.2126,0.7152,0.0722][i],0); };
const cr = (a,b) => { const [x,y]=[lum(a),lum(b)]; return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05); };

console.log('BK15 — safe exit「回首屏」可見性(對【合成】背景,非宣告背景)');
const back = (html.match(/\.pay-back-link\{[\s\S]*?\}/) || [''])[0];
const bfs  = (back.match(/font-size:\s*(\d+(?:\.\d+)?)px/) || [])[1];
ok(bfs && parseFloat(bfs) >= 17, `font-size >= 17px (實得 ${bfs}px)`);
const bcol = (back.match(/color:\s*var\(--([a-z0-9-]+)\)/) || [])[1];
const bhex = bcol ? token(bcol) : null;
const real = bhex ? cr(bhex, BACKDROP) : 0;
ok(real >= 4.5, `對【合成】背景 ${BACKDROP} 對比 >= 4.5:1 (實得 ${real.toFixed(2)}:1, --${bcol}=${bhex})`);
ok(!/opacity\s*:/.test(back), '未用 opacity 稀釋(opacity 會讓上面的對比計算失效)');
// 明列已知不合格 token,避免有人「換個看起來比較暗的」又掉回去
for (const bad of ['moss','moss-soft','moss-2','jade']) {
  const h = token(bad); if (!h) continue;
  ok(bcol !== bad, `未使用 --${bad}(對合成背景僅 ${cr(h,BACKDROP).toFixed(2)}:1)`);
}
// 反陷阱:確保沒人把判準換回宣告值
ok(cr(bhex||'#000', DECLARED_TRAP) !== real || BACKDROP !== DECLARED_TRAP,
   `BACKDROP 不得改回宣告值 ${DECLARED_TRAP}(v1.0 就是這樣認證了一個 FAIL 的修法)`);

console.log('BK16 — 句5 字級生效,且不得溢出到 mock 面');
ok(/#payRelicLiveMessage\{[^}]*font-size:\s*17px/.test(html), '`#payRelicLiveMessage` 直接宣告 17px(ID 特異度勝過 .lp-body p)');
ok(/#payRelicLiveMessage\{[^}]*line-height:\s*1\.9/.test(html), '`#payRelicLiveMessage` 行高 1.9(蓋掉 .lp-body p 的 2.3)');
ok(!/#payRelicBranch\s+p\s*\{/.test(html),
   '不得使用 `#payRelicBranch p`(會誤中 #artifactMockList/#artifactMockDetail 內 renderer 動態建立的 <p>)');
const lpfs = ((html.match(/\.lp-body p\{[^}]*\}/) || [''])[0].match(/font-size:\s*(\d+(?:\.\d+)?)px/) || [])[1];
ok(lpfs && parseFloat(lpfs) < 17, `競爭規則 .lp-body p 仍為 ${lpfs}px(<17) — 若它自己升到 17px,本閘可退役`);

console.log('GLOW_GUARD — 背景合成層是否仍在(在則 BACKDROP 常數仍有效)');
ok(/\.cosmos\s+\.glow\s*\{/.test(html) && /\.cosmos\s+\.glow2\s*\{/.test(html),
   '.glow 與 .glow2 仍存在 → BACKDROP=rgb(52,57,34) 之取樣前提成立;若移除請重新取樣像素');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
