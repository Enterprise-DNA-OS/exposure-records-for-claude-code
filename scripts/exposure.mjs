import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { getDb, REPO_ROOT } from './lib/db.mjs';
import { parseCsv } from './lib/csv.mjs';
import { table } from './lib/format.mjs';

export const contracts = {
 help:[],sites:[],groups:[],plans:[],samples:[],sample:['ref'],coverage:[],
 'lab-review':[],'control-review':[],attention:[],compliance:[],history:[],imports:[],actions:[],reviews:[],notes:[],
 'add-site':['name','jurisdiction','owner','access-review','actor'],
 'add-group':['site','name','agent','hazard-kind','review-due','actor'],
 'plan-sampling':['group','task','owner','due','actor'],
 'complete-plan':['ref','sample','actor'],
 'add-sample':['group','source','source-id','sampled-on','recorded-on','task','result','units','report','method','actor'],
 import:['source','file','map','expected-count','source-ref','actor','dry-run'],
 'review-sample':['ref','decision','reviewer','evidence','date','actor'],
 'add-action':['ref','title','owner','due','actor'],
 'close-action':['ref','evidence','actor'],log:['ref','text','actor'],
 export:['file'],'weekly-review':[],'draft-review':['ref']
};
const reads={
 sites:'SELECT * FROM sites ORDER BY name',groups:'SELECT g.*,s.name AS site FROM exposure_groups g JOIN sites s ON s.id=g.site_id ORDER BY s.name,g.name,g.agent',
 plans:'SELECT * FROM v_plans ORDER BY due,id',samples:'SELECT * FROM v_samples ORDER BY sampled_on,source,source_id',
 coverage:'SELECT * FROM v_coverage ORDER BY site,exposure_group,agent',
 'lab-review':"SELECT source_id,site,exposure_group,result_text,units,decision,report_ref FROM v_samples WHERE decision IN ('unreviewed','insufficient_evidence') ORDER BY recorded_on,source_id",
 'control-review':"SELECT v.source_id,v.site,v.exposure_group,v.decision,v.open_actions, string_agg(a.title || ': ' || a.state, '; ' ORDER BY a.due) AS follow_up FROM v_samples v LEFT JOIN actions a ON a.sample_id=v.id WHERE v.decision='follow_up' GROUP BY v.id,v.source_id,v.site,v.exposure_group,v.decision,v.open_actions ORDER BY v.source_id",
 attention:'SELECT * FROM v_attention ORDER BY due,kind,id',compliance:'SELECT * FROM v_compliance ORDER BY rule,record',
 history:'SELECT * FROM events ORDER BY created_at,id',imports:'SELECT * FROM imports ORDER BY created_at,id',
 actions:'SELECT * FROM v_actions ORDER BY due,id',reviews:'SELECT r.*,s.source_id FROM reviews r JOIN samples s ON s.id=r.sample_id ORDER BY s.source_id,r.revision',
 notes:'SELECT n.*,s.source_id FROM notes n JOIN samples s ON s.id=n.sample_id ORDER BY n.created_at,n.id'
};
const entities=['sites','exposure_groups','sampling_plans','imports','samples','reviews','actions','notes','events'];
export function parse(argv){
 const [verb='help',...rest]=argv;if(!Object.hasOwn(contracts,verb))throw Error('Unknown command. Run help.');
 const opts={};let vendor;
 for(const a of rest){
  if(!a.startsWith('--')){if(verb==='import'&&!vendor){vendor=a;continue;}throw Error('Unexpected argument: '+a);}
  const eq=a.indexOf('=');const k=a.slice(2,eq<0?undefined:eq);const val=eq<0?true:a.slice(eq+1);
  if(![...contracts[verb],'json'].includes(k))throw Error('Unknown flag: '+k);
  if(Object.hasOwn(opts,k))throw Error('Duplicate flag: '+k);
  if(['json','dry-run'].includes(k)){if(val!==true)throw Error(k+' takes no value');}else if(val===true)throw Error(k+' requires =value');
  opts[k]=val;
 }
 if(verb==='import'&&vendor!=='cority')throw Error('Import requires vendor cority');
 return {verb,opts};
}
const req=(o,k)=>{if(typeof o[k]!=='string'||!o[k].trim())throw Error(k+' must be nonempty');return o[k].trim();};
export function date(v){if(!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v+'T00:00:00Z'))||new Date(v+'T00:00:00Z').toISOString().slice(0,10)!==v)throw Error('Expected real YYYY-MM-DD date: '+v);return v;}
const choice=(v,choices)=>{if(!choices.includes(v))throw Error('Expected one of '+choices.join(', '));return v;};
const hash=(x)=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
async function resolve(db,entity,ref){
 const cols={sites:'name',exposure_groups:'name',samples:'source_id',sampling_plans:'task',actions:'title'};
 const rows=await db.query(`SELECT * FROM ${entity} ORDER BY id`);
 const q=ref.toLowerCase();const full=rows.filter(r=>r.id===q);if(full.length)return full[0];
 const matches=rows.filter(r=>r.id.startsWith(q)||String(r[cols[entity]]).toLowerCase()===q);
 if(matches.length!==1)throw Error((matches.length?'Ambiguous':'No match')+': '+ref+'\n'+table(matches.length?matches:rows,[{key:'id',label:'id'},{key:cols[entity],label:cols[entity]}]));
 return matches[0];
}
async function event(db,id,kind,actor,detail){await db.query('INSERT INTO events(entity_id,kind,actor,detail) VALUES($1,$2,$3,$4)',[id,kind,actor,JSON.stringify(detail)]);}
async function transaction(db,fn,dry=false){await db.exec('BEGIN');try{const result=await fn();await db.exec(dry?'ROLLBACK':'COMMIT');return result;}catch(e){await db.exec('ROLLBACK');throw e;}}
function savePrivate(file,value){fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});fs.writeFileSync(file,typeof value==='string'?value:JSON.stringify(value,null,2)+'\n',{flag:'wx',mode:0o600});return [{file}];}
const fields=['source_id','site','group','agent','sampled_on','recorded_on','task','result','units','report','method'];
export async function importCority(db,o){
 const source=req(o,'source'),actor=req(o,'actor'),sourceRef=req(o,'source-ref');
 const expected=Number(req(o,'expected-count'));if(!Number.isSafeInteger(expected)||expected<1)throw Error('expected-count must be a positive integer');
 const content=fs.readFileSync(req(o,'file'),'utf8'),rows=parseCsv(content);
 if(rows.length!==expected)throw Error(`CSV count ${rows.length} does not match expected-count ${expected}`);
 const map=o.map?JSON.parse(fs.readFileSync(o.map,'utf8')):Object.fromEntries(fields.map(k=>[k,k]));
 if(Object.keys(map).some(k=>!fields.includes(k)))throw Error('Unknown mapping field');
 for(const f of fields)if(typeof map[f]!=='string'||!map[f])throw Error('Missing mapping: '+f);
 if(new Set(Object.values(map)).size!==fields.length)throw Error('Mapping columns must be distinct');
 for(const f of fields)if(!Object.hasOwn(rows[0],map[f]))throw Error('Missing CSV column: '+map[f]);
 const seen=new Set();const prepared=[];
 for(const raw of rows){
  const r=Object.fromEntries(fields.map(k=>[k,raw[map[k]].trim()]));
  for(const f of fields.filter(x=>x!=='method'))req(r,f);
  date(r.sampled_on);date(r.recorded_on);if(r.recorded_on<r.sampled_on)throw Error('recorded_on precedes sample date');
  if(seen.has(r.source_id))throw Error('Duplicate source ID in file: '+r.source_id);seen.add(r.source_id);
  const groups=await db.query('SELECT g.id FROM exposure_groups g JOIN sites s ON s.id=g.site_id WHERE lower(s.name)=lower($1) AND lower(g.name)=lower($2) AND lower(g.agent)=lower($3)',[r.site,r.group,r.agent]);
  if(groups.length!==1)throw Error('Register exactly one matching site, group and agent first: '+r.site+' / '+r.group+' / '+r.agent);
  const payload={group_id:groups[0].id,source,source_id:r.source_id,sampled_on:r.sampled_on,recorded_on:r.recorded_on,task:r.task,result_text:r.result,units:r.units,report_ref:r.report,method_ref:r.method,raw};
  prepared.push({...payload,record_hash:hash(payload)});
 }
 return transaction(db,async()=>{
  let added=0,skipped=0;
  const [batch]=await db.query('INSERT INTO imports(source,fingerprint,source_ref,expected_count,actor) VALUES($1,$2,$3,$4,$5) RETURNING id',[source,hash(content),sourceRef,expected,actor]);
  for(const s of prepared){
   const old=await db.query('SELECT id,record_hash FROM samples WHERE source=$1 AND source_id=$2',[source,s.source_id]);
   if(old.length){if(old[0].record_hash!==s.record_hash)throw Error('Conflicting source ID: '+s.source_id+'. Preserve the original and import a new source revision.');skipped++;continue;}
   const [r]=await db.query('INSERT INTO samples(group_id,source,source_id,import_id,sampled_on,recorded_on,task,result_text,units,report_ref,method_ref,raw,record_hash) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id',[s.group_id,source,s.source_id,batch.id,s.sampled_on,s.recorded_on,s.task,s.result_text,s.units,s.report_ref,s.method_ref,JSON.stringify(s.raw),s.record_hash]);
   await event(db,r.id,'sample-imported',actor,{import_id:batch.id,source_id:s.source_id});added++;
  }
  await event(db,batch.id,'import-checked',actor,{added,skipped,source_ref:sourceRef});
  return [{added,skipped,checked:expected,dry_run:!!o['dry-run']}];
 },!!o['dry-run']);
}
export async function execute(db,argv){
 const {verb,opts:o}=parse(argv);
 if(verb==='help')return Object.entries(contracts).map(([command,flags])=>({command,flags:flags.map(f=>'--'+f).join(' ')}));
 if(reads[verb])return db.query(reads[verb]);
 if(verb==='import')return importCority(db,o);
 if(verb==='sample'){
  const s=await resolve(db,'samples',req(o,'ref'));const [v]=await db.query('SELECT * FROM v_samples WHERE id=$1',[s.id]);
  return [{...v,reviews:await db.query('SELECT * FROM reviews WHERE sample_id=$1 ORDER BY revision',[s.id]),notes:await db.query('SELECT * FROM notes WHERE sample_id=$1 ORDER BY created_at,id',[s.id]),actions:await db.query('SELECT * FROM actions WHERE sample_id=$1 ORDER BY due,id',[s.id])}];
 }
 if(verb==='export')return transaction(db,async()=>{const records={};for(const e of entities)records[e]=await db.query(`SELECT * FROM ${e} ORDER BY id`);return savePrivate(path.resolve(req(o,'file')),{version:1,exported_at:new Date().toISOString(),records});});
 if(['weekly-review','draft-review'].includes(verb)){
  const root=process.env.OUTPUT_DIR||REPO_ROOT;let sections;
  if(verb==='weekly-review')sections=await Promise.all(['coverage','attention','compliance'].map(async c=>({command:c,records:await execute(db,[c])})));
  else sections=await execute(db,['sample','--ref='+req(o,'ref')]);
  return savePrivate(path.join(root,'drafts',verb+'-'+randomUUID()+'.md'),'# Exposure records review\n\nDraft. Internal records only. Qualified review is required before any exposure decision.\n\n```json\n'+JSON.stringify(sections,null,2)+'\n```\n');
 }
 const actor=req(o,'actor');
 return transaction(db,async()=>{
  let rows;
  if(verb==='add-site')rows=await db.query('INSERT INTO sites(name,jurisdiction,owner,access_review_due) VALUES($1,$2,$3,$4) RETURNING *',[req(o,'name'),choice(req(o,'jurisdiction'),['NZ','AU']),req(o,'owner'),date(req(o,'access-review'))]);
  if(verb==='add-group'){
   const site=await resolve(db,'sites',req(o,'site'));
   rows=await db.query('INSERT INTO exposure_groups(site_id,name,agent,hazard_kind,review_due) VALUES($1,$2,$3,$4,$5) RETURNING *',[site.id,req(o,'name'),req(o,'agent'),choice(req(o,'hazard-kind'),['asbestos','other']),date(req(o,'review-due'))]);
  }
  if(verb==='plan-sampling'){
   const group=await resolve(db,'exposure_groups',req(o,'group'));
   rows=await db.query('INSERT INTO sampling_plans(group_id,task,owner,due) VALUES($1,$2,$3,$4) RETURNING *',[group.id,req(o,'task'),req(o,'owner'),date(req(o,'due'))]);
  }
  if(verb==='complete-plan'){
   const plan=await resolve(db,'sampling_plans',req(o,'ref'));const s=await resolve(db,'samples',req(o,'sample'));
   if(s.group_id!==plan.group_id)throw Error('Sample belongs to a different exposure group');
   rows=await db.query("UPDATE sampling_plans SET state='completed',evidence_sample=$1,completed_by=$2 WHERE id=$3 AND state='open' RETURNING *",[s.id,actor,plan.id]);if(!rows.length)throw Error('Plan already completed');
  }
  if(verb==='add-sample'){
   const group=await resolve(db,'exposure_groups',req(o,'group'));const sampled=date(req(o,'sampled-on')),recorded=date(req(o,'recorded-on'));
   const raw={source_id:req(o,'source-id'),task:req(o,'task'),result:req(o,'result'),units:req(o,'units'),report:req(o,'report'),method:o.method||''};
   rows=await db.query('INSERT INTO samples(group_id,source,source_id,sampled_on,recorded_on,task,result_text,units,report_ref,method_ref,raw,record_hash) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *',[group.id,req(o,'source'),raw.source_id,sampled,recorded,raw.task,raw.result,raw.units,raw.report,raw.method,JSON.stringify(raw),hash(raw)]);
  }
  if(verb==='review-sample'){
   const s=await resolve(db,'samples',req(o,'ref'));const reviewed=date(req(o,'date'));if(reviewed<s.recorded_on)throw Error('Review date precedes record date');
   await db.query('SELECT id FROM samples WHERE id=$1 FOR UPDATE',[s.id]);
   rows=await db.query('INSERT INTO reviews(sample_id,revision,decision,reviewer,evidence,reviewed_on) SELECT $1,COALESCE(max(revision),0)+1,$2,$3,$4,$5 FROM reviews WHERE sample_id=$1 RETURNING *',[s.id,choice(req(o,'decision'),['follow_up','record_checked','insufficient_evidence']),req(o,'reviewer'),req(o,'evidence'),reviewed]);
  }
  if(verb==='add-action'){
   const s=await resolve(db,'samples',req(o,'ref'));
   rows=await db.query('INSERT INTO actions(sample_id,title,owner,due) VALUES($1,$2,$3,$4) RETURNING *',[s.id,req(o,'title'),req(o,'owner'),date(req(o,'due'))]);
  }
  if(verb==='close-action'){
   const a=await resolve(db,'actions',req(o,'ref'));
   rows=await db.query("UPDATE actions SET state='closed',closure_evidence=$1,closed_by=$2 WHERE id=$3 AND state='open' RETURNING *",[req(o,'evidence'),actor,a.id]);if(!rows.length)throw Error('Action already closed');
  }
  if(verb==='log'){
   const s=await resolve(db,'samples',req(o,'ref'));
   rows=await db.query('INSERT INTO notes(sample_id,actor,body) VALUES($1,$2,$3) RETURNING *',[s.id,actor,req(o,'text')]);
  }
  if(!rows)throw Error('Command not implemented: '+verb);
  await event(db,rows[0].id,verb,actor,rows[0]);return rows;
 });
}
export function human(rows){return table(rows,rows.length?Object.keys(rows[0]).filter(k=>!['raw','record_hash','created_at','updated_at'].includes(k)).map(key=>({key,label:key,format:v=>typeof v==='object'&&v!==null?JSON.stringify(v):v})):[]);}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 let db;try{const argv=process.argv.slice(2);const {opts}=parse(argv);db=await getDb();const rows=await execute(db,argv);console.log(opts.json?JSON.stringify(rows,null,2):human(rows));}catch(e){console.error(e.message);process.exitCode=1;}finally{await db?.close();}
}
