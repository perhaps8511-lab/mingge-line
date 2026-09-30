export const copy=Object.freeze({
 disclaimer:'卦象供你參考，決定仍在你手上；涉及醫療、法律、投資等專業事項，請另詢專業人士。',
 privacy:'卦記不公開；查看時會確認是你的帳號。',
 beforeLogin:'接下來 LINE 會請你確認一次身分，這是為了讓卦記只有你看得到。',
 question:'這次想問哪一件事？用自己的話寫就好。',
 saved:'已送出 · 老易解卦中',
 leave:'信箋會送到 LINE 聊天室，這一頁可以先關掉。',
 slow:'這封信比平常久一些。你可以先離開，稍後到「我的卦記」查看進度，不用再擲一次。',
 unknown:'目前無法確認是否已保存。請先保留本頁內容，稍後再查一次。',
 pushUnknown:'信箋已收進「我的卦記」，但目前無法確認是否送達聊天室。請點下方查看，不用重新問卦。',
 inbox:'你有一封信箋在卦記裡。',
 guidance:'這次還沒有正式解卦，不計入問卦次數。',
 boundary:'本次未進行解卦，不計入問卦次數。',
 unavailablePayment:'目前尚未開放付費使用。',
 // Owner bounded adoption, 2026-09-21: no W2 replay promise.
 failure:'這次沒能完成信箋，抱歉讓你等了。這是服務出了問題，和卦象的吉凶無關。這次不計入問卦次數。',
});
export function letterView(record) {
 const letter=record.letter;
 return {sections:letter?.sections??[],disclaimer:letter?.charge===1?copy.disclaimer:null,
   notice:copy[letter?.notice]??null,replay:false,repush:record.state==='completed'&&['unknown','failed'].includes(record.push_state)};
}
export function legacyLetterView(raw) {
 // Read-through is display-only: parse in memory, never persist or change text.
 let text=typeof raw==='string'?raw:'';
 try {const value=JSON.parse(text);if(typeof value==='string')text=value;
   else if(typeof value?.text==='string')text=value.text;
   else if(typeof value?.answer==='string')text=value.answer;
 } catch {}
 const full=[1,2,3,4,5,6].every(i=>text.includes(`[[J${i}]]`));
 return {text,disclaimer:full?copy.disclaimer:null};
}
