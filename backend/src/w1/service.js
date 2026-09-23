import { generateChecked } from './delivery.js';
import {detectSafety,safetyDelivery,safetyFallback,overseasSignal,SAFETY_COMMERCE} from './safety.js';
const fail=(code,status=503)=>Object.assign(new Error(code),{status});
const COST_STOP_CODES=['COST_HARD_CAP_REACHED','COST_REVIEW_STOP_REACHED','COST_RESERVE_EXCEEDED','PROVIDER_BUDGET_EXHAUSTED'];
// Upper bound for the safety model route (both attempts); past it the adopted fallback is delivered.
export const SAFETY_DEADLINE_MS=40000;
// Safety model route accepts only an [[SR]] without commerce/URL (v34 crisis iron rules; ruling C.5).
// A keyword hit is self-harm language, so its SR must be crisis or self-harm (the gate then requires 1925);
// a classifier-only positive may be judged non-crisis by v34 with full context, and that adopted SR stands.
const safetyRouteAccept=source=>v=>[...(v.hasSR?[]:['SAFETY_ROUTE_NOT_SR']),
  ...(source!=='classifier'&&v.meta.level!=='crisis'&&v.meta.category!=='self_harm'?['SAFETY_ROUTE_NOT_CRISIS']:[]),
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
  constructor({store,generate,push,buildPrompt,manifest,classifySafety,safetyDeadlineMs=SAFETY_DEADLINE_MS}) { Object.assign(this,{store,generate,push,buildPrompt,manifest,classifySafety,safetyDeadlineMs}); }
  get revision() { return this.manifest?.source_revision??null; }
  async create(subject,body) {
    validateInput(body);
    // reused tells a runner whether this request triggered new work; it never changes the record.
    const old=await this.store.existingRequest(subject,body);if(old)return {...recordView(old),reused:true};
    // GPT bounded ruling 2026-09-23: every keyword hit and classifier-only positive takes the safety-only v34
    // model route (adopted branch chosen with full context, gated, no entitlement, charge 0). There is no
    // fixed-template bypass: no keyword can prove the absence of a mixed, proxy, caregiver or overseas context.
    const keyword=detectSafety(body.question_text);
    const detected=keyword??(this.classifySafety?await this.classifySafety(subject,body):null);
    if(detected) {
      if(!await this.store.isOwnerTestGrant(subject))throw fail('OWNER_GRANT_REQUIRED',403);
      // A crisis-routed request never ends with no resource: if the model route cannot be set up, the
      // adopted fallback is delivered now.
      let cause=null;
      if(!this.generate)cause='RUNTIME_BINDING_UNVERIFIED';
      else try {await this.buildPrompt(body);} catch {cause='PROMPT_BUILD_FAILED';}
      if(cause)return this.createFallback(subject,body,cause,detected);
      const saved=await this.store.createSafetyJob(subject,body,{source:keyword?'keyword':'classifier'});
      return {...recordView(saved),reused:saved.reused===true};
    }
    if(!this.generate) throw fail('RUNTIME_BINDING_UNVERIFIED');
    // Deterministic lookup must succeed before reserving a coin or spending.
    await this.buildPrompt(body);
    const saved=await this.store.create(subject,body);return {...recordView(saved),reused:saved.reused===true};
  }
  async createFallback(subject,body,cause,detected) {
    let result;
    try {result=safetyDelivery(safetyFallback(body.question_text,{imminent:detected?.imminent===true}),'SAFETY_FALLBACK');}
    catch {await this.store.alert(null,'SAFETY_NO_DELIVERY');throw fail('SAFETY_NO_DELIVERY');}
    result.output.runtime={...result.output.runtime,route:'SAFETY_FALLBACK',fallback_cause:cause,runtime_revision:this.revision};
    const saved=await this.store.createSafety(subject,body,result,{cause});
    return {...recordView(saved),reused:saved.reused===true};
  }
  // Single-loop form (tests, smoke): sweep, then the safety lane, then the ordinary lane. The server runs
  // the three as separate loops so a safety job never waits behind an ordinary letter.
  async tick() {
    await this.sweepSafety();
    return (await this.tickSafety())||(await this.tickOrdinary());
  }
  // Safety jobs past their bound (lane stalled, process restarted) get the adopted fallback.
  async sweepSafety() {
    let n=0;
    for(const row of await this.store.expiredSafetyJobs())
      if(await this.safetyFallback(row,'GENERATION_UNRESOLVED',{route:'SAFETY_MODEL',runtime_revision:this.revision},{expect:[row.state]}))n++;
    return n;
  }
  async tickSafety() {
    if(!this.generate) return false;
    const row=await this.store.claim({lane:'safety'}); if(!row) return false;
    await this.process(row); return true;
  }
  async tickOrdinary() {
    await this.store.detectExpiredClaims();
    const pending=await this.store.nextPendingPush();
    if(pending){await this.repush(pending.subject,pending.id);return true;}
    if(!this.generate) return false;
    const row=await this.store.claim({lane:'ordinary'}); if(!row) return false;
    await this.process(row); return true;
  }
  async process(row) {
    const route=await this.store.routeOf(row.id);
    const safetyRoute=route==='SAFETY_MODEL';
    const base={route,runtime_revision:this.revision};
    // Inconsistent route markers never generate: fail closed on whichever settlement applies, and always
    // reach a terminal state.
    if(route==='UNKNOWN'){
      await this.store.alert(row.id,'ROUTE_UNKNOWN',base);
      if(!await this.store.settle(row.id,null,'ROUTE_UNKNOWN',base)&&!await this.store.settleSafetyModel(row.id,null,'ROUTE_UNKNOWN',base))
        await this.store.failStuck(row.id,'ROUTE_UNKNOWN');
      return;
    }
    // Request-side overseas sign for the gate's v34 overseas branch (never trusted from model output alone).
    const context={overseas:overseasSignal(row.input_json.question_text)};
    let result,last=null;
    const alert=(code,detail)=>{last={...base,...detail};return this.store.alert(row.id,code,last);};
    try {
      const prompt=await this.buildPrompt(row.input_json);
      if(safetyRoute) {
        const accept=safetyRouteAccept(await this.store.safetySource(row.id));
        let expired=false,timer;
        const run=generateChecked(attempt=>{if(expired)throw new Error('SAFETY_DEADLINE');return this.generate({prompt,recordId:row.id,attempt});},alert,{accept,context});
        run.catch(()=>{}); // a late provider outcome is still cost-settled by generate; it is never delivered
        try {result=await Promise.race([run,new Promise((_,reject)=>{timer=setTimeout(()=>{expired=true;reject(new Error('SAFETY_DEADLINE'));},this.safetyDeadlineMs);})]);}
        finally {clearTimeout(timer);}
      } else result=await generateChecked(attempt=>this.generate({prompt,recordId:row.id,attempt}),alert,{context});
    } catch(e) {
      // Budget stops keep their own code so a runner can halt instead of scoring them as failures.
      const message=e?.message??'';
      const code=COST_STOP_CODES.includes(message)?message:safetyRoute&&message==='SAFETY_DEADLINE'?'SAFETY_DEADLINE':'GENERATION_FAILED';
      const evidence={...(last??base),failure_code:/^[A-Z0-9_]{2,64}$/.test(message)?message:'UNCLASSIFIED'};
      if(safetyRoute){await this.safetyFallback(row,code,evidence);return;}
      await this.store.settle(row.id,null,code,evidence); return;
    }
    result.output.runtime={...result.output.runtime,...base};
    // If persistence fails, leave the reservation unresolved. Never publish or
    // classify a DB failure as an ordinary generated failure and overwrite it.
    if(!await (safetyRoute?this.store.settleSafetyModel(row.id,result):this.store.settle(row.id,result)))return;
    await this.store.get(row.subject,row.id); // owning-store readback before push
    await this.repush(row.subject,row.id);
  }
  // Safety net for the safety-only model route: the adopted v34 self-harm standard response with the
  // adopted first line (overseas / imminent / mixed) and caregiver sentence the context calls for. Charge 0,
  // completed with error_code = cause and route SAFETY_FALLBACK, so it is never counted as a model reply.
  async safetyFallback(row,cause,evidence,{expect=['generating']}={}) {
    const question=row.input_json.question_text;
    let detection=null;
    try {detection=await this.store.classifierDetection(row.subject,row.request_id);} catch {} // optional input only
    let result;
    try {
      const imminent=detection?.imminent===true||detectSafety(question)?.imminent===true;
      result=safetyDelivery(safetyFallback(question,{imminent}),'SAFETY_FALLBACK');
      result.output.runtime={...result.output.runtime,...evidence,route:'SAFETY_FALLBACK',fallback_cause:cause};
    } catch {
      await this.store.settleSafetyModel(row.id,null,cause,evidence,{expect});return false;
    }
    if(!await this.store.settleSafetyModel(row.id,result,cause,evidence,{expect}))return false;
    await this.repush(row.subject,row.id);
    return true;
  }
  async repush(subject,id) {
    const row=await this.store.claimPush(subject,id);
    if(!row) return {status:'UNCHANGED'};
    try { await this.push(row); await this.store.pushResult(id,'sent'); return {status:'SENT'}; }
    catch { await this.store.pushResult(id,'unknown'); return {status:'DELIVERY_UNCONFIRMED'}; }
  }
}
