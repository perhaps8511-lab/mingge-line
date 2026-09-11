# CHANGELOG ── 工地遷址與治理事件留痕

| 日期 | 事件 | 影響 |
|---|---|---|
| 2026-07-07 | 工地遷址至乾淨 clone,舊夾 D:\20260702 Begining\mingge-line 封存待整頓 | 影響:全部 |
| 2026-09-11 | D3 r3 龍宮舍利公開頁落地：`longyun.html`＋`assets/longyun*.js/css` 改用 r3 exact copy（D1-B/D2-B/D3-A/D4-C）；新增 `activation-card-preview.html`＋`assets/activation-card.js`（隨貨啟用卡數位稿）、`tests/test_d3_longyun_r3_copy_v1_0.mjs`；`index.html` 同步 D2-B 字面（「一件物」→「一件收藏」），對應更新 `tests/test_rm03_intent_split_v1_0.mjs`／`tests/test_mingge_v12_rc1_product_loop_v1_0.mjs` 斷言；未動起卦閘門／付款分支邏輯。詳見 `plans/d3_r3_implementation_20260911.md`（含發現之既有凍結衝突，CODEX-REVIEW: BLOCKED-B1） | 影響:龍運藏公開頁、隨貨啟用卡；起卦閘門與付款流程不變 |
| 2026-09-11 | S-20260911 稽核修正（Perth 三項查證）：`longyun.html` 拔除 `review-bar`／`#review`／`#item/*`／`#missing`／內部未上架 SKU 與參考價格（`XTVSSPvA`/`agmh9hhJ`/`S9j544BD`）；`assets/longyun-journey.js` 拔除 R1-S00／R6-LY 三個「審閱：」fixture 連結與對應 route，正式檔案沒有 query／hash／localStorage 可打開這些態；`tests/test_d3_longyun_r3_copy_v1_0.mjs` 加 60+ 項防外洩斷言。裁決：本波不動 M-090/M-092 與 RM03 付費入口文案，登記下一波待辦（見 `plans/d3_r3_implementation_20260911.md` 尾段） | 影響:龍運藏公開頁、R1-S00／R6-LY 旅程；正式頁不再有任何內部審閱路徑 |
