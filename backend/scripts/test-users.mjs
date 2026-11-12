import '../config/env.js';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import bcrypt from 'bcryptjs';
if(process.argv.includes('--preview'))process.env.CLIENT_URL='http://localhost:5174';
const name=`safespeak_users_test_${Date.now()}`;
assert.match(name,/^safespeak_users_test_\d+$/);
const root=new pg.Pool({host:process.env.DB_HOST,port:Number(process.env.DB_PORT),user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME});
let pool,server,created=false;
try {
 await root.query(`CREATE DATABASE "${name}"`);created=true;process.env.DB_NAME=name;
 pool=(await import('../config/db.js')).pool;
 for(const file of ['000_initial_schema.sql','001_auth_sessions.sql','auth_runtime_grants.sql','002_registration_details.sql','003_faq_audit_permissions.sql','004_user_access.sql','005_concern_categories.sql','006_coordinator_access.sql','007_category_management.sql','008_concern_submission.sql','009_category_deletion.sql','010_concern_workflow.sql','011_referrals_notifications.sql','012_reports_profile_settings.sql'])await pool.query(await readFile(new URL(`../database/${file}`,import.meta.url),'utf8'));
 const hash=await bcrypt.hash('Test-only-password-2026!',12), ids={},tokens={};
 const {createSession,getSessionUser}=await import('../services/sessions.js');
 const {canPersonnelAccessConcern}=await import('../services/user-access.js');
 const {sessionCookie,clientOrigin}=await import('../config/auth.js');
 for(const role of ['admin','student','personnel']){ids[role]=(await pool.query('INSERT INTO public.users(full_name,email,password_hash,role) VALUES($1,$2,$3,$4) RETURNING id',[`Test ${role}`,`${role}@example.invalid`,hash,role])).rows[0].id;tokens[role]=await createSession(ids[role]);}
 const {default:app}=await import('../app.js');server=app.listen(process.argv.includes('--preview')?5001:0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 const base=`http://127.0.0.1:${server.address().port}/api/v1`;let checks=0;
 async function req(path,{role='admin',method='GET',data,origin=clientOrigin}={},status=200){const r=await fetch(base+path,{method,headers:{...(role?{Cookie:`${sessionCookie}=${tokens[role]}`} : {}),Origin:origin,...(data?{'Content-Type':'application/json'}:{})},body:data?JSON.stringify(data):undefined});assert.equal(r.status,status,`${method} ${path}: ${await r.clone().text()}`);checks++;return status===204?null:r.json();}
 const expectedCategories=['Faculty','Student/s','Environment','Student Government','Outside the School Premises','Other'];
 assert.deepEqual((await req('/categories')).data.map(category=>category.name),expectedCategories);
 await pool.query(await readFile(new URL('../database/005_concern_categories.sql',import.meta.url),'utf8'));
 assert.deepEqual((await req('/categories')).data.map(category=>category.name),expectedCategories);
 const fresh=async id=>(await req(`/admin/users/${id}`)).data;
 const patch=async(id,changes,status=200)=>req(`/admin/users/${id}`,{method:'PATCH',data:{updatedAt:(await fresh(id)).updatedAt,...changes}},status);
 const body=role=>({firstName:'New',middleInitial:'T.',lastName:role,email:`new-${role}@example.invalid`,role,isActive:true,password:'Initial-test-password-2026!',...(role==='student'?{course:'BSIT',studentNumber:'234-12345M',yearLevel:2,section:'A'}:{})});
 await req('/admin/users',{role:null},401);
 for(const role of ['student','personnel']){await req('/admin/users',{role},403);await req('/admin/users/summary',{role},403);await req('/admin/users',{role,method:'POST',data:body('admin')},403);await req(`/admin/users/${ids.admin}`,{role,method:'PATCH',data:{updatedAt:'x',role:'student'}},403);}
 const made={};
 for(const role of ['student','personnel','admin']){made[role]=(await req('/admin/users',{method:'POST',data:body(role)},201)).data;assert.equal(made[role].fullName,`New T. ${role}`);assert.ok(!JSON.stringify(made[role]).includes('password'));const login=await req('/auth/login',{role:null,method:'POST',data:{email:body(role).email,password:body(role).password}});assert.equal(login.user.role,role);}
 await req('/admin/users',{method:'POST',data:body('student')},409);
 await req('/admin/users',{method:'POST',data:{...body('student'),email:'other@example.invalid'}},409);
 await req('/admin/users',{method:'POST',data:{...body('admin'),email:'unique@example.invalid',password:'short'}},400);
 await req('/admin/users',{method:'POST',data:{...body('student'),email:'invalidstudent@example.invalid',course:null}},400);
 await req('/admin/users',{method:'POST',origin:'https://wrong.invalid',data:body('admin')},403);
 await req('/admin/users/invalid',{},400);await req('/admin/users/00000000-0000-4000-8000-000000000000',{},404);
 assert.equal((await req('/admin/users?role=personnel&status=active')).pagination.total,2);
 assert.equal((await req('/admin/users?search=new-student')).pagination.total,1);
 const p1=await req('/admin/users?pageSize=2'),p2=await req('/admin/users?pageSize=2&page=2');assert.ok(!p1.data.some(a=>p2.data.some(b=>a.id===b.id)));
 await patch(ids.admin,{isActive:false},409);await patch(ids.admin,{role:'student'},409);
 const cat=(await pool.query("UPDATE public.concern_categories SET description='Test category' WHERE name='Faculty' RETURNING id")).rows[0].id;
 const otherCat=(await pool.query("UPDATE public.concern_categories SET description='Other test category' WHERE name='Environment' RETURNING id")).rows[0].id;
 let person=await fresh(made.personnel.id);const token=await createSession(person.id);
 person=(await patch(person.id,{categoryIds:[cat]})).data;
 assert.equal(await getSessionUser(token),null);
 const currentToken=await createSession(person.id);tokens.newPersonnel=currentToken;
 assert.equal((await req('/access/me',{role:'newPersonnel'})).data.categories[0].id,cat);
 const oldStamp=person.updatedAt;await patch(person.id,{fullName:'Changed personnel'});
 assert.ok(await getSessionUser(currentToken));
 await req(`/admin/users/${person.id}`,{method:'PATCH',data:{updatedAt:oldStamp,fullName:'Stale'}},409);
 await req(`/admin/users/${person.id}`,{method:'PATCH',data:{updatedAt:(await fresh(person.id)).updatedAt,password:'Forbidden-password'}},400);
 const logsBefore=(await req('/admin/audit-logs')).pagination.total;
 const unchanged=await fresh(person.id);await patch(person.id,{fullName:unchanged.fullName});assert.equal((await req('/admin/audit-logs')).pagination.total,logsBefore);
 await patch(person.id,{categoryIds:[cat,cat]},400);await patch(person.id,{categoryIds:['00000000-0000-4000-8000-000000000000']},400);
 const concern=(await pool.query("INSERT INTO public.concerns(student_id,category_id,title,description) VALUES($1,$2,'Test concern','Test only') RETURNING id",[ids.student,cat])).rows[0].id;
 const second=(await pool.query("INSERT INTO public.concerns(student_id,category_id,title,description) VALUES($1,$2,'Second concern','Test only') RETURNING id",[ids.student,otherCat])).rows[0].id;
 assert.equal(await canPersonnelAccessConcern(person.id,concern),false);assert.equal(await canPersonnelAccessConcern(person.id,second),false);
 await patch(person.id,{categoryIds:[]});assert.equal(await canPersonnelAccessConcern(person.id,concern),false);
 await pool.query('INSERT INTO public.concern_assignments(concern_id,assigned_to,assigned_by) VALUES($1,$2,$3)',[second,person.id,ids.admin]);
 assert.ok(await canPersonnelAccessConcern(person.id,second));await patch(person.id,{role:'admin'},409);
 await pool.query('UPDATE public.concern_assignments SET ended_at=now() WHERE assigned_to=$1',[person.id]);assert.equal(await canPersonnelAccessConcern(person.id,second),false);
 await patch(person.id,{categoryIds:[cat]});await pool.query('UPDATE public.concern_categories SET is_active=false WHERE id=$1',[cat]);assert.equal(await canPersonnelAccessConcern(person.id,concern),false);
 await pool.query('UPDATE public.concern_categories SET is_active=true WHERE id=$1',[cat]);
 await patch(person.id,{isActive:false});assert.equal(await canPersonnelAccessConcern(person.id,concern),false);await req('/auth/login',{role:null,method:'POST',data:{email:body('personnel').email,password:body('personnel').password}},401);
 await patch(person.id,{isActive:true});assert.equal(await getSessionUser(currentToken),null);
 await patch(person.id,{role:'student'},400);
 await patch(person.id,{role:'student',categoryIds:[],course:'BSCS',studentNumber:'234-99999M',yearLevel:3,section:'B'});
 assert.equal((await fresh(person.id)).categoryIds.length,0);assert.equal(await canPersonnelAccessConcern(person.id,concern),false);
 const legacy=await fresh(ids.student);assert.equal(legacy.course,null);await patch(legacy.id,{fullName:'Legacy Student Updated'});assert.equal((await fresh(legacy.id)).course,null);
 await patch(legacy.id,{section:'A'},400);
 const rollbackTarget=made.student.id;const rollbackToken=await createSession(rollbackTarget);const before=await fresh(rollbackTarget);
 await pool.query(`CREATE FUNCTION fail_user_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.entity_type='user' THEN RAISE EXCEPTION 'test audit failure'; END IF; RETURN NEW; END; $$; CREATE TRIGGER fail_user_audit BEFORE INSERT ON public.audit_logs FOR EACH ROW EXECUTE FUNCTION fail_user_audit();`);
 await patch(rollbackTarget,{isActive:false},500);assert.equal((await fresh(rollbackTarget)).isActive,true);assert.ok(await getSessionUser(rollbackToken));
 await req('/admin/users',{method:'POST',data:{...body('admin'),email:'rollback@example.invalid'}},500);assert.equal((await req('/admin/users?search=rollback@example.invalid')).pagination.total,0);
 await pool.query('DROP TRIGGER fail_user_audit ON public.audit_logs; DROP FUNCTION fail_user_audit();');
 const snapshots=await req('/admin/audit-logs?action=user.created');assert.ok(snapshots.data.length>=3);assert.ok(!JSON.stringify(snapshots).includes('password'));assert.ok(!JSON.stringify(snapshots).includes('token'));assert.equal(snapshots.data[0].entityType,'user');
 const runtime=await pool.connect();try{await runtime.query('BEGIN');await runtime.query('SET LOCAL ROLE safespeak_app');await runtime.query('SELECT id,updated_at,course FROM public.users');await runtime.query("INSERT INTO public.users(full_name,email,password_hash,role,is_active,course,student_number,year_level,section) VALUES('Runtime Test','runtime@example.invalid',$1,'student',true,'BSIT','234-11111M',1,'A')",[hash]);await runtime.query('UPDATE public.users SET full_name=full_name WHERE id=$1',[made.student.id]);await runtime.query('INSERT INTO public.personnel_category_access(user_id,category_id) VALUES($1,$2)',[ids.personnel,cat]);await runtime.query('SELECT concern_id,assigned_to,ended_at FROM public.concern_assignments');await runtime.query('ROLLBACK');}finally{runtime.release();}
 const {saveUser}=await import('../services/users.js');
 const a=await fresh(ids.admin),b=await fresh(made.admin.id);
 const results=await Promise.allSettled([saveUser({id:a.id,fullName:a.fullName,role:'admin'},b.id,{updatedAt:b.updatedAt,role:'personnel'}),saveUser({id:b.id,fullName:b.fullName,role:'admin'},a.id,{updatedAt:a.updatedAt,role:'personnel'})]);
 assert.equal(results.filter(result=>result.status==='fulfilled').length,1);assert.ok(Number((await pool.query("SELECT count(*) FROM public.users WHERE role='admin' AND is_active")).rows[0].count)>=1);
 console.log(`PASS: ${checks} user-management HTTP checks plus authorization, session, audit rollback, concurrency, and runtime-grant assertions.`);
 if(process.argv.includes('--preview')){await pool.query("UPDATE public.users SET role='admin',is_active=true WHERE id=$1",[ids.admin]);console.log('User preview API on 5001; send stop to clean up.');await new Promise(resolve=>{process.stdin.resume();process.stdin.once('data',resolve);});process.stdin.pause();}
}finally{if(server)await new Promise(r=>server.close(r));if(pool)await pool.end();if(created)await root.query(`DROP DATABASE "${name}" WITH (FORCE)`);await root.end();console.log('Isolated user test database removed.');}
