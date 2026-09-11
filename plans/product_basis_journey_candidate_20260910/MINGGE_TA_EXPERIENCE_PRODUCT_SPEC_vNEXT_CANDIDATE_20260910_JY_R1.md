# Mingge 命格 × 龍宮舍利 Product Master

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

## P01 產品定位與範圍

命格讓使用者問清楚一件掛心的事、留下自己的決策、讀懂易經，並自主決定是否購買數位方案或實體信物。核心 TA 為台灣 45–65 歲女性，延伸至具體決策事件者、熟齡文化收藏者及家庭買家。Trust × Interpretation × Decision Memory × Learning × Autonomy 為核心價值。

命格是 MindNexus 的長期 Product Asset；龍宮舍利是第一個特色 Supply Node／Commerce Proof。龍運藏為運好氣旗下品牌；品牌關係不構成法人、收款或履約責任認定。Perth、MindNexus、運好氣、供應商及實際 MoR 不可互換。

第一期商品類型為手鍊、鍊墜／鍊子；逐件資料就緒才公開。舊三件手鍊是候選工作集，不限制日後已確認鍊墜入列，但也不代表新增品項已可售。不建立龍運藏獨立 OA、能量商城、第七格；三角空間擺件、大型 B Corp／健診合作、affiliate 網絡、paid ads、靜坐／靜心／氣功與能量業務擴張均不進本期。

## P02 PRIMARY_SURFACE_PRODUCT_JOB_ANCHOR

surface_type=LINE_RICH_MENU；expected_surface_count=6。下表 state_class 均為 TARGET，實際完成另驗。

| surface_id | 顯示／副標 | user_job | primary_input | transformation | user_outcome |
|---|---|---|---|---|---|
| MG-RM-01 | 向天問卦／問一件新的事 | 看清當前一件事 | 明確所問與起卦必要輸入 | 唯一正式起卦、解讀 | 可理解、可保存的一卦 |
| MG-RM-02 | 我的卦記／回看、補記已有的事 | 接續自己的決策歷史 | 本人既有卦記與後續 | 回看、補記、同卦深看、跨卦複盤 | 私人 Decision Memory |
| MG-RM-03 | 方案・信物／看方案或龍宮舍利 | 自主理解購買選擇 | 明確方案或實品意圖 | Intent Split 後看相應價格與權益 | 不被逼迫的選擇 |
| MG-RM-04 | 易經書房／自己讀一篇 | 沒有新問題也能學習 | 閱讀意圖與內容 | 生活化易經導讀 | 讀懂、可帶走的觀察 |
| MG-RM-05 | 問老易／把看不懂的問懂 | 理解老易及易經 | 文章、古典、既有卦象知識問題 | 人格與方法信任、教學與深化 | 問懂，不另起卦 |
| MG-RM-06 | 書僮客服／查權益、訂單與售後 | 知道交易與會員現況 | 明確店務問題與本人授權 | 讀 owning stores、解釋下一步 | 可核對狀態並回原任務 |

⑤ canonical role 仍是「老易介紹＋老易說易」，不是角色改版；「問老易」沿 9/3 採用文案。Public surface `MG-PUB-LY` 為 public commerce / trust surface，歸格③商務領域，但不是 LINE_RICH_MENU surface，也不是新起卦入口。

## P03 自主路由與危機邊界

①唯一正式起卦；②唯一 Decision Memory 核心。卦象、負面結果、焦慮、危機及私人所問均不能觸發 SKU 推薦或商品 remarketing。⑤知識題不偷偷起卦；新個人決策交回①。④一般文章不直達 checkout；主動實品意圖可去③。⑥訂單、付款及退款問題不轉⑤做人生命解釋。

不買實品仍可完整使用命格；不先問卦也可買實品。危機回應先照顧當事人安全，不以付費、問卦或商品作前置。以卦象配商品、神準、效果保證、倒數、閃動庫存、最後機會等壓迫方式均禁止。

## P04 正式問卦與保存

交付所問、本卦、適用動爻／之卦、可理解解讀與卦記 reference；易經本體有來源，生活轉譯不變雞湯、不替人決定。結果頁只交付、保存／查看、退出，無深卜、複盤、方案、商品 CTA。

依實際 persistence mode 選 explicit_save 或 auto_saved；已保存須 write/readback 成立。確定未寫入才能說「未保存」；write 可能成功而 readback 失敗必為 unconfirmed，不能說已保存或不存在。保存成功與延後回訪不同時刻，新保存只看本卦／回首頁，不立刻分流。

## P05 Decision Memory 與回訪

本人可回看原始卦、後續／落款／回音、蓋印、深卜與複盤；來源、時間及 lineage 分開，不回寫原始內容。close/reopen 後仍能讀取已保存內容。延後回訪顯示「事情有變了／想把這一卦看深／想回看這一路／問另一件新的事」，依功能與資格呈現。

補記三句為引導非必填：後來發生什麼、做了什麼決定、現在最卡什麼。訂單、付款、退款不得寫成卦記內容。Optional artifact linkage 僅本人主動建立、可解除，獨立 relation store，不代表推薦；維持 FUTURE_GATED，未納入預演主流程。

## P06 Offer v1.2 完整 parity

| offer_id | 價格 TWD | 單位／起算 | 精確交付 |
|---|---:|---|---|
| single_149 | 149 | one_shot | 一件新問題正式起卦一次，保存可回看 |
| deepen_200 | 200 | one_shot_same_gua | 本人已完成原卦一次完整四鏡：互卦、綜卦、錯卦、序卦；不重起、不改原卦 |
| fupan_399 | 399 | one_shot_cross_gua | 至少三筆不同卦記；再次複盤需上次後新增卦或後續／回音 |
| plan_1490_6m | 1490 | 自付款確認日起六個月 | 完整 period_rights_unit；付款確認不替代權益寫入與讀回 |

period_rights_unit：期間內正常個人使用可問新的事、不逐次計費；自己的歷史或新卦每筆可完成一次深卜；至少三筆不同卦記可複盤，有新卦或新後續才可再複盤。無月配額、月重置或次數結轉，不宣傳無限／吃到飽。Fair-use 異常先人工處理；明顯自動化攻擊可限速，不變隱藏 quota。同題反覆焦慮優先回原卦。

| 實體售價帶 | 藏主期間 | 起算 |
|---|---|---|
| 3,000–5,999 | 3 個月 | holder 本人自主啟用 |
| 6,000–14,999 | 6 個月 | holder 本人自主啟用 |
| 15,000 以上 | 24 個月 | holder 本人自主啟用 |

各價帶每有效月同一套 period_rights_unit；半年藏主數位權益與 plan_1490_6m 相同，差別在實品及期間，不以能量強弱定價。低於 3,000 的鍊墜不得自創藏主期間，該 offer binding 待確認。3,000–5,999 不包裝成入門系列。

期限到後停止新增期間服務，既有卦記、深卜、複盤、後續、蓋印保留可讀；獨立單買深卜／複盤權益不隨另一期間方案到期消失。full refund 經 truth 確認僅撤銷對應 entitlement，既有內容保留。每單記 offer_id/version，不以新版減損舊購權益；多筆 entitlement 保留各自來源、不疊成雙倍次數。免費相贈數量本輪未確認，不新增數字或第9卜觸發承諾。

## P07 Offer 與 live 能力分離

上表是採用的產品權益，不證明 runtime 可用。複盤需建立、保存、回看及判權全可用才可對外販售／列為現在已包含；其他功能亦需目標 runtime 證據。預演可顯示具名 TARGET 功能，外框持續標「候選產品預演｜合成資料｜非正式服務」。不能用隱藏未完成權益的方式悄悄縮減 Offer；正式交易揭露與履約能力不一致時，停止受影響 offer 開賣，補能力或取得具名 offer 修訂。

## P08 書房與問老易內容

保留五內容柱：易經日常選擇、人際處世、工作／家庭／人生轉折、節氣時序、信物文化來源保養。古典公版可引，當代著作原創重述、不大段搬用。64卦知識可支撐卦義、卦爻辭、結構、生活轉譯及比較，不等於本輪做64卦新大全。

9/3已採用核心文案 v0.2 的十二問法、六組改寫、八篇 starter 文章及後續比較卡保留。十二題包含家庭、關係、工作、金錢取捨、照護安排、人生階段；不問診斷預後或投資標的。舊 runtime 題域限制不能反向刪產品題目。

⑤每輪至少一種 delta：更白話、生活例、古典深度、比較、直接回應新角度；只顯示四顆既有 chips。沒有新內容則承認並提供不同深化方向，不假新意。新決策正常用 engine handoff，前端不重播；僅 engine 未回正常收束時用 fallback。N13 reception 四題與 N16 未終審引路／留話句仍受來源 gate，不因整份文案已採用而解除。

## P09 商務雙入口

路徑A：命格格③ → Intent Split → 龍宮舍利公開自有頁 → 來源／商品／權益。
路徑B：YouTube／FB／IG／分享／搜尋 → 同一公開 Landing Page → 商品／來源 → checkout（ready且live）或自願找 LINE 書僮。

B 不繞經問卦、加 LINE、填個資或文化長文才能看已公開價格；首頁可直接跳商品。A 的 Intent Split 不得套到 B 成為新阻力。兩入口讀同一版本 catalog／facts／offer；公開頁不建第二套會員或私人記憶。沒有 LINE 的買家仍需有可用的訂單／售後管道；加 LINE 為自主選擇，權益啟用才另作本人身分綁定。

## P10 Landing Page 的七個內容區

一、人物來源 Hero；二、蔡老師角色；三、收藏故事；四、收藏來源聲明卡；五、商品列表與逐件五層資料；六、現有收藏與補貨現況；七、購買／藏主／配送／退款／客服與條款。FAQ、政策與聯絡可置第七區展開，七區不是七格。

正文原則≥17px、行高≥1.9、短段≤4行，不縮字；核心局部任務≤3步。首次接觸60–90秒能理解物件、誰聲明來源、價格、卡的界線、權益、如何購買與求助，屬待真人驗證目標。只在需要的地方解釋一次，同一理念不在連續兩屏全文重播；深連結進詳情仍須就地看到必要商品與交易揭露。

## P11 商品五層與來源證據

每件逐層呈現：物件實拍／規格／品相；已知及其證據；有依據的無法確認事項；文化收藏／佩戴／送禮情境；不承諾功效。Collector statement、supplier statement、third-party evidence、unknown 各自標示來源與範圍。

confirmed_fact 有 evidence_ref；disclosed_unknown 有來源支持確實無法確認；pending_source 是尚未取到／整理資料，不能包裝成公開「不知道」。required 基本事實仍pending時該SKU不公開。照片存在不等於使用權；比對拍攝物件、用途授權、自有託管及批次／SKU關係。

## P12 蔡老師與 Collector Source Statement

蔡銘斌老師的產品角色為導引混元功老師、長年收藏人、願意具名說明自己所知來源者；協會正式職銜、人像權利須可驗證才公開。四十多年只能依其回憶／表示，不擴為每件都收藏四十年。

聲明資產至少支援 identity、statement_scope、signature_state、company/brand_stamp_state、batch/SKU traceability_scope、statement_date、evidence_boundary、third_party_lab_certified=false或unknown（有何證據就填何值）。有簽名圖樣不等於已親簽；有章不等於已合法用印。有SKU碼而只勾批次層級，不代表單件加工追溯。無第三方報告不能推成「確定不存在報告」。

聲明卡是收藏人／品牌的来源聲明，不是驗身授權、第三方材質鑑定、科學能量檢測、真品或功效保證。無 signed verified evidence 不能說「蔡老師親簽」。卡片若未可公開，來源頁可誠實說明規劃，不展示為已完成背書；商品若承諾隨附親簽卡，未就緒則擋該承諾的交易。

## P13 Catalog 與實品 gate

catalog 由 publication_state=published 數量衍生：0為empty、至少1為open、讀取失敗為read_error。source_reference_only／needs_supplier／publishable_candidate 不得公開成商品卡；unavailable 不可結帳。價格、photo rights、庫存語意、必要規格品相、材質／來源證據、disclosed_unknown、保養與售後符合公開規則才可發布。

unique_item 才能說「照片這件就是交付這件」；multi_quantity 說明個體差異。現有收藏無穩定補貨來源，售完不能保證相同來源／物件；不用倒數、最後機會、數量閃動。Pinkoi 只可內部來源價格／版位參考，不作正式TA route、庫存／權利／材質／訂單truth。Offer v1.2的既有價格取得規則不被本輪默默移除，但其平台不是永久商品頁或checkout架構。

## P14 Provider-neutral checkout

產品需要一個合法、可驗證且承接商品、付款、退款、訂單及消費者責任的 Merchant of Record。exact provider、merchant、environment、route 由後續WP fresh-pin，不預定 Perth 或運好氣必為MoR。藍新個人申請只是可變 commerce constraint；approval pending不可顯示付款已可用。

checkout需同時確認SKU可售、實價、availability、MoR與品牌勾稽、出貨／運費／售後／客服／隱私條款、付款route與owning stores、實體加數位完整揭露及實際交付可用；ready不等於live。缺任何必要條件不顯示有效購買按鈕，可看資料、返回或詢問，不收假訂單或要求私人轉帳替代。

## P15 Buyer Holder 與自主啟用

buyer付款／查本人訂單；holder擁有本人數位權益，兩者可不同。自用也需本人explicit activation；送禮須提供現在啟用、稍後啟用、不接受、求助四路，不預勾。收到商品後由holder自主啟用為目標旅程；物流不得自動替代啟用。期間不從付款／出貨／寄達開始，未啟用不倒數；已持有效半年方案者可延後啟用。

買家不得讀holder卦記、深卜、複盤或使用紀錄；啟用邀請只帶必要商品／期間／關係資訊，不帶私人卦。多按、重試、換身分或已核退款後不得重複／越權發放。

## P16 交易 售後 隱私與狀態

payment、order、entitlement、fulfillment、refund、notification各自有truth及unknown/read_error。付款paid不等於order已記錄、已出貨或權益active。pending不等於failed；read_error不等於empty。客服呈現狀態、依據、下一步，結束回原任務；無有效context才回首頁。未驗發送不能說已留話／通知送達。

public visitor不自動變member，payer不自動變holder；私人identity、卦記、健康／聊天、secret及payment payload不進repo、一般日誌或公開分析。供應商只得履約必要資料，不得取私人記憶或跨品牌行銷同意。

## P17 Attribution 與營運觀測

最小source code支援既有關係、公域內容、分享、search、direct／unknown；代碼是來源而非真實人物身分證明。不啟動分潤網絡或廣告架構。事件可含landing_view、source_identified、product_detail_view、line_inquiry、checkout_started、purchase_completed、holder_activated；交易與啟用事件只能由owning truth確認，點LINE按鈕不等於實際詢問或加好友。

觀察來源組成、商品詳情、詢問、checkout、實付訂單與買因；不以合成預演宣稱PMF、真人轉換或已成交，不把BD指標門檻追加成產品驗收。

## P18 隨貨品與交付限制

5ml檀香保養油屬實體隨貨品，非數位entitlement。既有供應來源記載規劃附贈／每週保養，但成分、配方、用量、擦拭、警語、製造供應來源、批號效期仍需確認；不自寫安全用法、不說純精油／能量／療效／淨化。不因資料缺而默默取消既有隨貨承諾：補資料或另確認offer／交付變更，才交易。

## P19 文件與驗證位階

產品以adopted規格及具名修訂為準，runtime不反改acceptance；本輪是新候選。保留未受改動影響的既有PASS，但本輪不自稱重新驗過。UI成功不證明資料保存；錯app/model/prompt/KB/route全綠無效。Product Acceptance PASS、WP Closed、LIVE不互相代替。公開、真實交易、啟用與工程獨立審查各依既有授權，這份文件不新增部署授權。


## JY-20260910｜Owner 具名採用之旅程缺口修訂

本節為本轮有限施工的候選整合；審計文件只是輸入，未整體採用。保留原版設計、共用 Noto Sans TC 黑體與 26/20/17 字級；100% 為審閱預設。原文未受影響條目與有效證據保留；本節與舊文矛盾時，僅本輪具名範圍依本節及 Owner 指令。六件仍非正式 runtime／發布採用，所有 owning-store、真人 UAT 與部署驗收均未完成。

不採用額度用盡單一路徑、首卦免費、第 N 次收費、送驗、上架通知、回訪提醒、節氣廣播或到期提醒。免費數量未核不阻擋五態候選。照片及來源卡留白，不新增鑑定、親簽、材質、庫存、折扣、退換承諾。
### JY-P 產品
隨貨卡說明實品附有使用期間、由實際使用者決定是否啟用、未啟用不倒數。逐件期間只依核實 offer；目前工作 SKU 不以參考價推定權益。合成 3/6/24 月獨立於商品，只供腳本驗證。
啟用分本人驗證、完整權益閱讀、同意、現在啟用、稍後、不接受、求助；買家不能代替收禮者。pending 不說成功；invalid／claimed／pending 各有查詢與求助。權益確認後才提供問一件事／先讀一篇。既有方案持有人可延後藏主啟用。
完整期間權益：正常個人新事問卦不另逐次收費、每筆自己既有或新卦記一次未完成深卜、至少三筆不同卦記複盤，新卦／新後續才再複盤。每月權益相同、無月桶；到期停止新增期間服務，既有卦記／深卜／複盤／後續／蓋印保留，獨立購買權益不撤回。重疊保留來源，不倍增次數。
起卦前有有效期間、單次、核實免費、無可用、讀取失敗五態；讀取失敗不導購。空目錄提供來源、返回、詢問。詳見 d3_audit_14_questions_20260910.md。
