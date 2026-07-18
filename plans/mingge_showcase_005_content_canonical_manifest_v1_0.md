# MINGGE-SHOWCASE-005｜Content Canonical Manifest v1.0

> 日期：2026-07-18
> 用途：在任何 Dify／Airtable／Rich Menu 寫入前，先消除「新舊混放」造成的平行版本。
> 原則：本表只標記，不刪檔；狀態不明即隔離，不自行猜測為 production-ready。

## 1. 狀態定義

- `CANONICAL-SOURCE`：目前唯一可作後續修改基底的版本。
- `CANDIDATE-QA`：最新版候選，但未過內容 QA／Owner 味道終審／回歸，不得掛 production。
- `SUPPORTING-SPEC`：規格或稽核證據，不作為 TA 內容直接上架。
- `SUPERSEDED`：已有較新版本；保留追溯但不得再匯入。
- `DUPLICATE`：內容 hash 相同；保留一份索引，不再製造第三份。
- `LIVE-VERIFY`：文件聲稱已上線，但外部現役版本需在 mutation 前讀回核對。

## 2. 會影響 Showcase 的正本

| 資產 | 指定正本／候選 | 狀態 | SHA-256／證據 | 後續處置 |
|---|---|---|---|---|
| Rich Menu 視覺 | `Mix_ Rich Menu v3 底圖 + richmenu_image_labeled.png` | `CANONICAL-SOURCE`（視覺基底，不可直接上傳） | `a150a1494af13fb2d30736898c3d31f28381ba9aa6e5c87e15136809036c7121`；1376×768；1,963,606 bytes | 只改第 5 格文字為「問老易」，壓到 `<900 KB`；輸出新檔，不覆寫原檔 |
| dg 聲線 | `001_spec_dg_voice_S165_v1_0.md` | `SUPPORTING-SPEC` | `03156179fd1b43f73071dbf25c242e3f3058bdcd8d8c529595c8b9ea0b2a2308` | V1–V6 保留；任何新 production prompt/spec 改用特質描述，不用在世作者姓名作模仿錨 |
| 老易迎新 KB | `001_product_kb2_31_reception_S166_v1_0.md` | `CANDIDATE-QA` | `89cb1b9201ca78ab21b6efc790b6aeae8e4380c1bd126c22849b17de9cbb9710` | Claude 正確性／邊界 QA → 21+15 回歸全過才可掛 Dify |
| 讀卦隨筆 batch3 | `001_product_shufang_dugua_batch3_S166_v1_0.md` | `CANDIDATE-QA` | `6a97134e3df27490af0553d78748c4c291a9cf0b00fb8d7ff205b1ad81149f62` | 取代 S165 batch3；先做三篇代表樣本 QA，再決定整批 |
| 讀卦隨筆 batch1 潤飾 | `001_product_shufang_dugua_polish_b1_S166_v1_0.md` | `CANDIDATE-QA` | 本地附件存在 | 未經 Owner 味道終審，不覆寫 Airtable 既有 record |
| 書房入門 batch1 | `001_product_shufang_rumen_batch1_S165_v1_0.md` | `CANDIDATE-QA` | 本地附件存在 | 選一篇代表樣本做正確性／聲線 QA，再決定批次 |
| 書房既有 live 內容 | Airtable `ShufangContent` 中 `qc_passed=1` | `LIVE-VERIFY` | Worker `GET /study` 只回傳 `{qc_passed}=1` | Showcase 只讀此集合；不把本地候選視為已上線 |
| 老易說易現役 KB／app | 文件稱現役 29→30 篇、既有 21-case PASS | `LIVE-VERIFY` | `001_report_kb_census_S164_v1_0.md` | 掛 `kb2-31` 前讀回 dataset 名稱、現役版本與文件清單 |

### 2.1 Claude Content QA 回件裁定（2026-07-18）

| 回件資產 | 狀態 | Accountable 處置 |
|---|---|---|
| `sample_B_shufang_rumen_revised_v1_0.md` | `CANDIDATE-QA-ACCEPTED` | 代表樣本內容與 Owner taste gate 均通過；尚未上架 |
| `sample_C_dg20_pi_revised_v1_0.md` | `CANDIDATE-QA-ACCEPTED` | 代表樣本內容與 Owner taste gate 均通過；尚未上架 |
| `sample_A_kb2_31_reception_revised_v1_0.md` | `CANDIDATE-QA-DELTA` | Q6／Q12 三項 bounded delta；v1.1 通過前不得 ingestion |
| `claude_batch_revision_rules_v1_0.md` | `SUPPORTING-SPEC-DELTA` | R1–R10 主方向接受；待 v1.1 同步邊界與可重現 evidence |
| `qa_report_mingge_showcase_005_samples_v1_0.md` | `SUPPORTING-EVIDENCE-DELTA` | 核心診斷接受；待 v1.1 封口 Sample A verdict |

正式驗收與 exact hashes：`plans/review_logs/mingge_showcase_005_claude_content_qa_return_v1_0.md`。
最小差分卡：`plans/dispatch/mingge_showcase_005_claude_content_qa_delta_v1_0.md`。

## 3. 明確新舊關係

| 舊檔 | 狀態 | 取代／用途 |
|---|---|---|
| `001_product_shufang_dugua_batch3_S165_v1_0.md` | `SUPERSEDED` | 由 S166 batch3 取代；不得再匯入 |
| `001_rag_kb2_reception_S165_v1_0.md` | `SUPERSEDED`（成品層） | 保留作推導紀錄；TA 成品以 S166 `product_kb2_31` 為候選 |
| `001_spec_kb2_reception_S165_v1_0.md` | `SUPPORTING-SPEC` | 檢查 S166 成品是否符合接待規格，不直接掛 Dify |
| `001_cuiqu_kbcensus_dgpivot_S164_v1_0.md` | `DUPLICATE` | 與檔名帶 `(1)` 版本 SHA-256 同為 `0422e135...e6e6`；只保留一筆索引 |
| `001_product_shufang_dugua_batch1_S163_v1_0.md` | `SUPERSEDED`（聲線層） | 內容骨架可追溯；若 S166 polish 過關，以 polish 版作後續候選 |
| `001_product_shufang_dugua_batch2_S164_v1_0.md` | `CANDIDATE-QA` | 尚需聲線潤飾／Owner QC；不可因 closeout 標「已交付」就視為 live |
| `001_report_kb_census_S164_v1_0.md` | `SUPPORTING-SPEC`（歷史盤點） | 只用其中會影響現階段的證據；不可把 S164 狀態直接當 7/18 live truth |
| `001_closeout_kbcensus_dgbatch2_S164_v1_0.md` | `SUPPORTING-SPEC` | 正式證明格 5「問老易」架構曾由 Owner 拍板、但尚未接前端 |

## 4. Production ingestion gate

任何內容寫入 Dify 或 Airtable 前，必須依序滿足：

1. 檔名、版本與 SHA-256 對上本表；同 content_id 不得有兩個候選同時進場。
2. Claude 完成逐字古典引用、歸屬、斷言強度、宗教／商業／吉凶邊界與聲線 QA。
3. Owner 只審三個代表樣本的味道；未通過前不做整批改寫或匯入。
4. 書房內容寫入 Airtable 後仍維持 `qc_passed=false`；正式抽驗通過才逐筆勾選。
5. 老易 KB 掛載後，既有 21-case 與接待組 15-case 必須全 PASS。
6. 寫入後讀回 production item 清單與版本；Drive 檔案存在不等於 TA 可達。

## 5. 本輪不處理

- 複盤 KB、紫微 RAG、小象傳／文言傳／雜卦傳，不納入 7/20 Showcase 收口。
- 不清理或刪除 Drive 舊檔；等 soft launch 收口後另開 File Governance slice。
- 不自行認定 Dify、Make、Airtable 現役版本；外部 mutation 前只做一次 bounded read-back。
