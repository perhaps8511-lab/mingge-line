# WP-MINGGE-RM03B-ARTIFACT-MOCK 施工計畫 v1.0

- Authority：`governance/cards/WP-MINGGE-RM03B-ARTIFACT-MOCK_dispatch_v1_0.md` v1.1。
- Role：Codex，sole writer；不 commit、不 push、不 deploy。
- Baseline：`card/rm03b-artifact-mock` @ `1c2e95d1a26d03b235564fb80bced8b549d97d4e`。

## 施工順序

1. 在 `data/artifacts_placeholder.json` 建立拋棄式佔位資料：兩筆 `PLACEHOLDER`、一筆 `DELISTED`、命格定價皆為 `null`，並落 exact `_warning`。
2. 僅修改 `index.html` 的 `#page-pay` 龍宮舍利分支與 BK10 CSS：新增 `isArtifactMockViewer()`、dev-flag gating、列表／五槽詳情／mock checkout 返回鏈，以及獨立 `artifactCheckoutAllowed(items)`；不修改既有 checkout 三態機、`PAY_PLANS`、`initPayCheckoutCards()` 或 `openPayMock()` 本體。
3. 在 `tests/` 新增本卡 assertion，覆蓋 G1–G3、D1–D5、P1–P3、T1–T4、N-01／N-03 與 protected-region regression。
4. 執行本卡新測試、byte-master verifier、兩支指定 shell regression、syntax／diff QA；未執行者明列 `NOT_RUN`。
5. 每個完成項在 `governance/STATUS_BOARD.md` 留一行狀態與證據。
6. 執行 changed-path containment，並以 `git diff origin/main -- index.html` 對每個新增／刪除行逐項標示授權來源。

## 硬邊界

- 無 `?artifactmock=1`：龍宮舍利分支只保留 byte-master 句 5，零 mock 入口。
- 非 `VERIFIED` 資料的購買動作只能呼叫既有 `openPayMock()`，不得前往 sandbox／prod。
- 不發明 TA 文案、不呈現紅線詞、不呈現 `DELISTED`、不把 Pinkoi 價格冒充命格定價。
- 若獨立 guard 必須改動 `CHECKOUT_MODE` 或 `PAY_PLANS` 才能成立，依 B4 停手回報。
