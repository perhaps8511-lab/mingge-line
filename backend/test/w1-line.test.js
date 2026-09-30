import test from 'node:test';
import assert from 'node:assert/strict';
import {letterMessages,createLinePush,ALT_TEXT} from '../src/w1/line.js';

const ORDER=['GZ','J5','J2','J3','J4','J1','J6','ZY','NEXT'];
const DISCLAIMER='卦象供你參考，決定仍在你手上；涉及醫療、法律、投資等專業事項，請另詢專業人士。';
const full=(len=20,ch='文')=>({charge:1,sections:ORDER.filter(t=>t!=='GZ').map(tag=>({tag,text:`合成${tag}`+ch.repeat(len)}))});
const LIFF='https://liff.line.me/2011686320-a0IuCIix';
const utf8=value=>Buffer.byteLength(JSON.stringify(value),'utf8');
const bubblesOf=msg=>msg.contents.type==='carousel'?msg.contents.contents:[msg.contents];
const textsOf=msgs=>msgs.flatMap(m=>bubblesOf(m)).flatMap(b=>b.body.contents).filter(c=>c.type==='text').map(c=>c.text);
// Wire limits from LINE Messaging API (bubble 30 KB, carousel 50 KB, 12 bubbles, 5 messages per push).
function assertWireLimits(msgs) {
  assert.ok(msgs.length>=1&&msgs.length<=5);
  for(const m of msgs){
    assert.equal(m.altText,ALT_TEXT);
    assert.ok(utf8(m.contents)<=50000,'container bytes');
    assert.ok(bubblesOf(m).length<=12);
    for(const b of bubblesOf(m))assert.ok(utf8(b)<=30000,'bubble bytes');
  }
}
function assertLossless(msgs,letter) {
  const joined=textsOf(msgs).join('');
  let at=0;for(const s of letter.sections){const i=joined.indexOf(s.text,at);assert.ok(i>=at,s.tag);at=i+s.text.length;}
}

test('full letter renders one M17 card with staging links, no deep-read and M17 margins',()=>{
  const msgs=letterMessages(full(),{benGua:'雷火豐',liffUrl:LIFF});
  assert.equal(msgs.length,1);assertWireLimits(msgs);
  const [msg]=msgs,b=msg.contents;
  assert.equal(b.type,'bubble');assert.equal(b.size,'mega');
  assert.equal(b.body.backgroundColor,'#2C3E2D');
  assert.equal(b.hero.url,'https://perhaps8511-lab.github.io/mingge-line/55.png');
  const t=textsOf(msgs);
  const idx=tag=>t.findIndex(x=>x.startsWith(`合成${tag}`));
  const order=ORDER.filter(x=>x!=='GZ').map(idx);
  assert.deepEqual([...order].sort((a,b)=>a-b),order);
  assert.ok(idx('ZY')<t.indexOf('已收進「我的卦記」。')&&t.indexOf('已收進「我的卦記」。')<idx('NEXT'));
  assert.equal(t.at(-1),'善為易者不占 · 命格');
  const margin=tag=>b.body.contents.find(c=>c.text?.startsWith(`合成${tag}`)).margin;
  assert.deepEqual(['J5','J2','ZY','NEXT'].map(margin),['lg','md','lg','md']);
  assert.deepEqual(msg.quickReply.items.map(i=>[i.action.label,i.action.uri]),[['查看我的卦記',LIFF]]);
  const all=JSON.stringify(msgs);
  for(const banned of ['深讀','2010192384',DISCLAIMER])assert.equal(all.includes(banned),false,banned);
});

test('GZ keeps gold lg styling and unknown hexagram omits hero without failing',()=>{
  const letter={charge:1,sections:[{tag:'GZ',text:'合成GZ'},...full().sections]};
  const [msg]=letterMessages(letter,{benGua:'不存在的卦',liffUrl:LIFF});
  assert.equal(msg.contents.hero,undefined);
  const gz=msg.contents.body.contents.find(c=>c.text==='合成GZ');
  assert.equal(gz.color,'#C9A84C');assert.equal(gz.margin,'lg');
});

test('long Chinese and emoji letters split by UTF-8 bytes across messages without loss',()=>{
  // 3-byte CJK and 4-byte emoji: character counts understate wire size.
  for(const [len,ch] of [[5000,'文'],[3000,'🀄'],[1700,'文']]){
    const letter=full(len,ch);
    const msgs=letterMessages(letter,{benGua:'乾為天',liffUrl:LIFF});
    assertWireLimits(msgs);assertLossless(msgs,letter);
    const bubbles=msgs.flatMap(bubblesOf);
    assert.ok(bubbles[0].hero);assert.equal(bubbles.slice(1).some(b=>b.hero),false);
    assert.deepEqual(msgs.map(m=>!!m.quickReply),msgs.map((_,i)=>i===msgs.length-1));
    assert.equal(textsOf(msgs).at(-1),'善為易者不占 · 命格');
  }
  assert.ok(letterMessages(full(5000),{liffUrl:LIFF}).length>1,'5000-char fixture exceeds one 50 KB carousel');
});

test('bubble and carousel byte boundaries: just-fitting stays whole, beyond five messages fails loudly',()=>{
  // One 1800-char CJK chunk is ~5.4 KB: five fit a 30 KB bubble, a sixth does not.
  const five={charge:0,sections:Array.from({length:5},(_,i)=>({tag:'SR',text:String(i)+'文'.repeat(1799)}))};
  const m5=letterMessages(five);assertWireLimits(m5);assert.equal(m5.length,1);
  assert.equal(bubblesOf(m5[0]).length,1);
  const six={charge:0,sections:[...five.sections,{tag:'SR',text:'5'+'文'.repeat(1799)}]};
  const m6=letterMessages(six);assertWireLimits(m6);assert.equal(bubblesOf(m6[0]).length,2);assertLossless(m6,six);
  // ~5 messages x 50 KB is the ceiling; far beyond it must throw, never truncate.
  const huge={charge:0,sections:[{tag:'SR',text:'文'.repeat(120000)}]};
  assert.throws(()=>letterMessages(huge),/PUSH_PAYLOAD_TOO_LARGE/);
});

test('safety and status messages stay plain with the whitelisted altText',()=>{
  for(const letter of [{charge:0,sections:[{tag:'SR',text:'合成安全回應 1925'}]},{sections:[{tag:'STATUS',text:'合成久候'}]}]){
    const msgs=letterMessages(letter,{benGua:'雷火豐',liffUrl:LIFF});
    assertWireLimits(msgs);
    assert.equal(msgs.some(m=>m.quickReply),false);
    assert.equal(JSON.stringify(msgs).includes('#2C3E2D'),false);
    assert.equal(JSON.stringify(msgs).includes('已收進'),false);
  }
});

test('push sends all packed messages built from the stored record and staging LIFF id',async()=>{
  let sent;
  const fetchImpl=async(url,init)=>{sent=JSON.parse(init.body);return new Response('{}',{status:200});};
  const push=createLinePush({token:'synthetic-token',liffId:'2011686320-a0IuCIix',fetchImpl});
  await push({subject:'U'+'0'.repeat(32),push_key:'00000000-0000-4000-8000-000000000000',input_json:{ben_gua:'雷火豐'},output_json:full()});
  assert.equal(sent.messages.length,1);
  assert.equal(sent.messages[0].contents.hero.url.endsWith('/55.png'),true);
  assert.equal(sent.messages[0].quickReply.items[0].action.uri,LIFF);
  await push({subject:'U'+'0'.repeat(32),push_key:'00000000-0000-4000-8000-000000000002',input_json:{ben_gua:'雷火豐'},output_json:full(5000)});
  assert.ok(sent.messages.length>1&&sent.messages.length<=5);assertWireLimits(sent.messages);
  const bad=createLinePush({token:'synthetic-token',liffId:'javascript:alert(1)',fetchImpl});
  await bad({subject:'U'+'0'.repeat(32),push_key:'00000000-0000-4000-8000-000000000001',input_json:{ben_gua:'雷火豐'},output_json:full()});
  assert.equal(sent.messages[0].quickReply,undefined);
  const refused=createLinePush({token:'synthetic-token',liffId:'2011686320-a0IuCIix',fetchImpl:async()=>{throw new Error('must not send');}});
  await assert.rejects(refused({subject:'U'+'0'.repeat(32),push_key:'00000000-0000-4000-8000-000000000003',input_json:{},output_json:{charge:0,sections:[{tag:'SR',text:'文'.repeat(120000)}]}}),/LINE_DELIVERY_UNCONFIRMED/);
});
