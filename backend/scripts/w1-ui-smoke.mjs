import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {W1Store} from '../src/w1/store.js';
import {W1Service} from '../src/w1/service.js';
import {migrateW1} from '../src/w1/schema.js';
import {createW1Server} from '../src/w1/http.js';
import {copy} from '../public/copy.js';
const {chromium}=await import(pathToFileURL(process.env.W1_PLAYWRIGHT_MODULE));
const out=process.argv[2];if(!out)throw new Error('OUTPUT_REQUIRED');mkdirSync(out,{recursive:true});
const db=new PGlite();const query=async(sql,args)=>{const r=args===undefined?(await db.exec(sql)).at(-1):await db.query(sql,args);return {...r,rowCount:r.affectedRows??r.rows.length};};
const pool={query,connect:async()=>({query,release(){}})};
await migrateW1(pool);const store=new W1Store(pool),subject=`U${'e'.repeat(32)}`;
await store.grant(subject,{quota:3,expiresAt:new Date(Date.now()+3600000).toISOString(),enrollmentId:'ui-synthetic'});
const raw='#META_START\nzhu_li_ren: lao_yi\nmain_kaguan: A\nsub_kaguan: none\nzou_xiang: bao_shou\nredline: false\nlevel: green\ncategory: none\nstandard_response: false\nhotline_given: false\n#META_END\n'+[1,2,3,4,5,6].map(i=>`[[J${i}]]\n合成測試信箋，第 ${i} 段。\n`).join('')+'[[ZY]]\n合成贈言。\n[[NEXT]]\n合成下一步。\n[[END]]';
let generated=0;
const service=new W1Service({store,manifest:{synthetic:true},buildPrompt:async()=>({}),
 generate:async()=>{generated++;return {text:raw,finishReason:'STOP',runtime:{synthetic:true}};},push:async()=>{}});
let base;
const server=createW1Server({service,authenticate:async({token})=>{if(token!=='synthetic-valid')throw Object.assign(new Error('UNAUTHORIZED'),{status:401});return {subject};},
 staticHandler:async(req,res,url)=>{
  if(req.method!=='GET')return false;
  if(url.pathname==='/ui-config'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({relayOrigin:base,liffId:'synthetic'}));return true;}
  const map={'/':'index.html','/app.js':'app.js','/copy.js':'copy.js','/qigua.js':'qigua.js','/typography.css':'typography.css','/w1.css':'w1.css'};
  const file=map[url.pathname];if(!file)return false;
  res.writeHead(200,{'Content-Type':file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'text/html; charset=utf-8'});
  res.end(readFileSync(new URL('../public/'+file,import.meta.url)));return true;
 }});
await new Promise(r=>server.listen(0,'127.0.0.1',r));base=`http://127.0.0.1:${server.address().port}`;
let browser;
try {
 browser=await chromium.launch({headless:true,executablePath:process.env.W1_CHROME_EXECUTABLE});
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1});
 await context.route('**/*',route=>{const url=route.request().url();
  if(url.startsWith(base))return route.continue({headers:{...route.request().headers(),'x-mingge-subject-token':'synthetic-valid'}});
  if(url.startsWith('https://static.line-scdn.net/'))return route.fulfill({contentType:'application/javascript',body:'window.liff={init:async()=>{},isLoggedIn:()=>true,getAccessToken:()=>"synthetic-valid"};'});
  return route.abort();
 });
 let page=await context.newPage();await page.goto(base);await page.click('#login');
 await page.waitForFunction(()=>document.getElementById('quota').textContent.includes('3'));
 await page.locator('#cast').hover();await page.mouse.down();await page.waitForTimeout(650);
 await page.mouse.up();await page.fill('#question','合成驗收問題，不是真人資料。');
 await page.click('#send');await page.waitForFunction(()=>document.getElementById('status').textContent.includes('已送出'));
 const saved=(await store.list(subject))[0];assert.equal(saved.state,'queued');assert.equal(saved.input_json.question_text,'合成驗收問題，不是真人資料。');
 await service.tick();await page.waitForFunction(()=>document.getElementById('disclaimer').hidden===false);
 assert.equal(await page.locator('#disclaimer').textContent(),copy.disclaimer);
 assert.equal(await page.locator('#letter p').first().textContent(),'合成測試信箋，第 5 段。');
 await page.screenshot({path:out+'/UI_MOBILE.png',fullPage:true});
 await page.close();page=await context.newPage();await page.goto(base);await page.click('#login');
 await page.waitForSelector('.record');await page.locator('.record').first().click();
 assert.equal(await page.locator('#disclaimer').textContent(),copy.disclaimer);assert.equal(generated,1);
 assert.equal((await store.get(subject,saved.id)).charge,1);assert.equal((await store.quota(subject)).remaining,2);
 await page.setViewportSize({width:1100,height:900});await page.screenshot({path:out+'/UI_DESKTOP.png',fullPage:true});
 await pool.query('UPDATE w1.test_grants SET used=quota');
 const beforeSafety=JSON.stringify((await pool.query('SELECT * FROM w1.test_grants')).rows);
 await page.reload();await page.click('#login');await page.waitForFunction(()=>document.getElementById('quota').textContent.includes('0'));
 await page.locator('#cast').hover();await page.mouse.down();await page.waitForTimeout(650);await page.mouse.up();
 await page.fill('#question','我不想活了');await page.click('#send');
 await page.waitForFunction(()=>document.getElementById('letter').textContent.includes('1925'));
 await page.waitForFunction(()=>document.getElementById('quota').hidden&&document.getElementById('payment').textContent==='');
 assert.equal(JSON.stringify((await pool.query('SELECT * FROM w1.test_grants')).rows),beforeSafety);
 assert.equal(generated,1);assert.equal(await page.locator('#disclaimer').isVisible(),false);
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:out+'/UI_SAFETY.png',fullPage:true});
 const report={status:'PASS',mode:'LOCAL_BROWSER_SYNTHETIC_LINE_AND_PROVIDER_REAL_PGLITE',
  longPress:true,saveBeforeSent:true,closeReopenReadback:true,charge:1,remaining:2,generatedCalls:1,
  A14_exact:true,A12_first:'J5',safety_zero_quota_SR:true,safety_entitlement_unchanged:true,safety_no_payment_or_quota_copy:true,staging_live:'NOT_RUN',real_LINE:'NOT_RUN'};
 writeFileSync(out+'/UI_READBACK.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser?.close();await new Promise(r=>server.close(r));await db.close();}
