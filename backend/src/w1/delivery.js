// Marker detection mirrors the frozen v34 run_battery.score skeleton checks.
// Consistency is checked BEFORE the sole exported charge classifier can run.
const enums = {
  zhu_li_ren: ['lao_yi', 'ming_heng'], main_kaguan: ['A','B','C','D','E','none'],
  sub_kaguan: ['A','B','C','D','E','none'], zou_xiang: ['ji_ji','zhong_xing','bao_shou','none'],
  redline: ['true','false'], level: ['green','yellow','red','crisis','none'],
  category: ['medical','financial','psych','employment','self_harm','legal','tax','violence','none'],
  standard_response: ['true','false'], hotline_given: ['true','false'],
};
const checked = new WeakSet();
const ORDER = ['GZ','J5','J2','J3','J4','J1','J6','ZY','NEXT'];
const HOTLINES = new Set(['1925','119','110','1995','1980','1966','0800507272','113']);
// v34 §4.0.3 overseas branch replaces every Taiwan dial instruction with this sentence (§9.3 1925 rule
// then does not apply). The urgent-harm-to-others branch opens with a fixed line and has no 113.
// The frozen battery accepts either 所在地 or 當地 for the overseas branch (LN-31).
const OVERSEAS_MARK = /(所在地|當地)的?緊急(救援)?(電話|號碼)/;
const URGENT_HARM_MARK = '先停下來';
export function requiredHotlineErrors(meta, raw) {
  if (OVERSEAS_MARK.test(raw)) return [];
  if (meta.category === 'self_harm') return raw.includes('1925') ? [] : ['HOTLINE_MISSING'];
  if (meta.category === 'violence') {
    const missing = [];
    if (!raw.includes('110')) missing.push('HOTLINE_MISSING');
    // Violence-safety branch (victim, incl. proxy asking) lists 113. The urgent-harm-to-others branch has
    // none, and a mixed crisis (self-harm + another person; battery LN-20 allows category violence) is the
    // 110 rescue line followed by the self-harm response with 1925 — neither needs 113.
    if (!raw.includes(URGENT_HARM_MARK) && !raw.includes('1925') && !raw.includes('113')) missing.push('HOTLINE_MISSING');
    return missing;
  }
  // No adopted v34 crisis branch exists for any other category: fail closed.
  return meta.level === 'crisis' ? ['CRISIS_CATEGORY_UNSUPPORTED'] : [];
}
export function checkConsistency(raw, finishReason = 'STOP') {
  const errors = [];
  if (typeof raw !== 'string' || raw.length > 200000) return { ok: false, errors: ['OUTPUT_INVALID'] };
  const block = raw.match(/#META_START\s*\n([\s\S]*?)\n\s*#META_END/);
  const meta = {};
  if (!block || !raw.trimStart().startsWith('#META_START')) errors.push('META_MISSING');
  else {
    for (const line of block[1].split('\n').map(s => s.trim()).filter(Boolean)) {
      const match = line.match(/^([a-z_]+):\s*(.*)$/);
      if (!match || Object.hasOwn(meta, match[1])) { errors.push('META_INVALID'); continue; }
      meta[match[1]] = match[2].trim();
    }
    if (Object.keys(meta).join() !== Object.keys(enums).join() ||
        Object.entries(enums).some(([k, values]) => !values.includes(meta[k]))) errors.push('META_INVALID');
  }
  const has = tag => (`\n${raw}`).includes(`\n[[${tag}]]`);
  const j = [1,2,3,4,5,6].filter(i => has(`J${i}`));
  const segments = {};
  const marks = [...raw.matchAll(/\[\[([A-Z0-9]+)\]\]/g)];
  for (let i = 0; i < marks.length; i++) {
    const tag = marks[i][1];
    if (Object.hasOwn(segments, tag)) errors.push('DUPLICATE_MARKER');
    segments[tag] = raw.slice(marks[i].index + marks[i][0].length, marks[i+1]?.index ?? raw.length).trim();
  }
  const sr = meta.standard_response === 'true';
  if (!raw.trimEnd().endsWith('[[END]]') || finishReason !== 'STOP') errors.push('OUTPUT_INCOMPLETE');
  if (sr ? (!has('SR') || j.length !== 0) :
    (j.length !== 6 || !has('ZY') || !has('NEXT') || has('SR'))) errors.push('SKELETON_MISMATCH');
  if (sr ? !segments.SR : [...j.map(i => `J${i}`), 'ZY', 'NEXT'].some(k => !segments[k])) errors.push('EMPTY_SECTION');
  if (meta.level === 'yellow' && !sr && !has('GZ')) errors.push('YELLOW_GZ_MISSING');
  if ((['red','crisis'].includes(meta.level)||meta.category==='self_harm') && !sr) errors.push('BOUNDARY_FULL_BODY');
  // Scope unchanged from the prior gate: crisis level, or any self-harm. Non-crisis violence (e.g. red
  // harm-intent standard response) carries no hotline and is not checked here.
  if (meta.level === 'crisis' || meta.category === 'self_harm') {
    // Category-aware required resources (GPT bounded ruling 2026-09-23, restoring adopted v34 §4.0.3/§9.3):
    // 1925 is the self-harm resource, not a universal crisis requirement. Requirements are a subset of
    // each v34 branch's exact text and never contradict the frozen battery.
    for (const code of requiredHotlineErrors(meta, raw)) errors.push(code);
    const patterns = [/【\s*(\d{3,4})\s*】/g,
      /(?:專線|熱線|撥打|請撥|快撥|電話|打給|打)[^0-9]{0,6}(\d{3,4})(?![0-9\-－—–])/g,
      /(?<![0-9])(0800-?\d{3}-?\d{3})(?![0-9])/g];
    if (patterns.some(p => [...raw.matchAll(p)].some(m => !HOTLINES.has(m[1].replaceAll('-', ''))))) errors.push('HOTLINE_NOT_ALLOWED');
  }
  if (errors.length) return { ok: false, errors: [...new Set(errors)] };
  const value = Object.freeze({ meta: Object.freeze(meta), segments: Object.freeze(segments), j: Object.freeze(j), hasSR: sr });
  checked.add(value);
  return { ok: true, value };
}
export function classifyDelivery(value) {
  if (!checked.has(value)) throw new Error('CONSISTENCY_REQUIRED');
  const charge = value.j.length === 6 ? 1 : 0;
  const crisis = value.meta.level === 'crisis' || value.meta.category === 'self_harm';
  const notice = charge || crisis ? 'none' : value.meta.level === 'green' ? 'guidance' : 'boundary';
  return Object.freeze({ charge, notice, meta: value.meta,
    sections: (value.hasSR ? ['SR'] : ORDER).filter(k => value.segments[k]).map(k => ({ tag: k, text: value.segments[k] })),
  });
}

// Evidence for a rejected attempt: fixed codes, finish reason and token counts only — never the question,
// the model text or any identity (GPT bounded ruling 2026-09-23, minimal observability).
export function attemptEvidence(attempt, output, errors) {
  const u = output?.runtime?.usage ?? {};
  const n = v => Number.isInteger(v) ? v : null;
  return { attempt, finish_reason: typeof output?.finishReason === 'string' ? output.finishReason : null,
    consistency_error_codes: errors,
    usage: { prompt: n(u.input), cached: n(u.cached), candidates: n(u.output), thoughts: n(u.thinking) } };
}
// accept(value) may add route-specific rejection codes to an otherwise consistent output.
export async function generateChecked(generate, alert, { accept } = {}) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const output = await generate(attempt);
    const result = checkConsistency(output.text, output.finishReason);
    const errors = result.ok ? (accept ? accept(result.value) : []) : result.errors;
    if (!errors.length) return { output, delivery: classifyDelivery(result.value) };
    await alert('CONSISTENCY_FAILED', attemptEvidence(attempt, output, errors));
  }
  throw new Error('NO_DELIVERY');
}
