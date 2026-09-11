/**
 * mingge-relay-staging — MAKE_EXIT 第2段 item4 ＋ 第2b段 item1：Worker 端點對接(staging only)
 * =====================================================================
 * 對齊現役 mingge-relay 的 /history、/log、/trace、/log/seal、/trigger/deepdive 端點對外契約,
 * 但內部改打新的 Postgres 後端 API(env.API_BASE_URL),不碰 Airtable、不碰正式資料。
 *
 * 第2b段更新：拿掉 `X-Staging-Subject` 簡化,換回跟 mingge-relay(main)完全相同的
 * resolveUserId()+LINE_CHANNEL_ID 真實 LINE access token 驗證。用測試 LINE 帳號的真實
 * access token 打這個 Worker,跟正式 mingge-relay 認證邏辯輯一致，只是資料層換成新 API。
 *
 * 沒有 quota/entitlement gate,因為 staging 端點只做「讀寫語意對不對」的驗證,不重測商業規則
 * (商業規則已經在新 API 那一層測過,見 MAKE_EXIT_P2 交付報告)。
 *
 * 部署:npx wrangler deploy(本目錄下),需要設定 API_BASE_URL 變數指向 Railway staging API 網址。
 */

const LINE_CHANNEL_ID = "2010192384"; // 與 mingge-relay(main)相同,這是公開 channel ID,非機密。

// staging 測試頁(`/staging-liff-test`)跑在 Railway `api` service 的 origin 上,不是正式
// GitHub Pages,所以跟正式 mingge-relay 的 ALLOWED_ORIGIN 不同。這裡放行的是 staging 測試頁
// 自己的 origin;正式 mingge-relay 的 CORS 白名單不受本檔影響(兩份程式碼各自獨立部署)。
// 修 bug 記錄(2026-09-11):第一版沒帶任何 CORS header,瀏覽器對帶自訂 header(X-Line-AccessToken)
// 的跨源請求會先送 OPTIONS 預檢,本檔原本落到 404 沒有 CORS header,預檢失敗 → fetch 直接
// 回「Failed to fetch」,連 401/200 都到不了。對照正式 mingge-relay 的 corsHeaders() 補上。
const ALLOWED_ORIGIN = "https://api-production-b892.up.railway.app";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Line-AccessToken",
  };
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders(), "content-type": "application/json; charset=utf-8" },
  });
}

// 與 mingge-relay/worker.js 的 resolveUserId() 逐字相同,故意重複而非共用模組——
// 這是獨立部署的 staging Worker,保持自我完備,不建立對正式 repo 模組結構的隱性依賴。
async function resolveUserId(accessToken, channelId) {
  const verifyRes = await fetch(
    "https://api.line.me/oauth2/v2.1/verify?access_token=" + encodeURIComponent(accessToken),
    { method: "GET" }
  );
  if (!verifyRes.ok) throw { message: "Invalid or expired access token", status: 401 };
  const verifyData = await verifyRes.json();
  if (verifyData.client_id !== channelId) throw { message: "Token not for this channel", status: 401 };

  const profRes = await fetch("https://api.line.me/v2/profile", {
    method: "GET",
    headers: { Authorization: "Bearer " + accessToken },
  });
  if (!profRes.ok) throw { message: "Cannot resolve user", status: 401 };
  const profile = await profRes.json();
  return { userId: profile.userId, displayName: profile.displayName || "" };
}

async function verifiedSubject(request) {
  const accessToken = request.headers.get("X-Line-AccessToken");
  if (!accessToken) return { error: json({ error: "Missing access token" }, 401) };
  try {
    const { userId } = await resolveUserId(accessToken, LINE_CHANNEL_ID);
    return { subject: userId };
  } catch (e) {
    return { error: json({ error: e.message || "Invalid access token" }, e.status || 401) };
  }
}

export default {
  async fetch(request, env) {
    // CORS 預檢:瀏覽器對帶自訂 header(X-Line-AccessToken)的跨源請求會先送 OPTIONS,
    // 必須在碰任何路由判斷之前、用 2xx + CORS header 回覆,否則瀏覽器直接判定 fetch 失敗
    // (不會有 404 這種「至少呼叫到了」的訊號)。對齊正式 mingge-relay 的做法。
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    const url = new URL(request.url);
    const apiBase = env.API_BASE_URL;
    if (!apiBase) return json({ error: "API_BASE_URL not configured" }, 503);

    if (request.method === "GET" && url.pathname === "/health") {
      return json({ ok: true, service: "mingge-relay-staging", api_base: apiBase, auth: "real_line_token" });
    }

    // GET /history —— 對齊現役 mingge-relay /history:回傳該 subject 的卦記列表。
    if (request.method === "GET" && url.pathname === "/history") {
      const { subject, error } = await verifiedSubject(request);
      if (error) return error;
      let upstream;
      try {
        upstream = await fetch(`${apiBase}/gua-records?subject=${encodeURIComponent(subject)}`);
      } catch (e) {
        return json({ state: "read_error" }, 502);
      }
      if (!upstream.ok) return json({ state: "read_error" }, 502);
      const data = await upstream.json();
      const records = (data.records || []).map((r) => ({
        log_id: r.id, session_id: r.request_id, question_text: r.question_text,
        ben_gua: r.ben_gua, entry_type: "divination",
        golden_seal: !!r.golden_seal, golden_seal_time: r.golden_seal_time || null,
        trace_text: r.trace_text || null, trace_at: r.trace_at || null,
        deep_read_state: r.deep_read_state ?? null, deep_read_output_json: r.deep_read_output_json ?? null,
      }));
      return json({ records, subject });
    }

    // GET /log?log_id=... —— 對齊現役 /log:單筆讀回 + owner 比對。
    if (request.method === "GET" && url.pathname === "/log") {
      const logId = url.searchParams.get("log_id");
      if (!logId) return json({ error: "Missing log_id" }, 400);
      const { subject, error } = await verifiedSubject(request);
      if (error) return error;
      let upstream;
      try {
        upstream = await fetch(`${apiBase}/gua-records/${encodeURIComponent(logId)}`);
      } catch (e) {
        return json({ state: "read_error" }, 502);
      }
      if (upstream.status === 404) return json({ record: null }, 404);
      if (!upstream.ok) return json({ state: "read_error" }, 502);
      const rec = await upstream.json();
      if (rec.subject !== subject) return json({ record: null }, 403);
      return json({ record: rec });
    }

    // POST /trace  body: {log_id, trace_text, request_id} —— 對齊現役 /trace:owner 驗證後轉發。
    if (request.method === "POST" && url.pathname === "/trace") {
      const { subject, error } = await verifiedSubject(request);
      if (error) return error;
      let payload;
      try { payload = await request.json(); } catch { return json({ state: "failed", error: "Bad JSON body" }, 400); }
      const { log_id, trace_text, request_id } = payload || {};
      if (!log_id || !trace_text || !request_id) return json({ state: "failed", error: "Missing field" }, 400);

      let recRes;
      try { recRes = await fetch(`${apiBase}/gua-records/${encodeURIComponent(log_id)}`); }
      catch { return json({ state: "failed", error: "Upstream read failed" }, 502); }
      if (recRes.status === 404) return json({ state: "failed", record: null }, 404);
      if (!recRes.ok) return json({ state: "failed", error: "Upstream read failed" }, 502);
      const rec = await recRes.json();
      if (rec.subject !== subject) return json({ state: "failed", error: "Forbidden" }, 403);

      let traceRes;
      try {
        traceRes = await fetch(`${apiBase}/gua-records/${encodeURIComponent(log_id)}/trace`, {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ request_id, trace_text }),
        });
      } catch { return json({ state: "unconfirmed", request_id }, 202); }
      if (traceRes.status === 409) return json({ state: "unconfirmed", request_id }, 202);
      if (!traceRes.ok) return json({ state: "unconfirmed", request_id }, 202);
      const result = await traceRes.json();
      return json({ traced: true, trace_text: result.trace_text, trace_at: result.trace_at, request_id, idempotent: result.idempotent });
    }

    // POST /log/seal  body: {log_id} —— 對齊現役 /log/seal。
    if (request.method === "POST" && url.pathname === "/log/seal") {
      const { subject, error } = await verifiedSubject(request);
      if (error) return error;
      let payload;
      try { payload = await request.json(); } catch { return json({ error: "Bad JSON body" }, 400); }
      const logId = payload && payload.log_id;
      if (!logId) return json({ error: "Missing log_id" }, 400);

      let recRes;
      try { recRes = await fetch(`${apiBase}/gua-records/${encodeURIComponent(logId)}`); }
      catch { return json({ error: "Upstream read failed" }, 502); }
      if (recRes.status === 404) return json({ record: null }, 404);
      if (!recRes.ok) return json({ error: "Upstream read failed" }, 502);
      const rec = await recRes.json();
      if (rec.subject !== subject) return json({ error: "Forbidden" }, 403);

      let sealRes;
      try {
        sealRes = await fetch(`${apiBase}/gua-records/${encodeURIComponent(logId)}/seal`, { method: "POST" });
      } catch { return json({ error: "Upstream write failed" }, 502); }
      if (!sealRes.ok) return json({ error: "Upstream write failed" }, 502);
      return json(await sealRes.json());
    }

    // POST /trigger/deepdive  body: {log_id, request_id} —— 對齊現役 /trigger/deepdive,
    // 但直接打新 API 的深卜端點(現役版本轉發到 Make webhook;staging 版本轉發到新 API)。
    if (request.method === "POST" && url.pathname === "/trigger/deepdive") {
      const { subject, error } = await verifiedSubject(request);
      if (error) return error;
      let payload;
      try { payload = await request.json(); } catch { return json({ error: "Bad JSON body" }, 400); }
      const { log_id, request_id, external_event_id } = payload || {};
      if (!log_id || !request_id) return json({ error: "Missing field" }, 400);

      let recRes;
      try { recRes = await fetch(`${apiBase}/gua-records/${encodeURIComponent(log_id)}`); }
      catch { return json({ error: "Upstream read failed" }, 502); }
      if (recRes.status === 404) return json({ record: null }, 404);
      if (!recRes.ok) return json({ error: "Upstream read failed" }, 502);
      const rec = await recRes.json();
      if (rec.subject !== subject) return json({ error: "Forbidden" }, 403);

      let triggerRes;
      try {
        triggerRes = await fetch(`${apiBase}/gua-records/${encodeURIComponent(log_id)}/deep-read`, {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ request_id, external_event_id }),
        });
      } catch { return json({ error: "Upstream trigger failed" }, 502); }
      if (!triggerRes.ok && triggerRes.status !== 202) return json({ error: "Upstream trigger failed" }, 502);
      return json(await triggerRes.json(), triggerRes.status);
    }

    return json({ error: "not_found" }, 404);
  },
};
