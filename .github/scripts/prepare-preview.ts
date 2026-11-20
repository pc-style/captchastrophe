import fs from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { manifestSchema } from '../../scripts/manifest.ts';
const number=process.env.PREVIEW_PR;
if(!number || !/^[1-9][0-9]*$/.test(number))throw new Error('Invalid PR');
const repo='pc-style/captchastrophe';
function api(route:string){return JSON.parse(execFileSync('gh',['api',route],{encoding:'utf8',maxBuffer:5*1024*1024}));}
const pr=api(`repos/${repo}/pulls/${number}`);
if(pr.state!=='open')throw new Error('PR is not open');
const files=[];
for(let page=1;;page++){const batch=api(`repos/${repo}/pulls/${number}/files?per_page=100&page=${page}`);files.push(...batch);if(batch.length<100)break;if(page>=30)throw new Error('PR too large');}
const ids=new Set<string>();
for(const file of files){
  const match=/^submissions\/([a-z0-9]+(?:-[a-z0-9]+)*)\//.exec(file.filename);
  if(!match || file.previous_filename && !file.previous_filename.startsWith(`submissions/${match[1]}/`))throw new Error('Preview supports one entry-only PR; shared changes need separate maintainer review');
  ids.add(match[1]);
}
if(ids.size!==1)throw new Error('Preview requires exactly one submission');
const id=[...ids][0];
const blob=api(`repos/${pr.head.repo.full_name}/contents/submissions/${id}/manifest.json?ref=${pr.head.sha}`);
if(blob.type!=='file'||blob.size>10000)throw new Error('Invalid manifest');
const manifest=manifestSchema.parse(JSON.parse(Buffer.from(blob.content,'base64').toString('utf8')));
if(manifest.id!==id)throw new Error('ID mismatch');
const reviews=[];
for(let page=1;;page++){const batch=api(`repos/${repo}/pulls/${number}/reviews?per_page=100&page=${page}`);reviews.push(...batch);if(batch.length<100)break;if(page>=30)throw new Error('Too many reviews');}
const verdict=reviews.filter((r:any)=>r.user?.login==='coderabbitai[bot]'&&r.commit_id===pr.head.sha&&r.state!=='COMMENTED').at(-1);
if(verdict?.state!=='APPROVED')throw new Error('CodeRabbit has not approved the current head');
const runs=api(`repos/${repo}/actions/workflows/ci.yml/runs?event=pull_request_review&head_sha=${pr.head.sha}&per_page=100`).workflow_runs;
const run=runs.find((r:any)=>r.head_sha===pr.head.sha&&r.head_repository.id===pr.head.repo.id&&r.conclusion==='success'&&r.event==='pull_request_review');
if(!run)throw new Error('No successful CI run for the current fork head');
const artifacts=api(`repos/${repo}/actions/runs/${run.id}/artifacts`).artifacts;
const artifact=artifacts.find((a:any)=>a.name===`static-${run.id}`&&!a.expired);
if(!artifact)throw new Error('Current build artifact is missing or expired');
const entry={...manifest,status:'pre-review',prNumber:Number(number),addedAt:pr.created_at,sourceUrl:`https://github.com/${pr.head.repo.full_name}/tree/${pr.head.sha}/submissions/${id}`};
await fs.mkdir('.preview',{recursive:true});await fs.writeFile('.preview/index.json',JSON.stringify({generatedAt:new Date().toISOString(),entries:[entry]}));
await fs.writeFile('.preview/provenance.json',JSON.stringify({pr:Number(number),head:pr.head.sha,run:run.id,artifact:artifact.id,id}));
if(process.env.GITHUB_OUTPUT)await fs.appendFile(process.env.GITHUB_OUTPUT,`run=${run.id}\nartifact=${artifact.id}\nid=${id}\nhead=${pr.head.sha}\n`);
console.log(`Validated PR #${number}: ${pr.head.sha}, CI run ${run.id}, artifact ${artifact.id}`);
