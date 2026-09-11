// ====================================================
// mingge-relay — 命格轉發層 Worker v6
// S39: 方案3 LIFF Access Token 驗證(POST / → Make webhook)
// S135+: 新增 GET /history (E09 歷史卦例 + 會員狀態)
//         需要 Secret: AIRTABLE_API_KEY (Perth 貼進 Cloudflare Secrets)
// S137-R02: 新增 GET /log (E23 卦記詳情) + /history 加 log_id 欄位
// S140: 新增 POST /trigger/deepdive、/trigger/fupan(E27 深卜/複盤入口導引,薄代理層)
//         需要 Secret: HOOK_DEEPDIVE、HOOK_FUPAN(Perth 已貼進 Cloudflare Secrets)
//         沿用現役 resolveUserId() 驗證,webhook URL 不進前端(依 S37 binding)
// S163: 新增 POST /trace(E25② 卦記蓋印·補後續)—— TA 事後補寫「後來怎麼走」,
//         寫入 Divination_Log.trace_text + trace_at;/history、/log 白名單追加回傳兩欄。
// E56: 新增 POST /laoyi/chat(老易學習中心直連 Dify app-gQwG4,stateless,不落任何持久層)
//         需要 Secret: DIFY_LAOYI_KEY(Perth 貼進 Cloudflare Secrets;缺鑰時路由回 503)
// S20260721 UAT F4: /laoyi/chat 加 Workers Rate Limiting API binding(LAOYI_RATE_LIMITER,見 wrangler.toml)
//         per-verified-user 20 req/min,保護共用 Dify credit;workers.dev 子域無 zone,故不走 WAF 儀表板規則
//
// ⚠️ MAKE_EXIT 第2b段(獨立審 HOLD 修正②，2026-09-11)：本次修改**只 commit，不部署**。
//   /history、/log、/trace、/log/seal、/trigger/deepdive 五條路由改為薄轉發到新的 Postgres 後端 API
//   (env.MAKE_EXIT_API_BASE_URL)，取代直接讀寫 Airtable Divination_Log；驗證邏輯(resolveUserId)、
//   ownership 比對、payload 驗證規則完全比照原本，不放寬。其餘路由(/study、/artifacts、
//   /trigger/fupan、/laoyi/chat、/falsetoken/checkout)一個字不動。
//   正式部署前必做：①在 wrangler 設定加 MAKE_EXIT_API_BASE_URL(指向正式環境的新後端，非 staging)；
//   ②新後端目前 gua_records 表缺 bian_gua/dong_yao/output_json 三欄，下面標了 TODO，部署前要先補欄位
//   +搬資料，否則這三個欄位在正式切換後會變成一律 null；③這是 Owner 明確裁定「切正式必須另發 GO」的
//   動作，本次 commit 本身不構成部署授權。回退：`wrangler rollback` 回上一個部署版本即可，此檔沒有
//   拆成兩支腳本，是同一支腳本內部路由改寫，回退是單一版本回滾，乾淨。
// ====================================================

const ALLOWED_ORIGIN = "https://perhaps8511-lab.github.io";
const LINE_CHANNEL_ID = "2010192384";

const AT_BASE        = "apptFfyVBYE4ygW3E";
const AT_DIV_LOG     = "tblVyf8WfTQxvtpEg";
const AT_SUBS        = "tbljXninuBm76D9nf";
const AT_SHUFANG     = "tblbzhwwmBDfAKQAs";

// MG-RM-03 · 龍宮舍利 artifact owning store(與卦記/書房不同 base)
const AT_PRODUCT_BASE = "appfQm6On0Wp9LtL9";
const AT_ARTIFACTS    = "tbllxi9NZNhsBjLxD";
// Legacy formula 只代表既有資料列通過舊 gate；RC1 不把它升格成 published truth。
const ARTIFACT_PUBLISHABLE = "PUBLISHABLE";
const ARTIFACT_PUBLICATION_STATES = Object.freeze([
  "source_reference_only", "needs_supplier", "publishable_candidate", "published", "unavailable",
]);

// RC1 D-D08：逐 SKU publication truth。這是 internal scaffold，不會由 API 原樣輸出。
// pending_source 是資料工作缺口；disclosed_unknowns 只有具 evidence ref 後才可進 public item。
const FIRST_BATCH_ARTIFACT_PUBLICATION = Object.freeze({
  XTVSSPvA: Object.freeze({
    artifact_id: "XTVSSPvA", source_category: "bracelet", current_offer_price_twd: 6000,
    publication_state: "needs_supplier", title_state: "missing", photo_rights_state: "missing",
    owned_photo_assets: [], inventory_model: "PENDING_SUPPLIER", price_state: "confirmed",
    required_facts_state: "missing", disclosed_unknowns_state: "missing", care_state: "missing",
    after_sales_state: "missing", evidence_refs: [], pending_source: ["supplier_facts", "photo_rights", "inventory"],
    disclosed_unknowns: [],
  }),
  agmh9hhJ: Object.freeze({
    artifact_id: "agmh9hhJ", source_category: "bracelet", current_offer_price_twd: 6800,
    publication_state: "needs_supplier", title_state: "missing", photo_rights_state: "missing",
    owned_photo_assets: [], inventory_model: "PENDING_SUPPLIER", price_state: "confirmed",
    required_facts_state: "missing", disclosed_unknowns_state: "missing", care_state: "missing",
    after_sales_state: "missing", evidence_refs: [], pending_source: ["supplier_facts", "photo_rights", "inventory"],
    disclosed_unknowns: [],
  }),
  S9j544BD: Object.freeze({
    artifact_id: "S9j544BD", source_category: "bracelet", current_offer_price_twd: null,
    publication_state: "needs_supplier", title_state: "missing", photo_rights_state: "missing",
    owned_photo_assets: [], inventory_model: "PENDING_SUPPLIER", price_state: "missing",
    required_facts_state: "missing", disclosed_unknowns_state: "missing", care_state: "missing",
    after_sales_state: "missing", evidence_refs: [], pending_source: ["supplier_facts", "photo_rights", "inventory", "price"],
    disclosed_unknowns: [],
  }),
});

// TA 白名單刻意不含 source ref、pending_source、供應商工作註記與 publication internals。
const ARTIFACT_PUBLIC_FIELDS = [
  "artifact_id", "title_mingge", "price_mingge_twd", "price_band",
  "inventory_model", "availability", "dimensions", "weight", "condition",
  "material_claim", "source_provenance", "traceability",
  "known_facts", "cultural_use_context", "care", "publish_blocked",
];
const TRACE_MAX_BODY_BYTES = 4096;
const TRACE_REQUEST_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
// 新後端用 UUID 當主鍵(不是 Airtable 的 rec 前綴格式)；薄轉發路由用這個驗證 log_id 格式,
// 格式不對就地回 400,不讓一個明顯錯的字串一路轉發到新 API 才在資料庫層炸開。
const MAKE_EXIT_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Hub R9, 2026-09-03: no completed owning-store readback. Shared by both R2 pages.
const FUPAN_LIVE_PROVEN = false;
const LAOYI_CONV_ID_RE = /^[A-Za-z0-9_-]{1,128}$/;
const LAOYI_UPSTREAM_TIMEOUT_MS = 30000;
const FALSE_TOKEN_PLANS = Object.freeze({
  single_149: { amount: 149 },
  pack_399:   { amount: 399 },
  deepen_200: { amount: 200, schemaHold: true },
  sub_1490:   { amount: 1490 },
});

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/history") {
      const accessToken = request.headers.get("X-Line-AccessToken");
      if (!accessToken) {
        return json({ error: "Missing access token" }, 401);
      }

      let verifiedUserId;
      try {
        ({ userId: verifiedUserId } = await resolveUserId(accessToken, LINE_CHANNEL_ID));
      } catch (e) {
        return json({ error: e.message }, e.status || 401);
      }

      if (!env.MAKE_EXIT_API_BASE_URL) {
        return json({ error: "MAKE_EXIT_API_BASE_URL not configured" }, 503);
      }
      if (!env.AIRTABLE_API_KEY) {
        return json({ error: "AIRTABLE_API_KEY not configured" }, 503);
      }

      // 卦記列表:薄轉發到新後端(MAKE_EXIT 遷移範圍)。會員狀態(Subscribers)不在本次遷移範圍——
      // Owner 裁定 Entitlements/Subscribers 屬第5段(金流)才動,這裡維持原本直讀 Airtable。
      const [newApiRes, subResult] = await Promise.all([
        fetch(`${env.MAKE_EXIT_API_BASE_URL}/gua-records?subject=${encodeURIComponent(verifiedUserId)}`),
        airtableFetchStrict(env.AIRTABLE_API_KEY, AT_BASE, AT_SUBS, {
          filterByFormula: `{line_user_id}="${verifiedUserId}"`,
          fields: ["subscriber_tier", "trial_quota_remaining", "monthly_quota_remaining", "subscription_start"],
          maxRecords: 1,
        }),
      ]);

      if (!newApiRes.ok || !subResult.ok) {
        return json({ state: "read_error" }, 502);
      }
      const newApiData = await newApiRes.json();
      if (!Array.isArray(newApiData.records)) {
        return json({ state: "read_error" }, 502);
      }

      const records = newApiData.records.map(r => ({
        log_id: r.id,
        session_id: r.request_id || null,
        question_text: r.question_text || null,
        ben_gua: r.ben_gua || null,
        bian_gua: null, // TODO(部署前補齊):新後端 gua_records 目前沒有 bian_gua 欄位
        dong_yao: null, // TODO(部署前補齊):新後端 gua_records 目前沒有 dong_yao 欄位
        qigua_time: r.qigua_time || null,
        entry_type: "divination",
        golden_seal: !!r.golden_seal,
        golden_seal_time: r.golden_seal_time || null,
        trace_text: r.trace_text || null,
        trace_at: r.trace_at || null,
      }));
      const subRec  = (subResult.records || [])[0];
      const sub     = subRec ? subRec.fields : null;

      return json({
        records,
        fupan_live_proven: FUPAN_LIVE_PROVEN,
        subscriber: sub ? {
          tier:                    sub.subscriber_tier || "free",
          trial_quota_remaining:   sub.trial_quota_remaining   || 0,
          monthly_quota_remaining: sub.monthly_quota_remaining || 0,
          subscription_start:      sub.subscription_start      || null,
        } : null,
      });
    }

    if (request.method === "GET" && url.pathname === "/log") {
      const logId = url.searchParams.get("log_id");
      if (!logId) {
        return json({ error: "Missing log_id" }, 400);
      }

      const accessToken = request.headers.get("X-Line-AccessToken");
      if (!accessToken) {
        return json({ error: "Missing access token" }, 401);
      }

      let verifiedUserId;
      try {
        ({ userId: verifiedUserId } = await resolveUserId(accessToken, LINE_CHANNEL_ID));
      } catch (e) {
        return json({ error: e.message }, e.status || 401);
      }

      if (!MAKE_EXIT_UUID_RE.test(logId)) {
        return json({ error: "Invalid log_id" }, 400);
      }
      if (!env.MAKE_EXIT_API_BASE_URL) {
        return json({ error: "MAKE_EXIT_API_BASE_URL not configured" }, 503);
      }

      let recRes, rec;
      try {
        recRes = await fetch(`${env.MAKE_EXIT_API_BASE_URL}/gua-records/${encodeURIComponent(logId)}`);
        if (recRes.ok) rec = await recRes.json();
      } catch (_) { return json({ state: "read_error" }, 502); }
      if (recRes.status === 404) {
        return json({ record: null }, 404);
      }
      if (!recRes.ok || !rec || typeof rec !== "object") {
        return json({ state: "read_error" }, 502);
      }

      if (rec.subject !== verifiedUserId) {
        return json({ record: null }, 403);
      }

      return json({
        record: {
          log_id:         rec.id,
          session_id:     rec.request_id   || null,
          question_text:  rec.question_text || null,
          ben_gua:        rec.ben_gua      || null,
          bian_gua:       null, // TODO(部署前補齊):新後端 gua_records 目前沒有 bian_gua 欄位
          dong_yao:       null, // TODO(部署前補齊):新後端 gua_records 目前沒有 dong_yao 欄位
          qigua_time:     rec.qigua_time   || null,
          entry_type:     "divination",
          output_json:    null, // TODO(部署前補齊):新後端 gua_records 目前沒有保存原始解卦 output_json
          golden_seal:    !!rec.golden_seal,
          golden_seal_time: rec.golden_seal_time || null,
          trace_text:     rec.trace_text   || null,
          trace_at:       rec.trace_at     || null,
          deep_read_state: rec.deep_read_state ?? null,
          deep_read_output_json: rec.deep_read_output_json ?? null,
        },
      });
    }

    if (request.method === "GET" && url.pathname === "/study") {
      if (!env.AIRTABLE_API_KEY) {
        return json({ error: "AIRTABLE_API_KEY not configured" }, 503);
      }
      const result = await airtableFetch(env.AIRTABLE_API_KEY, AT_BASE, AT_SHUFANG, {
        filterByFormula: `{qc_passed}=1`,
        fields: ["title", "content_type", "body", "persona", "ta_type", "jieqi_node", "featured"],
        maxRecords: 100,
      });
      const articles = (result.records || []).map(r => r.fields);
      return json({ articles });
    }

    // RC1 · GET /artifacts —— publication-state 衍生的公開 catalog read model。
    // ★ legacy PUBLISHABLE 不等於 published；只有逐 SKU publication_state=published 才可回傳。
    // ★ 0 published → catalog_state=empty；store 讀失敗 → catalog_state=read_error。
    if (request.method === "GET" && url.pathname === "/artifacts") {
      if (!env.AIRTABLE_API_KEY) {
        return json({
          state: "read_error", catalog_state: "read_error", published_count: 0,
          items: [], gate: "publication_state", reason: "credential_unavailable",
        }, 503);
      }
      const result = await airtableFetchStrict(env.AIRTABLE_API_KEY, AT_PRODUCT_BASE, AT_ARTIFACTS, {
        fields: ARTIFACT_PUBLIC_FIELDS,
        maxRecords: 100,
      });
      if (!result.ok) {
        return json({
          state: "read_error", catalog_state: "read_error", published_count: 0,
          items: [], gate: "publication_state", reason: result.reason,
        }, 503);
      }
      const items = (result.records || [])
        .map(r => r.fields || {})
        .map(f => ({ fields: f, publication: artifactPublicationTruth(f.artifact_id) }))
        // Production dual gate：explicit published truth + legacy owning-store formula 都要成立。
        .filter(row => row.publication.publication_state === "published"
          && row.fields.publish_blocked === ARTIFACT_PUBLISHABLE)
        .map(row => artifactPublicView(row.fields, row.publication));
      const catalogState = deriveArtifactCatalogState(items.length);
      return json({
        state: "ok", catalog_state: catalogState, published_count: items.length,
        items, gate: "publication_state",
      });
    }

    if (request.method === "POST" && url.pathname === "/log/seal") {
      const contentType = request.headers.get("Content-Type") || "";
      if (!contentType.toLowerCase().includes("application/json")) {
        return json({ error: "Bad JSON body" }, 400);
      }

      let payload;
      try {
        payload = await request.json();
      } catch (e) {
        return json({ error: "Bad JSON body" }, 400);
      }

      const accessToken = request.headers.get("X-Line-AccessToken");
      if (!accessToken) {
        return json({ error: "Missing access token" }, 401);
      }

      let verifiedUserId;
      try {
        ({ userId: verifiedUserId } = await resolveUserId(accessToken, LINE_CHANNEL_ID));
      } catch (e) {
        console.log("Seal access token validation failed", e.message || e);
        return json({ error: "Invalid access token" }, 401);
      }

      const payloadIsObject = payload && typeof payload === "object" && !Array.isArray(payload);
      const payloadKeys = payloadIsObject ? Object.keys(payload) : [];
      if (payloadKeys.some(k => k !== "log_id")) {
        return json({ error: "Unexpected field in payload" }, 400);
      }

      const logId = payloadIsObject ? payload.log_id : undefined;
      if (typeof logId !== "string" || !MAKE_EXIT_UUID_RE.test(logId)) {
        return json({ error: "Invalid log_id" }, 400);
      }

      if (!env.MAKE_EXIT_API_BASE_URL) {
        return json({ error: "MAKE_EXIT_API_BASE_URL not configured" }, 503);
      }

      let recRes, rec;
      try {
        recRes = await fetch(`${env.MAKE_EXIT_API_BASE_URL}/gua-records/${encodeURIComponent(logId)}`);
        if (recRes.ok) rec = await recRes.json();
      } catch (e) {
        console.log("New-API seal read failed", e.message || e);
        return json({ error: "Read failed" }, 502);
      }

      if (recRes.status === 404) {
        return json({ record: null }, 404);
      }
      if (!recRes.ok || !rec) {
        console.log("New-API seal read failed", recRes.status);
        return json({ error: "Read failed" }, 502);
      }

      if (rec.subject !== verifiedUserId) {
        return json({ error: "Forbidden" }, 403);
      }

      // 新後端 /gua-records/:id/seal 本身已冪等(已蓋印直接回 already_sealed:true),
      // 這裡不需要重複判斷 golden_seal 現況再自行分岔,直接轉發、原樣轉發它的判斷結果。
      let sealRes;
      try {
        sealRes = await fetch(`${env.MAKE_EXIT_API_BASE_URL}/gua-records/${encodeURIComponent(logId)}/seal`, {
          method: "POST",
        });
      } catch (e) {
        console.log("New-API seal write failed", e.message || e);
        return json({ error: "Write failed" }, 502);
      }
      if (!sealRes.ok) {
        console.log("New-API seal write failed", sealRes.status);
        return json({ error: "Write failed" }, 502);
      }
      return json(await sealRes.json());
    }

    // S163(E25②):卦記蓋印·補後續 —— TA 事後補寫「後來怎麼走」,
    // 沿用 /log/seal 既有驗身+擁有權模式(S37 binding),不動 /log/seal 本身。
    if (request.method === "POST" && url.pathname === "/trace") {
      const contentType = request.headers.get("Content-Type") || "";
      if (!/^application\/json(?:;.*)?$/i.test(contentType.trim())) {
        return json({ state: "failed", error: "Bad JSON body" }, 400);
      }

      const declaredLength = Number(request.headers.get("Content-Length") || "0");
      if (declaredLength > TRACE_MAX_BODY_BYTES) {
        return json({ state: "failed", error: "Payload too large" }, 413);
      }

      let rawBody;
      try {
        rawBody = await readBodyWithLimit(request, TRACE_MAX_BODY_BYTES);
      } catch (e) {
        if (e && e.tooLarge) {
          return json({ state: "failed", error: "Payload too large" }, 413);
        }
        return json({ state: "failed", error: "Bad JSON body" }, 400);
      }

      let payload;
      try {
        payload = JSON.parse(rawBody);
      } catch (e) {
        return json({ state: "failed", error: "Bad JSON body" }, 400);
      }

      const accessToken = request.headers.get("X-Line-AccessToken");
      if (!accessToken) {
        return json({ state: "failed", error: "Missing access token" }, 401);
      }

      let verifiedUserId;
      try {
        ({ userId: verifiedUserId } = await resolveUserId(accessToken, LINE_CHANNEL_ID));
      } catch (e) {
        return json({ state: "failed", error: "Invalid access token" }, e.status || 401);
      }

      const payloadIsObject = payload && typeof payload === "object" && !Array.isArray(payload);
      const payloadKeys = payloadIsObject ? Object.keys(payload) : [];
      if (payloadKeys.some(k => k !== "log_id" && k !== "trace_text" && k !== "request_id")) {
        return json({ state: "failed", error: "Unexpected field in payload" }, 400);
      }

      const logId = payloadIsObject ? payload.log_id : undefined;
      if (typeof logId !== "string" || !MAKE_EXIT_UUID_RE.test(logId)) {
        return json({ state: "failed", error: "Invalid log_id" }, 400);
      }

      const rawTraceText = payloadIsObject ? payload.trace_text : undefined;
      const requestId = payloadIsObject ? payload.request_id : undefined;
      if (typeof requestId !== "string" || !TRACE_REQUEST_ID_RE.test(requestId)) {
        return json({ state: "failed", error: "Invalid request_id" }, 400);
      }
      const traceText = typeof rawTraceText === "string" ? rawTraceText.trim() : "";
      if (!traceText || traceText.length > 500) {
        return json({ state: "failed", error: "Invalid trace_text" }, 400);
      }

      if (!env.MAKE_EXIT_API_BASE_URL) {
        return json({ state: "failed", error: "MAKE_EXIT_API_BASE_URL not configured" }, 503);
      }

      let recRes, rec;
      try {
        recRes = await fetch(`${env.MAKE_EXIT_API_BASE_URL}/gua-records/${encodeURIComponent(logId)}`);
        if (recRes.ok) rec = await recRes.json();
      } catch (e) {
        return json({ state: "failed", error: "Read failed" }, 502);
      }

      if (recRes.status === 404) {
        return json({ state: "failed", record: null }, 404);
      }
      if (!recRes.ok || !rec) {
        console.log("SECURITY_GATE", "NEW_API_TRACE_READ_HTTP_ERROR", recRes.status);
        return json({ state: "failed", error: "Read failed" }, 502);
      }
      if (rec.subject !== verifiedUserId) {
        return json({ state: "failed", error: "Forbidden" }, 403);
      }

      // 冪等/append/寫後 readback-verify 的邏輯本身已經搬進新後端的
      // POST /gua-records/:id/trace(用 (gua_record_id, request_id) 正規化表當冪等鍵，
      // 見 backend/src/server.js traceGuaRecord())；Worker 這裡只需要單純轉發+把回應
      // 重新包裝成跟舊版一模一樣的對外形狀，不用再自己實作重試/驗證迴圈。
      let traceRes;
      try {
        traceRes = await fetch(`${env.MAKE_EXIT_API_BASE_URL}/gua-records/${encodeURIComponent(logId)}/trace`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ request_id: requestId, trace_text: traceText }),
        });
      } catch (e) {
        return json({ state: "unconfirmed", request_id: requestId }, 202);
      }
      if (traceRes.status === 409) {
        // 新後端對「同 request_id、不同內容」回 409——跟舊版「重用 ID 但內容不同不算成功」語意一致。
        return json({ state: "unconfirmed", request_id: requestId }, 202);
      }
      if (!traceRes.ok) {
        return json({ state: "unconfirmed", request_id: requestId }, 202);
      }
      const result = await traceRes.json();
      return json({
        traced: true, trace_text: result.trace_text, trace_at: result.trace_at,
        request_id: requestId, idempotent: !!result.idempotent,
      });
    }

    // S140(E27):深卜/複盤薄代理層 —— 前端只打這裡,Worker 驗完身分才轉發 Make webhook,
    // webhook URL 全程留在 Worker 端 Secrets,不進前端原始碼(S37 binding)。
    if (request.method === "POST" && url.pathname === "/falsetoken/checkout") {
      const contentType = request.headers.get("Content-Type") || "";
      if (!contentType.toLowerCase().includes("application/json")) {
        return json({ error: "Bad JSON body" }, 400);
      }

      let payload;
      try {
        payload = await request.json();
      } catch (e) {
        return json({ error: "Bad JSON body" }, 400);
      }

      const accessToken = request.headers.get("X-Line-AccessToken");
      if (!accessToken) {
        return json({ error: "Missing access token" }, 401);
      }

      let verifiedUserId;
      try {
        ({ userId: verifiedUserId } = await resolveUserId(accessToken, LINE_CHANNEL_ID));
      } catch (e) {
        console.log("FalseToken access token validation failed", e.message || e);
        return json({ error: "Invalid access token" }, 401);
      }

      const payloadIsObject = payload && typeof payload === "object" && !Array.isArray(payload);
      const payloadKeys = payloadIsObject ? Object.keys(payload) : [];
      if (payloadKeys.length !== 1 || payloadKeys[0] !== "plan") {
        return json({ error: "Unexpected field in payload" }, 400);
      }

      const plan = typeof payload.plan === "string" ? payload.plan : "";
      const planContract = FALSE_TOKEN_PLANS[plan];
      if (!planContract) {
        return json({ error: "Invalid plan" }, 400);
      }
      if (planContract.schemaHold) {
        return json({ error: "deepen_200 entitlement binding not configured" }, 409);
      }
      if (!env.HOOK_FALSETOKEN) {
        return json({ error: "HOOK_FALSETOKEN not configured" }, 503);
      }

      const randomPart = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
      const orderId = `MG${Date.now()}${randomPart}`;
      const hookPayload = {
        order_id: orderId,
        custom_id: `FT-${orderId}`,
        line_user_id: verifiedUserId,
        plan,
        amount: planContract.amount,
        status: "pending",
      };

      try {
        const hookRes = await fetch(env.HOOK_FALSETOKEN, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(hookPayload),
        });
        if (!hookRes.ok) {
          console.log("FalseToken webhook forward failed", hookRes.status);
          return json({ error: "Webhook forward failed" }, 502);
        }
      } catch (e) {
        console.log("FalseToken webhook forward failed", e.message || e);
        return json({ error: "Webhook forward failed" }, 502);
      }

      return json({ accepted: true, order_id: orderId }, 202);
    }

    if (request.method === "POST" && url.pathname === "/trigger/deepdive") {
      const contentType = request.headers.get("Content-Type") || "";
      if (!contentType.toLowerCase().includes("application/json")) {
        return json({ error: "Bad JSON body" }, 400);
      }

      let payload;
      try {
        payload = await request.json();
      } catch (e) {
        return json({ error: "Bad JSON body" }, 400);
      }

      const accessToken = request.headers.get("X-Line-AccessToken");
      if (!accessToken) {
        return json({ error: "Missing access token" }, 401);
      }

      let verifiedUserId;
      try {
        ({ userId: verifiedUserId } = await resolveUserId(accessToken, LINE_CHANNEL_ID));
      } catch (e) {
        console.log("Deepdive access token validation failed", e.message || e);
        return json({ error: "Invalid access token" }, 401);
      }

      const payloadIsObject = payload && typeof payload === "object" && !Array.isArray(payload);
      const payloadKeys = payloadIsObject ? Object.keys(payload) : [];
      if (payloadKeys.some(k => k !== "log_id")) {
        return json({ error: "Unexpected field in payload" }, 400);
      }

      const logId = payloadIsObject ? payload.log_id : undefined;
      if (typeof logId !== "string" || !MAKE_EXIT_UUID_RE.test(logId)) {
        return json({ error: "Invalid log_id" }, 400);
      }

      if (!env.MAKE_EXIT_API_BASE_URL) {
        return json({ error: "MAKE_EXIT_API_BASE_URL not configured" }, 503);
      }

      let recRes, rec;
      try {
        recRes = await fetch(`${env.MAKE_EXIT_API_BASE_URL}/gua-records/${encodeURIComponent(logId)}`);
        if (recRes.ok) rec = await recRes.json();
      } catch (e) {
        console.log("New-API deepdive read failed", e.message || e);
        return json({ error: "Read failed" }, 502);
      }

      if (recRes.status === 404) {
        return json({ record: null }, 404);
      }
      if (!recRes.ok || !rec) {
        console.log("New-API deepdive read failed", recRes.status);
        return json({ error: "Read failed" }, 502);
      }

      if (rec.subject !== verifiedUserId) {
        return json({ error: "Forbidden" }, 403);
      }

      // 舊版轉發到 Make webhook(HOOK_DEEPDIVE),不帶任何冪等鍵，由 Make 自己決定重複觸發怎麼處理。
      // 新後端的 /deep-read 端點要求 request_id 當冪等鍵；這裡沿用「每次點擊視為一次新觸發意圖」
      // 的舊語意，用 crypto.randomUUID() 產生一次性 request_id。
      // TODO(部署前確認):若要做到「同一次點擊只觸發一次」的更強冪等保護，應改成由前端(log.html)
      // 產生並帶入穩定的 request_id，而不是 Worker 每次都生一個新的。
      try {
        const triggerRes = await fetch(`${env.MAKE_EXIT_API_BASE_URL}/gua-records/${encodeURIComponent(logId)}/deep-read`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ request_id: crypto.randomUUID() }),
        });
        if (!triggerRes.ok && triggerRes.status !== 202 && triggerRes.status !== 200) {
          console.log("Deepdive trigger forward failed", triggerRes.status);
          return json({ error: "Trigger forward failed" }, 502);
        }
      } catch (e) {
        console.log("Deepdive trigger forward failed", e.message || e);
        return json({ error: "Trigger forward failed" }, 502);
      }

      return json({ sent: true }, 202);
    }

    if (request.method === "POST" && url.pathname === "/trigger/fupan") {
      const contentType = request.headers.get("Content-Type") || "";
      if (!contentType.toLowerCase().includes("application/json")) {
        return json({ error: "Bad JSON body" }, 400);
      }

      let payload;
      try {
        payload = await request.json();
      } catch (e) {
        return json({ error: "Bad JSON body" }, 400);
      }

      const accessToken = request.headers.get("X-Line-AccessToken");
      if (!accessToken) {
        return json({ error: "Missing access token" }, 401);
      }

      let verifiedUserId;
      try {
        ({ userId: verifiedUserId } = await resolveUserId(accessToken, LINE_CHANNEL_ID));
      } catch (e) {
        console.log("Fupan access token validation failed", e.message || e);
        return json({ error: "Invalid access token" }, 401);
      }

      const payloadIsObject = payload && typeof payload === "object" && !Array.isArray(payload);
      const payloadKeys = payloadIsObject ? Object.keys(payload) : [];
      if (payloadKeys.some(k => k !== "current_question")) {
        return json({ error: "Unexpected field in payload" }, 400);
      }

      const rawQuestion = payloadIsObject ? payload.current_question : undefined;
      const currentQuestion = typeof rawQuestion === "string" ? rawQuestion.trim() : "";
      if (!currentQuestion || currentQuestion.length > 200) {
        return json({ error: "Invalid current_question" }, 400);
      }

      if (!env.HOOK_FUPAN) {
        return json({ error: "HOOK_FUPAN not configured" }, 503);
      }

      const subscriberGate = await readSubscriberGate(env, verifiedUserId);
      if (!subscriberGate.allow) {
        return json({ error: "Subscriber entitlement required" }, subscriberGate.status || 403);
      }

      const hookPayload = {
        line_user_id:    verifiedUserId,
        current_question: currentQuestion,
      };

      try {
        const hookRes = await fetch(env.HOOK_FUPAN, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(hookPayload),
        });
        if (!hookRes.ok) {
          console.log("Fupan webhook forward failed", hookRes.status);
          return json({ error: "Webhook forward failed" }, 502);
        }
      } catch (e) {
        console.log("Fupan webhook forward failed", e.message || e);
        return json({ error: "Webhook forward failed" }, 502);
      }

      return json({ sent: true }, 202);
    }

    if (request.method === "POST" && url.pathname === "/laoyi/chat") {
      const contentType = request.headers.get("Content-Type") || "";
      if (!contentType.toLowerCase().includes("application/json")) {
        return json({ error: "Bad JSON body", code: "BAD_BODY" }, 400);
      }
      let payload;
      try { payload = await request.json(); }
      catch (e) { return json({ error: "Bad JSON body", code: "BAD_BODY" }, 400); }

      const accessToken = request.headers.get("X-Line-AccessToken");
      if (!accessToken) return json({ error: "Missing access token", code: "NO_TOKEN" }, 401);

      let verifiedUserId;
      try {
        ({ userId: verifiedUserId } = await resolveUserId(accessToken, LINE_CHANNEL_ID));
      } catch (e) {
        console.log("Laoyi chat access token validation failed", e.message || e);
        return json({ error: "Invalid access token", code: "INVALID_TOKEN" }, 401);
      }

      const payloadIsObject = payload && typeof payload === "object" && !Array.isArray(payload);
      const payloadKeys = payloadIsObject ? Object.keys(payload) : [];
      if (payloadKeys.some(k => k !== "query" && k !== "conversation_id")) {
        return json({ error: "Unexpected field in payload", code: "BAD_FIELD" }, 400);
      }

      const rawQuery = payloadIsObject ? payload.query : undefined;
      const query = typeof rawQuery === "string" ? rawQuery.trim() : "";
      if (!query || query.length > 2000) {
        return json({ error: "Invalid query", code: "INVALID_QUERY" }, 400);
      }
      // conversation_id 非字串/不符格式一律 400,不得靜默 slice 變造成另一個 ID
      const rawConvId = payloadIsObject ? payload.conversation_id : undefined;
      let conversationId = "";
      if (rawConvId !== undefined && rawConvId !== "") {
        if (typeof rawConvId !== "string" || !LAOYI_CONV_ID_RE.test(rawConvId)) {
          return json({ error: "Invalid conversation_id", code: "INVALID_CONV_ID" }, 400);
        }
        conversationId = rawConvId;
      }

      if (!env.DIFY_LAOYI_KEY) {
        return json({ error: "DIFY_LAOYI_KEY not configured", code: "NOT_CONFIGURED" }, 503);
      }

      // S20260721 UAT F4:workers.dev 子域無 zone,zone WAF Rate Limiting Rules 不適用,改 code 層擋。
      // 鍵=已驗證 LINE userId(非原始 token/IP)——同一人换 token 仍算同一額度,且不把 token 值存進限流鍵。
      // 20 req/min,超過該 60 秒窗口內即回 429(等同「block 60s」:窗口未過前同 key 持續被拒)。
      // 成本閘一律 fail-closed：binding 缺失、呼叫例外或 malformed result 都不得觸發 Dify。
      // 只有明確 success:true 才放行；明確 success:false 是正常超額 429。
      if (!env.LAOYI_RATE_LIMITER) {
        console.log("SECURITY_GATE", "RATE_LIMITER_BINDING_MISSING");
        return json({ error: "Rate limiter unavailable", code: "RATE_LIMITER_UNAVAILABLE" }, 503);
      }
      let limitResult;
      try {
        limitResult = await env.LAOYI_RATE_LIMITER.limit({ key: verifiedUserId });
      } catch (e) {
        console.log("SECURITY_GATE", "RATE_LIMITER_CHECK_FAILED");
        return json({ error: "Rate limiter unavailable", code: "RATE_LIMITER_UNAVAILABLE" }, 503);
      }
      if (!limitResult || typeof limitResult !== "object" || typeof limitResult.success !== "boolean") {
        console.log("SECURITY_GATE", "RATE_LIMITER_RESULT_MALFORMED");
        return json({ error: "Rate limiter unavailable", code: "RATE_LIMITER_UNAVAILABLE" }, 503);
      }
      if (limitResult.success !== true) {
        return json({ error: "Too many requests, please slow down", code: "RATE_LIMITED" }, 429);
      }

      // blocking 呼叫加 timeout,避免上游卡住無限拖住 Worker/前端 typing 泡泡
      const laoyiController = new AbortController();
      const laoyiTimeoutId = setTimeout(() => laoyiController.abort(), LAOYI_UPSTREAM_TIMEOUT_MS);
      let difyRes;
      try {
        difyRes = await fetch("https://api.dify.ai/v1/chat-messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + env.DIFY_LAOYI_KEY,
          },
          body: JSON.stringify({
            inputs: {},
            query,
            response_mode: "blocking",
            user: verifiedUserId,
            conversation_id: conversationId,
          }),
          signal: laoyiController.signal,
        });
      } catch (e) {
        const timedOut = e && e.name === "AbortError";
        console.log("Laoyi Dify forward failed", timedOut ? "timeout" : (e.message || e));
        return json({ error: timedOut ? "Dify request timed out" : "Dify request failed",
                      code: timedOut ? "UPSTREAM_TIMEOUT" : "UPSTREAM_ERROR" }, 502);
      } finally {
        clearTimeout(laoyiTimeoutId);
      }
      if (!difyRes.ok) {
        console.log("Laoyi Dify forward failed", difyRes.status);
        return json({ error: "Dify request failed", code: "UPSTREAM_ERROR" }, 502);
      }
      let difyData;
      try { difyData = await difyRes.json(); }
      catch (e) { return json({ error: "Dify response parse failed", code: "UPSTREAM_SCHEMA_ERROR" }, 502); }

      // 上游回應形狀驗證,answer/conversation_id 缺失或型別不符一律 502,不偽裝成成功
      const answerOk = difyData && typeof difyData === "object" && typeof difyData.answer === "string" && difyData.answer.length > 0;
      const convOk = difyData && typeof difyData.conversation_id === "string" && difyData.conversation_id.length > 0;
      if (!answerOk || !convOk) {
        // 診斷 log 只記型別存在性,不落 answer/conversation_id 原始內容,避免平台 log 變相持久化
        console.log("Laoyi Dify response shape invalid", { hasAnswer: !!(difyData && typeof difyData.answer === "string"), hasConversationId: !!(difyData && typeof difyData.conversation_id === "string") });
        return json({ error: "Dify response malformed", code: "UPSTREAM_SCHEMA_ERROR" }, 502);
      }

      return json({ answer: difyData.answer, conversation_id: difyData.conversation_id }, 200);
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: corsHeaders() });
    }

    const accessToken = request.headers.get("X-Line-AccessToken");
    if (!accessToken) {
      return new Response("Missing access token", { status: 401, headers: corsHeaders() });
    }

    let verifiedUserId, displayName;
    try {
      ({ userId: verifiedUserId, displayName } = await resolveUserId(accessToken, LINE_CHANNEL_ID));
    } catch (e) {
      return new Response(e.message, { status: e.status || 401, headers: corsHeaders() });
    }

    let payload;
    try {
      payload = await request.json();
    } catch (e) {
      return new Response("Bad JSON body", { status: 400, headers: corsHeaders() });
    }

    if (payload.event !== "consent_granted") {
      const quotaGate = await readQuotaGate(env, verifiedUserId);
      if (!quotaGate.allow) {
        if (quotaGate.status === 503) {
          return json({ error: "Quota gate unavailable", code: "QUOTA_GATE_UNAVAILABLE" }, 503);
        }
        return json({ gate: "zero_quota", credits: 0, next: "door_149", code: "QUOTA_REQUIRED" }, 402);
      }
    }

    payload.line_user_id = verifiedUserId;
    if (!payload.display_name && displayName) { payload.display_name = displayName; }

    const targetWebhook =
      payload.event === "consent_granted"
        ? env.MAKE_ROUTEA_WEBHOOK_URL
        : env.MAKE_WEBHOOK_URL;

    if (!targetWebhook) {
      return new Response("Relay misconfigured: missing target webhook", { status: 500, headers: corsHeaders() });
    }

    try {
      const makeRes = await fetch(targetWebhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const text = await makeRes.text();
      return new Response(text, { status: makeRes.status, headers: corsHeaders() });
    } catch (e) {
      return new Response("Relay to Make failed", { status: 502, headers: corsHeaders() });
    }
  },
};

function artifactPublicationTruth(artifactId) {
  const configured = artifactId ? FIRST_BATCH_ARTIFACT_PUBLICATION[artifactId] : null;
  if (configured && ARTIFACT_PUBLICATION_STATES.includes(configured.publication_state)) {
    return configured;
  }
  // 未逐 SKU admission 的資料列一律只是 source reference，不從 legacy formula 猜成 published。
  return {
    artifact_id: artifactId || "", publication_state: "source_reference_only",
    title_state: "missing", photo_rights_state: "missing", owned_photo_assets: [],
    inventory_model: "PENDING_SUPPLIER", price_state: "missing", required_facts_state: "missing",
    disclosed_unknowns_state: "missing", care_state: "missing", after_sales_state: "missing",
    evidence_refs: [], pending_source: ["publication_admission"], disclosed_unknowns: [],
  };
}

function deriveArtifactCatalogState(publishedCount) {
  return Number(publishedCount) > 0 ? "open" : "empty";
}

function artifactPublicView(fields, publication) {
  const hasUnknownEvidence = publication.disclosed_unknowns_state === "confirmed"
    && Array.isArray(publication.evidence_refs) && publication.evidence_refs.length > 0;
  const disclosedUnknowns = hasUnknownEvidence && Array.isArray(publication.disclosed_unknowns)
    ? publication.disclosed_unknowns.join("；") : "";
  const ownedPhoto = publication.photo_rights_state === "cleared"
    && Array.isArray(publication.owned_photo_assets) ? publication.owned_photo_assets[0] : "";
  const factsConfirmed = publication.required_facts_state === "confirmed";
  return {
    artifact_id: publication.artifact_id,
    publication_state: "published",
    title_mingge: publication.title_state === "approved" ? (fields.title_mingge || "") : "",
    photo_url: ownedPhoto || "",
    price_mingge_twd: publication.price_state === "confirmed" && typeof fields.price_mingge_twd === "number"
      ? fields.price_mingge_twd : null,
    price_band: publication.price_state === "confirmed" ? (fields.price_band || "") : "",
    inventory_model: factsConfirmed ? publication.inventory_model : "",
    availability: factsConfirmed ? (fields.availability || "") : "",
    dimensions: factsConfirmed ? (fields.dimensions || "") : "",
    weight: factsConfirmed ? (fields.weight || "") : "",
    condition: factsConfirmed ? (fields.condition || "") : "",
    material_claim: factsConfirmed ? (fields.material_claim || "") : "",
    source_provenance: factsConfirmed ? (fields.source_provenance || "") : "",
    traceability: factsConfirmed ? (fields.traceability || "") : "",
    known_facts: factsConfirmed ? (fields.known_facts || "") : "",
    disclosed_unknowns: disclosedUnknowns,
    cultural_use_context: factsConfirmed ? (fields.cultural_use_context || "") : "",
    care: publication.care_state === "confirmed" ? (fields.care || "") : "",
  };
}

// S163(E25②):邊讀邊擋的 body 位元組上限 —— 用 stream reader 累計位元組數,
// 一旦超過 limit 立即 cancel 底層串流並丟出 tooLarge,不等整包 body 進記憶體才檢查
// (無 Content-Length/chunked body 場景仍受此上限保護)。
async function readBodyWithLimit(request, limit) {
  if (!request.body) {
    return "";
  }
  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) {
      await reader.cancel();
      const err = new Error("Payload too large");
      err.tooLarge = true;
      throw err;
    }
    chunks.push(value);
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder("utf-8").decode(merged);
}

async function resolveUserId(accessToken, channelId) {
  const verifyRes = await fetch(
    "https://api.line.me/oauth2/v2.1/verify?access_token=" + encodeURIComponent(accessToken),
    { method: "GET" }
  );
  if (!verifyRes.ok) {
    const err = { message: "Invalid or expired access token", status: 401 };
    throw err;
  }
  const verifyData = await verifyRes.json();
  if (verifyData.client_id !== channelId) {
    throw { message: "Token not for this channel", status: 401 };
  }

  const profRes = await fetch("https://api.line.me/v2/profile", {
    method: "GET",
    headers: { "Authorization": "Bearer " + accessToken },
  });
  if (!profRes.ok) {
    throw { message: "Cannot resolve user", status: 401 };
  }
  const profile = await profRes.json();
  return { userId: profile.userId, displayName: profile.displayName || "" };
}

function findTraceRequestEntry(text, requestId) {
  if (typeof text !== "string") return null;
  // Only a complete server-stamp line is a request marker, never an arbitrary substring in an answer.
  const marker = new RegExp("(?:^|\\n---\\n)(\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}\\+08:00 · req:"
    + requestId.toLowerCase() + "\\n)", "g");
  const match = marker.exec(text);
  if (!match) return null;
  const start = match.index + match[0].length - match[1].length;
  const remainder = text.slice(start);
  const next = /\n---\n(?=\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}\+08:00 · req:[0-9a-f-]{36}\n)/.exec(remainder);
  return next ? remainder.slice(0, next.index) : remainder;
}

async function airtableFetch(apiKey, base, table, opts) {
  const params = new URLSearchParams();
  if (opts.filterByFormula) params.set("filterByFormula", opts.filterByFormula);
  if (opts.maxRecords)      params.set("maxRecords", String(opts.maxRecords));
  if (opts.fields)          opts.fields.forEach(f => params.append("fields[]", f));
  if (opts.sort)            opts.sort.forEach((s, i) => {
    params.set(`sort[${i}][field]`,     s.field);
    params.set(`sort[${i}][direction]`, s.direction);
  });

  const res = await fetch(
    `https://api.airtable.com/v0/${base}/${table}?${params.toString()}`,
    { headers: { "Authorization": "Bearer " + apiKey } }
  );
  if (!res.ok) {
    console.log("SECURITY_GATE", "AIRTABLE_HTTP_ERROR", res.status);
    return { records: [] };
  }
  return res.json();
}

// 與 airtableFetch 相同的查詢組裝,但把「讀取失敗」與「讀到零筆」分開回報。
// 刻意獨立一支:既有路由依賴 airtableFetch 的吞錯行為,不在本卡改它的契約。
// reason 只回固定字串,永不回傳 Airtable 原始回應內容。
async function airtableFetchStrict(apiKey, base, table, opts) {
  const params = new URLSearchParams();
  if (opts.filterByFormula) params.set("filterByFormula", opts.filterByFormula);
  if (opts.maxRecords)      params.set("maxRecords", String(opts.maxRecords));
  if (opts.fields)          opts.fields.forEach(f => params.append("fields[]", f));
  if (opts.sort)            opts.sort.forEach((s, i) => {
    params.set(`sort[${i}][field]`, s.field);
    params.set(`sort[${i}][direction]`, s.direction);
  });
  let res;
  try {
    res = await fetch(
      `https://api.airtable.com/v0/${base}/${table}?${params.toString()}`,
      { headers: { "Authorization": "Bearer " + apiKey } }
    );
  } catch (e) {
    console.log("SECURITY_GATE", "AIRTABLE_STRICT_NETWORK_ERROR");
    return { ok: false, reason: "upstream_unreachable", records: [] };
  }
  if (!res.ok) {
    const reason = res.status === 401 || res.status === 403
      ? "permission_denied"
      : res.status === 429
        ? "rate_limited"
        : "upstream_error";
    console.log("SECURITY_GATE", "AIRTABLE_STRICT_HTTP_ERROR", res.status);
    return { ok: false, reason, records: [] };
  }
  let body;
  try { body = await res.json(); }
  catch (e) { return { ok: false, reason: "upstream_malformed", records: [] }; }
  if (!body || !Array.isArray(body.records)) {
    return { ok: false, reason: "upstream_malformed", records: [] };
  }
  return { ok: true, reason: "", records: body.records };
}

async function readQuotaGate(env, lineUserId) {
  if (!env.AIRTABLE_API_KEY) {
    console.log("SECURITY_GATE", "QUOTA_GATE_CREDENTIAL_MISSING");
    return { allow: false, status: 503, reason: "credential_unavailable" };
  }

  const subResult = await airtableFetchStrict(env.AIRTABLE_API_KEY, AT_BASE, AT_SUBS, {
    filterByFormula: `{line_user_id}="${lineUserId}"`,
    fields: ["subscriber_tier", "trial_quota_remaining", "monthly_quota_remaining"],
    maxRecords: 1,
  });
  if (!subResult.ok) {
    console.log("SECURITY_GATE", "QUOTA_GATE_READ_FAILED", subResult.reason);
    return { allow: false, status: 503, reason: subResult.reason };
  }

  const subRec = subResult.records[0];
  if (!subRec) {
    return { allow: false, status: 402, reason: "subscriber_not_found" };
  }

  if (!subRec.fields || typeof subRec.fields !== "object" || Array.isArray(subRec.fields)) {
    console.log("SECURITY_GATE", "QUOTA_GATE_RECORD_MALFORMED");
    return { allow: false, status: 503, reason: "upstream_malformed" };
  }
  const sub = subRec.fields;
  const tier = sub.subscriber_tier || "free";
  const trialCredits = sub.trial_quota_remaining === undefined ? 0 : Number(sub.trial_quota_remaining);
  const monthlyCredits = sub.monthly_quota_remaining === undefined ? 0 : Number(sub.monthly_quota_remaining);
  if (![trialCredits, monthlyCredits].every(n => Number.isFinite(n) && n >= 0)) {
    console.log("SECURITY_GATE", "QUOTA_GATE_FIELDS_MALFORMED");
    return { allow: false, status: 503, reason: "upstream_malformed" };
  }
  const credits = trialCredits + monthlyCredits;
  if (tier === "subscriber" || credits > 0) {
    return { allow: true, status: 200, reason: tier === "subscriber" ? "subscriber" : "bounded_credit" };
  }

  return { allow: false, status: 402, reason: "quota_exhausted" };
}

async function readSubscriberGate(env, lineUserId) {
  if (!env.AIRTABLE_API_KEY) {
    return { allow: false, status: 503 };
  }

  let subResult;
  try {
    subResult = await airtableFetch(env.AIRTABLE_API_KEY, AT_BASE, AT_SUBS, {
      filterByFormula: `AND({line_user_id}="${lineUserId}",NOT({record_type}="compliance_evidence"))`,
      fields: ["subscriber_tier", "consent_at", "record_type"],
      maxRecords: 1,
    });
  } catch (e) {
    console.log("Subscriber gate Airtable read failed", e.message || e);
    return { allow: false, status: 503 };
  }

  const subRec = (subResult.records || [])[0];
  const sub = subRec ? (subRec.fields || {}) : {};
  return {
    allow: sub.subscriber_tier === "subscriber" && !!sub.consent_at && sub.record_type !== "compliance_evidence",
    status: 403,
  };
}

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { ...corsHeaders(), "Content-Type": "application/json" },
  });
}

function isValidIsoDateString(value) {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
    !Number.isNaN(Date.parse(value))
  );
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin":  ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Line-AccessToken",
  };
}
