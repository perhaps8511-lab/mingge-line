-- MAKE_EXIT 第2b段(獨立審 HOLD 修正①實測)｜清掉增量同步並行競態留下的一筆重複測試列。
-- 根因：反覆 connect-service-source 觸發滾動部署時，新舊 container 短暫重疊，舊版(尚無
-- pg_try_advisory_lock 保護)進程與新版進程的輪次交錯，各自判斷「還沒連上
-- legacy_source_airtable_id」而各自走了一次 INSERT 分支，多長出這一筆。
-- 已在 src/worker.js 的 runIncrementalAirtableToPostgresSync() 加 advisory lock 修正並行本身，
-- 這裡只是清掉修正前已經產生的這一筆合成測試資料殘留(subject 帶 SYNTH- 前綴＝合成測試值，
-- 非真實使用者資料)。條件寫死到單一 id，多重限定避免誤刪，且若已經手動清過則整段是 no-op。
DELETE FROM gua_records
WHERE id = 'ebad8068-050e-4644-8540-cb2ebbcb71c8'
  AND subject = 'SYNTH-p2b-autosync-holder-0001'
  AND is_legacy_import = true
  AND legacy_source_airtable_id = 'rec0ukJ465SgGmsDm';
