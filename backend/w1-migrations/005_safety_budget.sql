CREATE TABLE w1.safety_calls (
 id uuid PRIMARY KEY, subject text NOT NULL, campaign text NOT NULL,
 request_id text NOT NULL, input_sha text NOT NULL, result_json jsonb,
 runtime_json jsonb, reserved_usd numeric NOT NULL CHECK(reserved_usd>0), created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(subject,request_id)
);
CREATE INDEX safety_calls_subject_time ON w1.safety_calls(subject,created_at);
