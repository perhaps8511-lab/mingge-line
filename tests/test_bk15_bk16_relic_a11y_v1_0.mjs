// BK15/BK16 回歸閘 — 熟齡可用性(字級/對比)機械斷言
// 起因:BK10「relic-branch 提到 17px」只設在容器,`.lp-body p` 直接命中 <p> 而勝出,
//       修補默默失效無人察覺。本檔專門讓「宣稱修好但其實沒生效」直接 fail。
// 判準來源:MINGGE_UI_INTERACTION_SCREEN_SPEC_v1_1 §0「熟齡優先:主要文字原則 >=17px、行高 >=1.9」
//           對比門檻 WCAG 2.1 AA 一般文字 4.5:1
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
let pass = 0, fail = 0;
const ok  = (c, m) => { if (c) { pass++; console.log('  PASS  ' + m); } else { fail++; console.log('  FAIL  ' + m); } };

// ---- 工具:解析 :root token、算相對亮度與對比 ----
function token(name) {
  const m = html.match(new RegExp('--' + name + ':\\s*(#[0-9a-fA-F]{3,6})'));
  return m ? m[1] : null;
}
function srgb(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
}
function lum(hex) {
  return srgb(hex).map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4))
    .reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0);
}
function contrast(a, b) {
  const [L1, L2] = [lum(a), lum(b)];
  return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
}

// 實測背景(2026-08-20 production 量得 rgb(7,11,7));若日後改版須同步更新此常數
const BACKDROP = '#070b07';

console.log('BK15 — safe exit「回首屏」可見性');
const back = (html.match(/\.pay-back-link\{[\s\S]*?\}/) || [''])[0];
ok(back.length > 0, '.pay-back-link 規則存在');
const bfs = (back.match(/font-size:\s*(\d+(?:\.\d+)?)px/) || [])[1];
ok(bfs && parseFloat(bfs) >= 17, `.pay-back-link font-size >= 17px (實得 ${bfs}px)`);
const bcol = (back.match(/color:\s*var\(--([a-z0-9-]+)\)/) || [])[1];
ok(!!bcol, `.pay-back-link 使用 :root token 而非硬寫色 (實得 --${bcol})`);
const bhex = bcol ? token(bcol) : null;
const bc = bhex ? contrast(bhex, BACKDROP) : 0;
ok(bc >= 4.5, `safe exit 對比 >= 4.5:1 WCAG AA (實得 ${bc.toFixed(2)}:1, --${bcol}=${bhex})`);
ok(!/color:\s*var\(--moss\)/.test(back), '.pay-back-link 不得用 --moss(對比僅 1.73:1)');

console.log('BK16 — 句5 字級真的生效(不是只設在容器)');
ok(/#payRelicBranch\s*p\s*\{[^}]*font-size:\s*17px/.test(html),
   '存在 `#payRelicBranch p` 直接宣告 17px(ID 特異度勝過 .lp-body p)');
ok(/#payRelicBranch\s*p\s*\{[^}]*line-height:\s*1\.9/.test(html),
   '`#payRelicBranch p` 行高 >= 1.9');
// 反向斷言:確認我們知道對手是誰,對手若改小也要被抓到
const lpbody = (html.match(/\.lp-body p\{[^}]*\}/) || [''])[0];
const lpfs = (lpbody.match(/font-size:\s*(\d+(?:\.\d+)?)px/) || [])[1];
ok(!!lpfs, `已知競爭規則 .lp-body p 存在(${lpfs}px) — 若此規則消失請重審本閘`);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
