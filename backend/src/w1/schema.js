import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
export async function migrateW1(pool) {
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT pg_advisory_xact_lock(10210921)");
    await client.query('CREATE TABLE IF NOT EXISTS w1_migrations(filename text PRIMARY KEY,sha256 text NOT NULL)');
    const dir=new URL('../../w1-migrations/',import.meta.url);
    for(const name of readdirSync(dir).filter(n=>n.endsWith('.sql')).sort()) {
      const bytes=readFileSync(new URL(name,dir)),sha=createHash('sha256').update(bytes).digest('hex');
      const old=await client.query('SELECT sha256 FROM w1_migrations WHERE filename=$1',[name]);
      if(old.rows.length){if(old.rows[0].sha256!==sha)throw new Error('MIGRATION_SHA_MISMATCH');continue;}
      await client.query(bytes.toString('utf8'));await client.query('INSERT INTO w1_migrations VALUES($1,$2)',[name,sha]);
    }
    await client.query('COMMIT');
  } catch(e) {await client.query('ROLLBACK');throw e;}finally{client.release();}
}
export async function seedYaoci(store,data) {
  return store.tx(async c=>{
    for(const g of data.hexagrams) {
      for(const y of g.yao.filter(y=>y.yao_no>=1&&y.yao_no<=6)) {
        await c.query(`INSERT INTO w1.yaoci VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING`,
          [g.gua_no,g.gua_name,g.fields.gua_ci,y.yao_no,y.position,y.text,data.rag_sha256]);
      }
      await c.query('INSERT INTO w1.classic_text VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING',
        [g.gua_no,g.fields.tuan,g.fields.daxiang,data.rag_sha256,'CANDIDATE_EDITION_UNVERIFIED']);
    }
    const {rows}=await c.query('SELECT * FROM w1.yaoci ORDER BY gua_no,dong_yao');
    if(rows.length!==384)throw new Error('YAOCI_COUNT');
    for(const row of rows) {
      const g=data.hexagrams.find(x=>x.gua_no===row.gua_no),y=g?.yao.find(x=>x.yao_no===row.dong_yao);
      if(!y||row.gua_ci!==g.fields.gua_ci||row.yao_pos!==y.position||row.yao_ci!==y.text||row.source_sha!==data.rag_sha256)throw new Error('YAOCI_READBACK_MISMATCH');
    }
    return {rows:384,fieldsCompared:1152,sourceSha:data.rag_sha256};
  });
}
