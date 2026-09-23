// Pure cost/ordering logic for the W1 Owner QA runner (Owner cost ruling 2026-09-23). Browser + Node.
export const HARD_CAP_USD=30;          // provider + safety + canary, all W1 spend
export const WARN_AT_USD=20;           // advisory only (reference discussion); the cap is the stop rule
export const CANARY_CAP_USD=0.10;      // external canary ledger, counted toward the cap
// One measured generation (0.0497) + classifier upper (0.0112), rounded up; used only before any
// new case in this run has an actual cost.
export const BASELINE_CASE_USD=0.07;
// Targeted gate: 4 historical-only crisis exceptions (no waiver for new runtime), the contract
// stability set, then prefix-stratified cases evenly spaced in suite order.
export const TARGETED_20=Object.freeze(['LN-22','LN-26','LN-27','LN-30','LN-06','LN-11','LN-32','D4-228','D4-225','D4-247',
  'D4-241','D4-212','D4-219','JG-12','JG-14','JG-09','LD-04','LD-11','LD-09-B','LN-20']);
export function orderCases(cases) {
  const byKey=new Map(cases.map(c=>[c.case_key,c]));
  if(TARGETED_20.some(k=>!byKey.has(k)))throw new Error('TARGETED_CASE_MISSING');
  return [...TARGETED_20.map(k=>byKey.get(k)),...cases.filter(c=>!TARGETED_20.includes(c.case_key))];
}
// Cost of one case: settled actuals; any unsettled attempt counts at its full reserve.
export function caseCost(cost) {
  const parts=[...(cost?.generation_attempts??[]),...(cost?.safety_classification?[cost.safety_classification]:[])];
  const usd=parts.reduce((n,p)=>n+(p.settled&&p.actual_usd!==null?p.actual_usd:p.reserved_usd),0);
  return {usd:Math.round(usd*1e8)/1e8,unsettled:parts.filter(p=>!p.settled).length,attempts:cost?.generation_attempts?.length??0};
}
export function projection({totalEffectiveUsd,newCaseCosts,remainingCases}) {
  const avg=newCaseCosts.length?newCaseCosts.reduce((a,b)=>a+b,0)/newCaseCosts.length:BASELINE_CASE_USD;
  const projected=totalEffectiveUsd+CANARY_CAP_USD+avg*remainingCases;
  return {avg_case_usd:Math.round(avg*1e6)/1e6,projected_total_usd:Math.round(projected*1e4)/1e4,
    stop:projected>HARD_CAP_USD,warn:totalEffectiveUsd+CANARY_CAP_USD>=WARN_AT_USD};
}
// Receipt summary: the tokens/cost baseline requested by the Owner ruling.
export function summarize(rows) {
  const attempts=rows.flatMap(r=>r.cost?.generation_attempts??[]);
  const sum=k=>attempts.reduce((n,a)=>n+(a[k]??0),0);
  const prompt=sum('promptTokenCount'),cached=sum('cachedContentTokenCount');
  const safety=rows.map(r=>r.cost?.safety_classification).filter(Boolean);
  const actual=list=>Math.round(list.reduce((n,a)=>n+(a.actual_usd??0),0)*1e6)/1e6;
  return {cases:rows.length,generation_attempts:attempts.length,cases_with_regeneration:rows.filter(r=>(r.cost?.generation_attempts?.length??0)>1).length,
    unsettled_attempts:attempts.filter(a=>!a.settled).length,
    promptTokenCount:prompt,cachedContentTokenCount:cached,candidatesTokenCount:sum('candidatesTokenCount'),thoughtsTokenCount:sum('thoughtsTokenCount'),
    cache_hit_ratio:prompt?Math.round(cached/prompt*1e4)/1e4:null,
    generation_actual_usd:actual(attempts),safety_actual_usd:actual(safety),safety_calls:safety.length};
}
