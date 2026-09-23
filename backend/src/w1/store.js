import { randomUUID, createHash } from 'node:crypto';
const fail = (code, status = 503) => Object.assign(new Error(code), { status });
const sourceTable = kind => {
  if (!['entitlements','test_grants'].includes(kind)) throw fail('SOURCE_INVALID');
  return `w1.${kind}`;
};
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])]));
  return value;
}
export class W1Store {
  constructor(pool) { this.pool = pool; }
  async tx(fn) {
    const c = await this.pool.connect();
    try { await c.query('BEGIN'); const result = await fn(c); await c.query('COMMIT'); return result; }
    catch (e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); }
  }
  async audit(c, code, recordId = null, grant = null) {
    await c.query('INSERT INTO w1.audit_events(id,record_id,code,grant_id,remaining,granted_by,reason) VALUES($1,$2,$3,$4,$5,$6,$7)',
      [randomUUID(),recordId,code,grant?.id ?? null, grant ? grant.quota-grant.used-grant.reserved : null,
        grant?.granted_by ?? null, grant?.reason ?? null]);
  }
  async grant(subject, { quota, expiresAt, enrollmentId }) {
    if (!/^U[0-9a-f]{32}$/.test(subject) || !Number.isInteger(quota) || quota < 1 || quota > 1000 ||
        !Number.isFinite(Date.parse(expiresAt)) || Date.parse(expiresAt) <= Date.now() || !enrollmentId) throw fail('GRANT_INVALID',400);
    return this.tx(async c => {
      const { rows } = await c.query(`INSERT INTO w1.test_grants
        (id,subject,environment,quota,expires_at,granted_by,reason,enrollment_id)
        VALUES($1,$2,'staging',$3,$4,'owner_verified_enrollment','w1_owner_uat',$5)
        ON CONFLICT(enrollment_id) DO NOTHING RETURNING *`, [randomUUID(),subject,quota,expiresAt,enrollmentId]);
      if (!rows.length) throw fail('ENROLLMENT_ALREADY_USED',409);
      await this.audit(c,'TEST_GRANT_CREATED',null,rows[0]);
      return this.grantView(rows[0]);
    });
  }
  grantView(g) { return { id:g.id, quota:g.quota, used:g.used, reserved:g.reserved,
    remaining:g.quota-g.used-g.reserved, expires_at:g.expires_at, revoked_at:g.revoked_at }; }
  async revoke(subject,id) {
    return this.tx(async c => {
      const {rows} = await c.query('UPDATE w1.test_grants SET revoked_at=now() WHERE subject=$1 AND id=$2 RETURNING *',[subject,id]);
      if (!rows.length) throw fail('NOT_FOUND',404);
      await this.audit(c,'TEST_GRANT_REVOKED',null,rows[0]); return this.grantView(rows[0]);
    });
  }
  async isOwnerTestGrant(subject) {
    const {rows} = await this.pool.query(`SELECT id FROM w1.test_grants WHERE subject=$1 AND environment='staging'
      AND expires_at>now() AND revoked_at IS NULL AND reason='w1_owner_uat'`,[subject]);
    return rows.length > 0;
  }
  async hasOwnerBinding(subject) {
    return (await this.pool.query("SELECT id FROM w1.test_grants WHERE subject=$1 AND environment='staging' AND reason='w1_owner_uat' LIMIT 1",[subject])).rows.length>0;
  }
  async quota(subject) {
    const {rows} = await this.pool.query(`SELECT quota,used,reserved FROM w1.entitlements WHERE subject=$1
      AND environment='staging' AND expires_at>now() AND revoked_at IS NULL
      UNION ALL SELECT quota,used,reserved FROM w1.test_grants WHERE subject=$1
      AND environment='staging' AND expires_at>now() AND revoked_at IS NULL`,[subject]);
    return { remaining:rows.reduce((n,r)=>n+r.quota-r.used-r.reserved,0) };
  }
  async create(subject, input) {
    const hash = createHash('sha256').update(JSON.stringify(canonical(input))).digest('hex');
    const id = await this.tx(async c => {
      // Locks the subject across both entitlement sources and request IDs.
      await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[subject]);
      const existing = await c.query('SELECT id,input_sha FROM w1.gua_records WHERE subject=$1 AND request_id=$2',[subject,input.request_id]);
      if (existing.rows.length) {
        if (existing.rows[0].input_sha !== hash) throw fail('REQUEST_CONTENT_CONFLICT',409);
        return existing.rows[0].id;
      }
      let source;
      for (const kind of ['entitlements','test_grants']) {
        const found = await c.query(`SELECT * FROM ${sourceTable(kind)} WHERE subject=$1 AND environment='staging'
          AND expires_at>now() AND revoked_at IS NULL AND used+reserved<quota ORDER BY expires_at,id LIMIT 1 FOR UPDATE`,[subject]);
        if (found.rows.length) { source={kind,row:found.rows[0]}; break; }
      }
      if (!source) throw fail('NO_QUOTA',409);
      const recordId = randomUUID();
      await c.query(`INSERT INTO w1.gua_records(id,subject,request_id,input_sha,input_json,push_key) VALUES($1,$2,$3,$4,$5,$6)`,
        [recordId,subject,input.request_id,hash,JSON.stringify(input),randomUUID()]);
      await c.query(`UPDATE ${sourceTable(source.kind)} SET reserved=reserved+1 WHERE id=$1`,[source.row.id]);
      await c.query('INSERT INTO w1.reservations(record_id,source_kind,source_id) VALUES($1,$2,$3)',[recordId,source.kind,source.row.id]);
      await c.query('INSERT INTO w1.jobs(record_id) VALUES($1)',[recordId]);
      await this.audit(c,'RESERVED',recordId); return recordId;
    });
    // Independent post-commit readback; failure never becomes a saved promise.
    try {
      const row = await this.get(subject,id);
      if (row.input_sha !== hash) throw fail('WRITE_UNCONFIRMED');
      return {...row,readback_verified:true};
    } catch { throw fail('WRITE_UNCONFIRMED'); }
  }
  async get(subject,id) {
    const {rows} = await this.pool.query('SELECT * FROM w1.gua_records WHERE subject=$1 AND id=$2',[subject,id]);
    if (!rows.length) throw fail('NOT_FOUND',404); return rows[0];
  }
  async createSafety(subject,input,result) {
    // Gate again at the persistence boundary; no caller can insert a full letter.
    const {safetyDelivery}=await import('./safety.js');
    result=safetyDelivery(result.output.text);
    const hash=createHash('sha256').update(JSON.stringify(canonical(input))).digest('hex');
    const id=await this.tx(async c=>{
      await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[subject]);
      const previous=(await c.query('SELECT id,input_sha FROM w1.gua_records WHERE subject=$1 AND request_id=$2',[subject,input.request_id])).rows[0];
      if(previous){if(previous.input_sha!==hash)throw fail('REQUEST_CONTENT_CONFLICT',409);return previous.id;}
      const active=await c.query("SELECT id FROM w1.test_grants WHERE subject=$1 AND environment='staging' AND expires_at>now() AND revoked_at IS NULL AND reason='w1_owner_uat' FOR SHARE",[subject]);
      if(!active.rows.length)throw fail('OWNER_GRANT_REQUIRED',403);
      const id=randomUUID();
      await c.query(`INSERT INTO w1.gua_records(id,subject,request_id,input_sha,input_json,push_key,state,output_json,raw_output,runtime_json,charge,notice,push_state,completed_at)
        VALUES($1,$2,$3,$4,$5,$6,'completed',$7,$8,$9,0,'none','pending',now())`,
        [id,subject,input.request_id,hash,JSON.stringify(input),randomUUID(),JSON.stringify(result.delivery),result.output.text,JSON.stringify(result.output.runtime)]);
      await this.audit(c,'SAFETY_BYPASS',id);return id;
    });
    try {const row=await this.get(subject,id);if(row.input_sha!==hash)throw fail('WRITE_UNCONFIRMED');return {...row,readback_verified:true};}
    catch {throw fail('WRITE_UNCONFIRMED');}
  }
  async list(subject) {
    return (await this.pool.query('SELECT * FROM w1.gua_records WHERE subject=$1 ORDER BY created_at DESC LIMIT 50',[subject])).rows;
  }
  async claim() {
    return this.tx(async c => {
      const {rows} = await c.query(`SELECT record_id FROM w1.jobs WHERE state='pending' ORDER BY record_id LIMIT 1 FOR UPDATE SKIP LOCKED`);
      if (!rows.length) return null;
      const id=rows[0].record_id;
      await c.query("UPDATE w1.jobs SET state='claimed',claimed_at=now() WHERE record_id=$1",[id]);
      return (await c.query("UPDATE w1.gua_records SET state='generating',started_at=now() WHERE id=$1 RETURNING *",[id])).rows[0];
    });
  }
  async settle(id,result,errorCode=null) {
    return this.tx(async c => {
      const {rows} = await c.query('SELECT * FROM w1.reservations WHERE record_id=$1 FOR UPDATE',[id]);
      const reservation=rows[0];
      if (!reservation || reservation.state!=='reserved') return false;
      const charge=result?.delivery.charge ?? 0;
      const grant=(await c.query(`UPDATE ${sourceTable(reservation.source_kind)} SET reserved=reserved-1,used=used+$2 WHERE id=$1 RETURNING *`,[reservation.source_id,charge])).rows[0];
      await c.query('UPDATE w1.reservations SET state=$2 WHERE record_id=$1',[id,charge?'confirmed':'released']);
      await c.query(`UPDATE w1.gua_records SET state=$2,output_json=$3,raw_output=$4,runtime_json=$5,charge=$6,
        notice=$7,push_state=$8,completed_at=now(),error_code=$9 WHERE id=$1`,
        [id,result?'completed':'failed',result?JSON.stringify(result.delivery):null,result?.output.text??null,
          result?JSON.stringify(result.output.runtime):null,charge,result?.delivery.notice??'failure',result?'pending':'not_ready',errorCode]);
      await c.query("UPDATE w1.jobs SET state='done' WHERE record_id=$1",[id]);
      await this.audit(c,charge?'CONFIRMED':'RELEASED',id,reservation.source_kind==='test_grants'?grant:null);
      return true;
    });
  }
  async alert(id,code) { await this.audit(this.pool,code,id); }
  async claimPush(subject,id) {
    const row=await this.get(subject,id);
    if(row.state!=='completed') throw fail('NOT_DELIVERABLE',409);
    return (await this.pool.query(`UPDATE w1.gua_records SET push_state='sending',push_started_at=now() WHERE subject=$1 AND id=$2
      AND push_state IN ('pending','failed','unknown') RETURNING *`,[subject,id])).rows[0]??null;
  }
  async nextPendingPush() {
    return (await this.pool.query("SELECT id,subject FROM w1.gua_records WHERE state='completed' AND push_state='pending' ORDER BY completed_at LIMIT 1")).rows[0]??null;
  }
  async reserveProviderCall(recordId,attempt,{campaign,budgetUsd,upperUsd,hardCapUsd}) {
    if(typeof campaign!=='string'||!campaign||!Number.isFinite(budgetUsd)||!Number.isFinite(upperUsd)||upperUsd<=0||budgetUsd<=0||!Number.isFinite(hardCapUsd)||hardCapUsd<=0)throw fail('PROVIDER_BUDGET_REQUIRED');
    await this.tx(async c=>{
      await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',['provider:'+campaign]);
      const used=Number((await c.query('SELECT COALESCE(sum(COALESCE(actual_usd,reserved_usd)),0) AS used FROM w1.provider_calls WHERE campaign=$1',[campaign])).rows[0].used);
      if(used+upperUsd>budgetUsd*.9)throw fail('PROVIDER_BUDGET_EXHAUSTED');
      await this.checkHardCap(c,upperUsd,hardCapUsd);
      await c.query('INSERT INTO w1.provider_calls(record_id,attempt,campaign,reserved_usd) VALUES($1,$2,$3,$4)',[recordId,attempt,campaign,upperUsd]);
    });
  }
  async existingRequest(subject,input) {
    const row=(await this.pool.query('SELECT * FROM w1.gua_records WHERE subject=$1 AND request_id=$2',[subject,input.request_id])).rows[0];
    if(row&&row.input_sha!==createHash('sha256').update(JSON.stringify(canonical(input))).digest('hex'))throw fail('REQUEST_CONTENT_CONFLICT',409);
    return row?{...row,readback_verified:true}:null;
  }
  async reserveSafetyCall(subject,{campaign,budgetUsd,upperUsd,hardCapUsd},input={request_id:randomUUID()}) {
    if(!campaign||!Number.isFinite(budgetUsd)||!Number.isFinite(upperUsd)||budgetUsd<=0||upperUsd<=0||!Number.isFinite(hardCapUsd)||hardCapUsd<=0)throw fail('SAFETY_BUDGET_REQUIRED');
    return this.tx(async c=>{
      await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',['safety:'+campaign]);
      await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',['safety-subject:'+subject]);
      const hash=createHash('sha256').update(JSON.stringify(canonical(input))).digest('hex');
      const old=(await c.query('SELECT * FROM w1.safety_calls WHERE subject=$1 AND request_id=$2',[subject,input.request_id])).rows[0];
      if(old){if(old.input_sha!==hash)throw fail('REQUEST_CONTENT_CONFLICT',409);if(!old.result_json)throw fail('SAFETY_CLASSIFICATION_UNRESOLVED');return {id:old.id,cached:true,result:old.result_json};}
      const active=await c.query("SELECT id FROM w1.test_grants WHERE subject=$1 AND environment='staging' AND expires_at>now() AND revoked_at IS NULL AND reason='w1_owner_uat' FOR SHARE",[subject]);
      if(!active.rows.length)throw fail('OWNER_GRANT_REQUIRED',403);
      const rate=Number((await c.query("SELECT count(*) AS n FROM w1.safety_calls WHERE subject=$1 AND created_at>now()-interval '60 seconds'",[subject])).rows[0].n);
      const spent=Number((await c.query('SELECT COALESCE(sum(COALESCE(actual_usd,reserved_usd)),0) AS n FROM w1.safety_calls WHERE campaign=$1',[campaign])).rows[0].n);
      if(rate>=6||spent+upperUsd>budgetUsd*.9)throw fail('SAFETY_BUDGET_EXHAUSTED',429);
      await this.checkHardCap(c,upperUsd,hardCapUsd);
      const id=randomUUID();await c.query('INSERT INTO w1.safety_calls(id,subject,campaign,reserved_usd,request_id,input_sha) VALUES($1,$2,$3,$4,$5,$6)',[id,subject,campaign,upperUsd,input.request_id,hash]);return {id,cached:false};
    });
  }
  // Owner cost ruling 2026-09-23: one hard cap across provider + safety spend. Settled calls count
  // their actual cost, unsettled calls their full reserve; the lock serializes both reserve paths.
  async checkHardCap(c,upperUsd,hardCapUsd) {
    await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',['w1-cost-hard-cap']);
    const total=Number((await c.query(`SELECT (SELECT COALESCE(sum(COALESCE(actual_usd,reserved_usd)),0) FROM w1.provider_calls)
      +(SELECT COALESCE(sum(COALESCE(actual_usd,reserved_usd)),0) FROM w1.safety_calls) AS n`)).rows[0].n);
    if(total+upperUsd>hardCapUsd)throw fail('COST_HARD_CAP_REACHED',429);
  }
  // Settle once from provider usage; a missing cost keeps the full reserve.
  async settleProviderCall(recordId,attempt,cost) {
    if(!cost)return false;
    const r=await this.pool.query(`UPDATE w1.provider_calls SET prompt_tokens=$3,cached_tokens=$4,candidates_tokens=$5,thoughts_tokens=$6,
      actual_usd=$7,settled_at=now() WHERE record_id=$1 AND attempt=$2 AND settled_at IS NULL`,
      [recordId,attempt,cost.prompt,cost.cached,cost.candidates,cost.thoughts,cost.usd]);
    return r.rowCount===1;
  }
  async settleSafetyCall(id,cost) {
    if(!cost)return false;
    const r=await this.pool.query(`UPDATE w1.safety_calls SET prompt_tokens=$2,cached_tokens=$3,candidates_tokens=$4,thoughts_tokens=$5,
      actual_usd=$6,settled_at=now() WHERE id=$1 AND settled_at IS NULL`,[id,cost.prompt,cost.cached,cost.candidates,cost.thoughts,cost.usd]);
    return r.rowCount===1;
  }
  async costTotal() {
    const q=async table=>(await this.pool.query(`SELECT count(*)::int AS calls,count(settled_at)::int AS settled,
      COALESCE(sum(actual_usd),0) AS actual,COALESCE(sum(reserved_usd) FILTER (WHERE settled_at IS NULL),0) AS open_reserve,
      COALESCE(sum(COALESCE(actual_usd,reserved_usd)),0) AS effective FROM ${table}`)).rows[0];
    const view=r=>({calls:r.calls,settled:r.settled,actual_usd:Number(r.actual),open_reserve_usd:Number(r.open_reserve),effective_usd:Number(r.effective)});
    const provider=view(await q('w1.provider_calls')),safety=view(await q('w1.safety_calls'));
    return {provider,safety,total_effective_usd:Math.round((provider.effective_usd+safety.effective_usd)*1e8)/1e8};
  }
  async recordCost(subject,recordId) {
    const attempts=(await this.pool.query(`SELECT attempt,reserved_usd,prompt_tokens,cached_tokens,candidates_tokens,thoughts_tokens,actual_usd,settled_at
      FROM w1.provider_calls WHERE record_id=$1 ORDER BY attempt`,[recordId])).rows;
    const safety=(await this.pool.query(`SELECT s.reserved_usd,s.prompt_tokens,s.cached_tokens,s.candidates_tokens,s.thoughts_tokens,s.actual_usd,s.settled_at
      FROM w1.safety_calls s JOIN w1.gua_records r ON r.subject=s.subject AND r.request_id=s.request_id WHERE r.id=$1 AND r.subject=$2`,[recordId,subject])).rows[0]??null;
    const row=x=>({reserved_usd:Number(x.reserved_usd),promptTokenCount:x.prompt_tokens,cachedContentTokenCount:x.cached_tokens,
      candidatesTokenCount:x.candidates_tokens,thoughtsTokenCount:x.thoughts_tokens,actual_usd:x.actual_usd===null?null:Number(x.actual_usd),settled:!!x.settled_at});
    return {generation_attempts:attempts.map(a=>({attempt:a.attempt,...row(a)})),safety_classification:safety?row(safety):null};
  }
  async claimSlowNotice() {
    return (await this.pool.query(`UPDATE w1.gua_records SET slow_notified=true WHERE id=(
      SELECT id FROM w1.gua_records WHERE state='generating' AND slow_notified=false
      AND started_at<now()-interval '90 seconds' ORDER BY started_at LIMIT 1)
      AND slow_notified=false RETURNING *`)).rows[0]??null;
  }
  async detectExpiredClaims() {
    // Two bounded provider calls are at most 600s; use a 720s uncertainty
    // boundary. Never lease/replay a generation whose provider outcome is unknown.
    const expired=(await this.pool.query("SELECT id FROM w1.gua_records WHERE state='generating' AND started_at<now()-interval '720 seconds'")).rows;
    for(const {id} of expired) {
      await this.tx(async c=>{
        const {rows}=await c.query('SELECT * FROM w1.reservations WHERE record_id=$1 FOR UPDATE',[id]);
        const r=rows[0];if(!r||r.state!=='reserved')return;
        await c.query(`UPDATE ${sourceTable(r.source_kind)} SET reserved=reserved-1 WHERE id=$1`,[r.source_id]);
        await c.query("UPDATE w1.reservations SET state='released' WHERE record_id=$1",[id]);
        await c.query("UPDATE w1.gua_records SET state='generation_unknown',charge=0,error_code='GENERATION_UNRESOLVED' WHERE id=$1",[id]);
        await c.query("UPDATE w1.jobs SET state='unknown' WHERE record_id=$1",[id]);
        await this.audit(c,'GENERATION_UNRESOLVED',id);
      });
    }
    await this.pool.query("UPDATE w1.gua_records SET push_state='unknown' WHERE push_state='sending' AND push_started_at<now()-interval '60 seconds'");
  }
  async pushResult(id,state) {
    if(!['sent','failed','unknown'].includes(state)) throw fail('PUSH_STATE_INVALID');
    await this.pool.query('UPDATE w1.gua_records SET push_state=$2 WHERE id=$1 AND push_state=\'sending\'',[id,state]);
  }
}
