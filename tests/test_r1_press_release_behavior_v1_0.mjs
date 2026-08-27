// R1 行為測試｜早放 / 滿環放開 / touch+pointer 雙事件 —— 以 DOM stub 實跑 S2 互動區塊
// 目的：不是比對字串，而是真的跑一次「按住→放開」，證明門檻與 T0 語意沒被改壞，
//       且 rAF 被凍住時（模擬 LINE WebView）仍會出現「可以放開了」。
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const start = html.indexOf('/* ===== S2 起卦互動');
const end = html.indexOf('/* ===== 起卦時間', start);
if (start < 0 || end < 0) { console.error('FAIL cannot locate S2 block'); process.exit(1); }
const source = html.slice(start, end);

let pass = 0, fail = 0;
const check = (c, id, d) => { console.log(`${c ? '[PASS]' : '[FAIL]'} ${id} ${d}`); c ? pass++ : fail++; };

function makeEnv({ freezeRaf }) {
  const els = {};
  const mk = (id) => (els[id] = {
    id, innerHTML: '', textContent: '', style: {},
    _c: new Set(),
    classList: { add: (c) => els[id]._c.add(c), remove: (c) => els[id]._c.delete(c), contains: (c) => els[id]._c.has(c) },
    _listeners: {},
    addEventListener(ev, fn) { (this._listeners[ev] = this._listeners[ev] || []).push(fn); },
    fire(ev) { (this._listeners[ev] || []).forEach(fn => fn({ preventDefault() {} })); },
  });
  ['core', 'progBar', 'ring64', 'glyphring', 'runner', 'rgua', 'guide', 'coreLabel', 'guidePermit', 'breatheTxt', 'prog'].forEach(mk);

  let now = 0;
  const timers = [];
  const ctx = {
    console,
    document: { getElementById: (id) => els[id] || mk(id) },
    window: { GUA_RING: Array.from({ length: 64 }, (_, i) => ({ n: 'G' + i })) },
    Math,
    Date: Object.assign(function FakeDate() { return { _fake: true }; }, { now: () => now }),
    requestAnimationFrame: (fn) => (freezeRaf ? 1 : (timers.push({ at: now, fn, raf: true }), timers.length)),
    cancelAnimationFrame: () => {},
    setTimeout: (fn, ms) => (timers.push({ at: now + ms, fn }), timers.length),
    clearTimeout: (h) => { if (timers[h - 1]) timers[h - 1].fn = null; },
    setInterval: () => 1, clearInterval: () => {},
    buildGlyphRing: () => {}, buildRing64: () => {},
    qiGua: () => ({ stub: true }), showResult: () => { ctx._resultShown = true; }, go: () => {},
    lastG: null, _resultShown: false,
    advance(ms) { now += ms; timers.forEach(t => { if (t.fn && t.at <= now && !t.done) { t.done = true; const f = t.fn; t.fn = null; f(); } }); },
  };
  ctx.window.GUA_RING = ctx.window.GUA_RING;
  vm.createContext(ctx);
  vm.runInContext('var window=this.window; var GUA_RING=window.GUA_RING;' + source, ctx);
  return { ctx, els };
}

// 1) 早放：按住 1 秒放開 → 不成卦
{
  const { ctx, els } = makeEnv({ freezeRaf: true });
  els.core.fire('pointerdown');
  ctx.advance(1000);
  els.core.fire('pointerup');
  check(ctx._resultShown === false, 'R1-BH1', '早放（1s）不成卦');
  check(els.guide.innerHTML.includes('光環還沒繞滿，卦未成'), 'R1-BH2', '早放給出以光環為準的提示');
  check(els.core.classList.contains('ready') === false, 'R1-BH3', '早放後 ready 視覺已清除');
}

// 2) rAF 被凍住（模擬 LINE WebView）：滿 5 秒仍出現「可以放開了」
{
  const { ctx, els } = makeEnv({ freezeRaf: true });
  els.core.fire('touchstart');
  ctx.advance(5000);
  check(els.guide.innerHTML === '光環已圓滿，可以放開了', 'R1-BH4', 'rAF 凍住時，真實時鐘仍給出「光環已圓滿，可以放開了」');
  check(els.coreLabel.innerHTML === '可以放開了', 'R1-BH5', 'coreLabel 同步改為「可以放開了」');
  check(els.core.classList.contains('ready') && els.prog.classList.contains('ready'), 'R1-BH6', 'READY 視覺 class 已上');
  ctx.advance(500);
  els.core.fire('touchend');
  ctx.advance(700);   // doQi 內有 650ms 過場
  check(ctx._resultShown === true, 'R1-BH7', '滿環後放開 → 成卦');
}

// 3) LINE WebView 雙事件：touchstart+pointerdown 只算一次按住；touchend+pointerup 只成卦一次
{
  const { ctx, els } = makeEnv({ freezeRaf: true });
  let qiCalls = 0;
  ctx.showResult = () => { qiCalls++; };
  els.core.fire('touchstart');
  els.core.fire('pointerdown');      // 重複按下應被 pressing 旗標擋掉
  ctx.advance(5200);
  els.core.fire('touchend');
  els.core.fire('pointerup');        // 重複放開不得再成一次卦
  ctx.advance(700);
  check(qiCalls === 1, 'R1-BH8', `touch+pointer 雙事件僅成卦一次（實得 ${qiCalls}）`);
}

// 4) 未按住就放開 → 不得有任何反應
{
  const { ctx, els } = makeEnv({ freezeRaf: true });
  els.core.fire('pointerup');
  ctx.advance(700);
  check(ctx._resultShown === false, 'R1-BH9', '未按住即放開不成卦');
}

console.log(`PASS=${pass} FAIL=${fail}`);
process.exit(fail === 0 ? 0 : 1);
