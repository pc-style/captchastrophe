// Maintainer-only, idempotent repository setup. No token values are written here.
import {execFileSync} from 'node:child_process';
const repo='pc-style/captchastrophe';
function api(method:string,path:string,body?:unknown){
  const args=['api','--method',method,`repos/${repo}/${path}`];
  if(body!==undefined)args.push('--input','-');
  const out=execFileSync('gh',args,{input:body===undefined?undefined:JSON.stringify(body),encoding:'utf8'});
  return out.trim()?JSON.parse(out):null;
}
api('PUT','private-vulnerability-reporting');
api('PUT','actions/permissions/workflow',{default_workflow_permissions:'read',can_approve_pull_request_reviews:false});
// No required reviewer: previews publish automatically after CodeRabbit approval and green CI.
api('PUT','environments/preview',{wait_timer:0,prevent_self_review:false,reviewers:[],deployment_branch_policy:{protected_branches:false,custom_branch_policies:true}});
api('PUT','environments/production',{wait_timer:0,deployment_branch_policy:{protected_branches:false,custom_branch_policies:true}});
for(const env of ['preview','production']){
  const policies=api('GET',`environments/${env}/deployment-branch-policies`).branch_policies;
  if(!policies.some((p:any)=>p.name==='main'&&p.type==='branch'))api('POST',`environments/${env}/deployment-branch-policies`,{name:'main',type:'branch'});
}
const name='Human acceptance and green CI';
const rule={name,target:'branch',enforcement:'active',bypass_actors:[{actor_id:5,actor_type:'RepositoryRole',bypass_mode:'always'}],conditions:{ref_name:{include:['refs/heads/main'],exclude:[]}},rules:[
  {type:'deletion'}, {type:'non_fast_forward'},
  {type:'pull_request',parameters:{required_approving_review_count:1,dismiss_stale_reviews_on_push:true,require_code_owner_review:true,require_last_push_approval:false,required_review_thread_resolution:true}},
  {type:'required_status_checks',parameters:{required_status_checks:[{context:'checks'}],strict_required_status_checks_policy:true}},
]};
const existing=api('GET','rulesets').find((r:any)=>r.name===name);
api(existing?'PUT':'POST',existing?`rulesets/${existing.id}`:'rulesets',rule);
for(const [name,color,description] of [
  ['submission','c7d9b5','Contest entry'],['pre-review','d4c5a3','Not approved'],['accepted','b4d2bf','Human accepted'],['needs-maintainer','e2bb9b','Maintainer action needed'],['tooling','bbc8d7','Shared infrastructure'],['dependency-request','c8bed8','Pinned package request'],['rule-violation','d9a9a4','Potential hard-rule violation'],['broken','d9a9a4','Reproducible broken behavior'],['rejected','c5b7b7','Not accepted'],['duplicate-concern','cbbb9b','Meaningful interaction overlap to discuss'],
])execFileSync('gh',['label','create',name,'--repo',repo,'--color',color,'--description',description,'--force'],{stdio:'inherit'});
console.log('Configured ruleset, environments, labels, read-only workflow defaults and private reports. Admin bypass is retained for bootstrap/emergencies.');
