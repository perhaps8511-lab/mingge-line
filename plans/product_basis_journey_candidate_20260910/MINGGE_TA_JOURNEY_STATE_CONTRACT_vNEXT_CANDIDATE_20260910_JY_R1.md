# Mingge 命格 × 龍宮舍利 Journey State Contract

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

## J01 正交狀態

| 軸 | 狀態與語意 |
|---|---|
| divination | none／in_progress／completed／failed |
| gua persistence | unsaved／saving／saved／unconfirmed／unavailable；read_error獨立 |
| gua view context | first_completion／delayed_return |
| deep read | unavailable／eligible／purchased_or_entitled／completed |
| fupan | unavailable／eligible／entitled／active／completed；≥3筆及新內容條件 |
| learning | browse／article_context／qa_context |
| entry | public_direct／rm03；不等於member |
| commerce intent | none／mingge_plan／artifact |
| content | unavailable／ready／read_error |
| catalog | empty／open／read_error，依published count |
| publication | source_reference_only／needs_supplier／publishable_candidate／published／unavailable |
| checkout | blocked／ready／live；ready非live |
| payment | none／initiated／pending／paid／failed／refunded；unknown/read_error獨立 |
| order | none／created／paid／fulfilling／shipped／completed／cancelled／refund_pending／refunded；read_error獨立 |
| entitlement | none／pending／active／expired／revoked |
| fulfillment | unknown／not_started／processing／shipped／delivered／exception |
| refund | none／requested／pending／confirmed／failed／unknown |
| holder activation | none／invited／deferred／declined／pending／active／support_review |
| notification | not_sent／pending／sent／failed／unknown |
| optional link | none／user_linked／user_unlinked，FUTURE_GATED |

同一「成功」畫面不能推導其他軸成功。所有private transition以authenticated subject授權；catalog和交易狀態共用owning truth，不按入口各建一套。

## J02 Journey A 首次問卦

①輸入一件事 → 正式卦／解讀 → R1-S02。
explicit_save：點收進卦記 → saving → write/readback成功 → R2-S00；確定未寫入可重試／先不保存；寫入不明或讀回失敗→unconfirmed→查核／求助，不說已保存或未保存。
auto_saved：只有readback confirmed才顯示已留下／看這一卦；否則顯示對應未知。離開explicit未保存需確認不會進卦記；unconfirmed離開只說「尚無法確認是否保存，請先留存本頁結果」，不能斷言不存在。
保存完成只看本卦／回首頁。無immediate upsell；危機不進商業路徑。

## J03 Journey B 延後回訪

②list讀取 → empty／error／本人歷史 → 本卦原始內容及後續 → 四路：補記／四鏡／複盤／新事。
補記可答一句，保存且讀回後回原卦；逾時先查既有效果，不覆蓋原卦。
深卜：本人原卦已完成＋有權益＋未完成四鏡 → 同卦深化保存回看；已完成直接回看，不再扣一次。
複盤：功能live＋≥3不同卦＋有權益＋若非首次已有新卦／新後續 → 建立、保存、回看；不足顯示缺的條件，不誘導為湊數重問。
新事→①；主動方案意圖→③。過期仍可讀歷史，新增服務依P06。
預演以明確「模擬隔天回訪」場景切換代表delayed_return，不假裝已過真實一天。

## J04 Journey C 純命格

③Intent Split → 繼續使用命格 → 依本人情境看149／200／399／1490 → live能力及checkout gate → payment → entitlement readback → 返回①或原卦。
paid但權益未讀回→狀態待確認，不說可以用了，不二次扣款。半年起算是付款確認日期，與實體藏主分開。複盤未live不販售；不默默縮減期間權益換取checkout成立。

## J05 Journey D 與 G 雙商務入口

D：③Intent Split → 看看龍宮舍利 → 公開頁。
G：公域來源 → LP-S01；可直接跳LP-S05看公開商品，不需加入LINE、先問卦或逐區閱讀。
兩路在同一公開資料模型會合：empty→來源／知識→返回；open→published list→五層詳情；read_error→重試／返回，非假空目錄。
詳情可回來源卡、看權益、詢問、返回；checkout未live只看／問，不創訂單。過期SKU深連結→不可用→返回列表；不可用不暗示卦象不合。

## J06 Journey H Checkout 自用與送禮 FUTURE_GATED

同一商品 → preflight核物件/價格/availability/MoR/政策/實體數位交付 → 選self或gift → 付款頁 → 分別查payment/order。
付款pending：提示先別重複付款；failed：查款項疑慮／允許有效重試；paid+order未知：付款已確認、訂單待查；paid+order有、activation未開始：等待holder本人決定，非自動開通。
自用與送禮皆收到商品後由holder本人啟用。holder先驗身分及claim有效、訂單未confirmed full refund → 看商品、期間、起算、隱私 → 現在啟用／稍後／不接受／求助。
點啟用→pending→寫入及entitlement讀回→active，未確認留pending／support_review；未啟用不倒數。拒絕不自動退款；買家看自己的交易與物流、不看holder使用紀錄。

## J07 Journey E 閱讀與問懂

④選文章 → 讀全文／來源 →「這篇看不懂？問老易」帶文到⑤ → 白話/例子/古典/比較 → 回原文。
⑤首次或主動可看人物與方法，不強制每次過介紹；每輪有delta。新決策→①，商品事實→③，店務→⑥。N13/N16未確認文案不作已發布內容。

## J08 Journey F 客服回路

⑥按問題分類 → 驗本人權限 → 讀相應store → 現在狀態／依據／下一步 → 回原任務。public客可看公開客服資訊；查私人訂單需buyer驗證、不讀holder卦記。不得說未送出的訊息已送出。context無效回安全公開頁／首頁，不跳 其他人的紀錄。

## J09 Cross-edge fingerprint

下表每個C ID在Acceptance有同一行為判準；改任一邊需核另一邊。

| ID | Edge | 行為／guard | Product | Screen |
|---|---|---|---|---|
| C-01 | ①結果 → ② | 本人結果保存／查看；不帶商品 | P04 | R1-S02 → R2-S00 |
| C-02 | ②新問題 → ① | 本人明確選另一件新事 | P05 | R2-S02 → R1-S01 |
| C-03 | ②主動商業意圖 → ③ | 非卦象／焦慮觸發；未確認免費量不造第9卜觸發 | P03 | R2-S02 → R3-S01 |
| C-04 | ④文章 → ⑤ | 帶article context問懂後可回原文 | P08 | R4-S02 → R5-S02 |
| C-05 | ④實品意圖 → ③ | 使用者明確選擇，文章不直checkout | P03 | R4-S02 → R3-S01 |
| C-06 | ⑤新決策 → ① | 只handoff，不在⑤起卦；不重播engine句 | P08 | R5-S03 → R1-S01 |
| C-07 | ⑤商品事實 → ③／④ | 實品走③、文化走④，不推薦 | P03 | R5-S02 → R3-S01 / R4-S01 |
| C-08 | ③交易售後 → ⑥ | 按本人資格讀truth | P16 | R3-S05 → R6-S02 |
| C-09 | ⑥商業／學習 → ③／⑤ | 依意圖正確分流 | P16 | R6-S01 → R3-S01 / R5-S02 |
| C-10 | 信物 ↔ ②可選關聯 | FUTURE_GATED；explicit、可解除、commerce隔離 | P05 | R2-S03 |
| C-11 | 結果 → 保存確認 | 保存真相成立、無immediate upsell | P04 | R1-S02 → R2-S00 |
| C-12 | 首次完成／延後回訪 | 不同context，不以點下一頁假造延後 | P05 | R2-S00 / R2-S02 |
| C-13 | ③ → catalog/content | empty/open/read_error各自CTA | P13 | R3-S01 → R3-LY-01 |
| C-14 | 購買 → buyer/holder | 雙席分離，holder自選啟用 | P15 | R3-LY-06 → R6-LY-01 |
| C-15 | ⑥ → 原任務 | 保留最小context並重新授權 | P16 | R6-S02 → 原screen |
| C-16 | 公域 → 公開頁 → 商品 | 不先問卦、不先加LINE、不強制文化課 | P09 | LP-S01 → LP-S05 |
| C-17 | 公開頁／商品 → 來源卡 | 區分批次／SKU與簽名狀態，能回原商品 | P12 | LP-S05 → LP-S04 |
| C-18 | 商品 → checkout → 狀態 | ready且live才付款；payment/order/entitlement分別核對 | P14 | LP-S05 → R3-LY-06 → R3-S05 |
| C-19 | 公域商品 → 詢問 → 原商品 | 自願LINE；另可公開客服，無私人memory | P09 | LP-S05 → R6-S01 → LP-S05 |
| C-20 | paid → holder自主啟用 | 本人claim／退款資格／active readback，不從付款起算 | P15 | R3-S05 → R6-LY-01 |

## J10 Failure 終點與恢復

loading可返回，不承諾秒數；empty需truth確認；來源缺不公布SKU；卡未signed不假背書；read_error保留未知；callback重複先查既有效果。所有可恢復錯誤有重試／求助／返回，沒有「假成功繼續」。私密拒讀為access_denied，不能假empty。unknown／失效return不洩漏私人context。

## J11 Journey 對照

A=P04／D08／R1-S01,S02,R2-S00；B=P05,P06／D05,D08／R2-S01,S02,S04,S05,S06；C=P06,P07,P14／D05,D07／R3-S02,S05；D/G=P09–P13／D02–D04／LP-S01–S07；H=P14–P16／D05–D08／R3-LY-06,R3-S05,R6-LY-01；E=P08／D01／R4-S01,S02,R5-S01–S03；F=P16／D09／R6-S01,S02。


## JY-20260910｜Owner 具名採用之旅程缺口修訂

本節為本轮有限施工的候選整合；審計文件只是輸入，未整體採用。保留原版設計、共用 Noto Sans TC 黑體與 26/20/17 字級；100% 為審閱預設。原文未受影響條目與有效證據保留；本節與舊文矛盾時，僅本輪具名範圍依本節及 Owner 指令。六件仍非正式 runtime／發布採用，所有 owning-store、真人 UAT 與部署驗收均未完成。

不採用額度用盡單一路徑、首卦免費、第 N 次收費、送驗、上架通知、回訪提醒、節氣廣播或到期提醒。免費數量未核不阻擋五態候選。照片及來源卡留白，不新增鑑定、親簽、材質、庫存、折扣、退換承諾。
### JY-J 增量狀態與轉移
保留原 20 C-edge；以下為獨立 JY transition，不重編歷史邊：parcel→activate；activate→holder_verified；buyer→gift_help；holder_verified→consent；consent+verified_period→pending；pending→confirmed（需 owning truth）；pending→pending；invalid→help；claimed→original_subject_check/help；unactivated→later/declined（不倒數）；confirmed→eligibility/read。
關閉、重載或稍後不能以 UI 猜測正式啟用失敗。pending 查詢不到仍 pending，不重送 claim。讀不到資格保持 error；none 才可查看方案。候選狀態存記憶體，重載重設，沒有真實 claim／保存行為。
