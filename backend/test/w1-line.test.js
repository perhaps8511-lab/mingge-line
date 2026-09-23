import test from 'node:test';
import assert from 'node:assert/strict';
import {letterMessage,createLinePush,ALT_TEXT} from '../src/w1/line.js';

const ORDER=['GZ','J5','J2','J3','J4','J1','J6','ZY','NEXT'];
const DISCLAIMER='卦象供你參考，決定仍在你手上；涉及醫療、法律、投資等專業事項，請另詢專業人士。';
const full=(len=20)=>({charge:1,sections:ORDER.filter(t=>t!=='GZ').map(tag=>({tag,text:`合成${tag}`+'文'.repeat(len)}))});
const texts=msg=>JSON.stringify(msg).match(/"text":"[^"]*"/g).map(s=>s.slice(8,-1));
const LIFF='https://liff.line.me/2011686320-a0IuCIix';

test('full letter renders the M17 card with staging links and no deep-read',()=>{
  const msg=letterMessage(full(),{benGua:'雷火豐',liffUrl:LIFF});
  assert.equal(msg.altText,ALT_TEXT);
  const b=msg.contents;
  assert.equal(b.type,'bubble');assert.equal(b.size,'mega');
  assert.equal(b.body.backgroundColor,'#2C3E2D');
  assert.equal(b.hero.url,'https://perhaps8511-lab.github.io/mingge-line/55.png');
  const t=texts(msg);
  // Section order preserved; footer sits between 贈言 and NEXT; signature last.
  const idx=tag=>t.findIndex(x=>x.startsWith(`合成${tag}`));
  const order=ORDER.filter(x=>x!=='GZ').map(idx);
  assert.deepEqual([...order].sort((a,b)=>a-b),order);
  assert.ok(idx('ZY')<t.indexOf('已收進「我的卦記」。')&&t.indexOf('已收進「我的卦記」。')<idx('NEXT'));
  assert.equal(t.at(-1),'善為易者不占 · 命格');
  assert.deepEqual(msg.quickReply.items.map(i=>[i.action.label,i.action.uri]),[['查看我的卦記',LIFF]]);
  const all=JSON.stringify(msg);
  for(const banned of ['深讀','2010192384',DISCLAIMER])assert.equal(all.includes(banned),false,banned);
});

test('GZ keeps gold styling and unknown hexagram omits hero without failing',()=>{
  const letter={charge:1,sections:[{tag:'GZ',text:'合成GZ'},...full().sections]};
  const msg=letterMessage(letter,{benGua:'不存在的卦',liffUrl:LIFF});
  assert.equal(msg.contents.hero,undefined);
  const gz=msg.contents.body.contents.find(c=>c.text==='合成GZ');
  assert.equal(gz.color,'#C9A84C');
});

test('long letter splits into same-styled bubbles without losing text',()=>{
  const letter=full(5000);
  const msg=letterMessage(letter,{benGua:'乾為天',liffUrl:LIFF});
  assert.equal(msg.contents.type,'carousel');
  const bubbles=msg.contents.contents;
  assert.ok(bubbles.length>1&&bubbles.length<=12);
  for(const b of bubbles){assert.equal(b.body.backgroundColor,'#2C3E2D');assert.ok(JSON.stringify(b).length<=24000);}
  assert.ok(bubbles[0].hero);assert.equal(bubbles.slice(1).some(b=>b.hero),false);
  const joined=texts(msg).join('');
  for(const s of letter.sections)assert.ok(joined.includes(s.text),s.tag);
  assert.equal(texts(msg).at(-1),'善為易者不占 · 命格');
});

test('safety and status messages stay plain with the whitelisted altText',()=>{
  for(const letter of [{charge:0,sections:[{tag:'SR',text:'合成安全回應 1925'}]},{sections:[{tag:'STATUS',text:'合成久候'}]}]){
    const msg=letterMessage(letter,{benGua:'雷火豐',liffUrl:LIFF});
    assert.equal(msg.altText,ALT_TEXT);
    assert.equal(msg.quickReply,undefined);
    assert.equal(JSON.stringify(msg).includes('#2C3E2D'),false);
    assert.equal(JSON.stringify(msg).includes('已收進'),false);
  }
});

test('push sends the card built from the stored record and staging LIFF id',async()=>{
  let sent;
  const push=createLinePush({token:'synthetic-token',liffId:'2011686320-a0IuCIix',fetchImpl:async(url,init)=>{sent=JSON.parse(init.body);return new Response('{}',{status:200});}});
  await push({subject:'U'+'0'.repeat(32),push_key:'00000000-0000-4000-8000-000000000000',input_json:{ben_gua:'雷火豐'},output_json:full()});
  assert.equal(sent.messages.length,1);
  assert.equal(sent.messages[0].contents.hero.url.endsWith('/55.png'),true);
  assert.equal(sent.messages[0].quickReply.items[0].action.uri,LIFF);
  const bad=createLinePush({token:'synthetic-token',liffId:'javascript:alert(1)',fetchImpl:async(url,init)=>{sent=JSON.parse(init.body);return new Response('{}',{status:200});}});
  await bad({subject:'U'+'0'.repeat(32),push_key:'00000000-0000-4000-8000-000000000001',input_json:{ben_gua:'雷火豐'},output_json:full()});
  assert.equal(sent.messages[0].quickReply,undefined);
});
