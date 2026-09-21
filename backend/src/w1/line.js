export const ALT_TEXT='老易的信箋到了。';
export function letterMessage(letter) {
  if(!letter || !Array.isArray(letter.sections) || !letter.sections.length) throw new Error('LETTER_INVALID');
  // Flex text objects have limits; split without truncating or changing order.
  const chunks=letter.sections.flatMap(s=>{
    const chars=Array.from(s.text), out=[];
    for(let i=0;i<chars.length;i+=1800) out.push(chars.slice(i,i+1800).join(''));
    return out;
  });
  const bubbles=[];
  for(let i=0;i<chunks.length;i+=4) bubbles.push({type:'bubble',body:{type:'box',layout:'vertical',
    contents:chunks.slice(i,i+4).map(text=>({type:'text',text,wrap:true,size:'md'}))}});
  if(bubbles.length>12) throw new Error('PUSH_PAYLOAD_TOO_LARGE');
  return {type:'flex',altText:ALT_TEXT,contents:bubbles.length===1?bubbles[0]:{type:'carousel',contents:bubbles}};
}
export function createLinePush({token,fetchImpl=fetch}) {
  if(!token) throw new Error('LINE_PUSH_UNCONFIGURED');
  return async row=>{
    try {
      const response=await fetchImpl('https://api.line.me/v2/bot/message/push',{
        method:'POST',redirect:'error',signal:AbortSignal.timeout(15000),
        headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json','X-Line-Retry-Key':row.push_key},
        body:JSON.stringify({to:row.subject,messages:[letterMessage(row.output_json)]}),
      });
      // 409 only proves accepted when LINE supplies the original request ID.
      if(!response.ok && !(response.status===409 && response.headers.get('x-line-accepted-request-id'))) throw new Error();
    } catch {throw new Error('LINE_DELIVERY_UNCONFIRMED');}
  };
}
