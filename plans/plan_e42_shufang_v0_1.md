# plan_e42_shufang — E42 卡B 格4 易經書房呈現層
規格源:`001_spec_journey_6grid_script_S156_v1_0` §4-A~F + §8 卡B。閘1=Journey_Edges `recpgmvs4BDg9ZK4l`(8項)。Perth 2026-07-09 裁決(Change_Log `recE8ZAIlHc9z9thr`)。
狀態:Codex 互審 **r2 APPROVED**(§11)+ §10-A Perth 定案(§10/§12)→ **施工-ready**。

## 0. 範圍與紅線
- **改的檔**:(1) live `index.html` `#page-study` 呈現層(HTML/CSS/JS);(2) relay Worker `mingge-relay` `/study` 加 `featured` 一欄(⑤,獨立 commit/deploy)。
- **禁碰**:Dify prompt/六格結構/格名/earned/起卦互動模型;卡C(E44)不同 commit;格1/2/3/5/6 一字不動;article body **零改字零破句零正規化**。
- **禁動色(Perth 裁③)**:金=live `--gold:#B8860B`;禁引入 `#C9A84C`(歸 E45 換皮);任何改色=範圍外,Codex 攔。
- **基礎檔鐵律**:base=自抓 GitHub raw/API live main;**施工前記錄該次 main commit SHA**,完整檔逐行 diff 對此固定基底;互審/施工期間 main 若動 → 重抓重 diff(R1-#13)。禁本機 `00D_spec/index.html` 化石。
- **資料紀律(S37)**:前端→Worker relay(E13 既模式);前端禁持 key、禁直連 Airtable、禁新 API。

## 1. Pre-flight(已核實 · 含 Worker 源實查)
- ShufangContent(`apptFfyVBYE4ygW3E`/`tblbzhwwmBDfAKQAs`)28 篇全 `qc_passed`;三分類 `content_type`=節氣信12/人際小文8/時節問候8。
- **Worker `mingge-relay` /study 實源**:`airtableFetch(...{filterByFormula:"{qc_passed}=1", fields:["title","content_type","body","persona","ta_type","jieqi_node"], maxRecords:100})`→`articles=records.map(r=>r.fields)`。即**以欄名取值**(非 field id),回傳 `r.fields`(欄名鍵)。CORS `ALLOWED_ORIGIN=https://perhaps8511-lab.github.io`。
- payload/篇=`{title,persona,ta_type,body,content_type,jieqi_node?}`,**無 id**;body 皆「老易在書房,談/寫於X。」樣板開場(28/28);古典原文以「」夾注 body 內(時節問候 8 篇零卦引)。
- `featured` 欄已建=`fldTo9eEVE9RRje8J`(checkbox,欄名=`featured`,無 BOM;僅 `content_id` 欄名帶 BOM)。

## 2. 三層資訊架構(§4-A)——單頁內 view 切換,路由不動
`action=study` 單一入口;`#page-study` 內三 sub-view(`.study-cover`/`.study-list`/`.study-read`),JS 切 `hidden`。
- **單次 fetch 快取**:進格 fetch `/study` 一次,`articles` 存記憶體陣列;三層皆讀此快取,**層間不重抓**(→ 無 mid-session 重排,idx 穩定)(R1-#5)。
- **篇識別**:relay 無 id → 以快取陣列 index 為 key;層2 卡 `data-idx`、層3 依 idx 取篇。
- **導覽狀態機(R1-#5)**:進格 `history.replaceState({layer:1})`;入層2 `pushState({layer:2,cat})`;入層3 `pushState({layer:3,cat,idx})`。`popstate` 依 state.layer 還原(3→2→1);**idx/cat 還原前對快取邊界/一致性 guard**(越界或 cat 不符 → 退層1);layer1 再返回=不攔,走 LIFF 預設(不 trap、不強留)。

### 層1 書房門面
- 自我介紹句一行(路標)。
- **門面兩句(§4-B,閘⑧逐字凍結)**:①`主人讀易的地方,也擱著些可看的東西。`(live 531 已在)②`不必問卦也能進來坐 —— 挑一卷,慢慢看。`(**新增**)。
- **分類籤(closed-set guard,R1-#4)**:固定白名單+序 `[節氣信, 人際小文, 時節問候]`;僅顯示白名單內、且該類實際有篇的籤(0 篇不掛=空籤零出);payload 出現白名單外/空/異常 `content_type` → 該篇不掛任何籤 + 記機讀證據,不新增野籤。閘②。
- **精選區「本週擱在案上的」(R1-#12)**:取 `a.featured===true` 篇,依 payload 順序 cap 3;**無任一 true → 整區不 render(`hidden`)**。閘⑤。

### 層2 書卷列表(點分類籤進入)
- 紙卡直列:篇名 + 一句引。
- **一句引(§4-E.4,禁 AI,確定性;Perth §10-A 定案)**:規則封閉化 = (1) 精確匹配樣板開場 `^老易在書房[，,](?:談|寫於)[^。]*。` **才剝**,不匹配則 fallback 字面首句;(2) 取其後第一句(至 `。！？`);(3) >20 字則截前 20 + `「…」`。excerpt 主體=body 逐字子字串;**機讀證=去尾 `…` 後為 body 逐字子字串**(`…` 為截斷符非生成內容;零 AI)。實跑 28 篇全表見 **§12**(28/28 剝、0 fallback)。

### 層3 閱讀頁(點紙卡進入)
- 篇名(`--moss` serif 大字)→ 內文(≥17px/行高≥1.9/`--rice`|`--paper` 底/窄欄 max-width/手機 24px 邊距)。閘③字級。
- **body DOM 重建規格(零改字,R1-#10)**:body 依 `\n` 切段(保留空行、原標點、原空白,不 normalize、不重切段);逐段以 `document.createTextNode` 建文字節點;**僅**把 §3 偵測到的古文 span 包 `<span class="study-quote">`;**全程不對 body 用 innerHTML**(零轉寫 + XSS 安全)。
- **古文引文卡(inline-block,Perth 裁②)**:古文 span 就地套「`--rice-deep` 底 + `--gold`(#B8860B)細左邊線 + serif」;白話同段緊隨(段落零破)。「左金線」塊卡意 inline 態以細左邊線承接。
- 篇尾:落款小卦符印(CSS 線稿)+ **尾部路標(§4-C,閘④)僅一處**:`讀著讀著,心裡若浮出一件自己的事 —— 書房這頭,隨時可向天問一卦。` + 按鈕 `🎴 向天問卦`;**每篇僅此一處,不插中段、不彈窗、不計數**。
- **🎴 目的地(R1-#11)**:沿用 live 既有 idiom=`location.href='./index.html'`(與現役 about 頁尾路標 line 568 同式,已上線接受);不另接 liff.state 深路由(那屬 live 行為變更=範圍外)。

## 3. 古文引文卡偵測規則(閘③核心 · 零 AI · 確定性 · 寧漏勿誤)
把 body 中古文 span 套 inline 引文卡 **當且僅當**其前 ≤6 非引號字內出現封閉白名單標記:
- 傳文:`大象`/`大象說`/`大象傳`/`彖曰`/`彖傳`/`象曰`/`象傳`/`卦辭`/`爻辭`/`卦說`
- 爻位:`初九`/`九二`/`九三`/`九四`/`九五`/`上九`/`初六`/`六二`/`六三`/`六四`/`六五`/`上六`/`用九`/`用六`
- **配對嚴格(R1-#9)**:引號只認合法同型配對 `(「[^」]+」|『[^』]+』)`,不允許 `「…』` 異配對。
- 正則:`(白名單)[^「『」』]{0,6}?(「[^」]+」|『[^』]+』)`。
- **28 篇實測**:命中=人際小文 8/8、節氣信 12/12(含爻位補 乾九三/乾上九)→ 非問候 **20/20 每篇 ≥1 古典原文**;誤命中 0(白話強調引號 贏/成事/止/夠了… 無前置標記,不套)。
- **時節問候 8 篇零卦引** → 不套=純文字(合法)。**Perth 裁②**:不擋卡;列 content-軌 backlog(立秋/立夏/秋分/春分/夏至/立春/冬至/立冬);前端禁生成補洞。

## 4. 亂碼閃 + 降級(§4-E.2,閘⑥)
- **charset(R1-#6)**:pre-flight 確認 live `<head>` 內 `<meta charset="UTF-8">` 早置(已於現役 line~4);fetch+`res.json()` 依規格為 UTF-8。⑥ 機讀證含「charset 存在 + 換入無未解碼位元幀」。
- **骨架**:進頁先 render `.sk-*` 固定高度佔位;`res.json()` 完、內文 DOM 組好才一次換入(不半解碼逐字塞)。
- **schema guard(R1-#14)**:`res` 非 2xx / body 非合法 JSON / `articles` 非陣列 → 走既有錯誤態(不新文案);單篇缺 `title`|`body`|`content_type` → 跳過該篇 + 記機讀證據,不 blank 全頁;`articles=[]` → 既有「書房整理中」。

## 5. featured relay passthrough(⑤最小必要 diff · 獨立 artifact)
- **實源確認**:Worker /study 以欄名取 `fields:[...]`。**最小 diff = 在該 `fields` 陣列加 `"featured"`(欄名,無 BOM)一項**;`r.fields.featured` 勾選=`true`、未勾 Airtable 省略該鍵 → 前端 `a.featured===true` 兩態皆正確。不改結構/不新端點/不動驗身/不改 filterByFormula。
- 🔴 禁新 API/禁前端直連 Airtable/禁持 key。與 index.html **不同 commit**,各自 Codex 審+deploy。
- **⑤ 完整驗收 gate(R1-#3)**:須 (a) Worker `featured` passthrough deploy + (b) Perth 勾一篇 featured=true → 精選區顯示該篇 之顯示路徑實測 + (c) 全不勾→整區 `hidden`。三者齊才簽 ⑤。index.html 可先交付,但 ⑤ 不因「僅驗隱藏態」而收;Worker 未上線前 ⑤ 掛「hidden-only 已達、featured 顯示待 Worker」。

## 6. CSS(沿用既有 tokens,禁動色)
1. 全用 live 既有 `--moss #2C3E2D`/`--rice #F5F1E8`/`--rice-deep #ece5d6`/`--paper`/`--gold #B8860B`/`--jade`/`--line`/Noto Serif TC。
2. 新 class 一律 `study-*`,不覆寫既有選擇器。
3. 引文卡=`--rice-deep` 底 + `--gold` 細左邊線;一句引截斷=CSS line-clamp。
4. 頁尾統一 foot(§4-E.6),不遮內容。
5. 落款小卦符印/空態=純排版線稿(不新產圖)。
6. **禁引入 #C9A84C 或任何新色值**(Perth 裁③)。

## 7. 驗收對映(8項;①③⑤⑥出機讀證,真機關 Perth)
①三層真機可走(機讀:三 sub-view + replaceState/pushState/popstate + 邊界 guard)②三分類零空籤(機讀:籤∈白名單且該類有篇;野類不掛)③內文≥17px/行高≥1.9 + inline 引文卡 + 每篇(有卦引之20篇)古典原文≥1(機讀:computed style + 偵測覆蓋 20/20、誤命中0)④篇尾路標僅一處+鈕(機讀:單一 `.study-signpost`)⑤featured:無勾整區 `hidden` + 有勾顯示(gate 見 §5)⑥亂碼閃0/10(機讀:charset+骨架先於內文)⑦一句引逐字取自 body、CSS 截斷(機讀:DOM 文字=body 子字串)⑧門面兩句逐字。

## 8. 明文不做
時節問候補卦(內容軌)/心情卡+集點(phase2)/隨筆第四籤/換皮·改色(E45)/格1235 6/信箋(卡C)/圖鑑蓋印(W-DJ)。

## 9. 交付流程
自抓 live main(記 SHA)→ 改 `#page-study`(+worker featured 獨立)→ 完整檔逐行 diff → Codex 互審(本檔=模式A;施工後=模式B code 三查)→ (Perth session 內 GitHub 授權後)Claude Code push main → Pages deploy → 機讀證回報 → Perth 真機掃 → 收官 bump(指紋/Live_Artifacts/E42翻🟢/Change_Log 三同步,待收官指令)。

## 10. Perth 微裁紀錄(TA 文案類)
- **A|一句引取句 — Perth §10-A 定案(2026-07-09):剝樣板開場取次句。** 規則封閉化(精確匹配樣板才剝、否則 fallback 字面首句);≤20 字截斷加「…」;零 AI 不變;附 28 篇實跑全表供審(§12)。→ 已納入 §2 層2。**gate 已清,計畫施工-ready。**

## 11. Codex 互審 round-1 裁決紀錄(14 條)
- 採納[BLOCKER] #2 featured 讀值:實查 Worker 用欄名取值 → 改以欄名 `featured`(非 field id);最小 diff=fields 陣列加一項(§1/§5)。
- 採納 #3 ⑤ 完整 gate:須 Worker deploy + featured=true 顯示實測,非僅隱藏態(§5/§7)。
- 採納 #4 分類籤 closed-set 白名單 + 野類不掛(§2 層1)。
- 採納 #5 導覽狀態機:replaceState/邊界 guard/單次 fetch 快取/層1 不 trap(§2)。
- 採納 #6 charset 納 pre-flight + ⑥ 機讀(§4)。
- 採納 #7 一句引 CSS 截斷、excerpt 逐字(§2 層2)。
- 採納 #9 引號嚴格同型配對(§3)。
- 採納 #10 body DOM createTextNode 重建、禁 innerHTML/禁 normalize(§2 層3)。
- 採納 #12 featured cap-3 依 payload 序(§2 層1)。
- 採納 #13 施工前鎖 main SHA、對固定基底 diff(§0)。
- 採納 #14 schema guard 降級(§4)。
- 部分/釋疑 #1:③「每篇古典原文≥1」對時節問候 8 篇天然不成立=**Perth 裁②既決**(不擋卡、列 backlog);③ 範圍=有卦引之 20 篇 20/20;非單方改驗收(§3)。
- 釋疑 #11 🎴 目的地:沿用現役 about 頁尾同式 `./index.html`(live 既有接受式),深路由屬範圍外(§2 層3)。
- ESCALATE #8:一句引取句 → 交 Perth(§10-A)。

## 12. 一句引實跑全表(28 篇 · Perth §10-A 供審 · 規則=剝樣板→次句→≤20+「…」)
| # | 分類 | 篇名 | 一句引 | 剝? |
|---|---|---|---|---|
| 1 | 節氣信 | 立秋〔D 遯〕 | 暑氣未退，節氣已先轉了。 | 剝 |
| 2 | 節氣信 | 秋分〔E 睽〕 | 秋分平分晝夜，也是結算的時節。 | 剝 |
| 3 | 節氣信 | 中秋〔B 同人〕 | 月到中秋分外圓。 | 剝 |
| 4 | 節氣信 | 夏至〔B 乾·上九〕 | 夏至，日最長、陽最盛，過了這天，白晝就一… | 剝 |
| 5 | 節氣信 | 春節〔A 既濟／未濟〕 | 一年將盡，既濟與未濟正好對著看：既濟是事… | 剝 |
| 6 | 節氣信 | 端午〔C 節〕 | 端午在仲夏之中，是個「節」字當令的時候。 | 剝 |
| 7 | 節氣信 | 冬至〔E 復〕 | 冬至，夜最長、陰最重，卻也正是一陽初生的… | 剝 |
| 8 | 節氣信 | 春分〔C 泰〕 | 春分晝夜均、寒暑平，是泰卦的氣象——「天… | 剝 |
| 9 | 節氣信 | 立冬〔D 坤〕 | 冬氣始藏，萬物收斂。 | 剝 |
| 10 | 節氣信 | 重陽〔D 漸／謙〕 | 重陽登高，是敬老、也是望遠的日子。 | 剝 |
| 11 | 節氣信 | 立春〔A 屯〕 | 春氣初動，萬物要發，卻還裹在土裡——這正… | 剝 |
| 12 | 節氣信 | 立夏〔A／D 乾·九三〕 | 夏氣方盛，萬物將全力鋪展。 | 剝 |
| 13 | 人際小文 | 交棒（蠱／漸） | 老樹擋了陽光，新苗就長不起來。 | 剝 |
| 14 | 人際小文 | 起爭執（訟） | 要起爭執前，先問自己：要的是「贏」，還是… | 剝 |
| 15 | 人際小文 | 拒絕也是尊重（節） | 會做事的人，常敗在不會拒絕。 | 剝 |
| 16 | 人際小文 | 識人（觀／履） | 看人，最怕看一時的熱絡。 | 剝 |
| 17 | 人際小文 | 合夥的分寸（同人／比） | 合夥這事，難在分寸——走太遠，界線糊了；… | 剝 |
| 18 | 人際小文 | 低姿態（謙） | 很多人把低姿態當輸。 | 剝 |
| 19 | 人際小文 | 人脈（井／比） | 人脈不是收集來的，是養出來的。 | 剝 |
| 20 | 人際小文 | 進退先學止（艮／漸） | 人最難的不是進，是知道在哪裡停。 | 剝 |
| 21 | 時節問候 | 立秋 | 暑氣還在，秋意已先動了。 | 剝 |
| 22 | 時節問候 | 立夏 | 夏天到了，白日漸長。 | 剝 |
| 23 | 時節問候 | 秋分 | 晝夜再次均平，風也涼了。 | 剝 |
| 24 | 時節問候 | 春分 | 晝夜剛好均了，寒暑也平。 | 剝 |
| 25 | 時節問候 | 夏至 | 今日白晝最長。 | 剝 |
| 26 | 時節問候 | 立春 | 春氣初動，土裡的事都在悄悄醒來。 | 剝 |
| 27 | 時節問候 | 冬至 | 今夜最長，過了這晚，白晝就一天天回來了。 | 剝 |
| 28 | 時節問候 | 立冬 | 冬天開始藏了。 | 剝 |

**剝樣板 28/28、fallback 0/28。** 時節問候 8 篇亦剝樣板取次句(它們亦以「老易在書房,寫於X。」開場),一句引正常;與 §3「時節問候無卦引」是兩軸(一句引=列表卡,古文引文卡=閱讀頁,互不影響)。

<!-- CODEX-REVIEW: APPROVED · r2 · 2026-07-09 · codex-cli 0.142.3 · 模式A · r1 提 14 條(10 BLOCKER/3 SUGGEST/1 ESCALATE)全裁決,r2 十條 BLOCKER 全撤回 · 無未決技術 BLOCKER · 唯 §10-A 一句引取句待 Perth 微裁(TA文案,非技術BLOCKER,為計畫自身施工前 gate) · logs: plans/review_logs/plan_e42_shufang_r1.txt, _r2.txt -->

