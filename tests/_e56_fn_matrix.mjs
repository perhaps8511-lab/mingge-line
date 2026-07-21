// _e56_fn_matrix.mjs — helper for test_e56_laoyi_center_v1_0.sh 段②
// Extracted to its own file to avoid bash/heredoc escaping of regex literals.
import fs from 'node:fs';

const idxPath = process.argv[2];
const src = fs.readFileSync(idxPath, 'utf8');

function extractFn(name) {
  const re = new RegExp('(async )?function ' + name + '\\([^)]*\\)\\{[\\s\\S]*?\\n\\}');
  const m = src.match(re);
  if (!m) throw new Error('extractFn miss: ' + name);
  return m[0];
}

let pass = 0, fail = 0;
function report(ok, label) {
  console.log((ok ? 'PASS' : 'FAIL') + ' ' + label);
  if (ok) pass++; else fail++;
}

// case1: laoyiSanitizeTitle — 控制字元清洗 + 長度上限 200 + 空值安全
{
  const fnSrc = extractFn('laoyiSanitizeTitle');
  const hasCtrlStrip = /\\x00-\\x1F/.test(fnSrc);
  const hasSlice200 = /slice\(0,\s*LAOYI_TITLE_MAX\)/.test(fnSrc);
  const hasTypeGuard = /typeof raw!== *'string'/.test(fnSrc);
  report(hasCtrlStrip && hasSlice200 && hasTypeGuard, 'case1 laoyiSanitizeTitle 控制字元清洗+長度上限+型別防呆');
}

// case2: content_id 不再二次 decodeURIComponent(r2 #1 修正)
{
  const initSrc = extractFn('initAskLaoyiPage');
  const noDoubleDecode = !/decodeURIComponent\(new URLSearchParams/.test(initSrc) && !/decodeURIComponent\(contentId\)/.test(initSrc);
  report(noDoubleDecode, 'case2 initAskLaoyiPage 不重複 decodeURIComponent(URLSearchParams.get 已解碼)');
}

// case3: initAskLaoyiPage 可重入防護(__laoyiInited)
{
  const initSrc = extractFn('initAskLaoyiPage');
  const hasGuard = /if\(__laoyiInited\) return;/.test(initSrc) && /__laoyiInited\s*=\s*true;/.test(initSrc);
  report(hasGuard, 'case3 initAskLaoyiPage 具重入防護旗標');
}

// case4: S4 決策題 regex fixture(12句 positive/negative,逐句斷言,12/12 門檻)
{
  const reMatch = src.match(/var LAOYI_DECISION_RE\s*=\s*(\/.*\/[a-z]*);/);
  if (!reMatch) throw new Error('LAOYI_DECISION_RE not found');
  const re = eval(reMatch[1]);
  const fixtures = [
    ['這個工作要不要接？', true],
    ['我該不該換工作？', true],
    ['這筆投資值不值得？', true],
    ['這兩個方案該如何選？', true],
    ['我該怎麼決定要不要搬家？', true],
    ['這件事現在能不能做？', true],
    ['要選 A 還是 B？', true],
    ['Should I go or no go on this deal?', true],
    ['今天天氣如何？', false],
    ['《易經》是什麼時候寫的？', false],
    ['老易你好', false],
    ['我剛讀完一篇文章', false],
  ];
  let hit = 0;
  fixtures.forEach(([q, expected]) => {
    const got = re.test(q);
    if (got === expected) hit++;
    else console.log('  mismatch: "' + q + '" expected=' + expected + ' got=' + got);
  });
  report(hit === 12, 'case4 S4 regex fixture 12/12 命中(實際=' + hit + '/12)');
}

// case5: laoyiSetComposerBusy guard(r3 N1 修正:節點缺失不拋錯)
{
  const fnSrc = extractFn('laoyiSetComposerBusy');
  const guarded = /if\(laoyiInput\)\{/.test(fnSrc) && /if\(laoyiSendBtn\)\{/.test(fnSrc);
  report(guarded, 'case5 laoyiSetComposerBusy 對 laoyiInput/laoyiSendBtn 皆 guard');
}

// case6: laoyiSend 單飛鎖 + query 長度前端契約(2000)+ 只有成功才計輪
{
  const fnSrc = extractFn('laoyiSend');
  const hasLock = /if\(laoyiSending\) return;/.test(fnSrc);
  const hasLenCap = /LAOYI_QUERY_MAX/.test(fnSrc);
  const countsOnlyOnOk = /if\(ok\)\{[\s\S]*laoyiTurnCount\+\+;/.test(fnSrc);
  report(hasLock && hasLenCap && countsOnlyOnOk, 'case6 laoyiSend 單飛鎖+長度契約+僅成功計輪');
}

// case7: laoyiComposerKeydown 處理 Enter/Shift+Enter/IME
{
  const fnSrc = extractFn('laoyiComposerKeydown');
  const handlesEnter = /e\.key!== *'Enter'/.test(fnSrc);
  const handlesShift = /e\.shiftKey/.test(fnSrc);
  const handlesIme = /e\.isComposing/.test(fnSrc) && /keyCode===229/.test(fnSrc);
  report(handlesEnter && handlesShift && handlesIme, 'case7 Enter送出/Shift+Enter換行/IME組字不誤送');
}

// case8: laoyiAppendBubble 使用 textContent(不用 innerHTML)
{
  const fnSrc = extractFn('laoyiAppendBubble');
  const usesTextContent = /el\.textContent\s*=\s*text;/.test(fnSrc);
  const noInnerHtml = !/\.innerHTML\s*=/.test(fnSrc);
  report(usesTextContent && noInnerHtml, 'case8 laoyiAppendBubble 用 textContent,不用 innerHTML(防XSS)');
}

// case9: laoyiShowSvcHandoff 無訊息時不捏造原句、防重複開啟
{
  const fnSrc = extractFn('laoyiShowSvcHandoff');
  const noFabricate = !/送出.*TA 尚未輸入/.test(fnSrc) && /先打字問一句/.test(fnSrc);
  const hasReentryGuard = /if\(laoyiSvcHandoffOpen\) return;/.test(fnSrc);
  report(noFabricate && hasReentryGuard, 'case9 無訊息時不捏造原句+防重複開啟(r1 #8/#10)');
}

// case10: laoyiHandoffToService 原句送出 + 防連點 + S6 僅 resolve 才顯示
{
  const fnSrc = extractFn('laoyiHandoffToService');
  const sendsRaw = /liff\.sendMessages\(\[\{type:'text',text:messageText\}\]\)/.test(fnSrc);
  const hasDoubleClickGuard = /if\(btnEl\.disabled\) return;/.test(fnSrc);
  const s6AfterAwait = /await liff\.sendMessages[\s\S]*已送到書僮案上/.test(fnSrc);
  report(sendsRaw && hasDoubleClickGuard && s6AfterAwait, 'case10 原句送出+防連點+S6僅resolve才顯示(r1 #9/#10/#11)');
}

// case11: studySendAskLaoyi 改走 deep link,不再 sendMessages
{
  const fnSrc = extractFn('studySendAskLaoyi');
  const usesDeepLink = /location\.href='\.\/index\.html\?action=ask&content_id='\+encodeURIComponent/.test(fnSrc);
  const noSendMessages = !/liff\.sendMessages/.test(fnSrc);
  report(usesDeepLink && noSendMessages, 'case11 studySendAskLaoyi 改走 content_id deep link(r2 #3 修正)');
}

console.log('---SUMMARY--- pass=' + pass + ' fail=' + fail);
process.exit(fail === 0 ? 0 : 1);
