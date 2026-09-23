// Actual-cost settlement from provider usageMetadata (Owner cost ruling 2026-09-23).
// Source: https://ai.google.dev/gemini-api/docs/pricing (Last updated 2026-09-22), Standard paid tier.
// Output price includes thinking tokens; implicit-cache hits bill at the context-caching rate.
// Unknown model, expired price or incomplete usage returns null: the caller then keeps the full
// reserve (conservative), never guesses a lower cost.
export const PRICES=Object.freeze({
  'gemini-3.7-flash':Object.freeze({inputPerToken:0.75e-6,cachedPerToken:0.075e-6,outputPerToken:3.75e-6,validThrough:'2026-12-31T23:59:59Z'}),
});
const count=v=>Number.isInteger(v)&&v>=0;
// Settle only on complete usage: prompt, candidates and thoughts must each be present as an
// integer; missing or null never becomes zero (the full reserve is then kept). The one exception is
// cachedContentTokenCount: absent/null is priced as no cache hit, which bills every prompt token at
// the full input rate, so it can only over-state cost, never under-state it.
export function actualCost(model,usage,now=Date.now()) {
  const price=PRICES[model];
  if(!price||now>Date.parse(price.validThrough)||!usage||typeof usage!=='object')return null;
  const prompt=usage.input,candidates=usage.output,thoughts=usage.thinking;
  const cached=usage.cached===undefined||usage.cached===null?0:usage.cached;
  if(!count(prompt)||!count(candidates)||!count(thoughts)||!count(cached)||cached>prompt)return null;
  const usd=(prompt-cached)*price.inputPerToken+cached*price.cachedPerToken+(candidates+thoughts)*price.outputPerToken;
  return {usd:Math.round(usd*1e8)/1e8,prompt,cached,candidates,thoughts};
}
