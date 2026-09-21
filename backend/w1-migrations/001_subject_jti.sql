-- Explicit W1 staging migration, intentionally outside the legacy auto-run set.
-- Execute only against the verified isolated staging owning store.
CREATE TABLE w1_subject_jti (
  jti uuid PRIMARY KEY,
  expires_at timestamptz NOT NULL
);
CREATE INDEX w1_subject_jti_expiry ON w1_subject_jti(expires_at);
