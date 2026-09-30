CREATE TABLE w1.yaoci (
 gua_no smallint NOT NULL CHECK(gua_no BETWEEN 1 AND 64), gua_name text NOT NULL,
 gua_ci text NOT NULL, dong_yao smallint NOT NULL CHECK(dong_yao BETWEEN 1 AND 6),
 yao_pos text NOT NULL, yao_ci text NOT NULL, source_sha text NOT NULL,
 PRIMARY KEY(gua_no,dong_yao)
);
CREATE TABLE w1.classic_text (
 gua_no smallint PRIMARY KEY CHECK(gua_no BETWEEN 1 AND 64), tuan text NOT NULL,
 daxiang text NOT NULL, source_sha text NOT NULL,
 edition_status text NOT NULL CHECK(edition_status='CANDIDATE_EDITION_UNVERIFIED')
);
