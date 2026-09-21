import { generateChecked } from './delivery.js';
import {detectSafety,standardSafety,safetyDelivery} from './safety.js';
const fail=(code,status=503)=>Object.assign(new Error(code),{status});
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
    const old=await this.store.existingRequest(subject,body);if(old)return recordView(old);
    const safety=detectSafety(body.question_text)??(this.classifySafety?await this.classifySafety(subject,body):null);
    if(safety) {
      if(!await this.store.isOwnerTestGrant(subject))throw fail('OWNER_GRANT_REQUIRED',403);
      let result;
      try {result=safetyDelivery(standardSafety(safety));}
      catch {await this.store.alert(null,'SAFETY_NO_DELIVERY');throw fail('SAFETY_NO_DELIVERY');}
      return recordView(await this.store.createSafety(subject,body,result));
    }
    if(!this.generate) throw fail('RUNTIME_BINDING_UNVERIFIED');
    // Deterministic lookup must succeed before reserving a coin or spending.
    await this.buildPrompt(body);
    return recordView(await this.store.create(subject,body));
  }
  async tick() {
    await this.store.detectExpiredClaims();
    const pending=await this.store.nextPendingPush();
    if(pending){await this.repush(pending.subject,pending.id);return true;}
    if(!this.generate) return false;
    const row=await this.store.claim(); if(!row) return false;
    let result;
    try {
      const prompt=await this.buildPrompt(row.input_json);
      result=await generateChecked(attempt=>this.generate({prompt,recordId:row.id,attempt}),
        code=>this.store.alert(row.id,code));
    } catch {
      await this.store.settle(row.id,null,'GENERATION_FAILED'); return true;
    }
    // If persistence fails, leave the reservation unresolved. Never publish or
    // classify a DB failure as an ordinary generated failure and overwrite it.
    if(!await this.store.settle(row.id,result))return true;
    await this.store.get(row.subject,row.id); // owning-store readback before push
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
