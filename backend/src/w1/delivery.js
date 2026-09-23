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
// v34 §4.0.3 overseas branch replaces every Taiwan dial instruction (§9.3 1925 rule then does not apply).
// The exemption needs BOTH a request-side overseas sign (context.overseas, computed from the question —
// never trusted from model output alone) and an output that points to local help (battery LN-31 accepts
// 當地 or 所在地). Foreign numbers are never allowed (v34: no local numbers; battery bans 911/988).
const LOCAL_HELP = /(所在地|當地)/;
const FOREIGN_EMERGENCY = /(?<![0-9])(911|988|999|112|000)(?![0-9])/;
const URGENT_HARM_MARK = '先停下來';          // v34 urgent-harm-to-others branch opener (no 113)
const VICTIM_SAFETY_MARK = '你現在的安全最重要'; // v34 violence-safety branch opener (lists 113)
export function requiredHotlineErrors(meta, raw, context = {}) {
  const errors = FOREIGN_EMERGENCY.test(raw) ? ['HOTLINE_NOT_ALLOWED'] : [];
  if (context.overseas === true && LOCAL_HELP.test(raw)) return errors;
  if (meta.category === 'self_harm') return raw.includes('1925') ? errors : [...errors, 'HOTLINE_MISSING'];
  if (meta.category === 'violence') {
    if (!raw.includes('110')) errors.push('HOTLINE_MISSING');
    // Victim safety (incl. proxy asking) must list 113. Urgent harm to others has none; a mixed crisis
    // (self-harm + another person; battery LN-20 allows category violence) is the 110 rescue line plus the
    // self-harm response with 1925. Otherwise one of 113 / 1925 / the urgent-harm opener must be present.
    if (raw.includes(VICTIM_SAFETY_MARK) ? !raw.includes('113') :
        !(raw.includes('113') || raw.includes('1925') || raw.includes(URGENT_HARM_MARK))) errors.push('HOTLINE_MISSING');
    return errors;
  }
  // No adopted v34 crisis branch exists for any other category: fail closed.
  return meta.level === 'crisis' ? [...errors, 'CRISIS_CATEGORY_UNSUPPORTED'] : errors;
}
// context.overseas: request-side overseas sign (see requiredHotlineErrors); defaults to Taiwan.
export function checkConsistency(raw, finishReason = 'STOP', context = {}) {
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
    for (const code of requiredHotlineErrors(meta, raw, context)) errors.push(code);
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
export async function generateChecked(generate, alert, { accept, context } = {}) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const output = await generate(attempt);
    const result = checkConsistency(output.text, output.finishReason, context);
    const errors = result.ok ? (accept ? accept(result.value) : []) : result.errors;
    if (!errors.length) return { output, delivery: classifyDelivery(result.value) };
    await alert('CONSISTENCY_FAILED', attemptEvidence(attempt, output, errors));
  }
  throw new Error('NO_DELIVERY');
}
