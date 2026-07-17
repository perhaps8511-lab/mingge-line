# Owner Decision Log

## MINGGE-ODL-20260717-001｜Showcase Freeze 與 PAT／secret 最小解除

- Date: 2026-07-17 Asia/Taipei
- Release stage: SOFT_LAUNCH_READINESS
- Showcase target: 2026-07-20
- Buffer date: 2026-07-21
- Schedule health: Amber
- Active slice: MINGGE-SHOWCASE-001
- Owner authorization verbatim: 「同意 Showcase Freeze 與 PAT／secret 最小解除 Gate」

### Authorized
1. Showcase scope freeze：
   Rich Menu → 向天問卦 → 等待 → 信箋 → 我的卦記 →
   補後續 → 保存 → reload 後仍顯示文字與時間。
2. Owner 建立新的 Airtable PAT：
   - data.records:read
   - data.records:write
   - resource 包含 apptFfyVBYE4ygW3E
3. Owner 親自在 Cloudflare 將 mingge-relay 的
   AIRTABLE_API_KEY 更新為新 PAT。
4. sealed 單帳號驗證與 Airtable 回讀。
5. 若新 PAT 失敗，可將 secret 換回舊 PAT rollback。

### Not authorized
- Merge
- 產品 code deploy
- 公開流量或擴大測試
- Make／Dify／LINE mutation
- 真實付款或退款
- Production Activation
- 刪除或撤銷舊 PAT
- 其他 secret 變更

### Success
POST /trace 回 200；
trace_text、trace_at 寫入 Airtable；
手機關閉重開仍顯示文字與時間。

### Stop condition
新 PAT／secret 後仍回 403，或既有 Airtable read path 受影響：
立即 rollback，不做第三次相似嘗試。
