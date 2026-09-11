# Mingge 命格 × 龍宮舍利 Data Runtime Entitlement Contract

```yaml
pack_id: MINGGE-PRODUCT-BASIS-vNEXT-CANDIDATE-20260909
status: OWNER_ADOPTION_CANDIDATE
canonical_effect: none_until_owner_explicit_adoption
runtime_claim: NONE
mutation_authority: NONE
owner: Perth
version: vNEXT_CANDIDATE
```

本檔為完整整合候選稿，不是要求施工者逐層套用舊 delta。來源、採用證據與具名修訂由 Index 綁定；六件之外的來源附件不是第七份 Product Basis。

## D01 邏輯真相與權責

此處定義資料契約，不選資料庫、不建表、不遷移。Product=P01–P19；程式為目標repo實際revision；runtime為目標部署及binding讀回；資料為authenticated subject可讀的owning store；發布為實際結果及授權。

| domain | 最小資料 | owning truth | 禁止替代 |
|---|---|---|---|
| identity | internal_subject、authentication_state、binding_evidence | identity mapping | public visitor／collector signature |
| divination | owner_subject、question、gua、changing_lines、result、created_at、version | 正式卦store | UI狀態 |
| Decision Memory | record_ref、owner、original、followups、echo、seal、deep/fupan refs、source/time | 卦記及附屬紀錄store | 訂單timeline |
| learning | content_id/version、provenance、article_context、answered_layers、delta_type | 內容／知識來源 | 全部私人卦記 |
| catalog | artifact_id、publication_state、facts_revision、gate_evidence | publication store衍生 | 手動catalog開關 |
| offer | offer_id/version、price/currency、period_rights_unit、availability | 已採用Offer設定 | 首屏價格文案 |
| payment | payment_ref、order_ref、state、provider_ref、verified_at | provider／payment ledger | 返回success URL |
| order | order_ref、buyer_subject、artifact/offer snapshot、state | order store | payment paid |
| entitlement | entitlement_ref、holder_subject、source_ref/version、state、starts/expires | holder entitlement store | 買家身分／物流狀態 |
| fulfillment | order_ref、items、state、carrier/tracking、evidence_time | 履約store | 訂單已建立 |
| refund | refund_ref、payment/order_ref、state、verified_at | refund/payment truth | 客服已收件 |
| support | request_ref、requester、context_ref、delivery/read state | 客服owning record＋上述各store | AI自述已送出 |
| optional relation | holder、gua_ref、artifact_ref、explicit_action、linked/unlinked | 獨立relation store | 自動推導商品 |

MG-RM-01負責正式卦；02讀私人記憶；03及MG-PUB-LY讀商務公開模型；04/05讀知識；06按身分讀店務。沒有surface另建真相庫。

## D02 Public visitor Attribution Intent

```yaml
public_visit:
  visitor_ref: ephemeral_pseudonymous_or_none
  source_code: allowlisted_or_unknown
  entry_kind: public_direct_or_rm03
  landing_revision: required
  consent_state: only_if_applicable
  is_mingge_member: not_inferred
product_intent:
  intent_ref: opaque
  artifact_ref: published_only
  entry_context_ref: opaque
checkout_intent:
  intent_ref: opaque
  artifact_ref: required
  offer_version: required
  quoted_price_revision: required
  readiness_state: blocked_or_ready_or_live
```

不因瀏覽建立會員、holder或Decision Memory。來源參數只能採白名單短碼；不接收私人所問、完整URL query、raw LINE identity或付款payload作分析。沒有source保留unknown/direct；分享碼不證明person／affiliation。保留期與同意機制由後續最小data-purpose設定，不發明無限追蹤。匿名至buyer／holder的映射只在明確且必要的身分流程內成立，不能用cookie／相同裝置推定。

## D03 Artifact Facts Publication

```yaml
artifact:
  artifact_id: required
  title: required_approved
  category: bracelet_or_pendant_or_chain
  actual_photo_assets: rights_cleared_and_owned_hosting
  inventory_model: unique_item_or_multi_quantity_or_pending_source
  price_twd: confirmed_or_null
  price_version: required_for_publication
  availability: authoritative_or_unknown
  dimensions_weight_condition: confirmed_applicable_fields
  material_claim: value_plus_evidence_kind_and_scope
  source_provenance: value_plus_evidence_kind_and_scope
  known_facts: evidence_bound
  disclosed_unknowns: evidence_bound_inability_to_confirm
  care: confirmed_source
  after_sales: approved_policy_ref
  collector_statement_ref: optional_unless_promised
  offer_binding: required_or_explicit_no_entitlement
  publication_state: source_reference_only_or_needs_supplier_or_publishable_candidate_or_published_or_unavailable
  publication_evidence_refs: required
  checked_at: required
```

required facts pending、price null、photo rights未clear、inventory語意未確認、disclosed_unknown無來源或售後未齊時不得published。適用欄位無法量測亦須有依據及允許揭露，不能空白填滿。catalog=published count衍生empty/open；query error為read_error，不能把缺讀回計0。published指可公開資料，不推成checkout live；售罄／下架不可結帳，過期深連結顯示不可用與返回。

Pinkoi source_listing_id、source_url、checked_at、extracted_title/price、layout_notes可留內部reference；不供TA連出，不推照片授權、材質、來源、inventory或availability。

## D04 Collector Source Statement

```yaml
collector_statement:
  asset_id: required
  asset_revision: required
  collector_identity: name_and_identity_evidence_ref
  statement_scope: collection_origin_storage_processing_as_supported
  signature_state: pending_or_sample_only_or_verified_signed_or_unknown
  signature_evidence_ref: required_for_verified_signed
  brand_stamp_state: pending_or_sample_only_or_verified_or_unknown
  company_stamp_state: pending_or_sample_only_or_verified_or_unknown
  issuer_name: exact_verified_name_or_unknown
  traceability_scope: batch_or_sku_or_unknown
  batch_ref: as_evidenced
  artifact_refs: explicit_applicability_only
  statement_date: verified_date_or_unknown
  image_date_text: observed_text_not_verified_date
  evidence_boundary: collector_statement_not_lab_or_effect_guarantee
  third_party_lab_certified: false_or_unknown_as_evidenced
  third_party_report_ref: only_if_separately_obtained
  public_use_rights_state: confirmed_or_pending
  qr_target_state: verified_or_unknown
  publication_state: draft_or_approved_or_published_or_withheld
```

批次聲明不推成每件加工履歷；卡上SKU不變更聲明勾選層級。false只在來源確定無該認證時，未取得／未確認填unknown。若日後另有第三方報告，另建證據資產、保存檢測範圍，不把collector card升格為lab certificate。

本輪樣稿觀察（非公開資料）：卡上SKU XTVSSPvA、日期文字2025/09/02、Batch Level勾選／SKU Level未勾，帶簽名字樣及章；最新BD明載pending signature。故signature_state=sample_only，verified簽署日期未知；實際issuer、姓名字樣、用印權、QR目的地及批次對應待核。圖片不是完成簽署證據。

## D05 Offer Entitlement 精確語意

P06完整拘束：single_149／deepen_200／fupan_399／plan_1490_6m；3/6/24個月，不是90天；period_rights_unit無月bucket。deep_read需holder擁有原卦、尚未完成該卦完整四鏡；fupan需≥3筆distinct records且再次需new_gua_or_new_followup。

plan_1490_6m starts_at=verified_payment_confirmed_at。實體藏主starts_at=verified_holder_activation_at，不能用paid_at／shipped_at／delivered_at代入。ends_at按月制；實際時區、月底／閏日計算與API精度由後續WP選定並一致揭露，不悄悄以固定天數替代。

entitlement state=none/pending/active/expired/revoked；activation_state獨立見D06。活躍多來源不累加quota；每筆保留source及offer_version。到期保留已產生內容；confirmed full refund撤銷僅對應entitlement，不刪原始內容。partial refund結果本輪未定，交既有政策／後續規格，不自行按比例扣權益。舊v1.1購買不因新方案被縮減。

## D06 Buyer Holder Activation

```yaml
artifact_purchase:
  order_ref: verified
  buyer_subject: authenticated
  intended_holder_type: self_or_recipient
  intended_holder_ref: invitation_scope_only
holder_activation:
  holder_subject: authenticated
  order_ref: verified_authorized_claim
  state: none_or_invited_or_deferred_or_declined_or_pending_or_active_or_support_review
  explicit_action_ref: required_for_activation
  activated_at: required_only_after_commit
  entitlement_ref: required_for_active
  readback_state: confirmed_or_unconfirmed_or_read_error
```

buyer不能替recipient同意；self也需explicit action。eligible狀態由訂單、有效claim及退款truth共同決定；本人未綁定、邀請錯人／失效、已核full refund時不得active。重試和重複回呼以同一業務identity去重，先查是否已寫入，不多發權益。具體token／一次性claim實作留WP，不放原始credential於文檔或一般log。holder可延後、拒絕、求助；拒絕啟用不自動取消實體訂單／退款。

## D07 Payment MoR readiness

```yaml
commerce_runtime_pin:
  provider: exact_or_unknown
  merchant_of_record: exact_verified_or_unknown
  merchant_brand_relationship: evidence_ref
  environment: sandbox_or_production_or_unknown
  route: exact_or_unknown
  order_store: exact_or_unknown
  payment_ledger: exact_or_unknown
  entitlement_store: exact_or_unknown
  fulfillment_owner: exact_or_unknown
  policy_revision: exact_or_unknown
  live_feature_revision: exact_or_unknown
  approval_state: pending_or_conditional_or_approved_or_rejected_or_unknown
  activation_authority_ref: exact_or_none
  readback_at: timestamp
```

通過provider審核不自動live，ready與live分開。尚未pin時checkout blocked；真實order/payment/activation不執行。TA端品牌、收款名、責任主體必能勾稽；申請以實體加數位真實交付揭露，不遮掩。這張表不把藍新或Perth、運好氣寫死為永久產品truth。

## D08 Persistence與交易失敗

```yaml
persistence:
  mode: explicit_save_or_auto_saved
  write_state: not_attempted_or_confirmed_written_or_confirmed_not_written_or_unknown
  readback_state: not_attempted_or_confirmed_or_failed
  effective_state: unsaved_or_saving_or_saved_or_unconfirmed_or_unavailable
  record_ref: authorized_opaque_or_none
```

confirmed_written＋failed readback→unconfirmed；unknown write亦unconfirmed。只在正確owner的record讀回成功才能saved。逾時先查既有效果再安全重試。保存write/readback/close-reopen/second-read為正式證據；預演session切換僅合成，不冒充持久化。

payment paid而order未確認→付款已確認／訂單待查；entitlement寫失敗→保留paid、權益pending，不重扣。實體paid未啟用→awaiting_holder，不用數位方案自動開通句。fulfillment未知不說已出貨。通知發送失敗不改交易truth，未送達不得說已通知。

## D09 Contextual return 與客服

entry_context存source_surface/screen、最小opaque record_ref、allowlisted safe_return_route、expiry；不把private question或payment payload塞URL。進任何私人內容重新授權；跨使用者、失效context安全回相應公開頁或首頁。public visitor可用公開客服管道；需私人訂單資訊時驗buyer資格，不強迫先問卦或加LINE。

## D10 最小事件與隱私

landing_view＝頁面實際開啟；source_identified＝解析允許代碼；product_detail_view＝詳情開啟；line_inquiry僅實際詢問證據，單純點連結只能line_link_clicked；checkout_started＝實際開始checkout；purchase_completed＝payment/order reconciliation確認；holder_activated＝啟用＋entitlement讀回。事件以event_id／業務ref去重，最小record帶event_name/time/source_code/page_revision/artifact_ref（適用時）。

不用私人所問、卦、情緒、raw identity做remarketing。供應商僅得必要履約資料，不能讀Decision Memory。最小化與purpose restriction比新增analytics更優先；本輪不設tracking服務。

## D11 Runtime證據與適用性

後續正式施工才pin repo revision、deployment、LINE surface、Make/Dify IDs、provider/model、prompt/KB、payment route/store及時間。N/A說明理由；wrong target拒絕。變動只使受影響證據失效，未觸及PASS不重跑。公開／付款／holder／私人記憶的admission與獨立審查依專案規則；本輪不修改任何runtime。

## D12 5ml保養油

care_item_id/artifact_ref/volume_ml=5/role=fulfillment_included_item；成分、配方、amount_per_use、application_method、warnings、supplier/manufacturer、batch/expiry/source_ref需有資料。缺口不能自補；保留既有規劃為內部狀態，交易前依P18解決。


## JY-20260910｜Owner 具名採用之旅程缺口修訂

本節為本轮有限施工的候選整合；審計文件只是輸入，未整體採用。保留原版設計、共用 Noto Sans TC 黑體與 26/20/17 字級；100% 為審閱預設。原文未受影響條目與有效證據保留；本節與舊文矛盾時，僅本輪具名範圍依本節及 Owner 指令。六件仍非正式 runtime／發布採用，所有 owning-store、真人 UAT 與部署驗收均未完成。

不採用額度用盡單一路徑、首卦免費、第 N 次收費、送驗、上架通知、回訪提醒、節氣廣播或到期提醒。免費數量未核不阻擋五態候選。照片及來源卡留白，不新增鑑定、親簽、材質、庫存、折扣、退換承諾。
### JY-D 資料界線
正式實作需 owning store 提供 product_offer/version、verified_duration、holder subject binding、consent evidence、activation status、holder_activation_at、ends_at、source lineage。不能從參考價、付款、送達或 UI 勾選生成 active。claim idempotency、身份授權、回讀／重試與隱私驗證仍是正式工程驗收，不因候選按鈕 PASS 完成。
資格輸入分 active_period、available_single、verified_free、none、read_error；只有前 3 者可以往問卦前進。免費數不得推定。period 不由可用次數欄判斷耗盡。
候選只有 memory-only synthetic fields，無 token、真人 subject、付款資料、外連、localStorage 或寫入 owning store。合成 confirmed 必須經 verified+consent+period+pending，無外部服務能力。
