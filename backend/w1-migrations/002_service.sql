-- Isolated W1 schema. Never runs legacy backfill/cleanup/sync migrations.
CREATE SCHEMA w1;
CREATE TABLE w1.entitlements (
 id uuid PRIMARY KEY, subject text NOT NULL, environment text NOT NULL CHECK(environment='staging'),
 quota integer NOT NULL CHECK(quota>=0), used integer NOT NULL DEFAULT 0 CHECK(used>=0),
 reserved integer NOT NULL DEFAULT 0 CHECK(reserved>=0), expires_at timestamptz NOT NULL,
 revoked_at timestamptz, CHECK(used+reserved<=quota)
);
CREATE TABLE w1.test_grants (
 id uuid PRIMARY KEY, subject text NOT NULL, environment text NOT NULL CHECK(environment='staging'),
 quota integer NOT NULL CHECK(quota>0), used integer NOT NULL DEFAULT 0 CHECK(used>=0),
 reserved integer NOT NULL DEFAULT 0 CHECK(reserved>=0), expires_at timestamptz NOT NULL,
 revoked_at timestamptz, granted_by text NOT NULL, reason text NOT NULL,
 enrollment_id text NOT NULL UNIQUE, created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(used+reserved<=quota)
);
CREATE TABLE w1.gua_records (
 id uuid PRIMARY KEY, subject text NOT NULL, request_id text NOT NULL, input_sha text NOT NULL,
 input_json jsonb NOT NULL, state text NOT NULL DEFAULT 'queued'
 CHECK(state IN ('queued','generating','completed','failed','generation_unknown')),
 output_json jsonb, raw_output text, runtime_json jsonb,
 charge integer NOT NULL DEFAULT 0 CHECK(charge IN (0,1)),
 notice text NOT NULL DEFAULT 'none', push_state text NOT NULL DEFAULT 'not_ready'
 CHECK(push_state IN ('not_ready','pending','sending','sent','unknown','failed')),
 push_key uuid NOT NULL, push_started_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), started_at timestamptz,
 completed_at timestamptz, slow_notified boolean NOT NULL DEFAULT false,
 error_code text, legacy_source_airtable_id text, UNIQUE(subject,request_id)
);
CREATE TABLE w1.reservations (
 record_id uuid PRIMARY KEY REFERENCES w1.gua_records(id),
 source_kind text NOT NULL CHECK(source_kind IN ('entitlements','test_grants')),
 source_id uuid NOT NULL, state text NOT NULL DEFAULT 'reserved' CHECK(state IN ('reserved','confirmed','released'))
);
CREATE TABLE w1.jobs (
 record_id uuid PRIMARY KEY REFERENCES w1.gua_records(id),
 state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','claimed','done','unknown')),
 claimed_at timestamptz
);
CREATE TABLE w1.audit_events (
 id uuid PRIMARY KEY, record_id uuid, code text NOT NULL,
 grant_id uuid, remaining integer, granted_by text, reason text,
 created_at timestamptz NOT NULL DEFAULT now()
);
