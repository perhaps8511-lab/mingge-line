// Evidence is supplied by trusted deployment configuration, never an HTTP body.
// This module reports missing evidence; booleans are not credential-scope proof.
export const BASIS = Object.freeze({
  contract: 'f4fef807f372dbd69eba81e9889f8f5b308fde3789759ac4b0e159ac5f054bd9',
  plan: 'fde0b7338b30759e5622a7f78c35938e5e1ba152dc218a432534e6fd1782887e',
  prompt: 'be08968c3226d55aa963ad7de12c6251f0365887f051f5e7d77b0847d395287a',
});
export function readthroughAdmission(evidence = {}) {
  const checks = ['C1', 'C2', 'C3', 'C4', 'C5'].map(id => ({
    id, status: evidence[id]?.status === 'PASS' &&
      typeof evidence[id]?.reference === 'string' && evidence[id].reference.trim()
      ? 'PASS' : 'UNKNOWN',
  }));
  return Object.freeze({
    status: checks.every(c => c.status === 'PASS') ? 'EVIDENCE_RECORDED' : 'NEEDS_BOUNDED_CHANGE',
    checks,
  });
}
export const A11 = Object.freeze({
  threshold_status: 'ENGINEERING_CANDIDATE', blocking: false,
  exactDuplicateRate: 0.05, similarity: 0.9, similarPairRate: 0.10,
  owner_adoption: 'pending', recalibrate_after_first_125: true,
});
