import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
export const CLASSICS_SHA='0f1b6f31b72e066477e3b5c816c1c3581c423f954ccc1e65e7244df272fd3187';
export const PREFIX_SHA='eab2c7c9b0d1fd985fbec43ad0abba7bf0ab23f10c1b0c92a78428773e41fddd';
const hash=b=>createHash('sha256').update(b).digest('hex');
export function loadClassics(path) {
  const bytes=readFileSync(path);if(hash(bytes)!==CLASSICS_SHA)throw new Error('CLASSICS_SHA_MISMATCH');
  const data=JSON.parse(bytes), keys=new Set();
  for(const g of data.hexagrams??[])for(const y of g.yao??[]) {
    if(y.yao_no<1||y.yao_no>6)continue;
    const k=`${g.gua_no}:${y.yao_no}`;if(keys.has(k))throw new Error('CLASSICS_DUPLICATE');keys.add(k);
  }
  if(data.hexagrams.length!==64||keys.size!==384)throw new Error('CLASSICS_INCOMPLETE');
  return data;
}
export function lookup(data,name,line) {
  const g=data.hexagrams.find(x=>name===x.gua_name||name.endsWith(x.gua_name)||name.startsWith(x.gua_name+'為'));
  const yao=g?.yao.find(y=>y.yao_no===line);
  if(!g||!yao)throw new Error('CLASSICS_NOT_FOUND');
  return {gua:g,yao};
}
export function loadPrefix(path) {
  const bytes=readFileSync(path);if(hash(bytes)!==PREFIX_SHA)throw new Error('PREFIX_SHA_MISMATCH');return bytes.toString('utf8');
}
export function selectRules(prefix,mode='B',mainKaguan) {
  if(mode==='B')return prefix;
  if(mode!=='A'||!['A','B','C','D','E'].includes(mainKaguan))throw new Error('RETRIEVAL_SELECTION_REQUIRED');
  const parts=prefix.split(/(?=^## 規則 #)/m);
  const matching=parts.slice(1).filter(p=>new RegExp(`\\*\\*主卡關\\*\\*[^\\n]*\\*\\*${mainKaguan}\\s`).test(p));
  if(matching.length!==6)throw new Error('RETRIEVAL_RULE_COUNT');
  return parts[0]+matching.join('');
}
export function createPromptBuilder({data,prefix,prompt,mode='B',classifyKaguan}) {
  return async input=>{
    const a=lookup(data,input.ben_gua,input.dong_yao),b=lookup(data,input.bian_gua,input.dong_yao);
    const code=mode==='A'?await classifyKaguan?.(input):undefined;
    const selected=selectRules(prefix,mode,code);
    // Preserve RAG_02 exact fields only. Candidate xiaoxiang is NEVER selected.
    const user=`【爻辭源·確定性查表】\n本卦:${input.ben_gua}\n卦辭:${a.gua.fields.gua_ci}\n彖傳:${a.gua.fields.tuan}\n大象傳:${a.gua.fields.daxiang}\n動爻:第 ${input.dong_yao} 爻(${a.yao.position})\n爻辭:${a.yao.text}\n變卦:${input.bian_gua}\n卦辭:${b.gua.fields.gua_ci}\n彖傳:${b.gua.fields.tuan}\n大象傳:${b.gua.fields.daxiang}\n問題:${input.question_text}`;
    return {system:prompt.text,user:selected+'\n'+user};
  };
}
