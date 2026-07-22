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

// case12: S20260721 UAT F3 — LAOYI_SVC_CLOSE_RE 偵測引擎收束店務題(書僮 + 店務/帳務語意詞 40 字內共現)
// Codex 互審 r1 攔下單字 /書僮/ 過寬(誤觸發如純資訊題);修正後需同時證明:
// (a) 真機實測收束句仍命中(不能為了防誤觸發而漏掉真正的 bug),(b) 純提及書僮的資訊題不再誤觸發。
{
  const reMatch = src.match(/var LAOYI_SVC_CLOSE_RE\s*=\s*(\/[\s\S]*?\/[a-z]*);/);
  if (!reMatch) throw new Error('LAOYI_SVC_CLOSE_RE not found');
  const re = eval(reMatch[1]);
  const fixtures = [
    // positive:真機截圖實測收束句 + S1/S5 定稿邊界句衍生
    ['請洽詢書僮客服', true],
    ['這是店務，老夫不管帳——書僮就在門外。', true],
    ['占卦是天的事，店務找書僮。', true],
    ['退費的事,請問書僮,老夫不管帳目。', true],
    // negative:純提及書僮但非店務收束的資訊題/閒聊(舊版單字 /書僮/ 會誤觸發之處)
    ['書僮是誰？', false],
    ['老易和書僮有何不同？', false],
    ['這篇文章裡也提到書僮這個角色。', false],
    ['書僮平常都在忙些什麼？', false],
    ['《易經》講的是變與不變', false],
    ['善為易者不占', false],
    ['我剛讀完一篇文章,想再問深一點', false],
    ['要不要接這個工作？', false],
  ];
  let hit = 0;
  fixtures.forEach(([a, expected]) => {
    const got = re.test(a);
    if (got === expected) hit++;
    else console.log('  mismatch: "' + a + '" expected=' + expected + ' got=' + got);
  });
  report(hit === fixtures.length, 'case12 LAOYI_SVC_CLOSE_RE fixture ' + fixtures.length + '/' + fixtures.length + ' 命中(實際=' + hit + '/' + fixtures.length + ',含4 positive+8 negative,對應 Codex r1 攔下項)');
}

// case13: S20260721 UAT F3 — laoyiSend 對「引擎回覆」跑 SVC_CLOSE_RE(非對使用者問句),
// 命中時觸發 laoyiShowSvcHandoff,且優先於決策題 CTA(else-if,不疊加)
{
  const fnSrc = extractFn('laoyiSend');
  const testsAnswerNotQuestion = /LAOYI_SVC_CLOSE_RE\.test\(answerText\)/.test(fnSrc);
  const callsHandoff = /LAOYI_SVC_CLOSE_RE\.test\(answerText\)\)\{\s*laoyiShowSvcHandoff\(\);\s*\}/.test(fnSrc);
  const isPriorToDecision = /LAOYI_SVC_CLOSE_RE\.test\(answerText\)\)\{[\s\S]*?\}\s*else if\(LAOYI_DECISION_RE\.test\(trimmed\)\)/.test(fnSrc);
  report(testsAnswerNotQuestion && callsHandoff && isPriorToDecision,
    'case13 F3:引擎收束店務題(answerText 含書僮)自動觸發帶話按鈕,優先於起卦CTA');
}

// case14: S20260721 UAT F3 — 常駐入口/自動引路不再永久卡死:
// laoyiResetSvcHandoff 存在且成功/失敗/早退三路徑皆呼叫(舊版只有早退路徑解鎖)
{
  const resetFnSrc = extractFn('laoyiResetSvcHandoff');
  const resetsFlagAndEntry = /laoyiSvcHandoffOpen\s*=\s*false;/.test(resetFnSrc) && /entry\.disabled\s*=\s*false;/.test(resetFnSrc);

  const showFnSrc = extractFn('laoyiShowSvcHandoff');
  const earlyReturnResets = /先打字問一句[\s\S]*laoyiResetSvcHandoff\(\);/.test(showFnSrc);

  const handoffFnSrc = extractFn('laoyiHandoffToService');
  // 註:原始檔為 CRLF 換行,且 S6 陳述句後接行內註解 // S6,逐字定稿——比對時容許任意非換行字元(如註解)插在陳述句與下一行之間
  const successResets = /已送到書僮案上。回到聊天室，書僮接著答。'\s*,\s*'bot'\s*,\s*\{system:true\}\);[^\n]*\n\s*laoyiResetSvcHandoff\(\);/.test(handoffFnSrc);
  const failureResets = /btnEl\.disabled\s*=\s*false;[^\n]*\n\s*laoyiResetSvcHandoff\(\);/.test(handoffFnSrc);

  report(resetsFlagAndEntry && earlyReturnResets && successResets && failureResets,
    'case14 F3:laoyiResetSvcHandoff 於早退/成功/失敗三路徑皆解鎖(舊版用過一次後常駐入口永久按不動)');
}

console.log('---SUMMARY--- pass=' + pass + ' fail=' + fail);
process.exit(fail === 0 ? 0 : 1);
