ALTER TABLE w1.provider_calls
 ADD COLUMN prompt_tokens integer CHECK(prompt_tokens>=0),
 ADD COLUMN cached_tokens integer CHECK(cached_tokens>=0),
 ADD COLUMN candidates_tokens integer CHECK(candidates_tokens>=0),
 ADD COLUMN thoughts_tokens integer CHECK(thoughts_tokens>=0),
 ADD COLUMN actual_usd numeric CHECK(actual_usd>=0),
 ADD COLUMN settled_at timestamptz;
ALTER TABLE w1.safety_calls
 ADD COLUMN prompt_tokens integer CHECK(prompt_tokens>=0),
 ADD COLUMN cached_tokens integer CHECK(cached_tokens>=0),
 ADD COLUMN candidates_tokens integer CHECK(candidates_tokens>=0),
 ADD COLUMN thoughts_tokens integer CHECK(thoughts_tokens>=0),
 ADD COLUMN actual_usd numeric CHECK(actual_usd>=0),
 ADD COLUMN settled_at timestamptz;
