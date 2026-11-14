#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {getDb,REPO_ROOT} from './lib/db.mjs';
import {parseCsv,pick} from './lib/csv.mjs';
import {table} from './lib/format.mjs';

export const reports={
 portfolio:'select code,title,owner,status,phase,due_on,overdue_actions,benefits_waiting,controls_at_risk,approved_phases from v_portfolio order by code',
 'phase-queue':`select p.code,p.phase,p.owner,p.revision,p.due_on,case when r.id is null then 'needs_review' else 'reviewed' end as review from projects p left join phase_reviews r on r.project_id=p.id and r.phase=p.phase and r.revision=p.revision where p.status in ('idea','active') order by p.due_on nulls first,p.code`,
 attention:'select * from v_attention order by code,finding,title',
 benefits:`select currency,kind,review,count(*)::int as entries,sum(amount_cents)::bigint as amount_cents from v_benefits group by currency,kind,review order by currency,kind,review`,
 'benefit-review':`select id,code,title,kind,currency,period_on,amount_cents,recorded_by,verified_by,review from v_benefits where review<>'verified' order by code,period_on,title`,
 measures:'select code,id,name,unit,baseline,target,latest_value,observed_on,result from v_metrics order by code,name',
 'sustain-due':`select id,code,title,owner,due_on,last_result,finding from v_controls where finding<>'scheduled' order by due_on,code`,
 'owner-load':`select owner,count(*)::int as active_projects,sum(overdue_actions)::int as overdue_actions,sum(benefits_waiting)::int as benefits_waiting from v_portfolio where status in ('idea','active') group by owner order by owner`,
 'stale-projects':`select code,title,owner,reviewed_on from projects where status in ('idea','active') and (reviewed_on is null or reviewed_on<current_date-30) order by code`,
 compliance:`select code,finding,case when finding='personal_data_retention' then 'NZ-IPP9' else 'CI-LOCAL' end as rule from v_attention union all select p.code,'phase_evidence_missing','CI-DMAIC' from projects p where p.status='completed' and (select count(*) from phase_reviews r where r.project_id=p.id and r.revision=p.revision)<5 order by code,finding`,
 activity:'select a.sequence,p.code,a.actor,a.action,a.note,a.created_at from activity a left join projects p on p.id=a.project_id order by a.sequence desc'
};
export const commands=[...Object.keys(reports),'help','list','show','weekly-review','add','update','log','record-measure','review-phase','verify-benefit','void-benefit','record-check','import','export','draft-a3','draft-benefits'];
const phases=['define','measure','analyze','improve','control'];
const kinds={project:'projects',action:'actions',metric:'metrics',benefit:'benefits',control:'controls'};
const tables=['projects','actions','metrics','observations','benefits','phase_reviews','controls','control_checks','activity','import_batches'];
const fields={
 add:['kind','ref','code','title','owner','sponsor','problem','goal','process','due-on','personal-data','retention-review-on','name','unit','direction','baseline','target','baseline-on','evidence','currency','period-on','amount-cents','benefit-kind','cadence-days'],
 update:['kind','ref','title','owner','sponsor','problem','goal','process','due-on','personal-data','retention-review-on','status','evidence','active','cadence-days'],
 log:['ref','note'], 'record-measure':['ref','value','observed-on','evidence'],
 'review-phase':['ref','phase','evidence'], 'verify-benefit':['ref','evidence'], 'void-benefit':['ref','evidence'],
 'record-check':['ref','checked-on','result','evidence'],
 import:['file','source','map','dry-run','update','date-format'],export:['file','kind'],
 show:['ref','kind'],list:['kind'],'draft-a3':['ref'],'draft-benefits':[]
};
const req=(o,k)=>{if(typeof o[k]!=='string'||!o[k].trim())throw Error(`Required --${k}`);return o[k].trim();};
const one=(v,opts,k)=>{if(!opts.includes(v))throw Error(`${k}: choose ${opts.join(', ')}`);return v;};
const num=(v,k)=>{if(typeof v==='boolean'||String(v??'').trim()===''||!Number.isFinite(Number(v)))throw Error(`${k} must be a finite number`);return Number(v);};
const integer=(v,k)=>{const n=num(v,k);if(!Number.isSafeInteger(n))throw Error(`${k} must be a safe integer`);return n;};
const boolean=(v)=>{if(!['true','false'].includes(String(v)))throw Error('Boolean must be true or false');return String(v)==='true';};
function date(v){if(!/^\d{4}-\d{2}-\d{2}$/.test(String(v))||!Number.isFinite(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v)throw Error('Date must be a real YYYY-MM-DD date');return v;}
const today=()=>new Date().toISOString().slice(0,10);
function past(v){v=date(v);if(v>today())throw Error('Evidence date cannot be in the future');return v;}
async function audit(db,p,actor,action,note='',before=null,after=null){await db.query('insert into activity(project_id,actor,action,note,before_data,after_data) values($1,$2,$3,$4,$5,$6)',[p,actor,action,note,before,after]);}
export async function resolve(db,kind,ref){
 const t=kinds[kind];if(!t)throw Error('Unknown record kind');if(!ref)throw Error('Required --ref');
 const key=kind==='project'?'code':kind==='metric'?'name':'title';
 const rows=await db.query(`select * from ${t} where lower(${key})=lower($1) or ${kind==='project'?'lower(title)=lower($1) or ':''}id::text=$1`,[ref]);
 if(rows.length===1)return rows[0];
 const matches=rows.length?rows:await db.query(`select * from ${t} where starts_with(lower(${key}),lower($1)) or ${kind==='project'?'strpos(lower(title),lower($1))>0 or ':''}starts_with(id::text,$1)`,[ref]);
 if(matches.length!==1)throw Error(matches.length?'Ambiguous reference: '+matches.map(r=>`${r.id} ${r[key]}`).join('; '):`No ${kind} matches ${ref}`);
 return matches[0];
}
function validateOptions(c,o){const allowed=new Set(['json','actor',...(fields[c]||[])]);for(const k of Object.keys(o))if(!allowed.has(k))throw Error(`Unknown --${k} for ${c}`);for(const k of ['json','dry-run','update'])if(k in o&&typeof o[k]!=='boolean')throw Error(`--${k} takes no value`);}
async function insert(db,t,data){const keys=Object.keys(data);return (await db.query(`insert into ${t}(${keys.join(',')}) values(${keys.map((_,i)=>'$'+(i+1)).join(',')}) returning *`,Object.values(data)))[0];}
function write(file,contents){file=path.resolve(file);fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});fs.writeFileSync(file,contents,{mode:0o600});fs.chmodSync(file,0o600);return file;}
function csv(rows){if(!rows.length)return '';const cols=Object.keys(rows[0]);const enc=v=>'"'+String(v??'').replace(/^[=+@\-\t\r]/,"'$&").replaceAll('"','""')+'"';return [cols.map(enc).join(','),...rows.map(r=>cols.map(k=>enc(typeof r[k]==='object'&&r[k]!==null?JSON.stringify(r[k]):r[k])).join(','))].join('\r\n')+'\r\n';}

async function importEngage(db,o,actor,pos){
 if(pos.join(' ')!=='minitab-engage')throw Error('Use import minitab-engage --file=export.csv --source=deployment');
 const source=req(o,'source');const raw=fs.readFileSync(req(o,'file'),'utf8');const hash=createHash('sha256').update(raw).digest('hex');
 const rows=parseCsv(raw);if(!rows.length)throw Error('Empty CSV export');
 const mapping=o.map?JSON.parse(fs.readFileSync(o.map,'utf8')):{};
 const aliases={external_id:['Project ID','Project Id','ID'],title:['Project Name','Name'],owner:['Project Leader','Owner'],sponsor:['Sponsor','Project Sponsor'],problem:['Problem Statement','Problem'],goal:['Goal Statement','Goal'],process:['Process'],due_on:['Due Date','Completion Date','Completion'],phase:['Current Phase','Phase']};
 for(const k of Object.keys(mapping))if(!(k in aliases))throw Error(`Unknown mapped field ${k}`);
 for(const [k,v]of Object.entries(mapping))if(typeof v!=='string'||!Object.keys(rows[0]).includes(v))throw Error(`Mapped column missing: ${k}`);
 const value=(r,k)=>mapping[k]?r[mapping[k]]:pick(r,...aliases[k]);
 const seen=new Set();let inserted=0,updated=0,unchanged=0;
 for(const [i,row]of rows.entries()){
  const title=value(row,'title').trim();if(!title)throw Error(`CSV row ${i+2}: missing Project Name; use --map for renamed columns`);
  const external=value(row,'external_id').trim()||title;
  if(seen.has(external))throw Error(`CSV duplicate project key ${external}`);seen.add(external);
  let due=value(row,'due_on').trim();
  if(due&&o['date-format']==='dmy'){const m=due.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);if(m)due=`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;}
  if(o['date-format'])one(o['date-format'],['iso','dmy'],'date-format');
  due=due?date(due):null;
  const phase=(value(row,'phase').trim()||'define').toLowerCase().replace('analyse','analyze');one(phase,phases,'phase');
  const existing=(await db.query('select * from projects where import_source=$1 and external_id=$2 for update',[source,external]))[0];
  if(existing&&JSON.stringify(existing.source_data)===JSON.stringify(row)){unchanged++;continue;}
  // jsonb key order is canonical, so compare in the database as well.
  if(existing&&(await db.query('select source_data=$2::jsonb as same from projects where id=$1',[existing.id,row]))[0].same){unchanged++;continue;}
  const data={title,owner:value(row,'owner').trim(),sponsor:value(row,'sponsor').trim(),problem:value(row,'problem').trim(),goal:value(row,'goal').trim(),process:value(row,'process').trim(),due_on:due,source_data:row};
  if(existing){
   if(!o.update)throw Error(`Changed source row ${external}; review and rerun with --update`);
   const keys=Object.keys(data);const [after]=await db.query(`update projects set ${keys.map((k,i)=>k+'=$'+(i+2)).join(',')},reviewed_on=null where id=$1 returning *`,[existing.id,...Object.values(data)]);
   await audit(db,existing.id,actor,'import-update',source,existing,after);updated++;
  }else{
   const code='ENG-'+createHash('sha256').update(JSON.stringify([source,external])).digest('hex').slice(0,14).toUpperCase();
   const p=await insert(db,'projects',{...data,code,phase,status:'idea',import_source:source,external_id:external});
   await audit(db,p.id,actor,'import','Imported project pending local review',null,p);inserted++;
  }
 }
 await db.query('insert into import_batches(source,sha256,rows_count,actor) values($1,$2,$3,$4) on conflict(source,sha256) do nothing',[source,hash,rows.length,actor]);
 return [{source,rows:rows.length,inserted,updated,unchanged,dry_run:Boolean(o['dry-run']),note:'Imported project fields only. Savings, reviews, diagrams and attachments require separate review.'}];
}
async function mutate(db,c,o,pos){
 const actor=req(o,'actor');
 if(c==='import')return importEngage(db,o,actor,pos);
 if(pos.length)throw Error('Unexpected positional argument');
 if(c==='add'){
  const kind=one(o.kind||'project',Object.keys(kinds),'kind');let p=null;let data;
  if(kind==='project'){
   data={code:req(o,'code'),title:req(o,'title'),owner:o.owner||'',sponsor:o.sponsor||'',problem:o.problem||'',goal:o.goal||'',process:o.process||'',due_on:o['due-on']?date(o['due-on']):null,personal_data:o['personal-data']===undefined?false:boolean(o['personal-data']),retention_review_on:o['retention-review-on']?date(o['retention-review-on']):null};
  }else{
   p=await resolve(db,'project',req(o,'ref'));if(p.status==='canceled')throw Error('Project is canceled');data={project_id:p.id};
   if(kind==='action')Object.assign(data,{title:req(o,'title'),owner:req(o,'owner'),due_on:date(req(o,'due-on'))});
   if(kind==='metric')Object.assign(data,{name:req(o,'name'),unit:req(o,'unit'),direction:one(req(o,'direction'),['higher','lower'],'direction'),baseline:num(req(o,'baseline'),'baseline'),target:num(req(o,'target'),'target'),baseline_on:past(req(o,'baseline-on')),baseline_evidence:req(o,'evidence')});
   if(kind==='benefit')Object.assign(data,{title:req(o,'title'),kind:one(req(o,'benefit-kind'),['hard','soft'],'benefit-kind'),currency:req(o,'currency'),period_on:past(req(o,'period-on')),amount_cents:integer(req(o,'amount-cents'),'amount-cents'),evidence:req(o,'evidence'),recorded_by:actor});
   if(kind==='control')Object.assign(data,{title:req(o,'title'),owner:req(o,'owner'),due_on:date(req(o,'due-on')),cadence_days:integer(req(o,'cadence-days'),'cadence-days')});
  }
  const out=await insert(db,kinds[kind],data);if(kind==='metric')await db.query("update projects set revision=revision+1,status=case when status='completed' then 'active' else status end where id=$1",[p.id]);await audit(db,p?.id||out.id,actor,'add-'+kind,'',null,out);return [out];
 }
 const kind=c==='record-measure'?'metric':['verify-benefit','void-benefit'].includes(c)?'benefit':c==='record-check'?'control':o.kind||'project';
 let old=await resolve(db,kind,req(o,'ref'));
 // Lock the parent first, serialising reviews and changes that affect the same project.
 const project=(await db.query('select * from projects where id=$1 for update',[kind==='project'?old.id:old.project_id]))[0];
 old=await resolve(db,kind,old.id);
 if(c==='log'){const note=req(o,'note');await audit(db,project.id,actor,'note',note);await db.query('update projects set reviewed_on=current_date where id=$1',[project.id]);return [{code:project.code,note}];}
 let out;
 if(c==='update'){
  one(kind,['project','action','control'],'update kind');const data={};
  const allowed=kind==='project'?['title','owner','sponsor','problem','goal','process','due-on','personal-data','retention-review-on','status']:kind==='action'?['title','owner','due-on','status','evidence']:['title','owner','due-on','active','cadence-days'];
  for(const k of Object.keys(o))if(!['kind','ref','actor','json'].includes(k)&&!allowed.includes(k))throw Error(`Field ${k} cannot update ${kind}`);
  for(const k of allowed)if(k in o){let v=o[k];if(k.endsWith('-on'))v=date(v);if(['personal-data','active'].includes(k))v=boolean(v);if(k==='cadence-days')v=integer(v,k);data[k.replaceAll('-','_')]=v;}
  if(!Object.keys(data).length)throw Error('No fields to update');
  if(kind==='project'&&data.status==='completed')throw Error('Use review-phase --phase=control to complete a project');
  const keys=Object.keys(data);out=(await db.query(`update ${kinds[kind]} set ${keys.map((k,i)=>k+'=$'+(i+2)).join(',')} where id=$1 returning *`,[old.id,...Object.values(data)]))[0];
 }else if(c==='record-measure'){
  const d=past(req(o,'observed-on'));if(d<old.baseline_on)throw Error('Observation precedes baseline');
  out=await insert(db,'observations',{metric_id:old.id,value:num(req(o,'value'),'value'),observed_on:d,evidence:req(o,'evidence'),actor});
 }else if(c==='void-benefit'){
  if(old.void_reason)throw Error('Benefit already void');
  out=(await db.query('update benefits set void_reason=$2,voided_by=$3 where id=$1 returning *',[old.id,req(o,'evidence'),actor]))[0];
 }else if(c==='verify-benefit'){
  if(old.void_reason)throw Error('Benefit is void');
  if(actor.toLowerCase()===old.recorded_by.trim().toLowerCase())throw Error('Benefit needs an independent reviewer');
  out=(await db.query('update benefits set verified_by=$2,verification_evidence=$3,verified_revision=$4,verified_at=now() where id=$1 returning *',[old.id,actor,req(o,'evidence'),project.revision]))[0];
 }else if(c==='record-check'){
  if(!old.active)throw Error('Control is inactive');const d=past(req(o,'checked-on'));
  const last=(await db.query('select max(checked_on)::text as d from control_checks where control_id=$1',[old.id]))[0].d;
  if(last&&d<last)throw Error('Check date precedes the latest check');
  const result=one(req(o,'result'),['pass','fail'],'result');
  out=await insert(db,'control_checks',{control_id:old.id,checked_on:d,result,evidence:req(o,'evidence'),actor});
  if(result==='pass')await db.query('update controls set due_on=$2::date+cadence_days where id=$1',[old.id,d]);
 }else if(c==='review-phase'){
  const phase=one(req(o,'phase'),phases,'phase');const evidence=req(o,'evidence');
  if(project.status==='canceled'||project.status==='paused')throw Error('Resume project before review');
  if(!project.owner.trim()||!project.sponsor.trim()||!project.problem.trim()||!project.goal.trim())throw Error('Review requires owner, sponsor, problem and goal');
  const i=phases.indexOf(phase);
  const prior=await db.query('select phase from phase_reviews where project_id=$1 and revision=$2',[project.id,project.revision]);
  if(phases.slice(0,i).some(x=>!prior.some(r=>r.phase===x)))throw Error('Earlier phase reviews are missing or stale');
  const metrics=await db.query('select * from v_metrics where project_id=$1',[project.id]);
  if(i>=1&&!metrics.length)throw Error('Measure review requires a baseline metric');
  if(i>=3&&metrics.some(m=>m.latest_value===null))throw Error('Improve review requires an observation for every metric');
  if(i===4){
   if(metrics.some(m=>m.result!=='target_met'))throw Error('Control review requires every metric to meet its target');
   const open=await db.query("select id from actions where project_id=$1 and status='open'",[project.id]);if(open.length)throw Error('Close outstanding actions before control review');
   const controls=await db.query('select * from v_controls where project_id=$1',[project.id]);
   if(!controls.length||controls.some(x=>x.last_result!=='pass'||x.finding==='overdue'))throw Error('Control review requires current passing sustain checks');
   const benefits=await db.query("select id from v_benefits where project_id=$1 and review<>'verified'",[project.id]);if(benefits.length)throw Error('Verify recorded benefits before control review');
  }
  out=await insert(db,'phase_reviews',{project_id:project.id,phase,revision:project.revision,actor,evidence});
  await db.query('update projects set phase=$2,status=$3,reviewed_on=current_date where id=$1',[project.id,phases[Math.min(i+1,4)],i===4?'completed':'active']);
 }else throw Error('Unknown mutation');
 await audit(db,project.id,actor,c,reqOptional(o,'evidence'),old,out);return [out];
}
const reqOptional=(o,k)=>typeof o[k]==='string'?o[k]:'';
export async function run(db,c,o={},pos=[]){
 if(!commands.includes(c))throw Error(`Unknown command ${c}; use help`);validateOptions(c,o);
 if(c!=='import'&&pos.length)throw Error('Unexpected positional argument');
 if(reports[c])return db.query(reports[c]);
 if(c==='help')return commands.map(command=>({command,usage:fields[command]?.map(k=>'--'+k).join(' ')||'Read report; --json supported'}));
 if(c==='list'){const t=o.kind||'projects';one(t,tables,'kind');return db.query(`select * from ${t} order by created_at,id`);}
 if(c==='show')return [await resolve(db,o.kind||'project',req(o,'ref'))];
 if(c==='weekly-review'){const data={};for(const report of ['portfolio','attention','benefits'])data[report]=await db.query(reports[report]);return data;}
 if(c==='export'){
  const file=req(o,'file');if(o.kind){one(o.kind,tables,'kind');const rows=await db.query(`select * from ${o.kind} order by created_at,id`);return [{file:write(file,csv(rows)),rows:rows.length,format:'CSV with formula escaping; JSON export preserves exact data'}];}
  const all={format:'improvement-projects-v1',exported_at:new Date().toISOString()};for(const t of tables)all[t]=await db.query(`select * from ${t} order by created_at,id`);
  return [{file:write(file,JSON.stringify(all,null,2)+'\n'),collections:tables.length}];
 }
 if(c.startsWith('draft-')){
  let data,title;
  if(c==='draft-a3'){
   const p=await resolve(db,'project',req(o,'ref'));title=`A3 ${p.code}`;
   data={project:p,measures:await db.query('select * from v_metrics where project_id=$1',[p.id]),actions:await db.query('select * from actions where project_id=$1',[p.id]),phase_reviews:await db.query('select * from phase_reviews where project_id=$1 order by created_at',[p.id]),controls:await db.query('select * from v_controls where project_id=$1',[p.id])};
  }else{title='Benefit review';data=await db.query(reports['benefit-review']);}
  const contents=`# ${title}\n\nDraft for human review. Evidence is supplied by operators, not independently audited by this software.\n\n\`\`\`json\n${JSON.stringify(data,null,2)}\n\`\`\`\n`;
  return [{file:write(path.join(process.env.OUTPUT_DIR||REPO_ROOT,'drafts',`${c}-${randomUUID()}.md`),contents)}];
 }
 await db.exec('BEGIN');try{const result=await mutate(db,c,o,pos);await db.exec(o['dry-run']?'ROLLBACK':'COMMIT');return result;}catch(e){await db.exec('ROLLBACK');throw e;}
}
function output(result){
 if(Array.isArray(result)){if(!result.length)return '(none)';const flat=result.map(r=>Object.fromEntries(Object.entries(r).map(([k,v])=>[k,v&&typeof v==='object'?JSON.stringify(v):v])));return table(flat,Object.keys(flat[0]).map(key=>({key,label:key,width:56})));}
 return Object.entries(result).map(([name,rows])=>`${name}\n${output(rows)}`).join('\n\n');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 let db;const o={};const pos=[];const args=process.argv.slice(2);const c=args.shift()||'help';
 try{for(const a of args){if(a.startsWith('--')){const [k,...rest]=a.slice(2).split('=');if(k in o)throw Error(`Duplicate --${k}`);o[k]=rest.length?rest.join('='):true;}else pos.push(a);}db=await getDb();const result=await run(db,c,o,pos);console.log(o.json?JSON.stringify(result,null,2):output(result));}
 catch(e){console.error(o.json?JSON.stringify({error:e.message}):e.message);process.exitCode=1;}finally{if(db)await db.close();}
}
