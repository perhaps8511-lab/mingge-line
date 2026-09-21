import pg from 'pg';
import {migrateW1,seedYaoci} from '../src/w1/schema.js';
import {W1Store} from '../src/w1/store.js';
import {loadClassics} from '../src/w1/classics.js';
if(process.env.W1_ENVIRONMENT!=='staging'||!process.env.W1_DATABASE_URL)throw new Error('W1_STAGING_REQUIRED');
const pool=new pg.Pool({connectionString:process.env.W1_DATABASE_URL});
try {await migrateW1(pool);const result=await seedYaoci(new W1Store(pool),loadClassics(new URL('../data/classics-candidate.json',import.meta.url)));
 console.log(JSON.stringify({status:'PASS',...result}));}
catch{console.error('W1_MIGRATION_FAILED');process.exitCode=1;}finally{await pool.end();}
