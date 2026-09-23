import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync} from 'node:crypto';
import {createGeminiAdapter} from '../src/w1/gemini.js';
import {loadClassics,lookup,loadPrefix,selectRules,createPromptBuilder} from '../src/w1/classics.js';
import {loadV34} from '../src/w1/registry.js';
import {subjectToken,verifyAccessToken,verifyWebhook} from '../../workers/mingge-w1-staging/worker.js';
import {createSubjectVerifier} from '../src/w1/subject.js';
import {copy,letterView,legacyLetterView} from '../public/copy.js';
const promptPath=new URL('../../prompts/jiegua/v34.md',import.meta.url);
// URLs above resolve relative to backend/test; repo root is two levels up.
test('exact v34 prompt, deterministic 384 lookup, B prefix and A six-rule selection',async()=>{
 const prompt=loadV34(promptPath),prefix=loadPrefix(new URL('../../prompts/jiegua/rag03-b.txt',import.meta.url));
 const data=loadClassics(new URL('../data/classics-candidate.json',import.meta.url));
 for(const g of data.hexagrams)for(let n=1;n<=6;n++)assert.equal(lookup(data,g.gua_name,n).yao.yao_no,n);
 assert.throws(()=>lookup(data,'不存在',1),/CLASSICS_NOT_FOUND/);
 for(const code of ['A','B','C','D','E'])assert.equal((selectRules(prefix,'A',code).match(/^## 規則 #/gm)||[]).length,6);
 const built=await createPromptBuilder({data,prefix,prompt})({ben_gua:'火水未濟',bian_gua:'火雷噬嗑',dong_yao:5,question_text:'合成問題'});
 assert.equal(built.system,prompt.text);assert.ok(built.user.includes('六五'));assert.equal(built.user.includes(copy.disclaimer),false);
});
test('Gemini preserves requested/acceptance/readback distinction and rejects unmapped values',async()=>{
 const binding={provider:'gemini',model:'gemini-3.7-flash',temperature:.4,maxOutputTokens:8192,thinking:{mode:'medium'},
  safety:{profile:'synthetic_explicit',categories:['HARASSMENT','HATE_SPEECH','SEXUALLY_EXPLICIT','DANGEROUS_CONTENT'].map(c=>({category:'HARM_CATEGORY_'+c,threshold:'BLOCK_MEDIUM_AND_ABOVE'}))},
  status:'VERIFIED',evidenceRef:'synthetic-only',timeoutMs:5000};
 let sent;
 const complete=createGeminiAdapter({binding,key:'synthetic',fetchImpl:async(url,options)=>{sent=JSON.parse(options.body);return {ok:true,status:200,json:async()=>({
   modelVersion:'gemini-3.7-flash',candidates:[{finishReason:'STOP',content:{parts:[{text:'synthetic'}]}}],usageMetadata:{promptTokenCount:1,candidatesTokenCount:2,thoughtsTokenCount:3}})};}});
 const output=await complete({prompt:{system:'synthetic',user:'synthetic'}});
 assert.equal(sent.generationConfig.thinkingConfig.thinkingLevel,'MEDIUM');
 assert.equal(output.runtime.applied_config_readback.status,'NOT_RETURNED');
 assert.equal(output.runtime.provider_acceptance.httpStatus,200);assert.equal(output.runtime.requested_config.config_fingerprint.length,64);
 assert.throws(()=>createGeminiAdapter({binding:{...binding,thinking:{mode:'off'}},key:'synthetic'}),/THINKING_MAPPING_UNSUPPORTED/);
 assert.throws(()=>createGeminiAdapter({binding:{...binding,safety:{profile:'x',categories:[]}},key:'synthetic'}),/RUNTIME_BINDING_UNVERIFIED/);
});
test('staging Worker signs a fresh key; backend verifies kid and verified subject',async()=>{
 const {privateKey,publicKey}=generateKeyPairSync('ed25519');
 const env={W1_SUBJECT_KID:'synthetic-kid',W1_SUBJECT_PRIVATE_KEY_PKCS8:privateKey.export({type:'pkcs8',format:'der'}).toString('base64')};
 const subject=`U${'c'.repeat(32)}`;
 const token=await subjectToken(subject,'r1','liff',env);
 const verify=createSubjectVerifier({publicKey:publicKey.export({type:'spki',format:'pem'}),kid:'synthetic-kid',consumeJti:async()=>true});
 assert.equal((await verify({token,requestId:'r1'})).subject,subject);
 await assert.rejects(createSubjectVerifier({publicKey:publicKey.export({type:'spki',format:'pem'}),kid:'wrong',consumeJti:async()=>true})({token,requestId:'r1'}),/UNAUTHORIZED/);
 await assert.rejects(verifyAccessToken('synthetic','expected',async()=>({ok:true,json:async()=>({client_id:'wrong',expires_in:100})})),/LINE_AUDIENCE_MISMATCH/);
 assert.equal(await verifyWebhook(new Uint8Array([1]),'bad','synthetic'),false);
});
test('A14 is only UI for full green/yellow letters; failure contains no W2 promise',()=>{
 assert.equal(copy.disclaimer,'卦象供你參考，決定仍在你手上；涉及醫療、法律、投資等專業事項，請另詢專業人士。');
 const full={state:'completed',letter:{charge:1,notice:'none',sections:[{tag:'J1',text:'synthetic'}]}};
 assert.equal(letterView(full).disclaimer,copy.disclaimer);assert.equal(JSON.stringify(full).includes(copy.disclaimer),false);
 assert.equal(letterView({...full,letter:{charge:0,sections:[],notice:'none'}}).disclaimer,null);
 assert.equal(/補送|我們會補上/.test(copy.failure),false);assert.equal(letterView(full).replay,false);
 assert.equal(legacyLetterView([1,2,3,4,5,6].map(i=>`[[J${i}]]合成`).join('')).disclaimer,copy.disclaimer);
 assert.equal(legacyLetterView('[[SR]]合成危機').disclaimer,null);
});
