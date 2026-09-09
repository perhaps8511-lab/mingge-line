# 金流安全候選：接線、部署與回復交接

日期 2026-09-09。Owner 授權：候選程式、測試、Draft PR、可審閱計畫；不部署／切流／停 Make／真付款。DB 選型不阻擋本 inbox 候選。原版設計裁決持續適用：[完整裁決](mingge_original_design_owner_ruling_20260909.md)。

## 已核對及尚未核對的接線

沿用當日 R1 唯讀 evidence（Make blueprint／Airtable schema），再核對 Cloudflare deployment 與 Git revision。未讀取真人訂單或 secret 值。

| 段落 | 可確認事實 | 不能推論 |
|---|---|---|
| provider → relay | OEN 本機既有實作；現役 `mingge-pay-relay` deployment `f6718fcf-d2a3-46ed-a506-abf8a3b0557b`，version `0873267f-b79c-4a48-8842-bc22e059475a` 100%，2026-06-13；唯一 binding 名稱 `MAKE_PAY_HOOK` | provider 後台當前 callback 是否指向此 Worker、merchant／測試正式環境，尚無回讀 |
| relay → Make | 現役收 body 後 `waitUntil(fetch(...))` 並先回 200；讀取錯誤可變空字串，catch 吞錯，未檢查下游狀態 | secret 值不能讀回，所以不能證明與指定 Make webhook 相等 |
| Make 金流回拋 | scenario 5375310「命格_04_金流回拋鏈」快照 inactive；M2 查 Payment_Orders、M3 HTTP GET 帶 Authorization；錯誤路徑 M13 Resume；M5 寫 status／verification／raw；M8 查 Subscribers、M14 create | inactive snapshot 不代表不存在訂單；不證明 provider 驗證完整或 entitlement 原子發放 |
| Make 退款取消 | 5375319「命格_05_退款取消鏈」快照 active；M2 查訂單、M4 POST→M5 寫訂單、M6 PUT→M7 寫訂單 | 尚未核對入口授權、provider 端退款 scope 與所有 router 條件；不以已存在流程當安全通過 |
| checkout | 5900399 FalseToken 快照 inactive；M2 create order／M3 HTTP POST；現行 Worker `/falsetoken/checkout` 有 token／plan gate，202 為受理；deepen schema hold 保留 | checkout 受理不代表已付款；未補訂閱／深讀產品語意 |
| owning stores | commerce base 的 Payment_Orders、Entitlements，以及營運 base 的 Subscribers schema 已讀；三者不同 | 未做真 record write/readback；沒有證據聲稱訂單已發權益或退款完成 |

主 Worker `mingge-relay` deployment `43375eb3-77c6-4104-a69a-c5857f67766c`／version `c63d67ca-a8d4-444f-b826-26ca345463fa` 100%。此候選未改主 Worker 或這些 runtime bindings。

### 精確缺項（可交 Owner／provider 管理員取證）

P01：後台 provider 名稱、merchant 對應別名與 sandbox／production 類別；可遮罩 ID，不需要貼 token。

P02：當前 callback URL 的來源與目標比對（受控環境中相等驗證，只交相等結果／末次更新時間）；OEN callback ACK status／body／deadline、JSON schema／encoding、是否驗簽及重試去重規則。公開 FAQ 不足以補完整契約。

P03：正式 API 查交易／退款的固定 endpoint、credential scope、來源固定 IP 限制、撤銷／輪替方式；拒絕與 pending／paid／refunded 的真實 schema；provider 可用事件序號或歷史查證方式。不能把 arrival time 當財務順序。

P04：Cloudflare secret-binding 與 Make webhook 的 names-only mapping＋受控等值比對；Make scenario current blueprint/router/filter／Webhook Response、Resume 路徑與實際啟用狀態覆核。

P05：單筆遮罩訂單的 provider→Payment_Orders→Entitlements／Subscribers 實際 owning-store 關聯，核准的全額退款授權角色與操作紀錄；僅正式 sandbox 合成訂單，真付款另行授權。

缺項不影響本地 durable receipt、fail-closed 及重送候選測試；未補齊不得宣稱 production 修復。

## 暴露範圍與具體輪替／接線方案（未執行）

本輪只掃當前 tracked tree 及既有 OEN relay 本機來源，不輸出 URL/token。公開 tracked `mingge_liff_pages_task.md:153` 存在一個 hook URL 型字串；既有測試檔也有合成 hook fixture，須區分而不一概當真鑰。舊 OEN `mingge_pay_relay_worker.js:22` 註解有另一個 hook URL 型字串。它们與目前 secret binding 的關係 UNKNOWN。歷史 commit、分享 ZIP、provider 後台及他人副本暴露 UNKNOWN。

| 項目 | 未來受控操作及核對 | 回復／限制 |
|---|---|---|
| 已出現於文件的 Make hook | 管理員在安全工具內核對仍有效與 scenario mapping；建立新 hook，重新綁定可信 consumer；從程式、文件及新封包移除舊值；歷史清理另案 | 清除文字不等於輪替；曝光舊 URL 不再作長期回復目標；本輪不刪改歷史 |
| `MAKE_PAY_HOOK`／`HOOK_FALSETOKEN` | 分別記錄來源 Worker、目標 scenario、secret 版本、deployment SHA；新舊隔離，不將 raw callback 同時送两套寫入鏈 | 先停新 consumer、保留 inbox；回復受控版本與舊設定需新授權，不丟棄 ACK 事件 |
| provider callback | 先 sandbox 校驗 ACK 契約及重試；正式變更前取遮罩原設定快照；單一入口切換；新入口須已持久化 | callback URL 回復後仍須逐筆排清切換窗口的 pending／held，不能雙重发權益 |
| provider API credentials | 按 merchant／env／查詢與退款權限分離；查詢 adapter 用最小 read scope；需固定 egress IP 時先配置；新鑰先驗證再撤舊 | 不讓退款權限隨查詢 adapter 下放；暴露鑰不可為了 rollback 長期保留 |
| inbox encryption key | 新寫使用新 key ID，舊 key 留受控 previous slot；盤點／re-encrypt 所有舊 key 收件與備份後才撤 | 不先撤舊 key；保留期、刪除與 backup restore 尚待正式演練 |

OEN FAQ 說明 callback 來源沒有可提供白名單 IP；不能把猜測 IP allowlist 當身份驗證。公網 ingress 僅有限 body／rate limit／durable encrypted untrusted receipt，金融授權靠後續 authenticated readback。正式前需全域流量／儲存預算告警及 WAF 界線，單 IP limiter 不等於防 DDoS 保證。

## 部署審閱與驗收門檻（本次全部不執行）

1. 工程維護者鎖定 reviewed commit／依賴 lock，安全 reviewer 清除候選必修項；Owner 核對 Product Basis／Offer adoption，沒有 entitlement 語意不自行新增。
2. provider 管理員補 P01–P03；整合維護者补 P04–P05、VERIFIER／ORDER_STORE／CONSUMER 實作。帶責任人姓名及替補的值班表由 Owner 指派，文件中的角色不是已有人值班。
3. Cloudflare 管理員準備獨立 staging Worker／DO namespace、私有 bindings、secret IDs、最小權限；預設 disabled 保留，無 route 指向正式。DO migration 只建立新 namespace；不能覆蓋現役。
4. 在隔離 sandbox 驗證：真 provider 重送／亂序／ACK timeout、偽造事件、退款拒絕、下游斷線、丟失 ACK、跨 subject、amount/currency/merchant/env 不符；owning-store write/readback／重啟後再讀、credit exactly-once、refund reconciliation。所有 financial claims 看 owning store，不只 UI。
5. 加入持久化 backlog／oldest age／held count／alarm失敗／驗證拒絕／consumer conflict 告警；服務前 15 分鐘有人接手，1 小時內修復目標只是提案，尚非 SLA。未 verified 收件不可在營運台顯示「付款成功」。
6. Owner 獨立給正式發布與切換授權，核對 provider callback、Worker exact version、Make狀態、營運恢復人及切換時間窗。Repo main push 會觸發 Pages，故 merge 亦屬發布影響，不可直接合併本 PR。
7. 正式切換需一個財務 writer；先核對舊 pending／重試窗口，再切單一入口、逐筆 reconciliation。是否停 Make 是另一次明確決策，不能由此 runbook 自動執行。

## 恢復操作與驗收

| 故障 | 恢復動作 | 驗收 |
|---|---|---|
| 收 body／storage／alarm 失敗 | 回非成功；provider 重試或管理員由 provider 查單補收；不偽造收件成功 | 無成功 ACK 的未保存收件；成功 ACK 的收件可以 restart/readback |
| verifier／owning store 暫失 | pending alarm 退避；8 次 held；確認 outage 修復後由具 namespace 權限的私有 maintenance Worker RPC `retryHeld()` | retained ciphertext 可解、merchant／subject／amount再驗，不直接跳 paid |
| consumer 非 2xx／timeout／commit 後回覆遺失 | 不移出 outbox；固定 applicationId 重送；held 私有 `retryHeld()` | owning-store applicationId 唯一；一筆只加一次；相同 paid 新 revision 不新增 credit |
| refund 先到 | 保留待核對；查 provider 歷史、先收已驗 paid，再 private retry refund | 不先發虛構 paid；不以 arrival order 授退款 |
| key／namespace 問題 | 保留舊 key ID 對應；不得 delete namespace；修復 binding／key，再重排 | 全部 ACK 收件仍可讀，含 held；跨 namespace migration 須另驗 |
| 候選版本需回退 | 新寫入 disabled／路由回復須授權；保留新 DO，不回滾資料 schema；啟用 reviewed recovery Worker 排清新版本已 ACK 事件 | 回退前後 applicationId 對帳一致，無漏單／雙發；不重用曝光 secret |

私有 maintenance Worker 本次未部署；只能綁指定 namespace，應無公開 fetch、受 Cloudflare RBAC／操作審計控制，接受人工指定的 opaque receipt/order ID；禁止原始 payload 輸出。本機測試直接調同一 RPC 證明恢復方法，不宣稱完成 production 值班或災難復原。

RPO 提案：單一 DO 正常持久化條件下，成功 ACK 對應 receipt 不丟失；供應商區域級災難／密鑰遺失／備份能力仍待實測，不能寫成 RPO=0 SLA。RTO 提案：下游恢復後自動 retry；held 由值班排查，目標 1 小時；跨區域恢復 NOT_RUN。

## 證據分層

新候選：本機 Workers runtime／SQLite／合成 service bindings 12 項 PASS；主 Worker fail-closed 26 項 PASS；Laoyi 靜態／VM 55 項 PASS；原起卦 VM 9 項 PASS。Bash 首次因 PATH 缺工具失敗，修正 shell PATH 後原測試通過，未改測試內容。CI 以 Draft PR exact head 結果另記。

R1 既有 31 項產品模擬及 7 項展示證據保留，未重新跑整套，也不升格正式證據。原版設計對照是合成離線展示；provider sandbox、正式安全驗收、付款／權益 owning-store UAT、真人 UAT、deploy／Activation 全部 NOT_RUN。

## 官方依據

- [OEN 技術串接 FAQ](https://tech.oen.tw/posts/30zdZkSThhyaqmCXKhX7c8aTq8Y?lng=en-US)：developer callback、token、固定 IP／callback retry 說明（2026-09-09 讀取）。
- [OEN API 文件入口](https://documenter.getpostman.com/view/26859697/2s9YsQ7VJA)：本輪工具無法取得完整渲染 schema，保留 P02/P03。
- [Cloudflare DO storage](https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/)、[alarms](https://developers.cloudflare.com/durable-objects/api/alarms/)：持久化／交易及恢復排程。
