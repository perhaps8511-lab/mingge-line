/**
 * mingge-relay-staging — MAKE_EXIT 第2段 item4：Worker 端點對接(staging only)
 * =====================================================================
 * 對齊現役 mingge-relay 的 /trace、/log/seal、/history 三個端點的對外契約,
 * 但內部改打新的 Postgres 後端 API(env.API_BASE_URL),不碰 Airtable、不碰正式資料。
 *
 * 刻意簡化(僅限本 staging Worker,非正式做法)：
 * - 不驗證真實 LINE access token(那需要正式 LINE channel 身分,不該讓 staging 元件依賴它)。
 *   改用 header `X-Staging-Subject` 直接帶「已驗證的 subject」,由呼叫端(測試腳本)提供合成值。
 *   正式對接時這裡要換回 resolveUserId()+LINE_CHANNEL_ID 的驗證邏輯(見 mingge-relay/worker.js)。
 * - 沒有 quota/entitlement gate,因為 staging 端點只做「讀寫語意對不對」的驗證,不重測商業規則
 *   (商業規則已經在新 API 那一層測過,見 MAKE_EXIT_P2 交付報告)。
 *
 * 部署:npx wrangler deploy --name mingge-relay-staging(本目錄下),
 * 需要設定 API_BASE_URL 變數指向 Railway staging API 的公開網址。
 */

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function getStagingSubject(request) {
  return request.headers.get("X-Staging-Subject") || null;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const apiBase = env.API_BASE_URL;
    if (!apiBase) return json({ error: "API_BASE_URL not configured" }, 503);

    if (request.method === "GET" && url.pathname === "/health") {
      return json({ ok: true, service: "mingge-relay-staging", api_base: apiBase });
    }

    // GET /history —— 對齊現役 mingge-relay /history:回傳該 subject 的卦記列表。
    if (request.method === "GET" && url.pathname === "/history") {
      const subject = getStagingSubject(request);
      if (!subject) return json({ error: "Missing X-Staging-Subject" }, 401);
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
      const subject = getStagingSubject(request);
      if (!subject) return json({ error: "Missing X-Staging-Subject" }, 401);
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
      const subject = getStagingSubject(request);
      if (!subject) return json({ state: "failed", error: "Missing X-Staging-Subject" }, 401);
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
      const subject = getStagingSubject(request);
      if (!subject) return json({ error: "Missing X-Staging-Subject" }, 401);
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
      const subject = getStagingSubject(request);
      if (!subject) return json({ error: "Missing X-Staging-Subject" }, 401);
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
