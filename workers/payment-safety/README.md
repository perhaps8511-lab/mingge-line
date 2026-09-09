# 命格金流安全修正候選 · 2026-09-09

範圍：隔離候選、合成測試、Draft PR。**未部署、未切流、未停 Make、未啟動真付款或退款。**

現役 relay 的背景轉送不能保證收件。本候選用 Cloudflare Durable Objects SQLite 持久化 inbox／outbox，與最終業務 PostgreSQL 選型分離。DO 不是正式付款或權益的 owning store。

## 實作與 ACK

`POST /webhooks/oen` → 限流、JSON／32 KiB 上限／1.5 秒讀取期限 → AES-GCM 加密 → 以環境、merchant alias、原始 bytes 的 SHA-256 去重 → 同一 transaction 保存收件及 recovery alarm → HTTP 200 `ok`。

**200 只代表可恢復收件，不代表驗證付款、發放權益或完成退款。**讀取、密鑰、儲存或 alarm 失敗不 ACK。相同 callback 重送可 ACK 已有收件；held 仍是待人工處理，不會因重送改成成功付款。語意相同但 bytes 不同會成為不同收件，財務層仍以訂單／狀態冪等。

OEN 公開 FAQ 描述 callback 失敗會以 2／4／6 秒重試三次；未從本次可讀官方文件確認完整 ACK body、deadline、content-type、簽章規則。`oen-reviewed-v1` 是待確認的**候選契約**，不是聲稱 OEN 已核准此名稱或 body。本設定 `INGRESS_PROFILE=disabled`，無公開 route、workers.dev 及 preview URL。未補足契約不得啟用。

`PaymentReceipt.alarm()` 解密後，僅送入私有 VERIFIER service binding。其 provider readback 必須驗 merchant、環境、交易狀態與 provider 身分；回覆再與 ORDER_STORE 的既有訂單核對 subject、金額、幣別及商店。callback 自報 paid、金額、LINE ID 或退款旗標均不構成權限。

`PaymentOrder` 以訂單為單位原子保存 state／outbox。重複及舊 revision 不重發；相同 paid／refunded 的較新 revision 只更新 metadata；退款先到需重新核對，不能先加再扣；退款後不得回到 paid。同一訂單／狀態有固定 `applicationId`。CONSUMER 必須原子去重及套用 owning store，再回覆包含相同 `eventId`、`applicationId`、`contract=mingge-payment-v1`、`applied=true`。HTTP 2xx 本身不足以清除 outbox。

alarm 在網路呼叫前先保存下一次恢復時點。失敗最多 8 次後 held，密文與 outbox 保留；私有 namespace RPC `retryHeld()` 重排，不公開管理 HTTP endpoint。CONSUMER 成功而本地尚未記錄即中斷會重送，故只保證 at-least-once；最終不重複入帳必須由 owning-store 原子 applicationId 去重實現。合成 consumer 的一次套用測試不能代替正式資料庫驗收。

退款 initiation 路由一律 403。本候選只對已經由 provider 查證的**全額退款狀態**進行 reconciliation；不新增部分退款、退費條款、金流產品或 entitlement 語意。

## 必須實作並審閱的正式 adapter 契約

| Binding | 必須完成 | 明確禁止 |
|---|---|---|
| VERIFIER | authenticated provider server-to-server 查詢；固定端點；merchant／sandbox-production 隔離；核對 callback 的交易鍵；提供可查證 evidenceRef；依 owning provider 事件歷史導出單調 revision | 直接相信 callback；用到達時間自行當 provider revision；把未知狀態當 paid |
| ORDER_STORE | 回讀既有訂單的不可變價格、TWD 最小單位、opaque subjectRef、merchant／environment | 根據 callback 建立「預期訂單」；raw LINE identity 放 inbox metadata |
| CONSUMER | 原子保存 applicationId＋付款／權益變更，權益語意服從已採用 Offer；重送回同一套用結果；錯誤 fail closed | 將目前 Make generic webhook 200 當交易 commit；Resume 假成功；重複 paid 加額度 |

adapter 未接妥是**部署阻擋項**，不是已完成正式金流修正。此候選不直接將原始事件轉送現役 Make，避免既有 Resume／未驗證寫入绕過新閘門。要保留 Make 作 downstream，必須先把上述 consumer 契約做成可信任中介與 owning-store transaction；若 Airtable 無法提供必要原子條件，先以單一可信交易處理層實現，再同步 Airtable 營運投影。

密鑰：`INBOX_KEY` 為 32 bytes 的 hex secret，`INBOX_KEY_ID` 非秘密版本別名。輪替時可保留 `INBOX_PREVIOUS_KEY`／`INBOX_PREVIOUS_KEY_ID` 讀舊密文。不提供範例真鑰，不寫入一般 log。正式上線前需補保留期限、刪除／re-encrypt job、old-key backlog 清空證據與異地恢復演練；目前不自動刪除 held 金流證據。

## 本機驗證

Node 24，`npm ci --ignore-scripts --no-audit --no-fund`，`npm test`。測試使用 Miniflare 的 SQLite DO 和合成 service bindings，不呼叫 provider／Make／Airtable。

包括：重啟後收件讀回、重送、收件及 alarm 失敗、下游非 2xx／泛用 2xx／timeout、驗證與訂單不符、亂序、退款未授權、held 私有重排、consumer 已套用但回覆遺失，以及部分 body 逾時。原版 UI 不在 Worker 測試中冒充正式 UAT。

完整接線、輪替及部署／回復審閱：[工程交接](../../plans/payment_safety_candidate_20260909.md)。持續適用的原版設計裁決：[Owner 設計基準](../../plans/mingge_original_design_owner_ruling_20260909.md)。
