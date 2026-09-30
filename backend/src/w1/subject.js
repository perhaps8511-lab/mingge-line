import { createPublicKey, verify } from 'node:crypto';

export const AUTH_REASON_CODES = Object.freeze([
  'AUTH_TOKEN_MISSING', 'AUTH_TOKEN_INVALID', 'AUTH_REQUEST_ID_INVALID',
  'AUTH_JWT_FORMAT_INVALID', 'AUTH_JWT_HEADER_INVALID', 'AUTH_KID_MISMATCH',
  'AUTH_SIGNATURE_INVALID', 'AUTH_CLAIMS_INVALID', 'AUTH_CLAIMS_TIME_INVALID',
  'AUTH_CLAIMS_CONTEXT_INVALID', 'AUTH_SUBJECT_INVALID', 'AUTH_JTI_INVALID',
  'AUTH_SOURCE_INVALID', 'AUTH_REQUEST_CLAIM_MISMATCH', 'AUTH_JTI_REJECTED',
  'AUTH_JTI_STORAGE_ERROR', 'AUTH_INTERNAL_ERROR',
]);
const authReasonCodeSet = new Set(AUTH_REASON_CODES);
export const isAuthReasonCode = value => authReasonCodeSet.has(value);

const forbidden = new Set(['subject', 'line_user_id', 'line_user_id_raw', 'user', 'userId']);
export function rejectClientIdentity(value) {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (forbidden.has(key)) throw Object.assign(new Error('BAD_FIELD'), { status: 400 });
    rejectClientIdentity(child);
  }
}
const unauthorized = authReasonCode => Object.assign(new Error('UNAUTHORIZED'), {
  status: 401,
  authReasonCode: isAuthReasonCode(authReasonCode) ? authReasonCode : 'AUTH_INTERNAL_ERROR',
});
function decode(part, reasonCode) {
  if (typeof part !== 'string' || !/^[A-Za-z0-9_-]+$/.test(part)) throw unauthorized(reasonCode);
  const bytes = Buffer.from(part, 'base64url');
  if (bytes.toString('base64url') !== part) throw unauthorized(reasonCode);
  return bytes;
}

// Identity bridge A: sub IS the Worker-verified LINE userId. No client fallback.
// consumeJti must atomically INSERT ... ON CONFLICT DO NOTHING in the owning DB.
export function createSubjectVerifier({ publicKey, kid, consumeJti, clock = () => Date.now() }) {
  const key = createPublicKey(publicKey);
  if (key.asymmetricKeyType !== 'ed25519' || typeof consumeJti !== 'function') {
    throw new Error('INVALID_AUTH_CONFIGURATION');
  }
  return async function authenticate({ token, requestId, body = {}, query = {} }) {
    rejectClientIdentity(body);
    rejectClientIdentity(query);
    try {
      if (token === undefined || token === null || token === '') throw unauthorized('AUTH_TOKEN_MISSING');
      if (typeof token !== 'string' || token.length > 4096) throw unauthorized('AUTH_TOKEN_INVALID');
      if (typeof requestId !== 'string' || !requestId || requestId.length > 128) throw unauthorized('AUTH_REQUEST_ID_INVALID');
      const pieces = token.split('.');
      if (pieces.length !== 3) throw unauthorized('AUTH_JWT_FORMAT_INVALID');
      const [head, payload, signature] = pieces;
      let header;
      try { header = JSON.parse(decode(head, 'AUTH_JWT_HEADER_INVALID')); }
      catch { throw unauthorized('AUTH_JWT_HEADER_INVALID'); }
      if (!header || typeof header !== 'object' || Array.isArray(header)) throw unauthorized('AUTH_JWT_HEADER_INVALID');
      if (header.alg !== 'EdDSA' || header.typ !== 'JWT' ||
          Object.keys(header).some(k => !['alg', 'typ', 'kid'].includes(k))) throw unauthorized('AUTH_JWT_HEADER_INVALID');
      if (kid !== undefined && header.kid !== kid) throw unauthorized('AUTH_KID_MISMATCH');
      let signatureBytes;
      try { signatureBytes = decode(signature, 'AUTH_SIGNATURE_INVALID'); }
      catch { throw unauthorized('AUTH_SIGNATURE_INVALID'); }
      let signatureValid;
      try { signatureValid = verify(null, Buffer.from(`${head}.${payload}`), key, signatureBytes); }
      catch { throw unauthorized('AUTH_SIGNATURE_INVALID'); }
      if (!signatureValid) throw unauthorized('AUTH_SIGNATURE_INVALID');
      let claims;
      try { claims = JSON.parse(decode(payload, 'AUTH_CLAIMS_INVALID')); }
      catch { throw unauthorized('AUTH_CLAIMS_INVALID'); }
      if (!claims || typeof claims !== 'object' || Array.isArray(claims)) throw unauthorized('AUTH_CLAIMS_INVALID');
      const now = Math.floor(clock() / 1000);
      if (!Number.isInteger(claims.iat) || !Number.isInteger(claims.exp) || claims.iat > now ||
          claims.exp <= now || claims.exp <= claims.iat || claims.exp - claims.iat > 120) {
        throw unauthorized('AUTH_CLAIMS_TIME_INVALID');
      }
      if (claims.iss !== 'mingge-relay' || claims.aud !== 'mingge-api') throw unauthorized('AUTH_CLAIMS_CONTEXT_INVALID');
      if (typeof claims.sub !== 'string' || !/^U[0-9a-f]{32}$/.test(claims.sub)) throw unauthorized('AUTH_SUBJECT_INVALID');
      if (typeof claims.jti !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(claims.jti)) {
        throw unauthorized('AUTH_JTI_INVALID');
      }
      if (!['liff', 'line_webhook'].includes(claims.src)) throw unauthorized('AUTH_SOURCE_INVALID');
      if (claims.req !== requestId || (body.request_id !== undefined && body.request_id !== requestId)) {
        throw unauthorized('AUTH_REQUEST_CLAIM_MISMATCH');
      }
      let consumed;
      try { consumed = await consumeJti(claims.jti, claims.exp); }
      catch { throw unauthorized('AUTH_JTI_STORAGE_ERROR'); }
      if (consumed !== true) throw unauthorized('AUTH_JTI_REJECTED');
      return Object.freeze({ subject: claims.sub, requestId, source: claims.src });
    } catch (error) {
      if (error?.message === 'UNAUTHORIZED' && isAuthReasonCode(error.authReasonCode)) throw error;
      throw unauthorized('AUTH_INTERNAL_ERROR');
    }
  };
}

export function postgresJtiConsumer(pool) {
  return async (jti, exp) => {
    const result = await pool.query(
      'INSERT INTO w1_subject_jti (jti, expires_at) VALUES ($1, to_timestamp($2)) ON CONFLICT DO NOTHING RETURNING jti',
      [jti, exp],
    );
    return result.rowCount === 1;
  };
}
