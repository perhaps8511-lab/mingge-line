// R1｜起卦互動清晰度（MG-RM-01）— 指引與 READY 視覺狀態
// 驗收面：文案不得再與 READY_MS 門檻矛盾；光環繞滿必須「看得見地」改變指引；
//         起卦語意（門檻、隨機、T0 放開成卦）不得被改動。
import { readFileSync } from 'node:fs';
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
let pass = 0, fail = 0;
const check = (c, id, d) => { console.log(`${c ? '[PASS]' : '[FAIL]'} ${id} ${d}`); c ? pass++ : fail++; };
const count = (s) => (html.split(s).length - 1);

// A. 矛盾文案已清除
check(!html.includes('不必久按'), 'R1-A1', '「不必久按」已清除');
check(!html.includes('念畢即放'), 'R1-A2', '「念畢即放」已清除');
check(!html.includes('念畢放開，卦自成'), 'R1-A3', '「念畢放開，卦自成」已清除');
check(!html.includes('念定了，放開即成卦'), 'R1-A4', '「念定了，放開即成卦」已清除');
check(!html.includes('按住凝神<br>念畢放開'), 'R1-A5', 'coreLabel 舊「念畢放開」已清除');

// B. Owner 指定的兩句指引在位（markup + prepQi 各一）
check(count('按住光點，心中默念你想問的事') >= 2, 'R1-B1', '「按住光點，心中默念你想問的事」在 markup 與 prepQi 皆在位');
check(count('等金色光環繞滿一圈，再放開起卦') >= 3, 'R1-B2', '「等金色光環繞滿一圈，再放開起卦」在初始/重置/按住中皆在位');

// C. READY 狀態必須可見地改變指引
check(html.includes("document.getElementById('guide').innerHTML='光環已圓滿，可以放開了';"), 'R1-C1', 'READY 時 guide 改為「光環已圓滿，可以放開了」');
check(html.includes("document.getElementById('coreLabel').innerHTML='可以放開了';"), 'R1-C2', 'READY 時 coreLabel 改為「可以放開了」');
check(/\.core\.ready\{/.test(html) && /\.prog\.ready \.br\{/.test(html), 'R1-C3', 'READY 有專屬視覺樣式（core + 光環）');
check(html.includes("core.classList.add('ready')") && html.includes("document.getElementById('prog').classList.add('ready')"), 'R1-C4', 'READY 會加上視覺 class');

// D. LINE WebView：rAF 可能被凍住 → 必須有真實時鐘 fallback
check(html.includes('readyTimer=setTimeout(markReady, READY_MS);'), 'R1-D1', 'setTimeout(markReady, READY_MS) 真實時鐘 fallback 存在');
check(html.includes('if(p>=1){ markReady(); }'), 'R1-D2', 'rAF 進度滿一圈亦觸發 markReady');
check(count('clearTimeout(readyTimer)') >= 2, 'R1-D3', 'readyTimer 在 clearReady 與 cancelPress 皆被清除（不外洩）');

// E. 早放（未滿門檻）指引一致
check(html.includes('光環還沒繞滿，卦未成'), 'R1-E1', '早放提示改為以光環為準');
check(!html.includes('按住的時間要久一點'), 'R1-E2', '舊的「時間要久一點」說法已清除');

// F. 起卦語意零改動（凍結區）
check(html.includes('const READY_MS=5000;'), 'R1-F1', 'READY_MS 仍為 5000（門檻未變）');
check(html.includes('if(held >= READY_MS){') && html.includes('doQi();'), 'R1-F2', '仍以真實時鐘 held >= READY_MS 判定成卦');
check(html.includes('const now=new Date();') && html.includes('const g=qiGua(now); lastG=g;'), 'R1-F3', 'T0 仍取放開那一刻，qiGua 未被改動');
check(count('core.addEventListener(') === 9, 'R1-F4', 'mouse/touch/pointer 九個事件綁定全數保留');
for (const ev of ['mousedown','mouseup','mouseleave','touchstart','touchend','touchcancel','pointerdown','pointerup','pointercancel'])
  check(html.includes(`core.addEventListener('${ev}'`), `R1-F4-${ev}`, `${ev} 綁定在位`);

console.log(`PASS=${pass} FAIL=${fail}`);
process.exit(fail === 0 ? 0 : 1);
