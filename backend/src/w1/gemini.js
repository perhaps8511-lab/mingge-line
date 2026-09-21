import {checkRuntimeBinding} from './registry.js';
import {createHash} from 'node:crypto';
// Official wire contract: https://ai.google.dev/api/generate-content
// No API in this contract echoes applied safety thresholds/thinking level.
// Never equate a submitted configuration with provider-attested applied values.
export function createGeminiAdapter({binding,key,fetchImpl=fetch}) {
  const config=checkRuntimeBinding(binding);
  if(config.provider!=='gemini'||!/^[a-zA-Z0-9.-]+$/.test(config.model)||!key||
    !Number.isFinite(config.temperature)||!Number.isInteger(config.timeoutMs)||config.timeoutMs<=0||config.timeoutMs>300000) {
    throw new Error('RUNTIME_BINDING_UNVERIFIED');
  }
  const categories=new Set(['HARM_CATEGORY_HARASSMENT','HARM_CATEGORY_HATE_SPEECH','HARM_CATEGORY_SEXUALLY_EXPLICIT','HARM_CATEGORY_DANGEROUS_CONTENT']);
  const thresholds=new Set(['BLOCK_LOW_AND_ABOVE','BLOCK_MEDIUM_AND_ABOVE','BLOCK_ONLY_HIGH','BLOCK_NONE','OFF']);
  if(config.safety.categories.length!==4 || new Set(config.safety.categories.map(x=>x.category)).size!==4 ||
      config.safety.categories.some(x=>!categories.has(x.category)||!thresholds.has(x.threshold)))throw new Error('SAFETY_MAPPING_UNSUPPORTED');
  if(!['low','medium','high'].includes(config.thinking.mode)||config.thinking.budgetTokens!==undefined)throw new Error('THINKING_MAPPING_UNSUPPORTED');
  const requested={temperature:config.temperature,maxOutputTokens:config.maxOutputTokens,
    thinkingConfig:{thinkingLevel:config.thinking.mode.toUpperCase()},safetySettings:config.safety.categories};
  const configFingerprint=createHash('sha256').update(JSON.stringify(requested)).digest('hex');
  return async({prompt})=>{
    let response;
    try {
      response=await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent`,{
        method:'POST',redirect:'error',signal:AbortSignal.timeout(config.timeoutMs),
        headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify({
          systemInstruction:{parts:[{text:prompt.system}]},contents:[{role:'user',parts:[{text:prompt.user}]}],
          generationConfig:{temperature:requested.temperature,maxOutputTokens:requested.maxOutputTokens,
            thinkingConfig:requested.thinkingConfig},safetySettings:requested.safetySettings,
        }),
      });
      if(!response.ok)throw new Error();
      const data=await response.json(),c=data.candidates?.[0];
      return {text:(c?.content?.parts??[]).filter(x=>!x.thought).map(x=>x.text??'').join(''),finishReason:c?.finishReason,
        runtime:{requested_config:{...requested,config_fingerprint:configFingerprint},
          provider_acceptance:{provider:'gemini',model:config.model,modelVersion:data.modelVersion,apiVersion:'v1beta',httpStatus:response.status,finishReason:c?.finishReason},
          applied_config_readback:{status:'NOT_RETURNED',reason:'UNVERIFIABLE_BY_PROVIDER_RESPONSE'},
          usage:{input:data.usageMetadata?.promptTokenCount,output:data.usageMetadata?.candidatesTokenCount,thinking:data.usageMetadata?.thoughtsTokenCount}}};
    } catch {throw new Error('PROVIDER_UNVERIFIED_NO_DELIVERY');}
  };
}
