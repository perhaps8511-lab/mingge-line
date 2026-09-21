"""Export only reviewed W1 application files from a clean exact Git commit."""
import hashlib,json,subprocess,sys
from pathlib import Path
out=Path(sys.argv[1])
if out.exists():raise SystemExit('OUTPUT_MUST_BE_NEW')
def git(*args):return subprocess.check_output(['git',*args])
if git('status','--porcelain').strip():raise SystemExit('WORKTREE_NOT_CLEAN')
head=git('rev-parse','HEAD').decode().strip()
if git('branch','--show-current').decode().strip()!='codex/w1-staging-20260921':raise SystemExit('WRONG_BRANCH')
files=git('ls-tree','-r','--name-only',head).decode().splitlines()
exact={'backend/package.json','backend/package-lock.json','backend/data/classics-candidate.json','backend/scripts/w1-migrate.mjs'}
prefixes=('backend/src/w1/','backend/public/','backend/w1-migrations/','prompts/jiegua/')
manifest={}
for name in files:
 if name not in exact and not name.startswith(prefixes):continue
 data=git('show',head+':'+name);target=out/name;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
 manifest[name]=hashlib.sha256(data).hexdigest()
for name in ['Dockerfile']:
 data=git('show',head+':deploy/w1/'+name);(out/name).write_bytes(data);manifest[name]=hashlib.sha256(data).hexdigest()
(out/'W1_BUILD.json').write_text(json.dumps({'source_revision':head,'files':manifest},indent=2),encoding='utf-8')
print(json.dumps({'revision':head,'files':len(manifest),'output':str(out)}))
