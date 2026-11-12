import '../config/env.js';
import assert from 'node:assert/strict';
import { readFile,mkdtemp,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join,dirname,resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import bcrypt from 'bcryptjs';
if(process.argv.includes('--preview'))process.env.CLIENT_URL='http://localhost:5174';
const database=`safespeak_workflow_test_${Date.now()}`;
const storage=await mkdtemp(join(tmpdir(),'safespeak-workflow-'));process.env.UPLOAD_DIR=storage;
const root=new pg.Pool({host:process.env.DB_HOST,port:Number(process.env.DB_PORT),user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME});
let pool,server,created=false;
try {
 await root.query(`CREATE DATABASE "${database}"`);created=true;process.env.DB_NAME=database;pool=(await import('../config/db.js')).pool;
 for(const file of ['000_initial_schema.sql','001_auth_sessions.sql','auth_runtime_grants.sql','002_registration_details.sql','003_faq_audit_permissions.sql','004_user_access.sql','005_concern_categories.sql','006_coordinator_access.sql','007_category_management.sql','008_concern_submission.sql','009_category_deletion.sql','010_concern_workflow.sql','011_referrals_notifications.sql','012_reports_profile_settings.sql'])await pool.query(await readFile(new URL(`../database/${file}`,import.meta.url),'utf8'));
 const ids={},tokens={},hash=await bcrypt.hash('Test-only-password-2026!',12);
 const {createSession}=await import('../services/sessions.js');const {sessionCookie,clientOrigin}=await import('../config/auth.js');
 for(const key of ['admin','student','other','coordinator','first','second','outsider']) {
  const role=key==='admin'?'admin':['student','other'].includes(key)?'student':'personnel';
  ids[key]=(await pool.query('INSERT INTO public.users(full_name,email,password_hash,role,is_intake_coordinator) VALUES($1,$2,$3,$4,$5) RETURNING id',[`Test ${key}`,`${key}@example.invalid`,hash,role,key==='coordinator'])).rows[0].id;tokens[key]=await createSession(ids[key]);
 }
 const categories=(await pool.query('SELECT id FROM public.concern_categories ORDER BY sort_order')).rows.map(row=>row.id);
 for(const key of ['first','second'])for(const category of categories.slice(0,2))await pool.query('INSERT INTO public.personnel_category_access(user_id,category_id) VALUES($1,$2)',[ids[key],category]);
 const {default:app}=await import('../app.js');server=app.listen(process.argv.includes('--preview')?5001:0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base=`http://127.0.0.1:${server.address().port}/api/v1`;let checks=0;
 async function request(path,{role='coordinator',method='GET',data,form,origin=clientOrigin}={},expected=200) {
  const response=await fetch(base+path,{method,headers:{Origin:origin,...(role?{Cookie:`${sessionCookie}=${tokens[role]}`} : {}),...(data?{'Content-Type':'application/json'}:{})},body:form||(data?JSON.stringify(data):undefined)});
  assert.equal(response.status,expected,`${method} ${path}: ${await response.clone().text()}`);checks++;return expected===204?null:response.json();
 }
 const detail=async(id,role='coordinator')=>(await request(`/concerns/${id}`,{role})).data;
 const stamp=async id=>(await detail(id)).updatedAt;
 const patch=async(id,status,role='coordinator',extra={},expected=200)=>request(`/concerns/${id}/status`,{role,method:'PATCH',data:{updatedAt:await stamp(id),status,...extra}},expected);
 const assign=async(id,role='first',extra={},expected=200)=>request(`/concerns/${id}/assignments`,{method:'POST',data:{updatedAt:await stamp(id),assignedTo:ids[role],...extra}},expected);
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aM5kAAAAASUVORK5CYII=','base64');
 async function submit(title='Workflow concern',role='student') {
  const body=new FormData();for(const [key,value] of Object.entries({clientSubmissionId:randomUUID(),title,categoryId:categories[0],description:'Private narrative for workflow tests'}))body.set(key,value);
  body.append('attachments',new Blob([png],{type:'image/png'}),'evidence.png');
  return (await request('/concerns',{role,method:'POST',form:body},201)).data;
 }
 const empty=await request('/concerns',{role:'student'});assert.equal(empty.data.length,0);assert.equal(empty.pagination.total,0);
 assert.equal((await request('/concerns/summary',{role:'student'})).data.total,0);
 for(const path of ['/concerns','/concerns/summary']){await request(path,{role:null},401);await request(path,{role:'admin'},403);}
 await request('/concerns?view=queue',{role:'student'},403);await request('/concerns?view=queue',{role:'first'},403);
 const concern=await submit(),id=concern.id;await submit('Other student private case','other');
 for(const role of ['admin','other','first','outsider'])for(const suffix of ['','/messages','/history'])await request(`/concerns/${id}${suffix}`,{role},404);
 const own=await detail(id,'student');assert.equal(own.description,'Private narrative for workflow tests');assert.equal(own.studentName,undefined);assert.equal(own.handlerId,undefined);assert.equal(own.attachments[0].storagePath,undefined);
 await request('/concerns/invalid',{role:'student'},400);await request(`/concerns/${randomUUID()}`,{},404);
 assert.equal((await request('/concerns?search=Workflow',{role:'student'})).pagination.total,1);
 assert.equal((await request('/concerns?pageSize=1')).data.length,1);
 assert.equal((await request('/concerns?search=Test%20student')).pagination.total,1);
 const manila=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Manila',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 assert.equal((await request(`/concerns?from=${manila}&to=${manila}`)).pagination.total,2);
 await request('/concerns?from=2026-12-31&to=2026-01-01',{},400);await request('/concerns?pageSize=101',{},400);
 await assign(id,'first',{},409);
 await request(`/concerns/${id}/status`,{role:'student',method:'PATCH',data:{updatedAt:own.updatedAt,status:'under_review'}},403);
 await request(`/concerns/${id}/status`,{method:'PATCH',origin:'https://wrong.invalid',data:{updatedAt:own.updatedAt,status:'under_review'}},403);
 await patch(id,'under_review','coordinator',{reason:'Private intake review note'});
 await request(`/concerns/${id}/status`,{method:'PATCH',data:{updatedAt:own.updatedAt,status:'rejected',reason:'stale'}},409);
 await patch(id,'resolved','coordinator',{resolutionSummary:'Not assigned'},409);
 await assign(id,'outsider',{},409);await assign(id,'coordinator',{},409);
 const eligible=await request(`/concerns/${id}/eligible-personnel?pageSize=1`);assert.equal(eligible.pagination.total,2);assert.equal(eligible.data.length,1);assert.equal(eligible.data[0].email,undefined);
 await request(`/concerns/${id}/eligible-personnel`,{role:'student'},403);
 await assign(id,'first',{reason:'Private initial assignment note'});
 await patch(id,'rejected','coordinator',{reason:'Assigned cases are not intake submissions'},409);
 assert.equal((await detail(id,'student')).handlerName,'Test first');assert.equal((await request('/concerns?view=assigned',{role:'first'})).pagination.total,1);
 assert.equal((await request('/concerns/summary',{role:'first'})).data.assignedToYou,1);
 await request(`/concerns/${id}/assignments`,{role:'first',method:'POST',data:{updatedAt:await stamp(id),assignedTo:ids.second}},403);
 await patch(id,'in_progress','coordinator',{},409);
 await request(`/concerns/${id}/messages`,{role:'student',method:'POST',data:{message:'Student clarification'}},201);
 await request(`/concerns/${id}/messages`,{role:'first',method:'POST',data:{message:'Public response'}},201);
 await request(`/concerns/${id}/messages`,{role:'first',method:'POST',data:{message:'Secret internal note',visibility:'internal'}},201);
 await request(`/concerns/${id}/messages`,{role:'coordinator',method:'POST',data:{message:'Coordinator note',visibility:'internal'}},201);
 await request(`/concerns/${id}/messages`,{role:'student',method:'POST',data:{message:'No internal access',visibility:'internal'}},403);
 await request(`/concerns/${id}/messages`,{role:'student',method:'POST',data:{message:'   '}},400);
 await request(`/concerns/${id}/messages`,{role:'student',method:'POST',data:{message:'a'.repeat(5001)}},400);
 const publicMessages=await request(`/concerns/${id}/messages`,{role:'student'});assert.equal(publicMessages.pagination.total,2);assert.ok(!JSON.stringify(publicMessages).includes('Secret internal'));
 assert.equal((await request(`/concerns/${id}/messages`,{role:'first'})).pagination.total,4);
 const publicHistory=await request(`/concerns/${id}/history`,{role:'student'});assert.ok(!JSON.stringify(publicHistory).includes('Private initial'));assert.ok(publicHistory.data.every(event=>event.details===null));assert.ok(!JSON.stringify(publicHistory).includes('Private intake review note'));assert.ok(JSON.stringify(await request(`/concerns/${id}/history`,{role:'first'})).includes('Private intake review note'));
 const attachment=own.attachments[0].id;
 async function download(role,expected) {const response=await fetch(`${base}/concerns/attachments/${attachment}`,{headers:{Cookie:`${sessionCookie}=${tokens[role]}`}});assert.equal(response.status,expected);checks++;}
 await download('first',200);await download('second',404);
 await patch(id,'in_progress','first');
 await assign(id,'second',{},400);await assign(id,'second',{reason:'Private reassignment reason'});
 assert.equal((await detail(id)).status,'in_progress');await request(`/concerns/${id}`,{role:'first'},404);await download('first',404);await download('second',200);
 assert.equal((await pool.query('SELECT count(*) FROM public.concern_assignments WHERE concern_id=$1 AND ended_at IS NULL',[id])).rows[0].count,'1');
 await request(`/concerns/${id}/category`,{method:'PATCH',data:{updatedAt:await stamp(id),categoryId:categories[2],reason:'Ineligible destination'}},409);
 await request(`/concerns/${id}/category`,{method:'PATCH',data:{updatedAt:await stamp(id),categoryId:categories[1],reason:'Private category correction'}},200);
 assert.equal((await detail(id,'student')).categoryId,categories[1]);
 await patch(id,'resolved','second',{},400);await patch(id,'resolved','second',{resolutionSummary:'Documented student-visible resolution'});
 await request(`/concerns/${id}/messages`,{role:'student',method:'POST',data:{message:'Too late'}},409);
 await request(`/concerns/${id}/messages`,{role:'second',method:'POST',data:{message:'Too late note',visibility:'internal'}},409);
 await patch(id,'closed','second',{},409);await patch(id,'closed');
 const closed=await detail(id,'student');assert.ok(closed.resolvedAt);assert.ok(closed.closedAt);assert.equal(closed.resolutionSummary,'Documented student-visible resolution');
 await patch(id,'in_progress','coordinator',{},409);await assign(id,'first',{reason:'closed'},409);
 await request(`/concerns/${id}/category`,{method:'PATCH',data:{updatedAt:await stamp(id),categoryId:categories[0],reason:'closed'}},409);
 assert.equal((await request('/concerns/summary',{role:'student'})).data.resolved,1);
 // Coordinators can reject unsuitable submissions immediately, without assigning a handler.
 const intakeReject=await submit('Unsuitable intake submission');
 await request(`/concerns/${intakeReject.id}/status`,{role:'student',method:'PATCH',data:{updatedAt:await stamp(intakeReject.id),status:'rejected',reason:'Student cannot reject'}},403);
 await request(`/concerns/${intakeReject.id}/status`,{role:'outsider',method:'PATCH',data:{updatedAt:await stamp(intakeReject.id),status:'rejected',reason:'Unassigned personnel cannot reject'}},404);
 await patch(intakeReject.id,'rejected','coordinator',{},400);
 await patch(intakeReject.id,'rejected','coordinator',{reason:'Documented unsuitable submission'});
 const intakeHistory=await request(`/concerns/${intakeReject.id}/history`,{role:'student'});assert.equal(intakeHistory.data[0].oldStatus,'submitted');assert.equal(intakeHistory.data[0].newStatus,'rejected');assert.equal(intakeHistory.data[0].reason,'Documented unsuitable submission');
 assert.equal((await pool.query('SELECT count(*) FROM public.concern_assignments WHERE concern_id=$1',[intakeReject.id])).rows[0].count,'0');
 // Initial-review rejection is public and never possible after assignment.
 const rejected=await submit('Rejected concern');await patch(rejected.id,'under_review');await patch(rejected.id,'rejected','coordinator',{},400);await patch(rejected.id,'rejected','coordinator',{reason:'Documented public rejection'});
 assert.ok(JSON.stringify(await request(`/concerns/${rejected.id}/history`,{role:'student'})).includes('Documented public rejection'));
 // Concurrent assignments share one revision: exactly one wins.
 const race=await submit('Concurrent case');await patch(race.id,'under_review');const revision=await stamp(race.id);
 const assignments=await Promise.all(['first','second'].map(key=>fetch(`${base}/concerns/${race.id}/assignments`,{method:'POST',headers:{Origin:clientOrigin,Cookie:`${sessionCookie}=${tokens.coordinator}`,'Content-Type':'application/json'},body:JSON.stringify({updatedAt:revision,assignedTo:ids[key]})})));
 assert.deepEqual(assignments.map(response=>response.status).sort(),[200,409]);
 // A committed eligibility removal while assignment waits must be respected.
 const blocked=await submit('Eligibility race');await patch(blocked.id,'under_review');const blocker=await pool.connect();
 try {
  await blocker.query('BEGIN');await blocker.query('SELECT pg_advisory_xact_lock(7024,1)');await blocker.query('DELETE FROM public.personnel_category_access WHERE user_id=$1 AND category_id=$2',[ids.first,categories[0]]);
  const pending=request(`/concerns/${blocked.id}/assignments`,{method:'POST',data:{updatedAt:await stamp(blocked.id),assignedTo:ids.first}},409);
  await blocker.query('COMMIT');await pending;
 }finally{blocker.release();}
 // Restoring grants is test fixture setup; category access alone still cannot read a case.
 await pool.query('INSERT INTO public.personnel_category_access(user_id,category_id) VALUES($1,$2)',[ids.first,categories[0]]);
 await request(`/concerns/${blocked.id}`,{role:'first'},404);
 // Every mutation must roll back when its audit insert fails.
 const before=await detail(blocked.id),beforeHistory=(await request(`/concerns/${blocked.id}/history`)).pagination.total;
 await pool.query(`CREATE FUNCTION fail_workflow_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.entity_type='concern' THEN RAISE EXCEPTION 'test rollback'; END IF; RETURN NEW; END; $$;CREATE TRIGGER fail_workflow_audit BEFORE INSERT ON public.audit_logs FOR EACH ROW EXECUTE FUNCTION fail_workflow_audit();`);
 await assign(blocked.id,'first',{},500);
 await request(`/concerns/${blocked.id}/messages`,{method:'POST',data:{message:'Rollback this reply'}},500);
 await request(`/concerns/${blocked.id}/category`,{method:'PATCH',data:{updatedAt:before.updatedAt,categoryId:categories[1],reason:'Rollback correction'}},500);
 await patch(blocked.id,'rejected','coordinator',{reason:'Rollback rejection'},500);
 assert.equal((await detail(blocked.id)).updatedAt,before.updatedAt);assert.equal((await request(`/concerns/${blocked.id}/messages`)).pagination.total,0);assert.equal((await request(`/concerns/${blocked.id}/history`)).pagination.total,beforeHistory);assert.equal((await detail(blocked.id)).handlerId,null);
 await pool.query('DROP TRIGGER fail_workflow_audit ON public.audit_logs;DROP FUNCTION fail_workflow_audit();');
 // Inactive categories cannot receive assignments; existing handlers retain read access.
 const inactive=await submit('Inactive category case');await patch(inactive.id,'under_review');await pool.query('UPDATE public.concern_categories SET is_active=false WHERE id=$1',[categories[0]]);
 await assign(inactive.id,'first',{},409);await request(`/concerns/${inactive.id}/category`,{method:'PATCH',data:{updatedAt:await stamp(inactive.id),categoryId:categories[1],reason:'Choose active destination'}});await assign(inactive.id,'first');
 await pool.query('UPDATE public.concern_categories SET is_active=true WHERE id=$1',[categories[0]]);
 await pool.query('DELETE FROM public.personnel_category_access WHERE user_id=$1',[ids.first]);assert.ok((await detail(inactive.id,'first')).permissions.isHandler);
 await pool.query('UPDATE public.users SET is_active=false WHERE id=$1',[ids.first]);await request(`/concerns/${inactive.id}`,{role:'first'},401);
 await pool.query('UPDATE public.users SET is_active=true WHERE id=$1',[ids.first]);
 // Verify the narrow runtime database role, including reads and all writes.
 const workflow=await import('../services/concern-workflow.js'),client=await pool.connect(),originalConnect=pool.connect;
 try {
  await client.query('SET ROLE safespeak_app');pool.connect=async()=>({query:client.query.bind(client),release(){}});
  const d=(await workflow.concernDetails(ids.coordinator,blocked.id)).data;
  await workflow.mutateConcern(ids.coordinator,blocked.id,'assignment',{updatedAt:d.updatedAt,assignedTo:ids.second});
  let current=(await workflow.concernDetails(ids.second,blocked.id)).data;
  await workflow.mutateConcern(ids.second,blocked.id,'message',{message:'Runtime reply',visibility:'student_visible'});
  current=(await workflow.concernDetails(ids.second,blocked.id)).data;await workflow.mutateConcern(ids.second,blocked.id,'status',{updatedAt:current.updatedAt,status:'in_progress'});
  current=(await workflow.concernDetails(ids.second,blocked.id)).data;await workflow.mutateConcern(ids.second,blocked.id,'status',{updatedAt:current.updatedAt,status:'resolved',resolutionSummary:'Runtime resolution'});
  current=(await workflow.concernDetails(ids.coordinator,blocked.id)).data;await workflow.mutateConcern(ids.coordinator,blocked.id,'status',{updatedAt:current.updatedAt,status:'closed'});
  await workflow.concernHistory(ids.student,blocked.id,{page:1,pageSize:20});await workflow.concernMessages(ids.student,blocked.id,{page:1,pageSize:20});await workflow.listConcerns(ids.student,{page:1,pageSize:20,search:''});await workflow.concernSummary(ids.second);
  await assert.rejects(client.query('DELETE FROM public.audit_logs'),error=>error.code==='42501');await assert.rejects(client.query('DELETE FROM public.concern_messages'),error=>error.code==='42501');
 }finally{pool.connect=originalConnect;await client.query('RESET ROLE');client.release();}
 const logs=await request('/admin/audit-logs?search=concern.',{role:'admin'});const serialized=JSON.stringify(logs);
 for(const secret of ['Secret internal note','Private intake review note','Private reassignment reason','Private category correction','Private narrative','Documented student-visible resolution','Runtime resolution','Public response'])assert.ok(!serialized.includes(secret),`Audit leaked ${secret}`);
 for(const action of ['concern.assigned','concern.reassigned','concern.category_changed','concern.reply_created','concern.note_created','concern.resolved','concern.closed'])assert.ok((await request(`/admin/audit-logs?action=${action}`,{role:'admin'})).pagination.total>0);
 if(process.argv.includes('--referrals'))await (await import('./referral-checks.mjs')).checkReferrals({pool,ids,tokens,request,submit,patch,assign,detail,stamp,categories,base,sessionCookie,clientOrigin,storage});
 if(process.argv.includes('--modules'))await (await import('./module-checks.mjs')).checkModules({pool,ids,tokens,request,submit,patch,assign,detail,stamp,categories,base,sessionCookie,clientOrigin,storage});
 console.log(`PASS: ${checks} concern-workflow HTTP checks plus concurrency, confidentiality, rollback, and runtime-permission assertions.`);
 if(process.argv.includes('--preview')){
  if(process.argv.includes('--ui-preview')){
   await submit('Intake review example');
   for(const [question,answer]of [['What kinds of concerns can I raise?','Choose an appropriate active category and explain the support you need.'],['How do I submit a concern?','Open Submit a concern, complete the form, and confirm submission.\nYou can save a browser draft before submitting.'],['Where can I see updates on my concern?','Open My concerns to view public replies and status history.']])await pool.query('INSERT INTO public.faqs(question,answer,is_published,created_by) VALUES($1,$2,true,$3)',[question,answer,ids.admin]);
  }
  console.log('Workflow preview ready on 5001; send stop to clean up.');await new Promise(resolve=>{process.stdin.resume();process.stdin.once('data',resolve)});process.stdin.pause();
 }
}finally {
 if(server)await new Promise(r=>server.close(r));if(pool)await pool.end();if(created)await root.query(`DROP DATABASE "${database}" WITH (FORCE)`);await root.end();assert.equal(resolve(dirname(storage)),resolve(tmpdir()));assert.ok(storage.startsWith(join(tmpdir(),'safespeak-workflow-')));await rm(storage,{recursive:true,force:true});console.log('Isolated workflow database and uploads removed.');
}
