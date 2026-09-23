import { generateChecked } from './delivery.js';
import {detectSafety,standardSafety,safetyDelivery,safetyFallback,SAFETY_COMMERCE} from './safety.js';
const fail=(code,status=503)=>Object.assign(new Error(code),{status});
// Safety model route accepts only a crisis [[SR]] without commerce/URL (v34 crisis iron rules; ruling C.5).
const safetyRouteAccept=v=>[...(v.hasSR?[]:['SAFETY_ROUTE_NOT_SR']),...(v.meta.level==='crisis'?[]:['SAFETY_ROUTE_NOT_CRISIS']),
  ...(v.hasSR&&SAFETY_COMMERCE.test(v.segments.SR??'')?['SAFETY_ROUTE_COMMERCE']:[])];
export function validateInput(body) {
  const keys=['request_id','ben_gua','bian_gua','dong_yao','qigua_time','question_text','session_id'];
  if (!body || Object.keys(body).some(k=>!keys.includes(k)) ||
      typeof body.request_id!=='string' || !/^[A-Za-z0-9_-]{1,128}$/.test(body.request_id) ||
      typeof body.question_text!=='string' || !body.question_text.trim() || body.question_text.length>4000 ||
      !Number.isInteger(body.dong_yao) || body.dong_yao<1 || body.dong_yao>6 ||
      ![body.ben_gua,body.bian_gua].every(x=>typeof x==='string' && x.length>0 && x.length<32) ||
      typeof body.qigua_time!=='string' || !/\+08:00$/.test(body.qigua_time) || !Number.isFinite(Date.parse(body.qigua_time)) ||
      (body.session_id!==undefined && (typeof body.session_id!=='string'||body.session_id.length>128))) throw fail('BAD_FIELD',400);
  return body;
}
export function recordView(row) {
  return { id:row.id, request_id:row.request_id, origin:'w1', writable:true,
    input:row.input_json, state:row.state, letter:row.output_json,
    push_state:row.push_state, created_at:row.created_at,
    delayed:row.state==='generating' && Date.now()-new Date(row.started_at).getTime()>90000,
    readback_verified:row.readback_verified===true };
}
export class W1Service {
  constructor({store,generate,push,buildPrompt,manifest,classifySafety}) { Object.assign(this,{store,generate,push,buildPrompt,manifest,classifySafety}); }
  async create(subject,body) {
    validateInput(body);
    // reused tells a runner whether this request triggered new work; it never changes the record.
    const old=await this.store.existingRequest(subject,body);if(old)return {...recordView(old),reused:true};
    // Narrow SAFETY_BYPASS (GPT bounded ruling 2026-09-23): the fixed v34 template only for imminent keyword
    // self-harm without an overseas sign (v34's context-free rescue-first branch). All other keyword hits and
    // classifier-only positives take the safety-only model route (adopted v34 branch, gated, charge 0).
    const keyword=detectSafety(body.question_text);
    if(keyword?.clear) {
      if(!await this.store.isOwnerTestGrant(subject))throw fail('OWNER_GRANT_REQUIRED',403);
      let result;
      try {result=safetyDelivery(standardSafety(keyword));}
      catch {await this.store.alert(null,'SAFETY_NO_DELIVERY');throw fail('SAFETY_NO_DELIVERY');}
      const saved=await this.store.createSafety(subject,body,result);return {...recordView(saved),reused:saved.reused===true};
    }
    const source=keyword?'keyword':(this.classifySafety&&await this.classifySafety(subject,body))?'classifier':null;
    if(source) {
      if(!await this.store.isOwnerTestGrant(subject))throw fail('OWNER_GRANT_REQUIRED',403);
      if(!this.generate) throw fail('RUNTIME_BINDING_UNVERIFIED');
      await this.buildPrompt(body);
      const saved=await this.store.createSafetyJob(subject,body,{source});return {...recordView(saved),reused:saved.reused===true};
    }
    if(!this.generate) throw fail('RUNTIME_BINDING_UNVERIFIED');
    // Deterministic lookup must succeed before reserving a coin or spending.
    await this.buildPrompt(body);
    const saved=await this.store.create(subject,body);return {...recordView(saved),reused:saved.reused===true};
  }
  async tick() {
    await this.store.detectExpiredClaims();
    // Expired safety-route generations get the adopted fallback, never "unknown" with no resource.
    for(const row of await this.store.expiredSafetyJobs())
      await this.safetyFallback(row,'GENERATION_UNRESOLVED',{route:'SAFETY_MODEL',runtime_revision:this.manifest?.source_revision??null});
    const pending=await this.store.nextPendingPush();
    if(pending){await this.repush(pending.subject,pending.id);return true;}
    if(!this.generate) return false;
    const row=await this.store.claim(); if(!row) return false;
    const route=await this.store.routeOf(row.id);
    const safetyRoute=route==='SAFETY_MODEL';
    const base={route,runtime_revision:this.manifest?.source_revision??null};
    // Inconsistent route markers never generate: fail closed on whichever settlement applies, and always
    // reach a terminal state.
    if(route==='UNKNOWN'){
      await this.store.alert(row.id,'ROUTE_UNKNOWN',base);
      if(!await this.store.settle(row.id,null,'ROUTE_UNKNOWN',base)&&!await this.store.settleSafetyModel(row.id,null,'ROUTE_UNKNOWN',base))
        await this.store.failStuck(row.id,'ROUTE_UNKNOWN');
      return true;
    }
    let result,last=null;
    try {
      const prompt=await this.buildPrompt(row.input_json);
      result=await generateChecked(attempt=>this.generate({prompt,recordId:row.id,attempt}),
        (code,detail)=>{last={...base,...detail};return this.store.alert(row.id,code,last);},
        safetyRoute?{accept:safetyRouteAccept}:{});
    } catch(e) {
      // Budget stops keep their own code so a runner can halt instead of scoring them as failures.
      const code=['COST_HARD_CAP_REACHED','COST_REVIEW_STOP_REACHED','COST_RESERVE_EXCEEDED','PROVIDER_BUDGET_EXHAUSTED'].includes(e?.message)?e.message:'GENERATION_FAILED';
      const evidence={...(last??base),failure_code:/^[A-Z0-9_]{2,64}$/.test(e?.message??'')?e.message:'UNCLASSIFIED'};
      if(safetyRoute){await this.safetyFallback(row,code,evidence);return true;}
      await this.store.settle(row.id,null,code,evidence); return true;
    }
    result.output.runtime={...result.output.runtime,...base};
    // If persistence fails, leave the reservation unresolved. Never publish or
    // classify a DB failure as an ordinary generated failure and overwrite it.
    if(!await (safetyRoute?this.store.settleSafetyModel(row.id,result):this.store.settle(row.id,result)))return true;
    await this.store.get(row.subject,row.id); // owning-store readback before push
    await this.repush(row.subject,row.id);
    return true;
  }
  // Safety net for the safety-only model route: the adopted v34 self-harm standard response with the
  // adopted first line the context calls for (overseas / imminent / mixed). Charge 0, pushed like any SR.
  async safetyFallback(row,cause,evidence) {
    let result;
    try {
      const detection=await this.store.classifierDetection(row.subject,row.request_id);
      const imminent=detection?.imminent===true||detectSafety(row.input_json.question_text)?.imminent===true;
      result=safetyDelivery(safetyFallback(row.input_json.question_text,{imminent}),'SAFETY_FALLBACK');
      result.output.runtime={...result.output.runtime,...evidence,route:'SAFETY_FALLBACK',fallback_cause:cause};
    } catch {
      await this.store.settleSafetyModel(row.id,null,cause,evidence);return;
    }
    if(!await this.store.settleSafetyModel(row.id,result))return;
    await this.store.alert(row.id,'SAFETY_MODEL_FALLBACK',{cause,runtime_revision:evidence?.runtime_revision??null});
    await this.repush(row.subject,row.id);
  }
  async repush(subject,id) {
    const row=await this.store.claimPush(subject,id);
    if(!row) return {status:'UNCHANGED'};
    try { await this.push(row); await this.store.pushResult(id,'sent'); return {status:'SENT'}; }
    catch { await this.store.pushResult(id,'unknown'); return {status:'DELIVERY_UNCONFIRMED'}; }
  }
}
