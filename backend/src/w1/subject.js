import { createPublicKey, verify } from 'node:crypto';

const forbidden = new Set(['subject', 'line_user_id', 'line_user_id_raw', 'user', 'userId']);
export function rejectClientIdentity(value) {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (forbidden.has(key)) throw Object.assign(new Error('BAD_FIELD'), { status: 400 });
    rejectClientIdentity(child);
  }
}
const unauthorized = () => Object.assign(new Error('UNAUTHORIZED'), { status: 401 });
function decode(part) {
  if (!/^[A-Za-z0-9_-]+$/.test(part)) throw unauthorized();
  const bytes = Buffer.from(part, 'base64url');
  if (bytes.toString('base64url') !== part) throw unauthorized();
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
      if (typeof token !== 'string' || token.length > 4096 ||
          typeof requestId !== 'string' || !requestId || requestId.length > 128) throw unauthorized();
      const pieces = token.split('.');
      if (pieces.length !== 3) throw unauthorized();
      const [head, payload, signature] = pieces;
      const header = JSON.parse(decode(head));
      if (header.alg !== 'EdDSA' || header.typ !== 'JWT' ||
          Object.keys(header).some(k => !['alg', 'typ', 'kid'].includes(k)) ||
          (kid !== undefined && header.kid !== kid)) throw unauthorized();
      if (!verify(null, Buffer.from(`${head}.${payload}`), key, decode(signature))) throw unauthorized();
      const claims = JSON.parse(decode(payload));
      const now = Math.floor(clock() / 1000);
      if (claims.iss !== 'mingge-relay' || claims.aud !== 'mingge-api' ||
          !/^U[0-9a-f]{32}$/.test(claims.sub) ||
          !Number.isInteger(claims.iat) || !Number.isInteger(claims.exp) ||
          claims.iat > now || claims.exp <= now || claims.exp <= claims.iat ||
          claims.exp - claims.iat > 120 ||
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(claims.jti) ||
          !['liff', 'line_webhook'].includes(claims.src) || claims.req !== requestId ||
          (body.request_id !== undefined && body.request_id !== requestId)) throw unauthorized();
      if (await consumeJti(claims.jti, claims.exp) !== true) throw unauthorized();
      return Object.freeze({ subject: claims.sub, requestId, source: claims.src });
    } catch { throw unauthorized(); }
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
