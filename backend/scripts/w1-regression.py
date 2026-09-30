"""Consume X-1 frozen scorer and historical synthetic outputs, without editing X-1.
This is charge/skeleton parity, not A4 live-provider or fresh semantic evidence.
"""
import argparse,hashlib,importlib.util,json,subprocess,sys
from pathlib import Path
from difflib import SequenceMatcher
p=argparse.ArgumentParser();p.add_argument('--cli-root',type=Path,required=True);p.add_argument('--out',type=Path,required=True);a=p.parse_args()
sys.dont_write_bytecode=True
spec=importlib.util.spec_from_file_location('x1',a.cli_root/'regress.py');x1=importlib.util.module_from_spec(spec);spec.loader.exec_module(x1)
x1.verify();cases,_=x1.cases('full');inputs=[];reference=[];nexts=[]
import re
for c in cases:
 raw=x1.read(a.cli_root/'replay/raw'/(c['case_key']+'_1.json'));text,finish,block=x1.parse(raw)
 score=x1.score(c,raw);inputs.append(dict(case_key=c['case_key'],text=text,finishReason=finish));reference.append(score)
 nxt=re.search(r'\[\[NEXT\]\]([\s\S]*?)(?=\[\[|$)',text)
 if nxt:nexts.append(nxt.group(1).strip())
runner=Path(__file__).with_name('w1-replay-charge.mjs')
result=subprocess.run(['node',str(runner)],input=json.dumps(inputs,ensure_ascii=False),encoding='utf-8',capture_output=True,check=True)
rows=json.loads(result.stdout);deltas=[]
exceptions=['LN-22','LN-26','LN-27','LN-30']
for row,ref in zip(rows,reference):
 # A stricter consistency gate may withhold a historical malformed output.
 # Report it explicitly; don't claim baseline perfection or alter the judge.
 expected=1 if ref['skeleton_J1_6']==6 else 0
 if row['gate']=='PASS' and row['charge']!=expected:deltas.append(dict(case_key=row['case_key'],expected=expected,actual=row['charge']))
 if row['case_key'] in exceptions:
  row.update(baseline_status='KNOWN_BASELINE_EXCEPTION_REPLAY_ONLY',reason='historical v34 crisis output missing 1925',replay_charge=0,current_runtime_acceptance='NOT_WAIVED')
norm=lambda s:re.sub(r'\W','',s)
pairs=len(nexts)*(len(nexts)-1)//2
similar=sum(SequenceMatcher(None,norm(x),norm(y)).ratio()>=.9 for i,x in enumerate(nexts) for y in nexts[i+1:])
exact=(len(nexts)-len(set(nexts)))/len(nexts) if nexts else 0
report=dict(mode='OFFLINE_CHARGE_REPLAY',status='PASS' if not deltas else 'FAIL',count=len(rows),skipped=['LN-07'],
 A4_live='NOT_RUN',semantic='CACHED_BASELINE_EVIDENCE_ONLY',charge_deltas=deltas,rows=rows,
 no_delivery=[r['case_key'] for r in rows if r['gate']!='PASS'],
 known_baseline_exceptions=exceptions,exception_scope='historical_offline_replay_only',waiver_for_W1_runtime=False,
 A11=dict(threshold_status='ENGINEERING_CANDIDATE',blocking=False,denominator=len(nexts),exact_duplicate_rate=exact,
   similar_pair_rate=similar/pairs if pairs else 0,similarity=.9,warning=exact>.05 or (similar/pairs if pairs else 0)>.10))
a.out.parent.mkdir(parents=True,exist_ok=True);a.out.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({k:v for k,v in report.items() if k not in ('rows',)},ensure_ascii=False))
sys.exit(bool(deltas))
