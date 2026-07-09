# plan_ge3_copy_S159_v0_1 — 格3「書房的來法」五卡改版(E30+E46 前端字面)

> 施工卡:`001_taskcard_ge3_copy_S159_v1_0.md`(Drive 檔 ID `1eS1kHNsZUX2C4eBtBNl6w4hN-0Ewi07k`)
> 文字真相源:`001_spec_ge3_copy_S159_v1_0.md`(Drive 檔 ID `1YlYyU4qydeBHpGlpiMEGjijji1W66__d`)
> 基礎檔:`curl` GitHub raw `perhaps8511-lab/mingge-line` main `index.html`(現役 v1.5.0,blob sha1 `0b7ed0c7`)。工作樹已 pin 此 blob(autocrlf=false,LF),禁本機/上傳副本。

## 0. 溯源與位元組認證(逐字取的前提)

- 卡/spec 由 Google Drive MCP 直取(桌面同步尚未跟上,本機 `D:\CBD_Lab_OS` 查無)。
- `read_file_content` 會跳脫 markdown 特殊字元且亂碼化 emoji,**非逐位元**;故 spec TA 文案改用 `download_file_content` 的 raw base64 解碼,並以 **byte-count + anchor + strict-UTF8** 自證。§一/§二 全部位元組認證,唯一破損(line41 `、` 壞成 `#\xef\xbf\xbd`)已依平行結構「十四天之內、未起過卦」+ read_file_content 交叉確認修回 `、`(U+3001)。認證副本 = `scratchpad/spec_ta_canonical.md`。
- **house-style 已定明(逐字必守)**:半形 `,` `;` `:` `(` `)` `|`;全形 `。` `、` `「」` `〔〕` `·`(U+00B7) `——`(U+2014×2)。破折號前後空格依處而異(§二深卜段「幾面 —— 四鏡」有空格;1490 段「複盤——這」無空格;§一 zero/deepdive/fupan「讀——深卜」無空格),**逐處照抄**。

## 1. 目標

S158 Perth 拍板訂閱制甲案(1490「決策的後半段」)+乙案(銅錢包 399/三枚)。本卡把格3「書房的來法」由三卡改為五卡直列,加進場語境行(?src)與退費二軌段,**純前端字面改版**,為 OEN 金流(E46/E18/E26)備妥門面。獨立 commit,禁與卡C 或任何其他改動混卡。

## 2. 現況定位(live v1.5.0)

- 格3 =「書房的來法」= `#page-pay`(E12 · action=pay),`index.html` **L533–564**。(格4 `#page-study`=E42,**不碰**。)
- 現況:T7 三卡直列(初訪/問一卦149/四鏡深卜200)+ `p.pay-note`(付款句 / 退費「14 天內全退」/ 收尾句)。
- CSS:`.pay-plan`(金框)、`.pay-plan h3`、`.pay-plan p`、`.pc-status`、`.pc-ok`、`.pay-note`、`.lp-sub`。
- Router:`?action=pay` → 顯示 `#page-pay` → `initPayPage()`(L814,async;內含 LIFF init + `/subscription` 後端查詢)。
- 無既有 `src` 參數解析(乾淨新增)。

## 3. 施工白名單(五處 hunk,全屬格3 範圍或版本字串)

| # | 位置 | 動作 |
|---|---|---|
| H1 | L6 `<title>` | v1.5.0 → v1.5.1 |
| H2 | 樣式區 `.pc-ok`(L408)後 | 新增 `.pay-ctx` 規則(用既有 `--jade` token) |
| H3 | `#page-pay` 區塊(L533–564) | 整塊替換為五卡結構 |
| H4 | `initPayPage()`(L814 頂、liff.init 之前) | 注入 ?src 語境行(純前端,無後端呼叫) |
| H5 | footer 指紋(L652) | v1.5.0 → v1.5.1「進場儀式 v1.5.1(E30/E46 書房的來法五卡)」 |

## 4. 五卡結構與逐字來源對映(TA 文案全部逐字取 spec §二,builder 從 `spec_ta_canonical.md` 生成,不手打)

順序(卡 §二.1):初訪(免費)→ 問一卦|149 → 囊中銅錢|399(新)→ 四鏡·深卜 200(附記)→ 問道·複盤|1490(新)。

- 每卡 = `.pay-plan` > `<p class="pl-copy">…</p>` + `<div class="pc-status[.pc-ok]">…</div>`。
- spec §二 每卡寫成「**卡名** — 內文」單句;`**…**` → `<strong>`,「 — 」保留為字面。故卡名由 live 的 `<h3>` 區塊改為 **行內粗體**(沿用 `.pay-plan` class 與既有 `p strong` 粗體;prose 逐位元 = spec)。深卜卡 spec 以「〔讀完…走〕…**四鏡·深卜 200**…」附記式書寫,粗體居中句,無獨立標題 = 卡明列「附記樣式沿 T7」。
- **pc-status 沿現行 live,零新寫承諾語**(卡§二.1 + spec 付款按鈕態):
  - 初訪 → 沿用現行 `pc-ok`「您的 3 枚銅錢已在囊中 —— 到〔向天問卦〕便可用。」
  - 問一卦149 / 囊中銅錢399 / 四鏡深卜200 / 問道複盤1490 → 沿用現行「付款通道整備中;銅錢尚在,不急。」
  - 此二狀態字串由 builder 從舊 `#page-pay` **抽取沿用**(byte-exact),不手打、不新寫。399/1490 為新卡,依卡「不做假按鈕/不做假灰鈕,沿 T7 誠實整備態」。
- 開場句(lp-sub)、付款句、退費段、收尾句:逐字取 spec §二(退費段 = 二軌替換,舊「14 天內全退」全格 0 殘留)。

## 5. 進場語境行(?src)

- DOM:`<div class="pay-ctx" id="payCtx" hidden>` 置於 `.lp-header` 內、`.lp-sub` 之後(spec§一「顯示於頁面標題下方一行」)。
- JS(`initPayPage()` 最頂,liff.init 前):`URLSearchParams(location.search).get('src')` → map `{zero,deepdive,fupan}` 三態(字串逐字取 spec §一)→ `textContent` + `hidden=false`;無參數/未知值 → 保持 hidden。**純前端,零後端呼叫**;放在 liff 前確保 LIFF/網路失敗仍顯示。

## 6. 版本三同步

- L6 title:`命格 · 進場儀式 v1.5.1`
- L652 footer:`善為易者不占 · 介面謙卑於源頭 · 進場儀式 v1.5.1(E30/E46 書房的來法五卡)`
- Live_Artifacts 版本欄:回報時提示 chat 收口(本卡不動 Airtable)。

## 7. 紅線遵守(碰到=停手 ESCALATED)

- 凍結區零觸碰:起卦演算法/gua_result/qigua_time(+08:00)/六格結構與格名/Dify prompt/儀式五屏/信箋/`#page-study`/router `pageMap`。
- 全站禁字(格3 內):解鎖/限時/倒數/折扣/優惠/349/補差/加收;任何算術句(均價等)。→ V5 掃描。
  - **例外(codex r1 BLOCKER 修)**:promotional「限時」為禁;但 canonical 收尾句「不催您、不限時、不打折」是**反促銷語**且 spec 明文逐字。V5 特判:先剝掉 byte-verified 收尾句再掃禁字(→0),並**另行單獨驗收尾句逐位元 = spec**。即「不限時」為唯一許可的「限時」出現,且必嵌於認證收尾句內。
- 不接 OEN URL、不碰 Worker/Make/key。
- diff hunk 全落白名單(H1–H5);範圍外任何變動=攔下。→ V7。

## 8. ⚠️ ESCALATED 爭點(交 Perth 真機拍板,不私自和稀泥)

依你「逐字照 spec,一字不改」指令,以 spec §二 為準逐位元照貼。與 live v1.5.0 的凍結段比對(NFKC 分類)結果:
- 開場/初訪/問一卦149/收尾 = **純標點寬度**(全形→半形逗號等)+ 呈現(h3→行內)差異,無增刪字。
- 深卜段 = 格式差異(加〔〕、—— 空格),無增刪字。
- **付款句:live「點上方連結」→ spec「點下方連結」= 唯一實質改字(方向字)**。隨新版面把付款連結移到卡片下方,spec body 明寫「下方」。惟 spec §二對照表把付款句標為「🔒凍結零字改」,body 卻改了方向字 → 對照表 label 與 body 內在不一致。
- 判斷:spec body = 唯一文字真相源,照貼「下方」;但此點列為 ESCALATED。**依 codex r1 §5,不等真機**:此爭點寫入 commit message + 回報 §8 明列,施工前即定案(照 spec=下方),交 Perth 覆核時只需確認/否決一字。若 Perth 裁「上方」,一字回改即可。
- 另(codex r1 §3)1490 卡 pc-status 沿用「付款通道整備中;銅錢尚在,不急。」語義非最佳(1490=訂閱非銅錢),但受「不新寫承諾語」紅線約束,施工時不得現寫新狀態;若要語義更精準須回 spec/卡補 canonical status,不在本卡。暫收並於回報註記。

## 9. 封閉驗收集(V1–V8,headless-first)

| # | 驗收 | 方法 |
|---|---|---|
| V1 | 五卡順序與文案 = spec §二 逐位元(含標點寬度) | 解析新 `#page-pay`,抽 **h1 + lp-sub + pl-copy + pay-note** 文字流,還原 strong/br 後 byte-diff spec §二(codex r1 §6) |
| V2 | 凍結段對 live 差異如實揭露 | NFKC 分類報告(寬度/格式 vs 動詞);唯一動詞改 = 付款句上→下(§8) |
| V3 | 舊「14 天內全退」殘留 = 0;新二軌句在位 | grep 全檔 |
| V4 | ?src **五**情境各正確 | headless(node)DOM 斷言:zero/deepdive/fupan **各顯示對應句**、無參數 hidden、**unknown(如 `?src=xxx`)hidden**(codex r1 §4) |
| V5 | 禁字掃描 0 命中(限時例外見 §7) | 剝掉認證收尾句後 grep 格3 禁字→0;另單獨驗收尾句逐位元=spec |
| V6 | v1.5.1 三處指紋(title/footer;Live_Artifacts chat 收口) | grep + 回報提示 |
| V7 | diff hunk 全落白名單(H1–H5)+凍結區未動 | `git diff` 逐 hunk 審行號/內容;**硬檢 diff 未觸 `#page-study`/router `pageMap`/起卦/Dify/儀式五屏**(codex r1 §2) |
| V8 | Pages deploy success + live raw 逐位元 = main | **需 Perth deploy 放行後** push→Pages→curl live vs raw hash |

- V8 需 push 到 live production repo → 觸發 Pages 部署(對外、不可逆)。卡明定「Perth 只做 deploy 放行」。故:本卡完成 build+commit+V1–V7+V8 本地預檢後,**停在 push 邊界,請 Perth 放行**再收 V8。

## 10. diff 預期

5 個 hunk:H1(title 1 行)、H2(CSS 新增 1 行)、H3(#page-pay 整塊)、H4(initPayPage 頂注入 ~4 行)、H5(footer 1 行)。全格3/版本字串。

<!-- CODEX-REVIEW: APPROVED · 模式A r2 · 0 BLOCKER · r1 BLOCKER(V5 限時/不限時)已修 · 5 SUGGEST 全納入 · log: plans/review_logs/plan_ge3_copy_S159_r1.txt,r2.txt -->
