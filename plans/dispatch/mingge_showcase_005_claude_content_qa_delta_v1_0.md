# MINGGE-SHOWCASE-005｜Claude Content QA 最小差分卡 v1.0

> 目的：關閉五份回件中僅存的 production 邊界；禁止重寫已接受的 Sample B／C，禁止展開完整 batch。
> 依據：`plans/review_logs/mingge_showcase_005_claude_content_qa_return_v1_0.md`

## Claude 只需做三件事

1. 在 Sample A Q6，將「不斷吉凶」修成「不替您下吉凶判決」或同等精確語意；保留「不許諾什麼」與決定權在 TA 手上。
2. 在 Sample A Q12，移除 `從來是` 這個普遍斷言，改成書房的閱讀框或可守限定；不得用 `從來／一律／都是` 替全部卦爻辭背書。
3. 讓 Q12 依原 S165 spec 的既有計數口徑落在 `100–150` 字，並在回件明列實算值。

## 同步但不得擴寫

- 更新 QA report：Sample A 最終 verdict 與對應條目必須反映上述差分。
- 更新 batch rules：R4／相關示例不得再把尚未合規的 Q12 句子當唯一主錨；Q6 邊界統一為「不替人下吉凶判決」，而不是宣稱產品不談吉凶。
- Evidence source 改列可重現的 `RAG_02_YiJing_64Gua_v1_2.md`／`mingge_yaoci_table_for_airtable_v1_0.csv`，或提供三個 JSON 的實際 Drive file ID 與 version。不得只列檔名。

## 不得改

- Sample B、Sample C 全文。
- Q1、Q5 已接受方向；除非為修正明顯錯字，不重寫。
- 產品價格、額度、routing、Dify／Make／Airtable／LINE 設定。
- 不啟動完整 batch rewrite。

## 回件（只要三份）

1. `sample_A_kb2_31_reception_revised_v1_1.md`
2. `qa_report_mingge_showcase_005_samples_v1_1.md`
3. `claude_batch_revision_rules_v1_1.md`

回件末尾附 change log，逐項對應 Delta 1–3；若來源無法讀回，標 `BLOCKED-SOURCE`，不得猜寫。
