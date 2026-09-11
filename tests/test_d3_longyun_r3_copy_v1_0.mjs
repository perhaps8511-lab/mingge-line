// D3 r3｜龍宮舍利公開頁與隨貨啟用卡 exact copy 逐字驗證
// Ref: 00B_taskcard/MINGGE_CLAUDE_CODE_DISPATCH_CARD_D3_r3_20260911.md
//      00D_spec/mingge_d3_final_r3_20260911/{02,03,04}_*.md（copy_of_record）
// 範圍：純字串比對（沿本 repo tests/ 慣例，不引入新的瀏覽器自動化依賴）。
// 互動狀態機、380px/200% 視覺回歸另以 Browser pane 人工核對，證據見交付報告。
import { readFileSync } from 'node:fs';
let pass = 0, fail = 0;
const check = (c, id, d) => { console.log(`${c ? '[PASS]' : '[FAIL]'} ${id} ${d}`); c ? pass++ : fail++; };

const longyunJs = readFileSync(new URL('../assets/longyun.js', import.meta.url), 'utf8');
const journeyJs = readFileSync(new URL('../assets/longyun-journey.js', import.meta.url), 'utf8');
const indexHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const cardHtml  = readFileSync(new URL('../activation-card-preview.html', import.meta.url), 'utf8');

// D1-B/D2-B（Owner 2026-09-11）
check(longyunJs.includes('先看清一件收藏，再決定要不要留下。'), 'D2-B-1', 'longyun.js 首摺 H1 用「一件收藏」');
check(!longyunJs.includes('先看清一件物'), 'D2-B-2', 'longyun.js 不含舊「先看清一件物」（「同一件物件」為 doc03 §4 exact copy 的合法巧合子字串，不誤判）');
check(indexHtml.includes('先看清一件收藏，再決定要不要留下。') && !indexHtml.includes('先看清一件物'), 'D2-B-3', 'index.html 龍運藏入口同步 D2-B');
check(longyunJs.includes('合作方（共同來源主體）') && longyunJs.includes('待核'), 'D1-B-1', 'longyun.js 來源聲明卡含 D1-B 共同來源主體待核框架');

// R1-S00 五態（doc04 §B exact copy）
check(journeyJs.includes('這一卦在您的方案期間內，不另計費。'), 'R1S00-period', 'period_active exact');
check(journeyJs.includes('您有一次可用的問卦。'), 'R1S00-single', 'single_available exact');
check(journeyJs.includes('這一卦不收費。這是最後一次不收費的問卦。'), 'R1S00-free-n1', 'free_verified n=1 exact');
check(journeyJs.includes('要問這一卦，先選一個方案。'), 'R1S00-none', 'none exact');
check(journeyJs.includes('目前無法確認您的資格，不代表沒有。'), 'R1S00-error', 'read_error exact');
check(!/journeyJs/.test('') && !journeyJs.includes('額度用完') && !journeyJs.includes('用完'), 'R1S00-forbid', '五態文案不含「用完」等禁詞');

// R6-LY-00/01/02（doc03 §11 exact copy）
check(journeyJs.includes('這件實品附有一段命格的使用時間。'), 'R6LY00', 'R6-LY-00 標題 exact');
check(journeyJs.includes('要現在開始您的藏主時間嗎？'), 'R6LY01', 'R6-LY-01 標題 exact');
check(journeyJs.includes('藏主時間已開始。'), 'R6LY02-active', 'R6-LY-02 active exact');
check(journeyJs.includes('好。想啟用的時候，從「書僮客服」進來就可以。'), 'R6LY02-deferred', 'R6-LY-02 deferred exact');
check(journeyJs.includes('好的，這份權益不會啟用。實品和訂單不受影響。'), 'R6LY02-declined', 'R6-LY-02 declined exact');
check(journeyJs.includes('目前還無法確認啟用結果，請再查一次。'), 'R6LY02-pending', 'R6-LY-02 pending/read_error exact');

// §9 LP-S07 = Offer Copy Master v1.0 §3 逐字（不得改寫、不得加新數字）
check(journeyJs.includes('三個月、半年、兩年，每一個有效月都有相同的藏主權益。差別只有陪伴多久，不是每個月拿到不同次數。'), 'LPS07-1', '共同主文案句1 exact');
check(journeyJs.includes('<strong>三個月藏主</strong> — 適用於 NT$3,000–5,999 的龍宮舍利'), 'LPS07-2', '三個月藏主 exact');
check(journeyJs.includes('<strong>半年藏主</strong> — 適用於 NT$6,000–14,999 的龍宮舍利'), 'LPS07-3', '半年藏主 exact');
check(journeyJs.includes('<strong>兩年藏主</strong> — 適用於 NT$15,000 以上的龍宮舍利'), 'LPS07-4', '兩年藏主 exact');
check(journeyJs.includes('如果您已經在使用命格半年方案，可以等現有方案結束後再啟用藏主權益。'), 'LPS07-5', '已有半年方案時 exact');

// R3-S02 方案頁（doc04 §A exact copy）
check(longyunJs.includes('這次，您想怎麼繼續？'), 'R3S02-title', 'R3-S02 標題 exact');
check(longyunJs.includes('針對一件新的事，完成一次正式起卦與解讀。'), 'R3S02-149', '149 方案 exact');
check(longyunJs.includes('把同一卦看深｜NT$200'), 'R3S02-200', '200 方案 exact');
check(longyunJs.includes('把幾段經歷放在一起看｜NT$399'), 'R3S02-399', '399 方案 exact');
check(longyunJs.includes('六個月命格方案｜NT$1,490'), 'R3S02-1490', '1490 方案 exact');
check(longyunJs.includes('付款功能尚未開放。'), 'R3S02-blocked', 'blocked checkout exact copy 存在');

// §13 FAQ 十題（doc03 exact questions）
const faqQuestions = ['龍宮舍利到底是什麼材質？','來源聲明卡是鑑定證書嗎？','為什麼收藏有限？','一定要先問卦或加入 LINE 才能買嗎？','買了就會改運或更健康嗎？','付款後藏主時間就開始嗎？','我買來送人，可以替對方啟用嗎？','啟用後能用什麼？','尺寸怎麼選？','可以退換嗎？'];
check(faqQuestions.every(q => longyunJs.includes(q)), 'FAQ-10', '§13 十題 FAQ 問題逐字皆在位');
check(longyunJs.includes('先不買也沒關係。您的命格卦記、方案與既有權益不受影響。'), 'SAFEEXIT', '安全退出句 exact');

// 隨貨啟用卡數位稿
check(cardHtml.includes('有人為您留下了一件收藏。') && cardHtml.includes('您留下了一件收藏。'), 'CARD-copy', 'gift/self 首句 exact 皆在位');
check(cardHtml.includes('[PLACEHOLDER:ACTIVATION_URL]'), 'CARD-qr', 'QR 為 placeholder，非真實連結');
check(!/https?:\/\/(?!localhost)/i.test(cardHtml.replace(/rel="noopener"|type="[^"]*"/g,'')), 'CARD-no-external', '卡片無外部連結');

// 金流零變更（靜態掃描）
for (const f of [longyunJs, journeyJs, cardHtml]) {
  check(!/Payment_Orders/i.test(f), 'NO-PAYMENT-ORDERS', 'Payment_Orders 不出現於本輪新增/修改檔');
  check(!/fetch\s*\(/.test(f), 'NO-FETCH', '本輪新增/修改檔零 network fetch（inert candidate 維持）');
}

console.log(`PASS=${pass} FAIL=${fail}`);
process.exit(fail === 0 ? 0 : 1);
