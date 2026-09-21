"""X-1 backend-url transport. Live execution requires explicit spend approval.
Uses the same frozen scorer and budget ledger; never edits the X-1 artifact.
"""
import math
import argparse,hashlib,importlib.util,json,os,re,sys,time,urllib.request
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--cli-root',type=Path,required=True);p.add_argument('--backend-url',required=True)
p.add_argument('--out',type=Path,required=True);p.add_argument('--manifest-sha',required=True)
p.add_argument('--campaign',required=True);p.add_argument('--approved-live',action='store_true')
p.add_argument('--budget',type=float,required=True);p.add_argument('--per-request-upper-usd',type=float,required=True)
a=p.parse_args();sys.dont_write_bytecode=True
spec=importlib.util.spec_from_file_location('x1',a.cli_root/'regress.py');x1=importlib.util.module_from_spec(spec);spec.loader.exec_module(x1)
x1.verify();cases,_=x1.cases('full')
def stop(code):print(code);sys.exit(2)
if not a.approved_live:stop('NOT_RUN_PAID_EXECUTION_NOT_APPROVED')
if not a.backend_url.startswith('https://') or not re.fullmatch(r'[a-zA-Z0-9_-]{1,40}',a.campaign):stop('INVALID_TARGET')
if not math.isfinite(a.per_request_upper_usd) or not math.isfinite(a.budget) or a.per_request_upper_usd<=0 or a.budget<=0 or a.per_request_upper_usd*125>a.budget*.9:stop('BUDGET_90_PERCENT_STOP')
token=os.environ.get('W1_LINE_ACCESS_TOKEN')
if not token:stop('MISSING_VERIFIED_LINE_TOKEN')
def call(path,body=None):
 req=urllib.request.Request(a.backend_url.rstrip('/')+path,data=json.dumps(body).encode() if body else None,
  headers={'X-Line-AccessToken':token,'Content-Type':'application/json'})
 try:
  with urllib.request.urlopen(req,timeout=30) as r:return json.loads(r.read())
 except Exception:stop('BACKEND_UNCERTAIN_NO_RETRY')
manifest=call('/runtime-manifest');encoded=json.dumps(manifest,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()
if hashlib.sha256(encoded).hexdigest()!=a.manifest_sha:stop('WRONG_TARGET_MANIFEST')
if manifest.get('environment')!='staging' or manifest.get('prompt',{}).get('sha256')!='be08968c3226d55aa963ad7de12c6251f0365887f051f5e7d77b0847d395287a':stop('WRONG_TARGET')
if a.out.exists():stop('OUTPUT_EXISTS')
a.out.mkdir(parents=True);ledger=x1.Ledger(a.out.parent/'w1_backend_calls.sqlite');rows=[]
for case in cases:
 payload=case['payload'];ben=re.search(r'本卦:([^\s]+)',payload);bian=re.search(r'變卦:([^\s]+)',payload);dong=re.search(r'動爻:第\s*(\d)\s*爻',payload)
 if not all((ben,bian,dong)):stop('FROZEN_INPUT_PARSE_FAILED')
 request_id='w1-regress-'+a.campaign+'-'+case['case_key']
 body=dict(request_id=request_id,session_id=request_id,ben_gua=ben[1],bian_gua=bian[1],dong_yao=int(dong[1]),
  qigua_time='2026-09-21T12:00:00+08:00',question_text=case['question'])
 key=hashlib.sha256(json.dumps(body,sort_keys=True).encode()).hexdigest()
 ledger.reserve(key,a.campaign,a.per_request_upper_usd,a.budget)
 record=call('/gua-records',body);end=time.monotonic()+750
 while time.monotonic()<end:
  record=call('/regression/records/'+record['id'])
  if record['state'] in ('completed','failed','generation_unknown'):break
  time.sleep(2)
 else:stop('BACKEND_UNRESOLVED_NO_RETRY')
 raw={'candidates':[{'content':{'parts':[{'text':record.get('raw_output') or ''}]},
  'finishReason':(record.get('runtime') or {}).get('provider_acceptance',{}).get('finishReason')}],
  'modelVersion':(record.get('runtime') or {}).get('provider_acceptance',{}).get('modelVersion')}
 score=x1.score(case,raw);score.update(state=record['state'],charge=record['charge'],semantic_mode='NOT_RUN')
 if record['state']!='completed':score['mech_verdict']='FAIL'
 x1.write(a.out/(case['case_key']+'.json'),record);rows.append(score);x1.write(a.out/'results.json',rows)
 ledger.finish(key,str(a.out/(case['case_key']+'.json')),None) # retain conservative cost reservation
summary=dict(count=len(rows),mechanical_pass=sum(r['mech_verdict']=='PASS' for r in rows),
 hardgate_pass=sum(r['kill'] and r['mech_verdict']=='PASS' for r in rows),semantic='NOT_RUN',A4='NOT_COMPLETE_WITHOUT_SEMANTIC_REVIEW',
 known_baseline_exceptions=['LN-22','LN-26','LN-27','LN-30'],waiver_for_W1_runtime=False)
x1.write(a.out/'SUMMARY.json',summary);print(json.dumps(summary))
sys.exit(1 if any(r['kill'] and r['mech_verdict']!='PASS' for r in rows) else 0)
