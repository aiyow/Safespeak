import '../config/env.js';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,readdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import pg from 'pg';
import bcrypt from 'bcryptjs';
if(process.argv.includes('--preview'))process.env.CLIENT_URL='http://localhost:5174';
const database=`safespeak_submission_test_${Date.now()}`;
const storage=await mkdtemp(join(tmpdir(),'safespeak-submission-'));process.env.UPLOAD_DIR=storage;
const root=new pg.Pool({host:process.env.DB_HOST,port:Number(process.env.DB_PORT),user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME});
let pool,server,created=false;
try{
 await root.query(`CREATE DATABASE "${database}"`);created=true;process.env.DB_NAME=database;pool=(await import('../config/db.js')).pool;
 for(const file of ['000_initial_schema.sql','001_auth_sessions.sql','auth_runtime_grants.sql','002_registration_details.sql','003_faq_audit_permissions.sql','004_user_access.sql','005_concern_categories.sql','006_coordinator_access.sql','007_category_management.sql','008_concern_submission.sql','009_category_deletion.sql','010_concern_workflow.sql','011_referrals_notifications.sql','012_reports_profile_settings.sql'])await pool.query(await readFile(new URL(`../database/${file}`,import.meta.url),'utf8'));
 const hash=await bcrypt.hash('Test-only-password-2026!',12),ids={},tokens={};const {createSession,getSessionUser}=await import('../services/sessions.js');const {sessionCookie,clientOrigin}=await import('../config/auth.js');
 for(const key of ['admin','student','other','personnel']){const role=key==='other'?'student':key;ids[key]=(await pool.query('INSERT INTO public.users(full_name,email,password_hash,role) VALUES($1,$2,$3,$4) RETURNING id',[`Test ${key}`,`${key}@example.invalid`,hash,role])).rows[0].id;tokens[key]=await createSession(ids[key]);}
 const {default:app}=await import('../app.js');server=app.listen(process.argv.includes('--preview')?5001:0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base=`http://127.0.0.1:${server.address().port}/api/v1`;let checks=0;
 async function request(path,{role='admin',method='GET',data,form,origin=clientOrigin}={},status=200){const r=await fetch(base+path,{method,headers:{...(role?{Cookie:`${sessionCookie}=${tokens[role]}`} : {}),Origin:origin,...(data?{'Content-Type':'application/json'}:{})},body:form||(data?JSON.stringify(data):undefined)});assert.equal(r.status,status,`${method} ${path}: ${await r.clone().text()}`);checks++;return r.status===204?null:r.json();}
 const getUser=async id=>(await request(`/admin/users/${id}`)).data;
 const setCoordinator=async enabled=>{const user=await getUser(ids.personnel);return request(`/admin/users/${ids.personnel}`,{method:'PATCH',data:{updatedAt:user.updatedAt,isIntakeCoordinator:enabled}})};
 const {canPersonnelAccessConcern,canAssignToCategory}=await import('../services/user-access.js');
 const initial=await request('/categories');assert.equal(initial.data.length,6);
 let category=(await request('/admin/categories',{method:'POST',data:{name:' New Category ',description:'A new category',isActive:true}},201)).data;
 assert.ok(category.sortOrder>6);await request('/admin/categories',{method:'POST',data:{name:'new category'}},409);
 const originalId=category.id,stamp=category.updatedAt;
 category=(await request(`/admin/categories/${category.id}`,{method:'PATCH',data:{name:'Renamed Category',updatedAt:category.updatedAt}})).data;assert.equal(category.id,originalId);assert.equal(category.description,'A new category');assert.equal(category.sortOrder,7);
 await request(`/admin/categories/${category.id}`,{method:'PATCH',data:{updatedAt:stamp,name:'Stale name'}},409);
 for(const role of ['student','personnel'])await request('/admin/categories',{role},403);
 await request('/admin/categories',{role:null},401);await request('/admin/categories',{method:'POST',origin:'https://wrong.invalid',data:{name:'No'}},403);

 const disposable=(await request('/admin/categories',{method:'POST',data:{name:'Disposable deletion test'}},201)).data;
 for(const role of ['student','personnel'])await request(`/admin/categories/${disposable.id}`,{role,method:'DELETE',data:{updatedAt:disposable.updatedAt}},403);
 await request(`/admin/categories/${disposable.id}`,{role:null,method:'DELETE',data:{updatedAt:disposable.updatedAt}},401);
 await request(`/admin/categories/${disposable.id}`,{method:'DELETE',origin:'https://wrong.invalid',data:{updatedAt:disposable.updatedAt}},403);
 await request(`/admin/categories/${disposable.id}`,{method:'DELETE',data:{updatedAt:'stale'}},409);
 await request('/admin/categories/invalid',{method:'DELETE',data:{updatedAt:disposable.updatedAt}},400);
 await request(`/admin/categories/${disposable.id}`,{method:'DELETE',data:{updatedAt:disposable.updatedAt}},204);
 await request(`/admin/categories/${disposable.id}`,{method:'DELETE',data:{updatedAt:disposable.updatedAt}},404);
 const deletedLog=await request('/admin/audit-logs?action=category.deleted');assert.equal(deletedLog.data[0].details.before.name,'Disposable deletion test');assert.equal(deletedLog.data[0].details.after,null);
 const rollbackCategory=(await request('/admin/categories',{method:'POST',data:{name:'Deletion rollback test'}},201)).data;
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aM5kAAAAASUVORK5CYII=','base64');
 const submission={clientSubmissionId:randomUUID(),title:'Private student concern',categoryId:category.id,description:'Private narrative must not appear in audit logs'};
 function form(input=submission,files=[{name:'evidence.png',type:'image/png',bytes:png}]){const body=new FormData();for(const[key,value]of Object.entries(input))body.set(key,value);for(const file of files)body.append('attachments',new Blob([file.bytes],{type:file.type}),file.name);return body;}
 await request('/concerns',{role:null,method:'POST',form:form()},401);await request('/concerns',{role:'admin',method:'POST',form:form()},403);await request('/concerns',{role:'personnel',method:'POST',form:form()},403);await request('/concerns',{role:'student',method:'POST',form:form(),origin:'https://wrong.invalid'},403);
 const received=(await request('/concerns',{role:'student',method:'POST',form:form()},201)).data;assert.match(received.referenceNumber,/^SS-\d{4}-\d+$/);
 assert.equal((await pool.query('SELECT count(*) FROM public.concern_status_history WHERE concern_id=$1',[received.id])).rows[0].count,'1');
 assert.equal((await pool.query('SELECT count(*) FROM public.concern_assignments WHERE concern_id=$1',[received.id])).rows[0].count,'0');
 await request(`/admin/categories/${category.id}`,{method:'DELETE',data:{updatedAt:category.updatedAt}},409);
 const retry=(await request('/concerns',{role:'student',method:'POST',form:form()})).data;assert.equal(retry.id,received.id);assert.equal(retry.repeated,true);
 await request('/concerns',{role:'student',method:'POST',form:form({...submission,title:'Changed retry'})},409);
 const race={...submission,clientSubmissionId:randomUUID()};const concurrent=await Promise.all([fetch(base+'/concerns',{method:'POST',headers:{Origin:clientOrigin,Cookie:`${sessionCookie}=${tokens.student}`},body:form(race,[])}),fetch(base+'/concerns',{method:'POST',headers:{Origin:clientOrigin,Cookie:`${sessionCookie}=${tokens.student}`},body:form(race,[])})]);assert.deepEqual(concurrent.map(r=>r.status).sort(),[200,201]);
 await request('/concerns',{role:'student',method:'POST',form:form({...submission,clientSubmissionId:randomUUID(),title:' '},[])},400);
 await request('/concerns',{role:'student',method:'POST',form:form({...submission,clientSubmissionId:randomUUID()},[{name:'fake.png',type:'image/png',bytes:Buffer.from('not an image')}])},400);
 await request('/concerns',{role:'student',method:'POST',form:form({...submission,clientSubmissionId:randomUUID()},[{name:'evidence.exe',type:'image/png',bytes:png}])},400);
 await request('/concerns',{role:'student',method:'POST',form:form({...submission,clientSubmissionId:randomUUID()},Array.from({length:4},()=>({name:'a.png',type:'image/png',bytes:png})))},400);
 await request('/concerns',{role:'student',method:'POST',form:form({...submission,clientSubmissionId:randomUUID()},[{name:'big.png',type:'image/png',bytes:Buffer.alloc(5*1024*1024+1)}])},400);
 const attachment=(await pool.query('SELECT id,storage_path FROM public.concern_attachments WHERE concern_id=$1',[received.id])).rows[0];assert.ok(!attachment.storage_path.includes('/'));
 async function download(role,status,preview=false){const r=await fetch(base+`/concerns/attachments/${attachment.id}${preview?'?preview=1':''}`,{headers:role?{Cookie:`${sessionCookie}=${tokens[role]}`}:{}});assert.equal(r.status,status);checks++;if(status===200){assert.ok(r.headers.get('content-disposition').startsWith(preview?'inline':'attachment'));if(preview)assert.equal(r.headers.get('content-type'),'image/png');assert.equal(r.headers.get('cache-control'),'no-store');assert.equal(r.headers.get('x-content-type-options'),'nosniff');assert.deepEqual(Buffer.from(await r.arrayBuffer()),png);}}
 await download('student',200);await download('other',404);await download('admin',404);await download('personnel',404);
 await download(null,401,true);await download('student',200,true);await download('other',404,true);await download('admin',404,true);await download('personnel',404,true);
 const pdf=(await request('/concerns',{role:'student',method:'POST',form:form({...submission,clientSubmissionId:randomUUID(),title:'PDF remains a download'},[{name:'document.pdf',type:'application/pdf',bytes:Buffer.from('%PDF-1.4\n%%EOF')}])},201)).data;
 const pdfFile=(await pool.query('SELECT id FROM public.concern_attachments WHERE concern_id=$1',[pdf.id])).rows[0];
 await request(`/concerns/attachments/${pdfFile.id}?preview=1`,{role:'student'},415);
 await pool.query('INSERT INTO public.personnel_category_access(user_id,category_id) VALUES($1,$2)',[ids.personnel,category.id]);assert.ok(await canAssignToCategory(ids.personnel,category.id));await request(`/admin/categories/${category.id}`,{method:'DELETE',data:{updatedAt:category.updatedAt}},409);assert.equal(await canPersonnelAccessConcern(ids.personnel,received.id),false);
 const priorToken=tokens.personnel;await setCoordinator(true);assert.equal(await getSessionUser(priorToken),null);tokens.personnel=await createSession(ids.personnel);assert.equal((await request('/access/me',{role:'personnel'})).data.isIntakeCoordinator,true);assert.ok(await canPersonnelAccessConcern(ids.personnel,received.id));await download('personnel',200);await download('personnel',200,true);
 await setCoordinator(false);tokens.personnel=await createSession(ids.personnel);await download('personnel',404);await download('personnel',404,true);
 await pool.query('INSERT INTO public.concern_assignments(concern_id,assigned_to,assigned_by) VALUES($1,$2,$3)',[received.id,ids.personnel,ids.admin]);assert.ok(await canPersonnelAccessConcern(ids.personnel,received.id));await download('personnel',200);await download('personnel',200,true);
 category=(await request(`/admin/categories/${category.id}`,{method:'PATCH',data:{updatedAt:category.updatedAt,isActive:false}})).data;assert.equal(await canAssignToCategory(ids.personnel,category.id),false);assert.ok(await canPersonnelAccessConcern(ids.personnel,received.id));
 await request('/concerns',{role:'student',method:'POST',form:form({...submission,clientSubmissionId:randomUUID()},[])},400);
 const sameRetry=(await request('/concerns',{role:'student',method:'POST',form:form()})).data;assert.equal(sameRetry.id,received.id);
 category=(await request(`/admin/categories/${category.id}`,{method:'PATCH',data:{updatedAt:category.updatedAt,isActive:true}})).data;
 const filesBefore=(await readdir(storage)).length,recordsBefore=Number((await pool.query('SELECT count(*) FROM public.concerns')).rows[0].count);
 await pool.query(`CREATE FUNCTION fail_submission_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.entity_type IN ('concern','category') THEN RAISE EXCEPTION 'test rollback'; END IF; RETURN NEW; END; $$;CREATE TRIGGER fail_submission_audit BEFORE INSERT ON public.audit_logs FOR EACH ROW EXECUTE FUNCTION fail_submission_audit();`);
 await request('/concerns',{role:'student',method:'POST',form:form({...submission,clientSubmissionId:randomUUID()})},500);assert.equal((await readdir(storage)).length,filesBefore);assert.equal(Number((await pool.query('SELECT count(*) FROM public.concerns')).rows[0].count),recordsBefore);
 await request(`/admin/categories/${category.id}`,{method:'PATCH',data:{updatedAt:category.updatedAt,name:'Must roll back'}},500);assert.equal((await pool.query('SELECT name FROM public.concern_categories WHERE id=$1',[category.id])).rows[0].name,'Renamed Category');
 await request(`/admin/categories/${rollbackCategory.id}`,{method:'DELETE',data:{updatedAt:rollbackCategory.updatedAt}},500);assert.equal((await pool.query('SELECT count(*) FROM public.concern_categories WHERE id=$1',[rollbackCategory.id])).rows[0].count,'1');
 await pool.query('DROP TRIGGER fail_submission_audit ON public.audit_logs;DROP FUNCTION fail_submission_audit();');
 const logs=await request('/admin/audit-logs?action=concern.submitted');assert.ok(logs.data.length>=2);assert.ok(!JSON.stringify(logs).includes(submission.description));assert.ok(!JSON.stringify(logs).includes(submission.title));
 const {deleteCategory}=await import('../services/categories.js');
 const {submitConcern}=await import('../services/concerns.js');const client=await pool.connect(),originalConnect=pool.connect;
 try{await client.query('SET ROLE safespeak_app');pool.connect=async()=>({query:client.query.bind(client),release(){}});await submitConcern(ids.student,{...submission,clientSubmissionId:randomUUID()},[{originalname:'runtime.png',mimetype:'image/png',buffer:png}]);await deleteCategory({id:ids.admin,fullName:'Test admin',role:'admin'},rollbackCategory.id,rollbackCategory.updatedAt);}finally{pool.connect=originalConnect;await client.query('RESET ROLE');client.release();}
 const coordinator=(await getUser(ids.personnel));await request(`/admin/users/${ids.personnel}`,{method:'PATCH',data:{updatedAt:coordinator.updatedAt,isIntakeCoordinator:true}});const current=await getUser(ids.personnel);
 await pool.query('UPDATE public.concern_assignments SET ended_at=now() WHERE assigned_to=$1',[ids.personnel]);
 await request(`/admin/users/${ids.personnel}`,{method:'PATCH',data:{updatedAt:current.updatedAt,role:'admin'}});assert.equal((await getUser(ids.personnel)).isIntakeCoordinator,false);
 console.log(`PASS: ${checks} category/coordinator/submission HTTP checks plus duplicate-race, private-file, rollback-cleanup, and runtime-service assertions.`);
 if(process.argv.includes('--preview')){await pool.query("UPDATE public.users SET role='personnel',is_intake_coordinator=true WHERE id=$1",[ids.personnel]);console.log('Submission preview ready on 5001; send stop to clean up.');await new Promise(resolve=>{process.stdin.resume();process.stdin.once('data',resolve)});process.stdin.pause();}
}finally{if(server)await new Promise(r=>server.close(r));if(pool)await pool.end();if(created)await root.query(`DROP DATABASE "${database}" WITH (FORCE)`);await root.end();assert.equal(resolve(dirname(storage)),resolve(tmpdir()));assert.ok(storage.startsWith(join(tmpdir(),'safespeak-submission-')));await rm(storage,{recursive:true,force:true});console.log('Isolated submission database and upload directory removed.');}
