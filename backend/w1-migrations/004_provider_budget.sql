CREATE TABLE w1.provider_calls (
 record_id uuid NOT NULL REFERENCES w1.gua_records(id), attempt integer NOT NULL CHECK(attempt IN (0,1)),
 campaign text NOT NULL, reserved_usd numeric NOT NULL CHECK(reserved_usd>0),
 created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(record_id,attempt)
);
