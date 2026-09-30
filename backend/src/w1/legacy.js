import { createHash } from 'node:crypto';
import { readthroughAdmission } from './admission.js';

const refuse = code => Object.assign(new Error(code), { status: 503 });
const fingerprint = value => createHash('sha256').update(value).digest('hex');

// Unwired until C1-C5 have real deployment evidence. No DB, cache or logger.
export function createLegacyReader({ evidence, token, tokenSha256, base, table,
  environment, isOwnerTestGrant, fetchImpl = fetch }) {
  const admission = readthroughAdmission(evidence);
  if (admission.status !== 'EVIDENCE_RECORDED' || environment !== 'staging' ||
      typeof token !== 'string' || !token || !/^[a-f0-9]{64}$/.test(tokenSha256 || '') ||
      fingerprint(token) !== tokenSha256 ||
      !/^app[A-Za-z0-9]+$/.test(base || '') || !/^tbl[A-Za-z0-9]+$/.test(table || '') ||
      typeof isOwnerTestGrant !== 'function') throw refuse('NEEDS_BOUNDED_CHANGE');
  return async function readLegacy(auth) {
    if (!auth || !/^U[0-9a-f]{32}$/.test(auth.subject || '')) throw refuse('SUBJECT_BINDING_REQUIRED');
    // Must query current owning grant state: owner binding, environment, expiry,
    // and revocation. No cached grant decisions and no body-supplied identity.
    if (await isOwnerTestGrant(auth.subject, 'staging') !== true) throw refuse('OWNER_TEST_GRANT_REQUIRED');
    const url = new URL(`https://api.airtable.com/v0/${base}/${table}`);
    url.searchParams.set('filterByFormula', `AND({line_user_id_raw}="${auth.subject}",{entry_type}="divination")`);
    url.searchParams.set('maxRecords', '50');
    url.searchParams.set('sort[0][field]', 'qigua_time');
    url.searchParams.set('sort[0][direction]', 'desc');
    for (const field of ['line_user_id_raw', 'entry_type', 'session_id', 'qigua_time', 'ben_gua', 'question_text', 'output_json']) {
      url.searchParams.append('fields[]', field);
    }
    try {
      const response = await fetchImpl(url, { method: 'GET', headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw refuse('LEGACY_READ_UNAVAILABLE');
      const data = await response.json();
      if (!Array.isArray(data.records) || data.records.length > 50) throw refuse('LEGACY_READ_UNAVAILABLE');
      return data.records.map(row => {
        const f = row.fields;
        if (!/^rec[A-Za-z0-9]+$/.test(row.id || '') || !f ||
            f.line_user_id_raw !== auth.subject || f.entry_type !== 'divination') {
          throw refuse('LEGACY_READ_UNAVAILABLE');
        }
        const result = { id: row.id, origin: 'legacy', writable: false };
        for (const field of ['session_id', 'qigua_time', 'ben_gua', 'question_text', 'output_json']) {
          if (f[field] !== undefined) {
            if (typeof f[field] !== 'string') throw refuse('LEGACY_READ_UNAVAILABLE');
            result[field] = f[field];
          }
        }
        return Object.freeze(result);
      });
    } catch { throw refuse('LEGACY_READ_UNAVAILABLE'); }
  };
}

export function mergeRecords(current, legacy) {
  // Both inputs must already have passed subject filtering.
  const ids = new Set(current.map(r => r.legacy_source_airtable_id).filter(Boolean));
  const sessions = new Set(current.map(r => r.request_id).filter(Boolean));
  return [...current, ...legacy.filter(r => !ids.has(r.id) && !(r.session_id && sessions.has(r.session_id)))];
}
