import 'dotenv/config';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import bcrypt from 'bcryptjs';
if (process.argv.includes('--preview')) process.env.CLIENT_URL = 'http://localhost:5174';
const db = `safespeak_faq_test_${Date.now()}`;
assert.match(db,/^safespeak_faq_test_\d+$/);
const root = new pg.Pool({host:process.env.DB_HOST,port:Number(process.env.DB_PORT),user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME});
let pool,server,created=false;
try {
 await root.query(`CREATE DATABASE "${db}"`); created=true; process.env.DB_NAME=db;
 pool=(await import('../config/db.js')).pool;
 for (const file of ['000_initial_schema.sql','001_auth_sessions.sql','auth_runtime_grants.sql','002_registration_details.sql','003_faq_audit_permissions.sql']) {
  await pool.query(await readFile(new URL(`../database/${file}`,import.meta.url),'utf8'));
 }
 // Verify the fresh-install runtime grants can register a student, not just read FAQs.
 const registrationClient=await pool.connect();
 const originalQuery=pool.query;
 try {
  await registrationClient.query('BEGIN');
  await registrationClient.query('SET LOCAL ROLE safespeak_app');
  pool.query=registrationClient.query.bind(registrationClient);
  const {createAccount,verifyAccount}=await import('../services/accounts.js');
  await createAccount({firstName:'Fresh',middleInitial:'T',lastName:'Install',email:'fresh-install@example.invalid',password:'Fresh-install-test-2026!',role:'student',course:'BSIT',studentNumber:'234-12345M',yearLevel:2,section:'A'});
  const account=await verifyAccount('fresh-install@example.invalid','Fresh-install-test-2026!');
  assert.equal(account.fullName,'Fresh T. Install');
  await registrationClient.query('RESET ROLE');
  const stored=(await registrationClient.query('SELECT course,year_level,section FROM public.users WHERE id=$1',[account.id])).rows[0];
  assert.deepEqual(stored,{course:'BSIT',year_level:2,section:'A'});
 } finally {
  pool.query=originalQuery;
  await registrationClient.query('ROLLBACK');
  registrationClient.release();
 }
 const hash=await bcrypt.hash('Test-only-password-2026!',12), tokens={}, ids={};
 const {createSession}=await import('../services/sessions.js');
 const {sessionCookie,clientOrigin}=await import('../config/auth.js');
 for(const role of ['admin','student','personnel']) {ids[role]=(await pool.query('INSERT INTO users(full_name,email,password_hash,role) VALUES($1,$2,$3,$4) RETURNING id',[`Test ${role}`,`${role}@example.invalid`,hash,role])).rows[0].id; tokens[role]=await createSession(ids[role]);}
 const {default:app}=await import('../app.js'); server=app.listen(process.argv.includes('--preview')?5001:0,'127.0.0.1'); await new Promise(r=>server.once('listening',r));
 const base=`http://127.0.0.1:${server.address().port}/api/v1`; let checks=0;
 async function req(path,options={},status=200) {
  const {role='admin',method='GET',data,origin=clientOrigin,raw}=options;
  const r=await fetch(base+path,{method,headers:{...(role?{Cookie:`${sessionCookie}=${tokens[role]}`} : {}),Origin:origin,...(data||raw?{'Content-Type':'application/json'}:{})},body:raw||(data?JSON.stringify(data):undefined)});
  assert.equal(r.status,status,`${method} ${path}: ${await r.clone().text()}`);checks++; return status===204?null:r.json();
 }
 assert.equal((await req('/admin/faqs')).pagination.total,0);assert.equal((await req('/admin/audit-logs')).pagination.total,0);
 await req('/faqs',{role:null},401);
 const draft=await req('/admin/faqs',{method:'POST',data:{question:'First question 100%',answer:'Line one\nLine two'}},201); const id=draft.data.id;assert.equal(draft.data.isPublished,false);
 for(const role of ['student','personnel']) {
  assert.equal((await req('/faqs',{role})).pagination.total,0);
  await req('/admin/faqs',{role},403);await req('/admin/audit-logs',{role},403);
  await req('/admin/faqs',{role,method:'POST',data:{question:'No',answer:'No'}},403);
  await req(`/admin/faqs/${id}`,{role,method:'PATCH',data:{isPublished:true}},403);await req(`/admin/faqs/${id}`,{role,method:'DELETE'},403);
 }
 await req(`/admin/faqs/${id}`,{method:'PATCH',data:{isPublished:true,answer:'New answer\nSecond line'}});
 assert.equal((await req('/faqs',{role:'student'})).data[0].answer,'New answer\nSecond line');
 assert.equal((await req('/admin/audit-logs')).pagination.total,3);
 await req(`/admin/faqs/${id}`,{method:'PATCH',data:{isPublished:true}});assert.equal((await req('/admin/audit-logs')).pagination.total,3);
 assert.equal((await req('/faqs?search=100%25')).pagination.total,1);assert.equal((await req('/faqs?search=_')).pagination.total,0);
 await req(`/admin/faqs/${id}`,{method:'PATCH',data:{isPublished:false}});assert.equal((await req('/faqs')).pagination.total,0);
 await req('/admin/faqs',{method:'POST',origin:'https://wrong.invalid',data:{question:'Q',answer:'A'}},403);
 for(const data of [{question:' ',answer:'A'},{question:'x'.repeat(301),answer:'A'},{question:'Q',answer:'x'.repeat(10001)}]) await req('/admin/faqs',{method:'POST',data},400);
 await req('/admin/faqs',{method:'POST',raw:'{'},400);await req('/admin/faqs',{method:'POST',data:{question:'Q',answer:'x'.repeat(70000)}},413);
 await req('/admin/faqs/invalid',{method:'PATCH',data:{answer:'A'}},400);await req('/admin/faqs/00000000-0000-4000-8000-000000000000',{method:'DELETE'},404);
 await req('/admin/audit-logs?from=2026-12-02&to=2026-12-01',{},400);await req('/admin/audit-logs?from=2026-02-30',{},400);await req('/admin/faqs?pageSize=101',{},400);
 await pool.query(`CREATE FUNCTION fail_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test audit failure'; END; $$; CREATE TRIGGER fail_audit BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION fail_audit();`);
 await req(`/admin/faqs/${id}`,{method:'PATCH',data:{question:'Must roll back'}},500);
 assert.equal((await pool.query('SELECT question FROM faqs WHERE id=$1',[id])).rows[0].question,'First question 100%');
 await req('/admin/faqs',{method:'POST',data:{question:'Must roll back',answer:'A'}},500);await req(`/admin/faqs/${id}`,{method:'DELETE'},500);
 assert.equal(Number((await pool.query('SELECT count(*) FROM faqs')).rows[0].count),1);
 await pool.query('DROP TRIGGER fail_audit ON audit_logs; DROP FUNCTION fail_audit();');await req(`/admin/faqs/${id}`,{method:'DELETE'},204);
 let logs=await req('/admin/audit-logs');assert.equal(logs.pagination.total,5);assert.ok(logs.data.find(x=>x.action==='faq.deleted').details.before.answer);
 assert.equal((await req('/admin/audit-logs?action=faq.deleted&actor=admin')).pagination.total,1);
 const a=await req('/admin/audit-logs?pageSize=2'),b=await req('/admin/audit-logs?pageSize=2&page=2');assert.ok(!a.data.some(x=>b.data.some(y=>x.id===y.id)));
 await pool.query("UPDATE audit_logs SET created_at='2026-11-11T16:00:00Z'");assert.equal((await req('/admin/audit-logs?from=2026-11-12&to=2026-11-12')).pagination.total,5);assert.equal((await req('/admin/audit-logs?from=2026-11-11&to=2026-11-11')).pagination.total,0);

 const batchDraft=await req('/admin/faqs',{method:'POST',data:{question:'Batch draft',answer:'Original answer'}},201);
 let workspace=await req('/admin/faqs/workspace');
 assert.equal((await req('/faqs',{role:'student'})).pagination.total,0);
 const changes={revision:workspace.revision,faqs:[{id:batchDraft.data.id,question:'Batch edited',answer:'Edited answer'},{question:'New batch FAQ',answer:'New answer'}]};
 for(const role of ['student','personnel']) await req('/admin/faqs',{role,method:'PUT',data:changes},403);
 await req('/admin/faqs',{method:'PUT',origin:'https://wrong.invalid',data:changes},403);
 workspace=await req('/admin/faqs',{method:'PUT',data:changes});
 assert.equal((await req('/faqs',{role:'student'})).pagination.total,2);
 assert.ok(workspace.data.every(faq=>faq.isPublished));
 const beforeNoop=(await req('/admin/audit-logs')).pagination.total;
 await req('/admin/faqs',{method:'PUT',data:{revision:workspace.revision,faqs:workspace.data.map(({id,question,answer})=>({id,question,answer}))}});
 assert.equal((await req('/admin/audit-logs')).pagination.total,beforeNoop);
 await req('/admin/faqs',{method:'PUT',data:changes},409);
 await req('/admin/faqs',{method:'PUT',data:{revision:workspace.revision,faqs:[{id:workspace.data[0].id,question:'Updated but rolled back',answer:'A'},{id:'00000000-0000-4000-8000-000000000000',question:'Unknown',answer:'A'}]}},400);
 assert.equal((await req('/admin/faqs/workspace')).revision,workspace.revision);
 await pool.query(`CREATE TRIGGER fail_audit BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION fail_batch_audit();`).catch(async()=>{
  await pool.query(`CREATE FUNCTION fail_batch_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'batch test audit failure'; END; $$; CREATE TRIGGER fail_audit BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION fail_batch_audit();`);
 });
 await req('/admin/faqs',{method:'PUT',data:{revision:workspace.revision,faqs:[]}},500);
 assert.equal((await req('/faqs')).pagination.total,2);
 assert.equal((await req('/admin/faqs/workspace')).revision,workspace.revision);
 await pool.query('DROP TRIGGER fail_audit ON audit_logs; DROP FUNCTION fail_batch_audit();');
 workspace=await req('/admin/faqs',{method:'PUT',data:{revision:workspace.revision,faqs:[{id:workspace.data[0].id,question:workspace.data[0].question,answer:workspace.data[0].answer}]}});
 assert.equal((await req('/faqs',{role:'personnel'})).pagination.total,1);
 assert.ok((await req('/admin/audit-logs?action=faq.deleted')).pagination.total>=2);
 await req('/admin/faqs',{method:'PUT',data:{revision:workspace.revision,faqs:[]}});
 assert.equal((await req('/faqs')).pagination.total,0);
 const expiryBefore=(await pool.query('SELECT expires_at FROM auth_sessions WHERE user_id=$1 ORDER BY expires_at DESC',[ids.admin])).rows[0].expires_at;
 const legacy=await fetch(base+'/auth/me',{headers:{Cookie:`${sessionCookie}=${tokens.admin}`}});assert.equal(legacy.status,200);assert.ok(legacy.headers.get('set-cookie').includes('Path=/api/v1/auth'));assert.ok(legacy.headers.get('set-cookie').includes('Path=/;'));
 assert.equal((await pool.query('SELECT expires_at FROM auth_sessions WHERE user_id=$1 ORDER BY expires_at DESC',[ids.admin])).rows[0].expires_at.toISOString(),expiryBefore.toISOString());
 const c=await pool.connect();try {await c.query('BEGIN');await c.query('SET LOCAL ROLE safespeak_app');await c.query('SELECT * FROM audit_logs');await c.query("INSERT INTO audit_logs(action,entity_type) VALUES('test.permissions','faq')");await c.query("INSERT INTO faqs(question,answer,is_published) VALUES('permission test','answer',false)");await c.query('ROLLBACK');for(const sql of ['UPDATE audit_logs SET action=action','DELETE FROM audit_logs','TRUNCATE audit_logs']){await c.query('BEGIN');await c.query('SET LOCAL ROLE safespeak_app');await assert.rejects(c.query(sql),e=>e.code==='42501');await c.query('ROLLBACK');}} finally{c.release();}
 assert.equal((await req('/health',{role:null})).success,true);assert.equal((await req('/categories',{role:null})).success,true);
 await req('/auth/logout',{method:'POST'},204);await req('/faqs',{},401);
 console.log(`PASS: ${checks} HTTP checks, audit rollback, publication, permissions, dates, pagination, cookie migration and logout.`);
 if(process.argv.includes('--preview')){console.log('Isolated preview ready on port 5001; send stop on stdin to clean up.');await new Promise(resolve=>{process.stdin.resume();process.stdin.once('data',resolve);});process.stdin.pause();}
}finally{if(server)await new Promise(r=>server.close(r));if(pool)await pool.end();if(created)await root.query(`DROP DATABASE "${db}" WITH (FORCE)`);await root.end();console.log('Isolated test database removed.');}
