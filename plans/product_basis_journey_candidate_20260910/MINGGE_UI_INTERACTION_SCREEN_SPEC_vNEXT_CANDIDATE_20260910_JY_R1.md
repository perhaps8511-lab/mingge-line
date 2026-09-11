# Mingge 命格 × 龍宮舍利 UI Interaction Screen Spec

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

## U01 共通螢幕契約

下表逐screen列ID、Product、Journey、Data、trigger/user_state、purpose/required_semantics、primary_action、safe_exit、data_read、data_write、acceptance_refs。source_or_truth_shown由Data欄及read欄給定；module及surface依U02；state_class預設TARGET，標FUTURE_GATED者只能隔離預演／日後已授權開放；next_state為action指向，成功／失敗依Journey，不允許另造狀態。

所有screen loading顯示「正在讀取／保存…」並允許安全退出，不承諾秒數。未依賴資料者loading/empty/error=N/A（靜態畫面無遠端操作）；有資料者empty只在truth confirmed為無，read_error显示「目前讀取失敗，不代表資料不存在」＋重試／返回。access_denied不顯別人的記錄。寫入未確認時共用U04分支，未完成不自稱成功。secondary_action為可展開的說明／返回來源；各screen只有一個主要任務，平行意圖選項可並列，不另加入促銷主CTA。

UI正文原則≥17px、line-height≥1.9、單段≤4行（窄螢幕以分段而非縮字），正文長文分節可滾動；按鈕建議≥44px為本候選可逆設計選擇。局部核心任務≤3步；整段購物及啟用旅程不虛報三步完成。380px與200%縮放需可讀可操作，無遮字／橫向溢出。

## U02 Identity與舊screen alias

MG-RM-HOME是六格容器；MG-WELCOME是首次訊息不新增第七格。R1/R2/R3/R4/R5/R6 screen分別屬MG-RM-01…06。LP-S01–S07屬MG-PUB-LY（public commerce/trust），領域歸MG-RM-03而非新增Rich Menu。R6-LY-01屬MG-RM-06。

舊R3-S03／R3-LY-03→LP-S05列表；R3-S04／R3-LY-04→LP-S05詳情；R3-LY-02→LP-S03的知識內容；R3-LY-05→LP-S01的empty；以上只是semantic alias，不保證現役URL重導已建。

## U03 Screen inventory

| Screen | Product | Journey | Data | Trigger | 首屏與目的 | Primary及next | Safe exit | Read | Write | Acceptance |
|---|---|---|---|---|---|---|---|---|---|---|
| MG-RM-HOME | P02 | J02–J08 | D01 | 主畫面 | 六格與副標逐字採P02；無第七格 | 選任一格 | 離開 | 公開導航 | 無 | G-01,G-07 |
| MG-WELCOME | P04 | J02 | D08 | 首次進場 | 一件掛心的事，用一卦看清楚。命格不替您做決定，只陪您把局勢看清楚。 | 開始問卦 → R1-S01 | 先看看就好 | 首次進場狀態 | 無 | G-02,LP-19 |
| R1-S01 | P04 | J02 | D01 | 本人主動新事 | 正式所問輸入；不先談商品；正式core流程沿現役 | 進入正式起卦 | 回首頁 | 必要起卦輸入 | 正式卦流程 | R1-01,R1-04 |
| R1-S02 | P04 | J02 | D08 | 完成結果 | 卦與解讀；explicit：這一卦，先回答您今天問的事。auto且confirmed：這一卦，已經替您留下。 | explicit收進我的卦記／auto看這一卦 | explicit先不保存並確認／auto回首頁 | 結果及persistence truth | explicit保存；auto不二次寫 | R1-02,R1-05,LP-17 |
| R2-S00 | P04 | J02 | D08 | 首次保存讀回成功 | 已收進「我的卦記」。事情有了變化，再回來補記就好。 | 看這一卦 | 回首頁 | saved本人record | 無 | R2-06,C-11 |
| R2-S01 | P05 | J03 | D01 | 本人開卦記 | 摘要最多兩行／原始日期／最近後續日期與一句摘要；無後續寫還沒有後續 | 看這一卦 | 回首頁 | 本人卦記list | 無 | R2-01,R2-02 |
| R2-S02 | P05 | J03 | D05 | 本人舊卦delayed_return | 先原卦與既有紀錄，再問：這次回來，想做什麼？四路依P05；三功能比較可展開 | 選補記／深卜／符合條件複盤／新事 | 回卦記列表 | 本人原始與附屬紀錄／資格 | 無 | R2-03,R2-06 |
| R2-S03 | P05 | J03 | D01 | FUTURE_GATED本人主動連結 | 把這件信物記在這段卦記旁；relation非推薦 | 建立／解除連結 | 回這一卦 | 本人卦＋artifact reference | 獨立relation | R2-05,C-10 |
| R2-S04 | P05 | J03 | D08 | 補記後續 | 後來發生什麼？您做了什麼決定？現在最卡的是什麼？三句非必填；這一筆留在原卦後面，不會改寫當時的原始卦。 | 記下來 | 先不記 → 原卦 | 本人原卦reference | append後續及readback | R2-03,LP-17 |
| R2-S05 | P06 | J03 | D05 | eligible深卜／已完成回看 | 互卦、綜卦、錯卦、序卦四視角；與原卦lineage分清，不重起 | 有權益看深／已完成回看／主動購買同卦深卜 | 回這一卦 | 本人原卦／深卜狀態／權益 | 符合條件完成一次四鏡 | R2-03,OF-02 |
| R2-S06 | P06 | J03 | D05 | FUTURE_GATED複盤 | 至少三筆不同卦記及後續放一起；未live不當現在可用 | 符合條件建立／已有回看 | 回我的卦記 | 本人多卦／新內容／entitlement | 複盤及readback | OF-03,LP-13 |
| R3-S01 | P09 | J04/J05 | D02 | LINE格③ | 你今天想看哪一邊？ | 繼續使用命格／看看龍宮舍利 | 回首頁 | 公開分流 | 無 | R3-01,R3-02 |
| R3-S02 | P06 | J04 | D05 | 純命格主動選擇 | 情境化149／200／399／1490、期間與資格按P06；複盤受live gate | 看適用方案；live才前往付款 | 回方案・信物 | Offer與live資格 | 只在live checkout intent | R3-02,OF-01,OF-04 |
| R3-S05 | P16 | J04/J06 | D08 | 付款返回／查狀態 | 分開付款／訂單／權益／配送。pending：這筆付款還在確認中，請先不要重複付款。 | 查目前狀態 | 回原商品／方案 | 本人各owning truth | 無，callback由正式後端 | R3-06,LP-09 |
| R4-S01 | P08 | J07 | D01 | 書房入口 | 今天想自己讀一篇？從生活裡常遇到的事開始，不必先懂卦名。 | 選一篇文章 | 回首頁 | 版本化內容list | 無 | R4-01,R4-06 |
| R4-S02 | P08 | J07 | D01 | 文章選取 | 生活問題／易經觀點／古典來源／白話／小觀察；沿用八篇exact文章及十二問法 | 這篇看不懂？問老易 | 回書房 | article/version | 無 | R4-04,R4-05,CT-01 |
| R5-S01 | P08 | J07 | D01 | 首次或主動人物介紹 | 老易是誰、怎麼讀易、重視什麼、不替您決定什麼；不發明學術身分 | 把易經問懂 | 回原文章／首頁 | 核可人物與方法內容 | 無 | R5-01 |
| R5-S02 | P08 | J07 | D01 | 知識問答 | 有一段看不懂？把文章、卦辭或既有卦象帶來；這裡只做解釋，不會替您再起一卦。 | 選擇要問的內容 | 回原文章／卦記 | 文章／知識及有界context | 教學context非卦記 | R5-02,CT-02 |
| R5-S03 | P08 | J07 | D01 | follow-up | 四顆：更白話／換生活例子／看古典脈絡／比較另一卦；新角度為行為，不做第五顆 | 選深化層 | 回原文章／卦記 | answered_layers及current意圖 | bounded QA context | R5-04,R5-05,CT-03 |
| R6-S01 | P16 | J08 | D09 | 客服入口 | 書僮在。想查哪一件？會員／權益、付款、訂單、物流、退換／退款、其他店務；啟用僅live時 | 選問題類型 | 回到剛才的位置 | 公開類別；私人查詢另驗身分 | 無 | R6-01,R6-03 |
| R6-S02 | P16 | J08 | D09 | 客服狀態結果 | 現在狀態：{truth}；依據：{record_label}；下一步：{available_action}；錯誤不是沒有 | 重查／可用求助 | 回到剛才的位置 | 本人owning records | 求助僅正式支援功能可用時 | R6-02,R6-05,LP-18 |
| R3-LY-01 | P09 | J05 | D02 | LINE商務橋接 | 由格③進同一公開頁；短句卦象不替您挑商品只在必要橋接出現 | 依catalog先認識／看看目前收藏 | 回命格 | 公開content/catalog | 無 | R3-08,C-13 |
| LP-S01 | P10 | J05 | D02 | public或rm03 entry | 蔡銘斌老師長年收藏｜命格 × 龍宮舍利；先看清一件物，再決定要不要留下。 | open看看目前收藏 → LP-S05；empty先認識龍宮舍利 → LP-S03 | 離開／回命格（自願） | public content/catalog | 可選最小landing_view | LP-01,LP-02,LP-03 |
| LP-S02 | P12 | J05 | D04 | 主動讀人物 | 導引混元功老師／長年收藏人；正式協會職銜、人像待驗；不展示未核職銜 | 了解收藏故事 | 回公開頁主區 | 已核角色及人像權 | 無 | LP-04,LP-05 |
| LP-S03 | P11 | J05 | D03 | 主動讀故事／空目錄 | 龍宮舍利，是這批收藏沿用的名稱。依收藏方說明呈現長年收藏；確切取得故事需來源與公開權 | open看收藏／empty返回主區 | 離開／回命格 | 核可來源文稿 | 無 | R3-09,R3-10 |
| LP-S04 | P12 | J05 | D04 | 來源聲明卡展開 | 收藏來源聲明；顯示聲明人、日期、簽名狀態、批次或單件範圍；不是第三方材質或科學檢測 | 回這件實品（有context）／看公開收藏 | 返回原區 | 公開核可卡資產及狀態 | 無 | LP-04,LP-05,LP-06,LP-16 |
| LP-S05 | P11 | J05 | D03 | 公開商品區／深連結 | published卡：實拍、正式名、SKU、價格、最多三項規格、來源一句、藏主期間；詳情五層。所有價格無LINE門檻 | 看完整資料；checkout live才前往購買 | 回收藏列表／離開 | 同一catalog/facts/offer | 最小detail_view或主動intent | LP-01,LP-03,R3-10 |
| LP-S06 | P13 | J05 | D03 | 收藏現況區 | 現有收藏沒有穩定補貨來源。售完後不能保證再取得相同來源與物件。 | 回收藏 | 回公開頁主區 | 已確認供應來源現況 | 無 | LP-12,G-04 |
| LP-S07 | P14 | J05/J06 | D05/D07 | 購買權益與售後區 | 價帶3/6/24個月、holder自主啟用、實體及數位交付、MoR／運送／退款／客服／隱私；未確認政策不填假承諾 | live且商品就緒才前往購買；否則查看資料／可用客服 | 回商品／離開 | Offer、MoR、政策、聯絡與live能力 | 無 | LP-13,LP-14,LP-15 |
| R3-LY-06 | P14 | J06 | D07 | FUTURE_GATED checkout preflight | 物件／價格／可售／條款／誰收款及出貨／self或gift；gift明示收禮者自己啟用、買家無私密使用讀權 | 確認並前往付款（live） | 回商品詳情 | fresh exact commerce snapshot | checkout intent | R3-14,R3-15,LP-14 |
| R6-LY-01 | P15 | J06 | D06 | FUTURE_GATED holder驗證後 | 要現在啟用藏主嗎？商品、期間、從本人啟用起算及隱私；未啟用不倒數 | 現在啟用；其他選項稍後啟用／不接受／問書僮 | 稍後處理 | 本人claim／order退款／權益 | explicit activation及readback | R6-06,LP-10,LP-20 |

## U04 狀態精確文案與具名候選修訂

本節僅修正核心文案v0.2 §2.2、§4.5–4.7、§8.2–8.3的truth mismatch；其餘沿用。非本輪擅自修改已採用原檔。

| 真狀態 | 顯示 | 可以做 | 禁止 |
|---|---|---|---|
| 尚未保存且未寫入 | 收進我的卦記／先不保存 | 保存或確認後離開 | 已保存／稍後再看 |
| 保存中 | 正在收進「我的卦記」…… | 暫停重複送出 | 承諾秒數 |
| confirmed_not_written | 這次沒有保存成功，結果還在這一頁。 | 安全重試／先不保存 | 已保存 |
| write未知或write成功但readback失敗 | 目前無法確認是否已保存。請先保留本頁結果，再查一次。 | 查核／求助／明確退出 | 已保存／沒有保存／不在卦記 |
| saved且本人readback PASS | 已收進「我的卦記」。 | 看本卦／回首頁 | immediate upsell |
| catalog empty且read成功 | 實品資料正在整理，完成後才會開放。 | 先認識來源／返回 | 假商品、未published價格卡 |
| catalog read_error | 目前讀取商品資料失敗，請再試一次。 | 重試／返回 | 沒有商品 |
| checkout未live | 付款功能尚未開放。 | 看資料／可用客服 | 有效付款按鈕 |
| 實體paid且未啟用 | 付款已確認。藏主時間由實際使用者自行啟用後開始。 | 查訂單／live且本人符合才看啟用 | 已開通／正在自動開通 |
| 數位paid但entitlement未確認 | 付款已確認，權益狀態仍待確認。 | 查狀態／客服 | 可以用了 |
| 啟用pending／read_error | 目前還無法確認啟用結果，請再查一次。 | 查原claim效果／求助 | 已啟用／重新扣款 |
| 通知未送出或未知 | 目前無法確認訊息是否送達。 | 查詢／其他有效聯絡 | 已送到書僮案上 |

首次歡迎文案原「問過的事會留在您的卦記裡」僅在保存保證有正確runtime證據時使用；本候選預演通用welcome不放該句，保留主標及自主決策說明。此修訂不移除保存產品要求，只避免未保存狀態的過度承諾。

## U05 公開頁內容與CTA

七區是P10內容架構，可一頁anchors／展開詳情，不需七次下一步。Hero在catalog open時一鍵跳商品；價格不受LINE、login或讀課門檻。來源、權益及政策可就地展開；不把長篇品牌宣言塞首屏。

來源卡若僅sample，預演顯示文字版「聲明卡樣稿，簽署／日期／適用範圍待核」，不合成簽名、不讓樣稿QR成可點官方連結；正式公開不得把樣稿當已signed。batch scope與SKU scope分清；未verified姓名／職銜／法人不借圖自動帶入。

Footer需商店品牌、實際MoR勾稽、可用客服、配送退款服務隱私條款。已知客服Email源自申請包，但服務時間／電話／LINE及法定責任資料未齊；預演標待核並禁真實發信。不把尚未完成的客服留話流程顯示已送達。

FAQ「能否送禮」在功能未live時以「預定支援，尚未開放」呈現；不能從target雙席契約推成現在可用。相同道理適用複盤及付款。

## U06 核心內容沿用與預演配置

Supporting_Sources核心文案v0.2：§3完整十二問法與六組改寫；§6.1–6.8八篇文章原文；§5.2比較卡、§5.3補記；§7.3四顆chips、§7.5engine handoff；§8客服真相模板。八篇非只做標題卡，點入可讀全文。

ordinary choices本輪採：歡迎以首次卡呈現、十二問法主位置在④〈怎麼把問題問對〉、八篇以四個生活分類分組；不把N9–N11重新交Owner。N13涉及E1/E3/E4/E8待終審，N16 S5/S6未終審句不公開；預演只放已採用且未受例外限制內容，必要時用明示「待來源確認」審阅槽位，不冒充原句已核。

新公開頁與U04為本候選新增文案；既有exact來源不自行重寫語氣。全文讀取／多輪示範不觸發真實LLM或外部API。


## JY-20260910｜Owner 具名採用之旅程缺口修訂

本節為本轮有限施工的候選整合；審計文件只是輸入，未整體採用。保留原版設計、共用 Noto Sans TC 黑體與 26/20/17 字級；100% 為審閱預設。原文未受影響條目與有效證據保留；本節與舊文矛盾時，僅本輪具名範圍依本節及 Owner 指令。六件仍非正式 runtime／發布採用，所有 owning-store、真人 UAT 與部署驗收均未完成。

不採用額度用盡單一路徑、首卦免費、第 N 次收費、送驗、上架通知、回訪提醒、節氣廣播或到期提醒。免費數量未核不阻擋五態候選。照片及來源卡留白，不新增鑑定、親簽、材質、庫存、折扣、退換承諾。
### JY-U 增量畫面
保留原 31 個 screen 定義；新增路由以 JY-U-01 至 14 映射，不冒用原 screen 編號。其中 activation-fixtures／eligibility-fixtures 是審閱工具，不是正式產品入口。
- JY-U-01: `#parcel`
- JY-U-02: `#rights`
- JY-U-03: `#activate`
- JY-U-04: `#gift-buyer`
- JY-U-05: `#activate-consent`
- JY-U-06: `#later`
- JY-U-07: `#declined`
- JY-U-08: `#activation-result`
- JY-U-09: `#activation-help`
- JY-U-10: `#activation-fixtures`
- JY-U-11: `#eligibility`
- JY-U-12: `#eligibility-fixtures`
- JY-U-13: `#ask`
- JY-U-14: `#read`

parcel 不含真領取 QR；activate-consent 只有 verified + consent + verified period + unactivated 才能送；送出先待確認。read 使用 Core v0.2 §6.1 全文，不假造 AI 回覆；ask 只預覽不送出，原版起卦動畫未改。
