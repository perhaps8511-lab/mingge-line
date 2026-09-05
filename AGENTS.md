# Mingge｜Repository AGENTS.md

版本：v2.4.1 · 2026-09-05

## 任務、授權與完成
以使用者本次指定的有限成果為工作目標。評估、文件修訂、隔離試作與完整產品建置是不同範圍；先從本輪指示與已成立授權判定，不因產品尚有其他缺口擴大任務。

既有授權持續有效。完成該成果必要的普通、可逆步驟與技術選擇可自行連續完成；不為每個步驟重開派工卡或重問同一授權。使用者指定只讀、審查、手動替換或 PAUSED 時，依該限制工作。文件採用本身不等於恢復已暫停的施工。

目前使用者的明確指示優先於其自訂 Skill／流程文件的一般建議；系統、平台及適用的安全權限仍須遵守。涉及產品承諾、範圍、敏感資料、金流、破壞性操作或 production Activation 的既有明確界線，依實際授權處理，不用完成導向繞過。

資料不足先查可用來源；未確認的項目不寫成事實，也不把「沒讀到」寫成「不存在」。完成其餘可可靠完成的部分。只有缺口會使受影響結論失真或動作越權時，才暫停該部分。

需要停等時，說明具體受阻動作、依據的使用者指示或文件條文、已完成部分與最小解除條件。若自動核准審查拒絕，準確說明被拒動作及理由，不重試同一越界路徑。

完成交付與必要驗證即結案；只有本次已授權目標仍有必要工作時繼續，不為「續卡」製造新任務。

## Mingge 專案指標與界線
Repository：`perhaps8511-lab/mingge-line`。
本機 Product Basis 搜尋起點：`D:\CBD_Lab_OS\001_mingge\00J_canon\Product_Basis`。這是 locator，不是現役版本證明。

從目前已採用 Index 解析 revision、pack、acceptance IDs、owner state 與 amendments；不把來源附件的 v1.1 日期當永久正本。

- 格①為唯一正式問卦入口；Decision Memory 必須 private、subject-bound，commerce／payment truth 不混作私人卦象記憶。
- 卦象輸出不推薦龍宮舍利 SKU，不用焦慮或危機驅動 commerce；產品事實與商務入口分別服從已採用來源。
- payment、order、entitlement、fulfillment 是不同狀態；各項 claim 要有對應 owning store 及正確 runtime 證據。
- 私人 identity、問卦文字、Decision Memory、secret 與 payment payload 不放 Project Sources／repo／general logs。
- 已採用的 exact TA copy 依來源；缺品名、Offer、退費或供應商資料時保留缺口，不能自行補成已提供服務。
- 危機回應優先照顧當事人安全，不以付費、算卦或商務 CTA 作前置。source-aware 話術不能成為事實或法律保證。


若目前已採用 Product Basis 使用 `MG-RM-01..MG-RM-06`，維持該版既定入口分工：格④先教學、一般文章不直跳 checkout；格⑤維持老易身分與易經學習／QA，不暗中新起正式卦或改作銷售推薦，追問應有具體增量；格⑥的會員／支付／訂單／權益／履約／退款資訊分別回讀其 owning store。不得因其他未合併 PR 的文字自行採用 Product Basis。

## 證據與完成層次
Product／acceptance 以已採用 Product Basis 為準；code 以 Git exact SHA 為準；runtime／model／route 以實際回讀為準；私人資料與支付狀態以 owning store 為準。新日期、CI 綠燈、UI 成功或對話記憶不能代替其所屬領域的證據；錯誤環境／route／Prompt／KB 的全綠仍為 WRONG_TARGET_GREEN／REJECT。

本次有限成果完成、WP 結案、Product Acceptance、merge、deploy、Production Activation 是分別需要證據的狀態。Repo 文件寫入授權不自動涵蓋 merge／deploy／Activation；已成立的相應授權持續有效。沒有相應授權時可完成分支與 PR，保留明確的合併／發布界線。

若本次改動涉及 TA journey，依適用驗收檢查入口、主輸出與 next／return path。保存聲明須有 owning-store evidence，依已採用驗收完成 write／readback／close-reopen／read-again 或等價證據；純文件變更不啟動真人資料或 runtime 測試。

## 工程上下文
先讀 current task、此工作路徑適用規則與 touched source。若 repo 的 `config/project-ops-contract.json` 存在，從其 `control_files.active_task_ledger` 解析實際 ledger，不假定舊路徑。此接口追蹤 repo 任務狀態，不取代使用者已成立授權；也不要求純分析先建 WP。

從 repo 的現行 manifest／scripts 確定 build、lint、typecheck、tests 指令，不在此臆造命令或 package manager。

## 執行與驗證
一般問答、寫作與局部只讀查證直接完成。真正 mutation 才回讀直接相關目標、現況、授權、並行衝突與必要回復方式；不掃全 BU 或全歷史。

角色由任務與證據存取能力決定，不由模型品牌固定。可使用的工具先做；只能向實際可呼叫且已獲授權的執行者交接。沒有派工渠道時，交付具體接手材料並明說未送出，不虛構 Cowork／Codex 已接手。

同一寫入範圍保留一位 active writer；不同互不干擾範圍可依現有授權並行。保留使用者既有變更。changed paths 應落在本次授權範圍內，勿夾帶無關重構或依賴升級。

按實際改動、既定驗收與具體風險驗證。不為純文件修字新增應用測試；程式／資料行為改動驗相關正常、失敗與邊界情境。既有未失效 PASS 不因換 session 重跑。證據足夠即停止擴測。

既有明文要求的獨立審查續效。material health/legal semantics、privacy/security、不可逆資料變更、外部 AI runtime binding、跨域架構、Product acceptance 或正式 release 變更，依適用專案要求安排獨立審查；普通文案與確定性小修不自動變全案審核。Writer 不自稱完成所要求的獨立審查。

不弱化測試、判分或驗收取得綠燈。未跑標 NOT_RUN；結果不明標 UNKNOWN。回報結果、影響、必要證據與限制即可，不為小任務列空白治理欄位。

## 資料與外部動作
Secret／token、raw LINE identity、私人聊天、真人健康報告、付款 payload，不放入 repo、Project Sources、通用 prompt、一般日誌、receipt 或一般測試 fixture。使用合成／遮罩資料；真正私人處理限已授權、具 subject binding 的系統與必要欄位。

只讀使用正式讀取能力；同值 update 仍是寫入。外部寫入要辨認目標並保留結果證據，失敗或 timeout 先查是否已生效，再決定安全重試。支付、權益、身分、必要同意或保存失敗，不能以 Resume 假成功繼續。已授權且不影響 correctness 的非必要 telemetry 可降級，清楚記錄漏記狀態。

Skill 的觸發不自動授權建表、發訊息、上傳 KB、部署或發布。正式發送、敏感權限、不可逆操作及 production Activation 依適用明確授權，不由模擬 PASS 或 QA PASS 代替。

## Repo 安全規則入口
`SECURITY.md` 的適用明文界線續效。LINE 身分須由服務端驗證並綁定 subject；前端 user ID／tier／quota／payment／entitlement 不能當授權證據；必要 quota／entitlement／rate-limit 查證失敗時，不繼續付費 AI 或外部寫入。

本 Repo 為公開程式庫；只提交可公開的規則與合成資料。正式發布需依 `SECURITY.md` 使用允許公開的站點資產範圍。變更前回讀當前發布 workflow；若 main push 會觸發部署，合併亦須納入該發布影響判斷。
