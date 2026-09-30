-- MAKE_EXIT 第2b段(獨立審 HOLD 修正①實測，續 006)｜補清同一次並行競態留下的另外 4 筆重複測試列。
-- 006 只清了 ebad8068(SYNTH-p2b-autosync-holder-0001)一筆；查證時發現同一時間戳(06:34:43，
-- 與舊 incremental_sync_runs 稽核列 matched_count:3/inserted_count:5 完全對得上——5=ebad8068 +
-- 這 4 筆，同一次異常輪次的全部產出，沒有其他隱藏的第 6 筆)還留下 SYNTH-stage2-holder-0001
-- 的 4 筆重複列：067054183.../962a5afa.../af38415a.../ab3dd7f0...。逐一比對 Airtable 對應記錄的
-- session_id 與原始列的 request_id 逐字相同(stage2-gr-0001~0004)，證實這 4 筆也是 pg_try_advisory_lock
-- 修正前、新舊 container 重疊那次跑到的產物，不是新缺陷。條件寫死到單一 id 逐筆刪除，多重限定
-- 避免誤刪，若已經清過則整段是 no-op。
DELETE FROM gua_records
WHERE subject = 'SYNTH-stage2-holder-0001'
  AND is_legacy_import = true
  AND (
    (id = '67054183-3c2e-429c-bee1-2a8acea3c216' AND legacy_source_airtable_id = 'reczbxQebL4oMhnJJ')
    OR (id = '962a5afa-5c89-4044-bb5a-a5510e4d2704' AND legacy_source_airtable_id = 'reclqe2hJZJREFdU2')
    OR (id = 'af38415a-b77b-4674-901a-02eeb84a8273' AND legacy_source_airtable_id = 'recQH7pZF0ZB2LAp3')
    OR (id = 'ab3dd7f0-fc12-4626-9a54-1946dcd7581c' AND legacy_source_airtable_id = 'rec7lQjwJDZdqo0mV')
  );
