# MINGGE-SHOWCASE-005｜Claude Content QA 回件驗收 v1.0

> 驗收日期：2026-07-18（Asia/Taipei）
> 驗收者：Codex accountable execution agent
> Owner taste gate：PASS（Owner 回覆「沒有細看，但是風格是 OK 的」）
> 範圍：只驗收 005 Content QA 派工卡指定的五份回件；不做 Dify／Make／Airtable／LINE mutation。

## 1. 回件與完整性

| 回件 | SHA-256 | 結果 |
|---|---|---|
| `claude_batch_revision_rules_v1_0.md` | `f1968198783a80d074c7f681955358ce417d88a82fb0be4ba3290287f96712aa` | 收件完成 |
| `qa_report_mingge_showcase_005_samples_v1_0.md` | `b7c337cce43c141373356c9c2bae1aba3ea4acfd0531f705b7157808fc57a73b` | 收件完成 |
| `sample_A_kb2_31_reception_revised_v1_0.md` | `26ece940716289b26c0095eedea0e7120d34e272b3233bdc9df7d67ba5b76a4f` | 收件完成 |
| `sample_B_shufang_rumen_revised_v1_0.md` | `dddb3956bb1456939fda7404201cafa313ef27e68e96c6bdc0c0c89209e318f7` | 收件完成 |
| `sample_C_dg20_pi_revised_v1_0.md` | `52f670b30b3c5b59876b24ddc90cf18c63b52486504d3e8854583e2a4b25bd74` | 收件完成 |

原回件由 Owner 在本 session 提供；本 log 以檔名與 hash 鎖定，不把聊天附件誤標為 production 現役內容。

## 2. Accountable verdict

| 項目 | 裁定 | 理由／後續 |
|---|---|---|
| QA report | `ACCEPT-WITH-DELTA` | 找出的核心問題成立：宗教普遍判定、對他行當的概括、「卦沒有好壞」絕對句、歷史最高級、逆境安慰裸斷均應修正。真相源檔名需正規化，見第 4 節。 |
| Sample A／kb2-31 四題 | `REVISE-BOUNDED` | Q1、Q5 方向可接受；Q6 與 Q12 各留一個 production 邊界問題，且 Q12 回件自報超過 150 字。只做三項差分，不重寫全組。 |
| Sample B／ym-01 | `ACCEPT` | 「最老之一」、占與讀並存、稱謂「您」、邀請式遞話皆符合本輪 gate。 |
| Sample C／dg-20 否 | `ACCEPT` | 序卦引文補齊、希望錨回文本、V4 補「若」、V6 金句依既定口徑縮至 20 字。 |
| Batch rules R1–R10 | `ACCEPT-WITH-DELTA` | R1–R10 可作批次守門；須先把 Q6/Q12 差分反映進 R4／相關示例，並以可讀回來源取代目前不可重現的 JSON 檔名宣告。 |

本輪沒有 `BLOCKED-SOURCE`，但在三項差分關閉前，不得把 Sample A 或完整 batch 標成 production-ready，也不得開始 Dify ingestion。

## 3. 唯一必要 Content Delta

1. **Q6 邊界一致性**：把「不斷吉凶」改成「不替您下吉凶判決」或同等精確語意。產品會呈現卦辭的吉／凶與讀卦，不可對 TA 宣稱完全不談吉凶；真正邊界是不把吉凶當成對人的宿命判決、不許諾結果。
2. **Q12 拔除第二個絕對句**：`但那些字說的,從來是…` 仍用「從來是」替全部卦爻辭下普遍判定。須改成書房閱讀框或可守限定，例如「在書房，這些字要放回時位與走法來讀」；不得再用 `從來／一律／都是`。
3. **Q12 字數合規**：依 S165 spec 的既有計數口徑實算並回報 `100–150` 字；不得用 Owner taste approval 覆蓋硬規格。

差分只影響 `sample_A`、QA report 的最終 verdict／對應條目、以及 batch rules 的相關示例。Sample B、Sample C 不重寫。

## 4. 古典來源與 evidence 正規化

本輪正式讀回可重現的 Drive 正本是：

- `RAG_02_YiJing_64Gua_v1_2.md`
- `mingge_yaoci_table_for_airtable_v1_0.csv`

其中已找到本輪關鍵逐字：`天行健,君子以自強不息`、`無平不陂,無往不復`、`觀乎天文,以察時變`、`否之匪人`、`物不可以終否,故受之以同人`。

Claude 回件所稱三個 JSON 真相源，本輪在目前 Google Drive 檔名索引中無法重現。這不阻擋三份樣本，因上述逐字均已在可讀回正本中找到；但往後 QA 報告必須填入實際可讀回的 source name／version／定位，不得只寫無法重現的 JSON 名稱。

## 5. 對 005A 的影響

- Owner taste gate 已 PASS，不需 Owner 再逐份校稿。
- Sample B、C 與 batch rules 主方向已足夠讓 repository-only `MINGGE-SHOWCASE-005A` 開工。
- Sample A 的三項文字差分可平行回 Claude；在差分 PASS 前，不做 Dify 掛載或外部 mutation。
- 這份驗收不授權 Merge、Deploy、LINE mutation、quota 修改、付款或 production activation。
