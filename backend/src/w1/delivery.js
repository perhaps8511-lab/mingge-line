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
  if (meta.level === 'crisis' || meta.category === 'self_harm') {
    if (!raw.includes('1925')) errors.push('HOTLINE_MISSING');
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

export async function generateChecked(generate, alert) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const output = await generate(attempt);
    const result = checkConsistency(output.text, output.finishReason);
    if (result.ok) return { output, delivery: classifyDelivery(result.value) };
    await alert('CONSISTENCY_FAILED');
  }
  throw new Error('NO_DELIVERY');
}
