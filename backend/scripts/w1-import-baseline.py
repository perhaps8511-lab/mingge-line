"""One-time import of synthetic frozen X-1 responses for offline CI only."""
import argparse,hashlib,importlib.util,json,sys
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--cli-root',required=True,type=Path);a=p.parse_args();sys.dont_write_bytecode=True
spec=importlib.util.spec_from_file_location('x1',a.cli_root/'regress.py');x1=importlib.util.module_from_spec(spec);spec.loader.exec_module(x1);x1.verify()
cases,_=x1.cases('full');rows=[]
for c in cases:
 raw=x1.read(a.cli_root/'replay/raw'/(c['case_key']+'_1.json'));text,finish,_=x1.parse(raw);score=x1.score(c,raw)
 rows.append(dict(case_key=c['case_key'],text=text,finishReason=finish,kill=score['kill'],historical_mechanical=score['mech_verdict'],
  frozen_skeleton_count=score['skeleton_J1_6'],source_raw_sha256=x1.digest((a.cli_root/'replay/raw'/(c['case_key']+'_1.json')).read_bytes())))
out=Path(__file__).parent.parent/'data/baseline-synthetic.json';out.write_text(json.dumps(dict(
 classification='SYNTHETIC_HISTORICAL_REPLAY_ONLY',scored=125,skipped=['LN-07'],
 source_pins_sha256=x1.digest((a.cli_root/'pins.json').read_bytes()),rows=rows),ensure_ascii=False,indent=2),encoding='utf-8')
print(hashlib.sha256(out.read_bytes()).hexdigest())
