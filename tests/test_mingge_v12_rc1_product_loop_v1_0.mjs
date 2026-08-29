import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const html = read('index.html');
const log = read('log.html');
const worker = read('workers/mingge-relay/worker.js');
const menu = JSON.parse(read('plans/mingge_showcase_005a_rich_menu_mapping_v1_0.json'));
const future = JSON.parse(read('contracts/mingge_v1_2_rc1_future_gated_contract_v1_0.json'));

let pass = 0;
let fail = 0;
const check = (condition, id, detail) => {
  console.log(`${condition ? '[PASS]' : '[FAIL]'} ${id} ${detail}`);
  condition ? pass++ : fail++;
};

const labels = ['向天問卦', '我的卦記', '方案・信物', '易經書房', '問老易', '書僮客服'];
const subtitles = ['問一件新的事', '回看、補記已有的事', '看方案或龍宮舍利', '自己讀一篇', '把看不懂的問懂', '查權益、訂單與售後'];
check(menu.areas.length === 6 && menu.areas.every((area, i) =>
  area.display?.label === labels[i] && area.display?.subtitle === subtitles[i] && area.action.label === labels[i]),
  'G-07', '六格 display label／副標逐格符合 adopted RC1');

const completionMarkup = html.slice(html.indexOf('<div class="save-complete"'), html.indexOf('<!-- 086卡'));
check(completionMarkup.includes('已收進「我的卦記」')
  && completionMarkup.includes('事情有了變化，再回來補記就好。')
  && completionMarkup.includes('>看這一卦</a>')
  && completionMarkup.includes('>回首頁</a>'),
  'R1-05/C-11', '保存完成 state 只提供查看與退出');
const buildId = html.match(/const APP_BUILD_ID = "([^"]+)";/)?.[1];
check(buildId === '20260829-save-complete-mobile-recovery-r1'
  && html.includes('id="handoffBuildId"')
  && html.includes('id="sendingBuildId"')
  && html.includes('id="saveCompleteBuildId"')
  && html.includes("console.info('[Mingge] APP_BUILD_ID='+APP_BUILD_ID)"),
  'R1-05-build', '固定 build id 可在 console、保存等待與完成畫面辨識');

const versionUrlSlice = html.slice(html.indexOf('function versionedLiffEndpointUrl'), html.indexOf('function renderAppBuildId'));
const versionUrlCtx = {
  URL,
  APP_BUILD_ID: buildId,
  APP_BUILD_QUERY_PARAM: 'app_build',
  LIFF_ENDPOINT_URL: 'https://perhaps8511-lab.github.io/mingge-line/',
};
vm.createContext(versionUrlCtx);
vm.runInContext(versionUrlSlice + '\nthis.__versionUrl=versionedLiffEndpointUrl;', versionUrlCtx);
const versionedUrl = new URL(versionUrlCtx.__versionUrl('https://perhaps8511-lab.github.io/mingge-line/?action=log&src=menu'));
check(versionedUrl.searchParams.get('action') === 'log'
  && versionedUrl.searchParams.get('src') === 'menu'
  && versionedUrl.searchParams.get('app_build') === buildId,
  'R1-05-cache-bust', '版本化 LIFF URL 保留既有 query parameters');
for (const forbidden of ['深卜', '複盤', '半年方案', '龍運藏', '商品', '靜心']) {
  check(!completionMarkup.includes(forbidden), `N-16-${forbidden}`, `保存完成 state 不含「${forbidden}」`);
}

const currentQiguaTime = '2026-08-29T15:22:00+08:00';
const currentQiguaTimeUtc = '2026-08-29T07:22:00.000Z';
const olderQiguaTimeUtc = '2026-08-29T07:20:00.000Z';
const persistenceStart = html.includes('function normalizedTimestampMs')
  ? html.indexOf('function normalizedTimestampMs')
  : html.indexOf('function persistenceDelay');
const persistenceSlice = html.slice(persistenceStart, html.indexOf('/* LIFF 初始化'));
const pageEvents = {};
const documentEvents = {};
const persistenceCtx = {
  RELAY_URL: 'https://relay.test/', SESSION_ID: 'session-rc1',
  sessionStorage: {
    values: new Map(), removed: [],
    getItem(k) { return this.values.has(k) ? this.values.get(k) : null; },
    setItem(k, v) { this.values.set(k, String(v)); },
    removeItem(k) { this.removed.push(k); this.values.delete(k); },
  },
  setTimeout(fn) { fn(); return 1; },
  console: { warn() {} },
  liff: { isLoggedIn: () => true, getAccessToken: () => 'resume-token' },
  window: { addEventListener(name, fn) { pageEvents[name] = fn; } },
  document: {
    visibilityState: 'visible',
    elements: {
      saveCompleteView: { href: '' },
      saveComplete: { classList: { values: [], add(v) { this.values.push(v); } } },
    },
    getElementById(id) { return this.elements[id] || null; },
    addEventListener(name, fn) { documentEvents[name] = fn; },
  },
};
vm.createContext(persistenceCtx);
vm.runInContext(persistenceSlice + '\nthis.__wait=waitForPersistedLog;this.__show=showSaveComplete;this.__recover=recoverInflightSave;this.__sameInstant=typeof timestampsRepresentSameInstant===\"function\"?timestampsRepresentSameInstant:null;this.__setRecoveryToken=function(v){liffReady=true;liffAccessToken=v;};this.__readbackBudgetMs=(PERSISTENCE_POLL_ATTEMPTS-1)*PERSISTENCE_POLL_INTERVAL_MS;', persistenceCtx);
let pollCount = 0;
persistenceCtx.sessionStorage.setItem('mg_inflight_session_id', 'session-rc1');
persistenceCtx.sessionStorage.setItem('mg_inflight_qigua_time', currentQiguaTime);
persistenceCtx.fetch = async () => ({
  ok: true,
  json: async () => ({ records: ++pollCount < 3 ? [] : [{ session_id: 'session-rc1', qigua_time: currentQiguaTimeUtc, log_id: 'rec123' }] }),
});
const persisted = await persistenceCtx.__wait('token', 'session-rc1', currentQiguaTime);
check(persisted?.log_id === 'rec123' && pollCount === 3
  && !persistenceCtx.sessionStorage.values.has('mg_inflight_session_id')
  && !persistenceCtx.sessionStorage.values.has('mg_inflight_qigua_time'),
  'R1-05-readback', '同 session_id + normalized qigua_time 的 history readback 後才取得 record_ref');
pollCount = 0;
persistenceCtx.sessionStorage.setItem('mg_inflight_session_id', 'session-rc1');
persistenceCtx.sessionStorage.setItem('mg_inflight_qigua_time', currentQiguaTime);
persistenceCtx.fetch = async () => ({
  ok: true,
  json: async () => ({ records: ++pollCount < 60 ? [] : [{ session_id: 'session-rc1', qigua_time: currentQiguaTimeUtc, log_id: 'rec-late' }] }),
});
const delayedPersisted = await persistenceCtx.__wait('token', 'session-rc1', currentQiguaTime);
check(delayedPersisted?.log_id === 'rec-late' && pollCount === 60
  && persistenceCtx.__readbackBudgetMs >= 120000,
  'R1-05-latency', '120 秒 readback 視窗涵蓋現役 Make/Airtable 近 90 秒延遲');
let stalePollCount = 0;
persistenceCtx.fetch = async () => ({
  ok: true,
  json: async () => { stalePollCount++; return { records: [{ session_id: 'session-rc1', qigua_time: olderQiguaTimeUtc, log_id: 'rec-stale' }] }; },
});
const stalePersisted = await persistenceCtx.__wait('token', 'session-rc1', currentQiguaTime);
check(stalePersisted === null && stalePollCount === 81,
  'R1-05-stale-session', '同 session_id 但較舊 qigua_time 的 record 不得被接受');
persistenceCtx.fetch = async () => ({
  ok: true,
  json: async () => ({ records: [
    { session_id: 'session-rc1', qigua_time: olderQiguaTimeUtc, log_id: 'rec-old' },
    { session_id: 'session-rc1', qigua_time: currentQiguaTimeUtc, log_id: 'rec-new' },
  ] }),
});
persistenceCtx.sessionStorage.setItem('mg_inflight_session_id', 'session-rc1');
persistenceCtx.sessionStorage.setItem('mg_inflight_qigua_time', currentQiguaTime);
const exactPersisted = await persistenceCtx.__wait('token', 'session-rc1', currentQiguaTime);
check(exactPersisted?.log_id === 'rec-new',
  'R1-05-current-log', '同 session 多筆 record 必須選本次 exact qigua_time 的新 log_id');
check(typeof persistenceCtx.__sameInstant === 'function'
  && persistenceCtx.__sameInstant(currentQiguaTime, currentQiguaTimeUtc) === true,
  'R1-05-time-equivalence', '+08:00 與 Airtable Z 時間相同 instant 可正規化匹配');
for (const invalidTime of [null, '', 'not-a-time']) {
  persistenceCtx.fetch = async () => ({ ok: true, json: async () => ({ records: [{ session_id: 'session-rc1', qigua_time: currentQiguaTimeUtc, log_id: 'rec-arbitrary' }] }) });
  const invalidPersisted = await persistenceCtx.__wait('token', 'session-rc1', invalidTime);
  check(invalidPersisted === null,
    `R1-05-invalid-time-${String(invalidTime)}`, '缺少或無效 qigua_time 時 fail honest，不顯示成功');
}
persistenceCtx.__show(persisted.log_id);
check(persistenceCtx.document.elements.saveCompleteView.href === './log.html?log_id=rec123&context=first_completion'
  && persistenceCtx.document.elements.saveComplete.classList.values.includes('show'),
  'C-12-first', '保存完成導向 first_completion context');

const gateStart = html.includes('function normalizedTimestampMs')
  ? html.indexOf('function normalizedTimestampMs')
  : html.indexOf('function readEntryGateState');
const gateSlice = html.slice(gateStart, html.indexOf('function persistenceDelay'));
let gateShownLogId = null;
const gateCtx = {
  SESSION_ID: 'session-rc1', APP_BUILD_ID: buildId, READING_STATUS_TEXT: '讀卦中',
  sessionStorage: persistenceCtx.sessionStorage,
  quotaCreditsFromSub: () => 0,
  showSaveComplete(logId) { gateShownLogId = logId; },
  setSceneById() {},
  document: {
    getElementById() { return null; },
    querySelector() { return null; },
  },
};
vm.createContext(gateCtx);
vm.runInContext(gateSlice + '\nthis.__readEntry=readEntryGateState;this.__blockEntry=blockEntryIfNeeded;', gateCtx);
persistenceCtx.sessionStorage.setItem('mg_inflight_session_id', 'session-rc1');
persistenceCtx.sessionStorage.setItem('mg_inflight_qigua_time', currentQiguaTime);
let reopenedState = gateCtx.__readEntry({ records: [{ session_id: 'session-rc1', qigua_time: currentQiguaTimeUtc, log_id: 'rec-reopen' }] });
check(gateCtx.__blockEntry(reopenedState) === true
  && gateShownLogId === 'rec-reopen'
  && !persistenceCtx.sessionStorage.values.has('mg_inflight_session_id')
  && !persistenceCtx.sessionStorage.values.has('mg_inflight_qigua_time'),
  'R1-05-reopen', 'reopen 讀到 exact session_id + normalized qigua_time + log_id 即顯示完成並清除兩個 inflight keys');
persistenceCtx.sessionStorage.setItem('mg_inflight_session_id', 'session-rc1');
persistenceCtx.sessionStorage.setItem('mg_inflight_qigua_time', currentQiguaTime);
reopenedState = gateCtx.__readEntry({ records: [{ session_id: 'other-session', qigua_time: currentQiguaTimeUtc, log_id: 'rec-other' }] });
check(reopenedState.persistedLogId === null && reopenedState.inFlight === true,
  'R1-05-session-negative', '不同 session_id 不得誤判保存成功');
reopenedState = gateCtx.__readEntry({ records: [{ session_id: 'session-rc1', qigua_time: currentQiguaTimeUtc }] });
check(reopenedState.persistedLogId === null && reopenedState.inFlight === true,
  'R1-05-log-negative', 'exact session 沒有 log_id 仍不得顯示成功');
persistenceCtx.sessionStorage.setItem('mg_inflight_qigua_time', currentQiguaTime);
reopenedState = gateCtx.__readEntry({ records: [{ session_id: 'session-rc1', qigua_time: olderQiguaTimeUtc, log_id: 'rec-stale-reopen' }] });
check(reopenedState.persistedLogId === null && reopenedState.inFlight === true,
  'R1-05-reopen-stale', 'reopen 不得接受同 session 的舊 qigua_time record');
for (const invalidTime of [null, 'invalid']) {
  persistenceCtx.sessionStorage.setItem('mg_inflight_session_id', 'session-rc1');
  if(invalidTime === null) persistenceCtx.sessionStorage.removeItem('mg_inflight_qigua_time');
  else persistenceCtx.sessionStorage.setItem('mg_inflight_qigua_time', invalidTime);
  reopenedState = gateCtx.__readEntry({ records: [{ session_id: 'session-rc1', qigua_time: currentQiguaTimeUtc, log_id: 'rec-arbitrary' }] });
  check(reopenedState.persistedLogId === null,
    `R1-05-reopen-invalid-${String(invalidTime)}`, 'reopen 缺少或無效 inflight qigua_time 不得成功');
}

const resumeMethods = [];
persistenceCtx.__setRecoveryToken('resume-token');
persistenceCtx.sessionStorage.setItem('mg_inflight_session_id', 'session-rc1');
persistenceCtx.sessionStorage.setItem('mg_inflight_qigua_time', currentQiguaTime);
persistenceCtx.fetch = async (_url, options) => {
  resumeMethods.push(options?.method);
  return { ok: true, json: async () => ({ records: [
    { session_id: 'session-rc1', qigua_time: olderQiguaTimeUtc, log_id: 'rec-pageshow-stale' },
    { session_id: 'session-rc1', qigua_time: currentQiguaTimeUtc, log_id: 'rec-pageshow' },
  ] }) };
};
const pageshowRecovered = await pageEvents.pageshow();
check(pageshowRecovered?.log_id === 'rec-pageshow'
  && persistenceCtx.document.elements.saveCompleteView.href.includes('log_id=rec-pageshow')
  && resumeMethods.every(method => method === 'GET')
  && !persistenceCtx.sessionStorage.values.has('mg_inflight_session_id')
  && !persistenceCtx.sessionStorage.values.has('mg_inflight_qigua_time'),
  'R1-05-pageshow', 'pageshow 前景恢復只用 session_id + normalized qigua_time 做 GET readback');
persistenceCtx.sessionStorage.setItem('mg_inflight_session_id', 'session-rc1');
persistenceCtx.sessionStorage.setItem('mg_inflight_qigua_time', currentQiguaTime);
persistenceCtx.fetch = async (_url, options) => {
  resumeMethods.push(options?.method);
  return { ok: true, json: async () => ({ records: [
    { session_id: 'session-rc1', qigua_time: olderQiguaTimeUtc, log_id: 'rec-visible-stale' },
    { session_id: 'session-rc1', qigua_time: currentQiguaTimeUtc, log_id: 'rec-visible' },
  ] }) };
};
const visibilityRecovered = await documentEvents.visibilitychange();
check(visibilityRecovered?.log_id === 'rec-visible'
  && persistenceCtx.document.elements.saveCompleteView.href.includes('log_id=rec-visible')
  && resumeMethods.every(method => method === 'GET')
  && !persistenceCtx.sessionStorage.values.has('mg_inflight_session_id')
  && !persistenceCtx.sessionStorage.values.has('mg_inflight_qigua_time'),
  'R1-05-visibility', 'visibilitychange 回前景只用 session_id + normalized qigua_time 做 GET readback');

const sendSlice = html.slice(html.indexOf('async function sendSay'), html.indexOf('function copyJson'));
check(sendSlice.indexOf('waitForPersistedLog') < sendSlice.indexOf('showSaveComplete')
  && /if\(persisted\)\{[\s\S]*showSaveComplete/.test(sendSlice)
  && /else\{[\s\S]*showSendingAndClose/.test(sendSlice)
  && sendSlice.includes("sessionStorage.setItem('mg_inflight_session_id', payload.session_id)")
  && sendSlice.includes("sessionStorage.setItem('mg_inflight_qigua_time', payload.qigua_time)"),
  'C-11-order', 'POST 後保存 exact session/qigua correlation 再 readback；未讀回不宣稱已保存');

const delayedSource = log.slice(log.indexOf('function buildDelayedActionsHtml'), log.indexOf('function renderDetail'));
for (const action of ['事情有變了', '想把這一卦看深', '想回看這一路', '問另一件新的事']) {
  check(delayedSource.includes(action), `R2-06-${action}`, `delayed return 包含「${action}」`);
}
check(delayedSource.includes('tierInfo.recordsCount >= 3')
  && log.includes('viewContext === "first_completion"')
  && log.includes('if (viewContext === "first_completion")')
  && log.includes('html += buildDelayedActionsHtml(rec, tierInfo);'),
  'C-12/R2-06', 'first completion 與 delayed return 分開，複盤僅符合條件顯示');

check(html.includes('<strong>今天想自己讀一篇？</strong>')
  && html.includes('從生活裡常遇到的事開始，不必先懂卦名。')
  && html.includes('>繼續閱讀</button>'),
  'R4-06', '④首屏與文章尾明確是自己閱讀');
check(html.includes('有一段看不懂？')
  && html.includes('把文章、卦辭或既有卦象帶來；這裡只做解釋，不會替您再起一卦。')
  && subtitles.slice(4, 5).every(copy => html.includes(copy))
  && ['更白話', '換生活例子', '看古典脈絡', '比較另一卦'].every(copy => html.includes(copy)),
  'R5-07', '⑤首屏與四種深化層明確是把內容問懂');
check(html.includes("entry_context=article&content_ref=")
  && html.includes("action=study&article=")
  && html.includes('id="laoyiContextReturn"'),
  'R4/R5-context', '文章 context 可帶入⑤並回原文章');

const relicMarkup = html.slice(html.indexOf('<div id="payRelicBranch"'), html.indexOf('<!-- P-STUDY'));
for (const copy of [
  '運好氣旗下｜龍宮舍利選藏', '龍運藏', '先看清一件物，再決定要不要留下。',
  '龍運藏整理龍宮舍利的收藏與逐件資料。卦象不替您挑商品。',
  '實品資料正在整理，完成後才會開放。', '先認識龍宮舍利',
]) check(relicMarkup.includes(copy), `R3-08/09-${copy}`, `龍運藏入口包含「${copy}」`);
check(relicMarkup.includes('龍宮舍利，是這批收藏沿用的名稱')
  && (relicMarkup.match(/<details>/g) || []).length === 4,
  'R3-08', '自有知識頁與四個可展開章節在位');
check(relicMarkup.includes('龍運藏只會開放資料已整理清楚的商品。您可以先認識龍宮舍利，或回命格。'),
  'R3-LY-05', 'Not-yet-open closure 在位');
check(!/pinkoi/i.test(relicMarkup) && !/https?:\/\//i.test(relicMarkup),
  'R3-11/N-13', 'TA-facing 龍運藏 markup 無外部平台 URL／copy／tag');
check(!relicMarkup.includes('NT$') && !relicMarkup.includes('前往購買')
  && html.includes("if(derivedState!==ARTIFACT_CATALOG_OPEN){ return; }"),
  'R3-09/N-15', '0 published 在商品卡／價格／購買狀態前 fail closed');
check(html.includes("if(_artifactCatalogState===ARTIFACT_CATALOG_OPEN){ showArtifactList(); }")
  && html.includes("else{ longyunShow('longyunGuide'); }"),
  'R3-13/C-13', 'catalog open 可直接看手鍊；empty 才以知識為 Primary');
check(relicMarkup.indexOf('龍運藏整理龍宮舍利') < relicMarkup.indexOf('龍宮舍利，是這批收藏沿用的名稱'),
  'N-18', '入口與知識頁分層，不在連續首屏重播完整長文');

for (const id of ['XTVSSPvA', 'agmh9hhJ', 'S9j544BD']) {
  const start = worker.indexOf(`${id}: Object.freeze`);
  const block = worker.slice(start, worker.indexOf('}),', start) + 3);
  check(start >= 0 && block.includes('publication_state: "needs_supplier"'), `R3-12-${id}`, `${id} 預設 needs_supplier`);
}
check(worker.includes('function deriveArtifactCatalogState(publishedCount)')
  && worker.includes('Number(publishedCount) > 0 ? "open" : "empty"'),
  'R3-10-catalog', 'catalog state 只由 published count 衍生');
const publicViewStart = worker.indexOf('function artifactPublicView');
const publicView = worker.slice(publicViewStart, worker.indexOf('// S163', publicViewStart));
check(publicView.includes('disclosed_unknowns: disclosedUnknowns')
  && !publicView.includes('pending_source:'),
  'R3-10/N-22', 'public view 只輸出 evidence-bound disclosed_unknowns');
const publicFields = worker.slice(worker.indexOf('const ARTIFACT_PUBLIC_FIELDS'), worker.indexOf('];', worker.indexOf('const ARTIFACT_PUBLIC_FIELDS')) + 2);
check(!/source_reference|sku_source_ref|supplier_facts|pending_source|actual_photos|collector_entitlement/i.test(publicFields),
  'R3-11/N-14', 'source reference／supplier gaps 不在 TA field whitelist');
check(!/collector_entitlement\s*:|actual_photos\s*:/.test(publicView),
  'R3-11-public-output', '舊權益文字與來源相片欄位不進公開回應');

check(future.status === 'FUTURE_GATED_NOT_RUNTIME'
  && future.payment_provider === null
  && future.real_checkout_enabled === false
  && future.order_mutation_enabled === false
  && future.entitlement_claim_enabled === false,
  'Slice-D-gate', 'provider／checkout／order／entitlement 均未 admission');
check(future.checkout_preflight.purchase_intent.join('|') === 'self_use|gift'
  && future.checkout_preflight.gift.buyer_private_memory_read === false,
  'C-14-privacy', 'self/gift preflight 分席且 buyer 無 holder private memory read');
check(future.holder_activation.preselected_action === null
  && future.holder_activation.starts_at === 'holder_explicit_activation'
  && future.holder_activation.payment_implies_active === false
  && future.holder_activation.actions.length === 4,
  'R6-06/N-23', 'holder 未預選、explicit activation 起算、四個選項');
check(future.entry_context.forbidden_fields.includes('private_decision_memory')
  && future.entry_context.forbidden_fields.includes('payment_payload')
  && future.support_return.from_article === 'return_same_article'
  && future.support_return.default === 'return_rich_menu',
  'R6-05/C-15', 'entry_context 最小化並可 contextual return；無 context 才回首頁');

console.log(`PASS=${pass} FAIL=${fail}`);
process.exit(fail === 0 ? 0 : 1);
