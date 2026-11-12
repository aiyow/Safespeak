import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
export async function checkModules({pool,ids,request,submit,patch,assign,stamp,categories,base,tokens,sessionCookie,clientOrigin}) {
 const profile=async(role='student')=>(await request('/profile',{role})).data;
 const edit=async(role,changes,expected=200)=>{const row=await profile(role);return request('/profile',{role,method:'PATCH',data:{updatedAt:row.updatedAt,fullName:row.fullName,email:row.email,...changes}},expected)};
 const settings=async()=>request('/admin/settings',{role:'admin'});
 const configure=async(changes,expected=200)=>{const row=await settings();return request('/admin/settings',{role:'admin',method:'PATCH',data:{revision:row.revision,...row.data,...changes}},expected)};
 const report=async query=>(await request(`/admin/reports${query?'?'+query:''}`,{role:'admin'})).data;
 for(const path of ['/profile','/settings','/admin/reports','/admin/reports/summary','/admin/reports/options','/admin/settings'])await request(path,{role:null},401);
 for(const role of ['student','first','coordinator'])for(const path of ['/admin/settings','/admin/reports','/admin/reports/summary','/admin/reports/options'])await request(path,{role},403);
 const original=await profile();assert.equal(original.id,ids.student);assert.equal(original.role,'student');assert.equal(original.password_hash,undefined);assert.equal(original.currentPassword,undefined);
 for(const role of ['admin','coordinator','first'])assert.equal((await profile(role)).id,ids[role]);
 for(const changes of [{role:'admin'},{isActive:false},{studentNumber:'234-12345M'},{course:'BSIT'},{yearLevel:4},{section:'A'},{categoryIds:[]},{isIntakeCoordinator:true},{id:ids.admin}])await edit('student',changes,400);
 await edit('student',{fullName:'   '},400);await edit('student',{fullName:'x'.repeat(151)},400);await edit('student',{email:'invalid'},400);await edit('student',{currentPassword:'x'.repeat(73)},400);
 await request('/profile',{role:'student',method:'PATCH',origin:'https://wrong.invalid',data:{updatedAt:original.updatedAt,fullName:original.fullName,email:original.email}},403);
 const updated=(await edit('student',{fullName:'Updated Student Name'})).data;assert.equal(updated.fullName,'Updated Student Name');assert.equal(updated.studentNumber,original.studentNumber);assert.equal(updated.course,original.course);assert.equal(updated.role,'student');assert.equal((await request('/auth/me',{role:'student'})).user.fullName,updated.fullName);
 await request('/profile',{role:'student',method:'PATCH',data:{updatedAt:original.updatedAt,fullName:'Stale name',email:original.email}},409);
 await edit('student',{email:'changed@example.invalid'},400);await edit('student',{email:'changed@example.invalid',currentPassword:'wrong password'},400);
 await edit('student',{email:' ADMIN@EXAMPLE.INVALID ',currentPassword:'Test-only-password-2026!'},409);
 const changed=(await edit('student',{email:' CHANGED@EXAMPLE.INVALID ',currentPassword:'Test-only-password-2026!'})).data;assert.equal(changed.email,'changed@example.invalid');assert.equal((await request('/auth/me',{role:'student'})).user.email,changed.email);
 await request('/auth/login',{role:null,method:'POST',data:{email:changed.email,password:'Test-only-password-2026!'}});
 await edit('student',{fullName:'Test student',email:'student@example.invalid',currentPassword:'Test-only-password-2026!'});
 const noOpBefore=Number((await pool.query("SELECT count(*) FROM public.audit_logs WHERE action='profile.updated'")).rows[0].count);await edit('student',{});assert.equal(Number((await pool.query("SELECT count(*) FROM public.audit_logs WHERE action='profile.updated'")).rows[0].count),noOpBefore);
 const initialSettings=await settings();assert.equal(initialSettings.data.acceptSubmissions,true);assert.equal(initialSettings.data.helpEmail,'');assert.equal((await pool.query("SELECT count(*) FROM public.system_settings WHERE key='portal'")).rows[0].count,'0');
 assert.equal((await request('/settings',{role:'student'})).revision,undefined);
 await request('/admin/settings',{role:'coordinator',method:'PATCH',data:{revision:initialSettings.revision,...initialSettings.data}},403);
 await configure({unknownSecret:'never expose'},400);await configure({helpEmail:'invalid'},400);await configure({acceptSubmissions:false,closedMessage:'  '},400);
 await request('/admin/settings',{role:'admin',method:'PATCH',origin:'https://wrong.invalid',data:{revision:initialSettings.revision,...initialSettings.data}},403);
 const saved=await configure({helpEmail:' HELP@EXAMPLE.INVALID ',officeHours:'Monday to Friday\nOffice schedule',supportMessage:'Contact the Help Desk for guidance.'});assert.equal(saved.data.helpEmail,'help@example.invalid');assert.equal((await request('/settings',{role:'first'})).data.officeHours,saved.data.officeHours);
 await request('/admin/settings',{role:'admin',method:'PATCH',data:{revision:initialSettings.revision,...initialSettings.data}},409);
 const settingAuditCount=Number((await pool.query("SELECT count(*) FROM public.audit_logs WHERE action='settings.updated'")).rows[0].count);const unchanged=await configure({});assert.equal(unchanged.revision,saved.revision);assert.equal(Number((await pool.query("SELECT count(*) FROM public.audit_logs WHERE action='settings.updated'")).rows[0].count),settingAuditCount);
 // Closed admission still permits drafts on the client, existing replies, and exact idempotent retries.
 const accepted=await submit('Admission check'),submission=(await pool.query('SELECT client_submission_id,category_id FROM public.concerns WHERE id=$1',[accepted.id])).rows[0];
 await configure({acceptSubmissions:false,closedMessage:'Submissions reopen after the scheduled review.'});
 const body=new FormData();for(const[key,value]of Object.entries({clientSubmissionId:randomUUID(),title:'Closed submission',categoryId:categories[0],description:'Must not be created'}))body.set(key,value);await request('/concerns',{role:'student',method:'POST',form:body},409);
 await request(`/concerns/${accepted.id}/messages`,{role:'student',method:'POST',data:{message:'Existing conversation remains available'}},201);
 // Reuse the original request and attachment, which the fixture helper always uses.
 const retry=new FormData();for(const[key,value]of Object.entries({clientSubmissionId:submission.client_submission_id,title:'Admission check',categoryId:submission.category_id,description:'Private narrative for workflow tests'}))retry.set(key,value);retry.append('attachments',new Blob([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aM5kAAAAASUVORK5CYII=','base64')],{type:'image/png'}),'evidence.png');assert.equal((await request('/concerns',{role:'student',method:'POST',form:retry})).data.id,accepted.id);
 await configure({acceptSubmissions:true});
 // Report boundaries use inclusive Manila calendar dates and current assignment only.
 const beforeMidnight=await submit('Private report fixture one'),afterMidnight=await submit('Private report fixture two');
 await pool.query('UPDATE public.concerns SET created_at=$2 WHERE id=$1',[beforeMidnight.id,'2001-06-10T15:59:59Z']);await pool.query('UPDATE public.concerns SET created_at=$2 WHERE id=$1',[afterMidnight.id,'2001-06-10T16:00:00Z']);
 const one=await report('from=2001-06-10&to=2001-06-10');assert.equal(one.summary.total,1);assert.deepEqual(one.byDate.data,[{date:'2001-06-10',count:1}]);
 const both=await report('from=2001-06-10&to=2001-06-11&pageSize=1');assert.equal(both.summary.total,2);assert.equal(both.byDate.pagination.total,2);assert.equal(both.byDate.data.length,1);assert.equal((await report('from=2001-06-10&to=2001-06-11&datePage=2&pageSize=1')).byDate.data[0].date,'2001-06-10');
 const empty=await report('from=1990-01-01&to=1990-01-01');assert.equal(empty.summary.total,0);for(const key of ['byCategory','byPersonnel','byDate'])assert.equal(empty[key].data.length,0);assert.equal(empty.byStatus.length,0);
 const assigned=await submit('Private personnel report case');await patch(assigned.id,'under_review');await assign(assigned.id,'first');await assign(assigned.id,'second',{reason:'Report assignment fixture'});await pool.query('UPDATE public.concerns SET created_at=$2 WHERE id=$1',[assigned.id,'2001-07-01T03:00:00Z']);
 assert.equal((await report(`from=2001-07-01&to=2001-07-01&personnelId=${ids.first}`)).summary.total,0);assert.equal((await report(`from=2001-07-01&to=2001-07-01&personnelId=${ids.second}`)).summary.total,1);
 await pool.query("UPDATE public.users SET role='student' WHERE id=$1",[ids.second]);assert.ok((await request('/admin/reports/options',{role:'admin'})).data.personnel.some(row=>row.id===ids.second));await pool.query("UPDATE public.users SET role='personnel' WHERE id=$1",[ids.second]);
 const all=await report();assert.equal(all.summary.total,Number((await pool.query('SELECT count(*) FROM public.concerns')).rows[0].count));assert.equal((await request('/admin/reports/summary',{role:'admin'})).data.total,all.summary.total);assert.equal(all.byStatus.reduce((sum,row)=>sum+row.count,0),all.summary.total);
 const serialized=JSON.stringify(all);for(const forbidden of ['Private report fixture','Private narrative','SS-2026-',beforeMidnight.id,ids.student,'@example.invalid'])assert.ok(!serialized.includes(forbidden));
 await request('/admin/reports?from=2001-07-02&to=2001-07-01',{role:'admin'},400);await request('/admin/reports?pageSize=101',{role:'admin'},400);await request('/admin/reports?categoryId=invalid',{role:'admin'},400);
 // Saves must roll back entirely if audit logging fails.
 await pool.query("CREATE FUNCTION fail_module_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action IN ('profile.updated','settings.updated') THEN RAISE EXCEPTION 'test module rollback'; END IF; RETURN NEW; END; $$;CREATE TRIGGER fail_module_audit BEFORE INSERT ON public.audit_logs FOR EACH ROW EXECUTE FUNCTION fail_module_audit();");
 const originalProfile=await profile(),originalConfig=await settings();await edit('student',{fullName:'Must roll back'},500);assert.equal((await profile()).fullName,originalProfile.fullName);assert.equal((await profile()).updatedAt,originalProfile.updatedAt);await configure({supportMessage:'Must roll back'},500);assert.equal((await settings()).revision,originalConfig.revision);await pool.query('DROP TRIGGER fail_module_audit ON public.audit_logs;DROP FUNCTION fail_module_audit();');
 // Two editors share a revision: one save succeeds and one is stale.
 const concurrent=await settings();const responses=await Promise.all(['First office hours','Second office hours'].map(officeHours=>fetch(`${base}/admin/settings`,{method:'PATCH',headers:{Origin:clientOrigin,Cookie:`${sessionCookie}=${tokens.admin}`,'Content-Type':'application/json'},body:JSON.stringify({revision:concurrent.revision,...concurrent.data,officeHours})})));assert.deepEqual(responses.map(response=>response.status).sort(),[200,409]);
 // Confirm all service operations work as the runtime role, not just the database owner.
 const settingsService=await import('../services/portal-settings.js'),profileService=await import('../services/profile.js'),reports=await import('../services/reports.js'),client=await pool.connect(),originalConnect=pool.connect,originalQuery=pool.query;
 try{
  await client.query('SET ROLE safespeak_app');pool.connect=async()=>({query:client.query.bind(client),release(){}});pool.query=client.query.bind(client);
  const state=await settingsService.portalSettings();await settingsService.savePortalSettings(ids.admin,{revision:state.revision,...state.data,supportMessage:'Runtime Help Desk message'});
  const person=(await profileService.getProfile(ids.first)).data;await profileService.saveProfile(ids.first,{updatedAt:person.updatedAt,fullName:person.fullName,email:person.email});await reports.reportSummary(ids.admin);await reports.reportOptions(ids.admin);await reports.getReports(ids.admin,{categoryPage:1,personnelPage:1,datePage:1,pageSize:20});
  await assert.rejects(client.query('DELETE FROM public.system_settings'),error=>error.code==='42501');await assert.rejects(client.query('DELETE FROM public.audit_logs'),error=>error.code==='42501');
 }finally{pool.connect=originalConnect;pool.query=originalQuery;await client.query('RESET ROLE');client.release();}
 const logs=await request('/admin/audit-logs?action=profile.updated',{role:'admin'});assert.ok(logs.pagination.total);const safe=JSON.stringify(logs);for(const forbidden of ['Test-only-password-2026!','password_hash','currentPassword','$2b$'])assert.ok(!safe.includes(forbidden));assert.ok((await request('/admin/audit-logs?action=settings.updated',{role:'admin'})).pagination.total);
 await configure({acceptSubmissions:true,closedMessage:'',helpEmail:'',officeHours:'',supportMessage:''});
 console.log('PASS: reports, self-profile validation, password-confirmed email changes, settings/admission, audit rollback, concurrency, privacy, and runtime-grant assertions.');
}
