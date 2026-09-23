export const ALT_TEXT='老易的信箋到了。';
// King Wen order from repo gua_index_map_v1_0.csv; used only to pick the public hexagram image.
const GUA_NO=Object.freeze({"乾為天":1,"坤為地":2,"水雷屯":3,"山水蒙":4,"水天需":5,"天水訟":6,"地水師":7,"水地比":8,"風天小畜":9,"天澤履":10,"地天泰":11,"天地否":12,"天火同人":13,"火天大有":14,"地山謙":15,"雷地豫":16,"澤雷隨":17,"山風蠱":18,"地澤臨":19,"風地觀":20,"火雷噬嗑":21,"山火賁":22,"山地剝":23,"地雷復":24,"天雷無妄":25,"山天大畜":26,"山雷頤":27,"澤風大過":28,"坎為水":29,"離為火":30,"澤山咸":31,"雷風恆":32,"天山遯":33,"雷天大壯":34,"火地晉":35,"地火明夷":36,"風火家人":37,"火澤睽":38,"水山蹇":39,"雷水解":40,"山澤損":41,"風雷益":42,"澤天夬":43,"天風姤":44,"澤地萃":45,"地風升":46,"澤水困":47,"水風井":48,"澤火革":49,"火風鼎":50,"震為雷":51,"艮為山":52,"風山漸":53,"雷澤歸妹":54,"雷火豐":55,"火山旅":56,"巽為風":57,"兌為澤":58,"風水渙":59,"水澤節":60,"風澤中孚":61,"雷山小過":62,"水火既濟":63,"火水未濟":64});
// M17 letter card (Make 5202754, adopted plan v5 §2.12): keep design, footer, signature and
// 〔查看我的卦記〕; drop the 深讀 line/button. Only full letters use it; SR/STATUS stay plain.
const GOLD='#C9A84C',CREAM='#F5F1E8',SAGE='#A8B5A0',GREEN='#2C3E2D';
const FOOTER='已收進「我的卦記」。',SIGNATURE='善為易者不占 · 命格';
// LINE Flex wire limits, measured as serialized UTF-8 bytes (decimal KB, the stricter reading):
// bubble 30 KB, carousel 50 KB and 12 bubbles; one push request carries at most 5 messages.
const BUBBLE_MAX_BYTES=30000,CONTAINER_MAX_BYTES=50000,MAX_BUBBLES=12,MAX_MESSAGES=5;
const bytes=value=>Buffer.byteLength(JSON.stringify(value),'utf8');
const chunk=text=>{const chars=Array.from(text),out=[];for(let i=0;i<chars.length;i+=1800)out.push(chars.slice(i,i+1800).join(''));return out;};
const tooLarge=()=>new Error('PUSH_PAYLOAD_TOO_LARGE');
// Lossless packing: items fill bubbles, bubbles fill carousels, carousels become separate
// messages. Text is never truncated or reordered; anything beyond LINE limits fails loudly.
function pack(items,makeBubble,{liffUrl}={}) {
  const bubbles=[];let current=[];
  for(const item of items){
    if(current.length&&bytes(makeBubble([...current,item],!bubbles.length))>BUBBLE_MAX_BYTES){bubbles.push(makeBubble(current,!bubbles.length));current=[];}
    current.push(item);
    if(bytes(makeBubble(current,!bubbles.length))>BUBBLE_MAX_BYTES)throw tooLarge();
  }
  bubbles.push(makeBubble(current,!bubbles.length));
  const container=list=>list.length===1?list[0]:{type:'carousel',contents:list};
  const groups=[];let group=[];
  for(const bubble of bubbles){
    if(group.length&&(group.length>=MAX_BUBBLES||bytes(container([...group,bubble]))>CONTAINER_MAX_BYTES)){groups.push(group);group=[];}
    group.push(bubble);
  }
  groups.push(group);
  if(groups.length>MAX_MESSAGES||groups.some(g=>bytes(container(g))>CONTAINER_MAX_BYTES))throw tooLarge();
  // LINE shows the quick reply of the last message only.
  return groups.map((g,i)=>({type:'flex',altText:ALT_TEXT,contents:container(g),
    ...(liffUrl&&i===groups.length-1?{quickReply:{items:[{type:'action',action:{type:'uri',label:'查看我的卦記',uri:liffUrl}}]}}:{})}));
}
function plainMessages(letter) {
  const items=letter.sections.flatMap(s=>chunk(s.text)).map(text=>({type:'text',text,wrap:true,size:'md'}));
  return pack(items,contents=>({type:'bubble',body:{type:'box',layout:'vertical',contents}}));
}
// M17 margins: separators, 卦旨, the first J section and 贈言 open with lg; the rest md.
function sectionItems(s,first) {
  const style=s.tag==='GZ'?{size:'md',color:GOLD}:s.tag==='ZY'?{size:'md',color:GOLD,style:'italic'}:
    s.tag==='NEXT'?{size:'sm',color:SAGE}:{size:'lg',color:CREAM};
  const items=chunk(s.text).map((text,i)=>({type:'text',text,wrap:true,margin:i===0&&first?'lg':'md',...style}));
  return s.tag==='ZY'?[{type:'separator',color:GOLD,margin:'lg'},...items]:items;
}
function letterCard(letter,{benGua,liffUrl}) {
  const items=[{type:'separator',color:GOLD,margin:'lg'}];
  const firstJ=letter.sections.find(s=>/^J[1-6]$/.test(s.tag))?.tag;
  for(const s of letter.sections){
    // M17 places the footer line between 贈言 and NEXT.
    if(s.tag==='NEXT')items.push({type:'text',text:FOOTER,wrap:true,size:'md',color:GOLD,margin:'md',weight:'bold'});
    items.push(...sectionItems(s,['GZ','ZY',firstJ].includes(s.tag)));
  }
  if(!letter.sections.some(s=>s.tag==='NEXT'))items.push({type:'text',text:FOOTER,wrap:true,size:'md',color:GOLD,margin:'md',weight:'bold'});
  items.push({type:'text',text:SIGNATURE,wrap:true,size:'sm',align:'end',color:SAGE,margin:'md'});
  const no=GUA_NO[benGua];
  const hero=Number.isInteger(no)?{type:'image',url:`https://perhaps8511-lab.github.io/mingge-line/${String(no).padStart(2,'0')}.png`,
    size:'full',aspectMode:'cover',aspectRatio:'2:1'}:null;
  return pack(items,(contents,first)=>({type:'bubble',size:'mega',...(first&&hero?{hero}:{}),
    body:{type:'box',layout:'vertical',paddingAll:'20px',backgroundColor:GREEN,contents}}),{liffUrl});
}
export function letterMessages(letter,{benGua,liffUrl}={}) {
  if(!letter || !Array.isArray(letter.sections) || !letter.sections.length) throw new Error('LETTER_INVALID');
  const full=['J1','J2','J3','J4','J5','J6'].every(tag=>letter.sections.some(s=>s.tag===tag));
  return full?letterCard(letter,{benGua,liffUrl}):plainMessages(letter);
}
export function createLinePush({token,liffId,fetchImpl=fetch}) {
  if(!token) throw new Error('LINE_PUSH_UNCONFIGURED');
  const liffUrl=/^[0-9]+-[A-Za-z0-9]+$/.test(liffId||'')?`https://liff.line.me/${liffId}`:undefined;
  return async row=>{
    try {
      const response=await fetchImpl('https://api.line.me/v2/bot/message/push',{
        method:'POST',redirect:'error',signal:AbortSignal.timeout(15000),
        headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json','X-Line-Retry-Key':row.push_key},
        body:JSON.stringify({to:row.subject,messages:letterMessages(row.output_json,{benGua:row.input_json?.ben_gua,liffUrl})}),
      });
      // 409 only proves accepted when LINE supplies the original request ID.
      if(!response.ok && !(response.status===409 && response.headers.get('x-line-accepted-request-id'))) throw new Error();
    } catch {throw new Error('LINE_DELIVERY_UNCONFIRMED');}
  };
}
