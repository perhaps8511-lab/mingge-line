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
// publish gate:Artifacts.publish_blocked 是 owning store 的 formula,只有這個字串代表可上架。
const ARTIFACT_PUBLISHABLE = "PUBLISHABLE";
// TA 面白名單。刻意不含 sku_source_ref(來源平台 SKU)、unverified_factual_claims、
// supplier_facts_note、data_state、evidence_grade、publish_block_reasons —— 那些是內部欄位。
const ARTIFACT_PUBLIC_FIELDS = [
  "artifact_id", "title_mingge", "actual_photos", "price_mingge_twd", "price_band",
  "inventory_model", "availability", "dimensions", "weight", "condition",
  "material_claim", "source_provenance", "traceability",
  "known_facts", "unknowns", "cultural_use_context", "care",
  "collector_entitlement", "publish_blocked",
];
const TRACE_MAX_BODY_BYTES = 4096;
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

      if (!env.AIRTABLE_API_KEY) {
        return json({ error: "AIRTABLE_API_KEY not configured" }, 503);
      }

      const [divResult, subResult] = await Promise.all([
        airtableFetch(env.AIRTABLE_API_KEY, AT_BASE, AT_DIV_LOG, {
          filterByFormula: `AND({line_user_id_raw}="${verifiedUserId}",{entry_type}="divination")`,
          sort: [{ field: "qigua_time", direction: "desc" }],
          fields: ["question_text", "ben_gua", "bian_gua", "dong_yao", "qigua_time", "session_id", "entry_type", "golden_seal", "golden_seal_time", "trace_text", "trace_at"],
          maxRecords: 50,
        }),
        airtableFetch(env.AIRTABLE_API_KEY, AT_BASE, AT_SUBS, {
          filterByFormula: `{line_user_id}="${verifiedUserId}"`,
          fields: ["subscriber_tier", "trial_quota_remaining", "monthly_quota_remaining", "subscription_start"],
          maxRecords: 1,
        }),
      ]);

      const records = (divResult.records || []).map(r => {
        const f = r.fields || {};
        return {
          log_id: r.id,
          ...f,
          golden_seal: !!f.golden_seal,
          golden_seal_time: f.golden_seal_time || null,
          trace_text: f.trace_text || null,
          trace_at: f.trace_at || null,
        };
      });
      const subRec  = (subResult.records || [])[0];
      const sub     = subRec ? subRec.fields : null;

      return json({
        records,
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

      if (!env.AIRTABLE_API_KEY) {
        return json({ error: "AIRTABLE_API_KEY not configured" }, 503);
      }

      const recRes = await fetch(
        `https://api.airtable.com/v0/${AT_BASE}/${AT_DIV_LOG}/${encodeURIComponent(logId)}`,
        { headers: { "Authorization": "Bearer " + env.AIRTABLE_API_KEY } }
      );
      if (!recRes.ok) {
        return json({ record: null }, recRes.status === 404 ? 404 : 502);
      }
      const rec = await recRes.json();
      const f = rec.fields || {};

      if (f.line_user_id_raw !== verifiedUserId) {
        return json({ record: null }, 403);
      }

      return json({
        record: {
          log_id:         rec.id,
          session_id:     f.session_id     || null,
          question_text:  f.question_text  || null,
          ben_gua:        f.ben_gua        || null,
          bian_gua:       f.bian_gua       || null,
          dong_yao:       f.dong_yao       || null,
          qigua_time:     f.qigua_time     || null,
          entry_type:     f.entry_type     || "divination",
          output_json:    f.output_json    || null,
          golden_seal:    !!f.golden_seal,
          golden_seal_time: f.golden_seal_time || null,
          trace_text:     f.trace_text     || null,
          trace_at:       f.trace_at       || null,
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

    // MG-RM-03 · GET /artifacts —— 龍宮舍利公開清單
    // ★ fail closed:只回傳 publish_blocked === "PUBLISHABLE" 的列。
    //   讀不到金鑰、Airtable 失敗、欄位缺漏 → 一律回空清單,TA 面維持「尚未開放」,
    //   絕不降級成示範資料、絕不用來源平台圖片或價格頂替。
    if (request.method === "GET" && url.pathname === "/artifacts") {
      if (!env.AIRTABLE_API_KEY) {
        return json({ items: [], gate: "fail_closed", reason: "AIRTABLE_API_KEY not configured" }, 503);
      }
      const result = await airtableFetch(env.AIRTABLE_API_KEY, AT_PRODUCT_BASE, AT_ARTIFACTS, {
        filterByFormula: `{publish_blocked}="${ARTIFACT_PUBLISHABLE}"`,
        fields: ARTIFACT_PUBLIC_FIELDS,
        maxRecords: 100,
      });
      const items = (result.records || [])
        .map(r => r.fields || {})
        // 第二道:即使 filterByFormula 被改壞,這裡仍逐列驗一次 publish gate。
        .filter(f => f.publish_blocked === ARTIFACT_PUBLISHABLE)
        .map(f => ({
          artifact_id:          f.artifact_id || "",
          title_mingge:         f.title_mingge || "",
          photo_url:            Array.isArray(f.actual_photos) && f.actual_photos[0] && f.actual_photos[0].url
                                  ? f.actual_photos[0].url : "",
          price_mingge_twd:     typeof f.price_mingge_twd === "number" ? f.price_mingge_twd : null,
          price_band:           f.price_band || "",
          inventory_model:      f.inventory_model || "",
          availability:         f.availability || "",
          dimensions:           f.dimensions || "",
          weight:               f.weight || "",
          condition:            f.condition || "",
          material_claim:       f.material_claim || "",
          source_provenance:    f.source_provenance || "",
          traceability:         f.traceability || "",
          known_facts:          f.known_facts || "",
          unknowns:             f.unknowns || "",
          cultural_use_context: f.cultural_use_context || "",
          care:                 f.care || "",
          collector_entitlement:f.collector_entitlement || "",
          publish_blocked:      f.publish_blocked,
        }));
      return json({ items, gate: "publish_blocked" });
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
      if (typeof logId !== "string" || !/^rec[a-zA-Z0-9]{14}$/.test(logId)) {
        return json({ error: "Invalid log_id" }, 400);
      }

      if (!env.AIRTABLE_API_KEY) {
        return json({ error: "AIRTABLE_API_KEY not configured" }, 503);
      }

      let recRes;
      try {
        recRes = await fetch(
          `https://api.airtable.com/v0/${AT_BASE}/${AT_DIV_LOG}/${encodeURIComponent(logId)}`,
          { headers: { "Authorization": "Bearer " + env.AIRTABLE_API_KEY } }
        );
      } catch (e) {
        console.log("Airtable seal read failed", e.message || e);
        return json({ error: "Airtable read failed" }, 502);
      }

      if (recRes.status === 404) {
        return json({ record: null }, 404);
      }
      if (!recRes.ok) {
        console.log("Airtable seal read failed", recRes.status);
        return json({ error: "Airtable read failed" }, 502);
      }

      let rec;
      try {
        rec = await recRes.json();
      } catch (e) {
        console.log("Airtable seal read JSON parse failed", e.message || e);
        return json({ error: "Airtable read failed" }, 502);
      }

      const f = rec.fields || {};
      if (f.line_user_id_raw !== verifiedUserId) {
        return json({ error: "Forbidden" }, 403);
      }

      if (f.golden_seal === true) {
        if (isValidIsoDateString(f.golden_seal_time)) {
          return json({ sealed: true, sealed_at: f.golden_seal_time, already_sealed: true });
        }
        console.log("Golden seal data anomaly", logId, "missing_or_invalid_golden_seal_time");
        return json({ sealed: true, sealed_at: null, already_sealed: true });
      }

      const sealedAt = new Date().toISOString();
      let patchRes;
      try {
        patchRes = await fetch(
          `https://api.airtable.com/v0/${AT_BASE}/${AT_DIV_LOG}/${encodeURIComponent(logId)}`,
          {
            method: "PATCH",
            headers: {
              "Authorization": "Bearer " + env.AIRTABLE_API_KEY,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              fields: {
                golden_seal: true,
                golden_seal_time: sealedAt,
              },
            }),
          }
        );
      } catch (e) {
        console.log("Airtable seal write failed", e.message || e);
        return json({ error: "Airtable write failed" }, 502);
      }

      if (!patchRes.ok) {
        console.log("Airtable seal write failed", patchRes.status);
        return json({ error: "Airtable write failed" }, 502);
      }

      return json({ sealed: true, sealed_at: sealedAt, already_sealed: false });
    }

    // S163(E25②):卦記蓋印·補後續 —— TA 事後補寫「後來怎麼走」,
    // 沿用 /log/seal 既有驗身+擁有權模式(S37 binding),不動 /log/seal 本身。
    if (request.method === "POST" && url.pathname === "/trace") {
      const contentType = request.headers.get("Content-Type") || "";
      if (!/^application\/json(?:;.*)?$/i.test(contentType.trim())) {
        return json({ error: "Bad JSON body" }, 400);
      }

      const declaredLength = Number(request.headers.get("Content-Length") || "0");
      if (declaredLength > TRACE_MAX_BODY_BYTES) {
        return json({ error: "Payload too large" }, 413);
      }

      let rawBody;
      try {
        rawBody = await readBodyWithLimit(request, TRACE_MAX_BODY_BYTES);
      } catch (e) {
        if (e && e.tooLarge) {
          return json({ error: "Payload too large" }, 413);
        }
        return json({ error: "Bad JSON body" }, 400);
      }

      let payload;
      try {
        payload = JSON.parse(rawBody);
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
        console.log("Trace access token validation failed", e.message || e);
        return json({ error: e.message || "Invalid access token" }, e.status || 401);
      }

      const payloadIsObject = payload && typeof payload === "object" && !Array.isArray(payload);
      const payloadKeys = payloadIsObject ? Object.keys(payload) : [];
      if (payloadKeys.some(k => k !== "log_id" && k !== "trace_text")) {
        return json({ error: "Unexpected field in payload" }, 400);
      }

      const logId = payloadIsObject ? payload.log_id : undefined;
      if (typeof logId !== "string" || !/^rec[a-zA-Z0-9]{14}$/.test(logId)) {
        return json({ error: "Invalid log_id" }, 400);
      }

      const rawTraceText = payloadIsObject ? payload.trace_text : undefined;
      const traceText = typeof rawTraceText === "string" ? rawTraceText.trim() : "";
      if (!traceText || traceText.length > 500) {
        return json({ error: "Invalid trace_text" }, 400);
      }

      if (!env.AIRTABLE_API_KEY) {
        return json({ error: "AIRTABLE_API_KEY not configured" }, 503);
      }

      let recRes;
      try {
        recRes = await fetch(
          `https://api.airtable.com/v0/${AT_BASE}/${AT_DIV_LOG}/${encodeURIComponent(logId)}`,
          { headers: { "Authorization": "Bearer " + env.AIRTABLE_API_KEY } }
        );
      } catch (e) {
        console.log("Airtable trace read failed", e.message || e);
        return json({ error: "Airtable read failed" }, 502);
      }

      if (recRes.status === 404) {
        return json({ record: null }, 404);
      }
      if (!recRes.ok) {
        const errBody = await recRes.text().catch(() => "");
        console.log("Airtable trace read failed", recRes.status, errBody);
        return json({ error: "Airtable read failed" }, 502);
      }

      let rec;
      try {
        rec = await recRes.json();
      } catch (e) {
        console.log("Airtable trace read JSON parse failed", e.message || e);
        return json({ error: "Airtable read failed" }, 502);
      }

      const f = rec.fields || {};
      if (f.line_user_id_raw !== verifiedUserId) {
        return json({ error: "Forbidden" }, 403);
      }
      if ((f.entry_type || "divination") !== "divination") {
        return json({ record: null }, 404);
      }

      const tracedAt = new Date().toISOString();
      let patchRes;
      try {
        patchRes = await fetch(
          `https://api.airtable.com/v0/${AT_BASE}/${AT_DIV_LOG}/${encodeURIComponent(logId)}`,
          {
            method: "PATCH",
            headers: {
              "Authorization": "Bearer " + env.AIRTABLE_API_KEY,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              fields: {
                trace_text: traceText,
                trace_at: tracedAt,
              },
            }),
          }
        );
      } catch (e) {
        console.log("Airtable trace write failed", e.message || e);
        return json({ error: "Airtable write failed" }, 502);
      }

      if (!patchRes.ok) {
        const errBody = await patchRes.text().catch(() => "");
        console.log("Airtable trace write failed", patchRes.status, errBody);
        return json({ error: "Airtable write failed" }, 502);
      }

      return json({ traced: true, trace_text: traceText, trace_at: tracedAt });
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
      if (typeof logId !== "string" || !/^rec[a-zA-Z0-9]{14}$/.test(logId)) {
        return json({ error: "Invalid log_id" }, 400);
      }

      if (!env.AIRTABLE_API_KEY) {
        return json({ error: "AIRTABLE_API_KEY not configured" }, 503);
      }
      if (!env.HOOK_DEEPDIVE) {
        return json({ error: "HOOK_DEEPDIVE not configured" }, 503);
      }

      let recRes;
      try {
        recRes = await fetch(
          `https://api.airtable.com/v0/${AT_BASE}/${AT_DIV_LOG}/${encodeURIComponent(logId)}`,
          { headers: { "Authorization": "Bearer " + env.AIRTABLE_API_KEY } }
        );
      } catch (e) {
        console.log("Airtable deepdive read failed", e.message || e);
        return json({ error: "Airtable read failed" }, 502);
      }

      if (recRes.status === 404) {
        return json({ record: null }, 404);
      }
      if (!recRes.ok) {
        console.log("Airtable deepdive read failed", recRes.status);
        return json({ error: "Airtable read failed" }, 502);
      }

      let rec;
      try {
        rec = await recRes.json();
      } catch (e) {
        console.log("Airtable deepdive read JSON parse failed", e.message || e);
        return json({ error: "Airtable read failed" }, 502);
      }

      const f = rec.fields || {};
      if (f.line_user_id_raw !== verifiedUserId) {
        return json({ error: "Forbidden" }, 403);
      }

      const hookPayload = {
        line_user_id:  verifiedUserId,
        ben_gua:       f.ben_gua       || "",
        question_text: f.question_text || "",
        session_id:    f.session_id    || "",
      };

      try {
        const hookRes = await fetch(env.HOOK_DEEPDIVE, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(hookPayload),
        });
        if (!hookRes.ok) {
          console.log("Deepdive webhook forward failed", hookRes.status);
          return json({ error: "Webhook forward failed" }, 502);
        }
      } catch (e) {
        console.log("Deepdive webhook forward failed", e.message || e);
        return json({ error: "Webhook forward failed" }, 502);
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
      // Codex 互審 r1 指出 fail-open 對「binding 缺失」不當:binding 缺失=部署設定錯誤,不是正常降級,
      // 此時放行等於本卡要保護的 Dify credit 唯一防線直接失效——故拆分兩種失效模式:
      //   binding 未宣告(部署配置錯誤,理論上不該發生但防禦性檢查)→ fail-closed 回 503,比照
      //   DIFY_LAOYI_KEY 缺鑰同款處理,逼部署方修正,不讓聊天在「無防護」狀態下悄悄公開。
      //   binding 已就位但 .limit() 呼叫本身出錯(Cloudflare 端暫時性錯誤)→ fail-open 放行+記警告,
      //   避免限流服務本身的暫時抖動連坐讓老易聊天全斷。
      if (!env.LAOYI_RATE_LIMITER) {
        console.log("Laoyi rate limiter binding missing, refusing request (fail-closed)");
        return json({ error: "Rate limiter not configured", code: "RATE_LIMITER_NOT_CONFIGURED" }, 503);
      }
      try {
        const { success } = await env.LAOYI_RATE_LIMITER.limit({ key: verifiedUserId });
        if (!success) {
          return json({ error: "Too many requests, please slow down", code: "RATE_LIMITED" }, 429);
        }
      } catch (e) {
        console.log("Laoyi rate limiter check failed, failing open", e.message || e);
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
      if (!quotaGate.allow) return json({ gate: "zero_quota", credits: 0, next: "door_149" }, 402);
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
    console.log("Airtable error", res.status, await res.text());
    return { records: [] };
  }
  return res.json();
}

async function readQuotaGate(env, lineUserId) {
  if (!env.AIRTABLE_API_KEY) {
    console.log("Quota gate skipped: AIRTABLE_API_KEY not configured");
    return { allow: true };
  }

  let subResult;
  try {
    subResult = await airtableFetch(env.AIRTABLE_API_KEY, AT_BASE, AT_SUBS, {
      filterByFormula: `{line_user_id}="${lineUserId}"`,
      fields: ["subscriber_tier", "trial_quota_remaining", "monthly_quota_remaining"],
      maxRecords: 1,
    });
  } catch (e) {
    console.log("Quota gate Airtable read failed", e.message || e);
    return { allow: true };
  }

  const subRec = (subResult.records || [])[0];
  if (!subRec) {
    return { allow: true };
  }

  const sub = subRec.fields || {};
  const tier = sub.subscriber_tier || "free";
  const credits = (Number(sub.trial_quota_remaining) || 0) + (Number(sub.monthly_quota_remaining) || 0);
  if (tier === "subscriber" || credits > 0) {
    return { allow: true };
  }

  return { allow: false };
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
