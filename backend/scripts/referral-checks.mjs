import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile,readdir } from 'node:fs/promises';

export async function checkReferrals(ctx) {
 const {pool,ids,tokens,request,submit,patch,assign,detail,stamp,categories,base,sessionCookie,clientOrigin,storage}=ctx;
 const {createSession}=await import('../services/sessions.js');
 ids.coordinator2=(await pool.query("INSERT INTO public.users(full_name,email,password_hash,role,is_intake_coordinator) SELECT 'Test coordinator two','coordinator2@example.invalid',password_hash,'personnel',true FROM public.users WHERE id=$1 RETURNING id",[ids.coordinator])).rows[0].id;tokens.coordinator2=await createSession(ids.coordinator2);
 for(const key of ['first','second'])for(const category of categories.slice(0,2))await pool.query('INSERT INTO public.personnel_category_access(user_id,category_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[ids[key],category]);
 const ref=async(id,role='coordinator')=>(await request(`/referrals/${id}`,{role})).data;
 const count=async role=>(await request('/notifications/unread-count',{role})).data.count;
 const notices=async role=>(await request('/notifications?pageSize=100',{role})).data;
 const requestReferral=async(id,role='first',to='second',expected=201)=>request(`/concerns/${id}/referrals`,{role,method:'POST',data:{updatedAt:await stamp(id),referredTo:ids[to],reason:'Private referral narrative'}},expected);
 const decide=async(id,action='approve',role='coordinator',extra={},expected=200)=>{const row=await ref(id);return request(`/referrals/${id}`,{role,method:'PATCH',data:{updatedAt:row.updatedAt,concernUpdatedAt:row.concernUpdatedAt,action,...extra}},expected)};
 const prepare=async(title='Referral case')=>{const c=await submit(title);await patch(c.id,'under_review');await assign(c.id,'first');return c.id;};
 for(const path of ['/referrals','/notifications','/notifications/unread-count'])await request(path,{role:null},401);
 for(const role of ['student','admin'])await request('/referrals',{role},403);
 assert.equal((await request('/notifications',{role:'admin'})).pagination.total,0);
 const submission=await submit('Notification intake');
 const intake=(await pool.query("SELECT n.user_id FROM public.notifications n WHERE n.concern_id=$1 AND type='concern.submitted'",[submission.id])).rows.map(row=>row.user_id).sort();assert.deepEqual(intake,[ids.coordinator,ids.coordinator2].sort());
 const id=await prepare('Referral handoff case'),ownerCount=await count('student'),targetCount=await count('second');
 await requestReferral(id,'student','second',403);await requestReferral(id,'outsider','second',404);await requestReferral(id,'coordinator','second',403);await requestReferral(id,'first','first',400);await requestReferral(id,'first','outsider',409);
 await request(`/concerns/${id}/referrals`,{role:'first',method:'POST',data:{updatedAt:await stamp(id),referredTo:ids.second,reason:'  '}},400);
 await request(`/concerns/${id}/referrals`,{role:'first',method:'POST',origin:'https://wrong.invalid',data:{updatedAt:await stamp(id),referredTo:ids.second,reason:'Wrong origin'}},403);
 const referral=(await requestReferral(id)).data.id;
 assert.equal((await detail(id,'first')).handlerId,ids.first);assert.equal((await detail(id,'student')).pendingReferralId,undefined);await request(`/concerns/${id}`,{role:'second'},404);await request(`/referrals/${referral}`,{role:'second'},404);
 assert.equal(await count('student'),ownerCount);assert.equal(await count('second'),targetCount);
 assert.ok((await notices('coordinator')).some(n=>n.target?.kind==='referral'&&n.target.id===referral));assert.equal((await request('/referrals',{role:'second'})).pagination.total,0);
 await requestReferral(id,'first','second',409);
 const initial=await ref(referral);await patch(id,'in_progress','first');assert.equal((await ref(referral)).status,'pending');
 await request(`/referrals/${referral}`,{method:'PATCH',data:{updatedAt:initial.updatedAt,concernUpdatedAt:initial.concernUpdatedAt,action:'approve'}},409);
 await decide(referral,'approve','first',{},403);await decide(referral,'decline','coordinator',{},400);
 const updated=await ref(referral);await request(`/referrals/${referral}`,{method:'PATCH',origin:'https://wrong.invalid',data:{updatedAt:updated.updatedAt,concernUpdatedAt:updated.concernUpdatedAt,action:'approve'}},403);
 await decide(referral);
 assert.equal((await detail(id,'second')).handlerId,ids.second);assert.equal((await detail(id,'second')).status,'in_progress');await request(`/concerns/${id}`,{role:'first'},404);
 const archived=await ref(referral,'first');assert.equal(archived.concernId,null);assert.equal(archived.reason,'Private referral narrative');assert.equal(archived.status,'completed');assert.equal(archived.description,undefined);
 await request(`/referrals/${referral}`,{role:'student'},403);await decide(referral,'approve','coordinator',{},409);
 assert.ok(!JSON.stringify(await request(`/concerns/${id}/history`,{role:'student'})).includes('Private referral'));
 const audit=(await pool.query("SELECT id,details FROM public.audit_logs WHERE entity_id=$1 AND action='referral.completed'",[referral])).rows[0];assert.equal(audit.details.before.status,'pending');assert.equal(audit.details.after.status,'completed');
 const delivered=(await pool.query('SELECT user_id,referral_id FROM public.notifications WHERE source_event_id=$1',[audit.id])).rows;
 assert.deepEqual(delivered.map(row=>row.user_id).sort(),[ids.student,ids.first,ids.second,ids.coordinator2].sort());
 const {notifyEvent}=await import('../services/notifications.js');await notifyEvent(pool,{eventId:audit.id,actorId:ids.coordinator,type:'referral.completed',concernId:id,referralId:referral,extraRecipients:[ids.first],referralTargetIds:[ids.first],includeStudent:true,includeHandler:true});assert.equal((await pool.query('SELECT count(*) FROM public.notifications WHERE source_event_id=$1',[audit.id])).rows[0].count,'4');
 const firstNotices=await notices('first');assert.ok(firstNotices.some(n=>n.target?.kind==='referral'&&n.target.id===referral));assert.ok(firstNotices.filter(n=>n.type==='concern.assigned').every(n=>n.target?.id!==id));
 const privateNotice=firstNotices.find(n=>n.target?.id===referral);await request(`/notifications/${privateNotice.id}`,{role:'second'},404);await request(`/notifications/${privateNotice.id}/read`,{role:'second',method:'PATCH',data:{}},404);
 const beforeRead=await count('first');await request(`/notifications/${privateNotice.id}/read`,{role:'first',method:'PATCH',data:{}});assert.equal(await count('first'),beforeRead-1);await request(`/notifications/${privateNotice.id}/read`,{role:'first',method:'PATCH',data:{}});assert.equal(await count('first'),beforeRead-1);
 await request('/notifications/read-all',{role:'first',method:'POST',data:{}});assert.equal(await count('first'),0);assert.equal((await request('/notifications?unread=true',{role:'first'})).pagination.total,0);
 await request('/notifications/read-all',{role:'student',method:'POST',origin:'https://wrong.invalid',data:{}},403);await request('/notifications/invalid/read',{role:'student',method:'PATCH',data:{}},400);
 const declinedCase=await prepare('Declined referral'),declined=(await requestReferral(declinedCase)).data.id;
 await pool.query('DELETE FROM public.personnel_category_access WHERE user_id=$1 AND category_id=$2',[ids.second,categories[0]]);await decide(declined,'approve','coordinator',{},409);assert.equal((await ref(declined)).status,'pending');
 await pool.query('INSERT INTO public.personnel_category_access(user_id,category_id) VALUES($1,$2)',[ids.second,categories[0]]);
 await pool.query('UPDATE public.users SET is_active=false WHERE id=$1',[ids.second]);await decide(declined,'approve','coordinator',{},409);await pool.query('UPDATE public.users SET is_active=true WHERE id=$1',[ids.second]);
 await pool.query('UPDATE public.users SET is_active=false WHERE id=$1',[ids.first]);await decide(declined,'approve','coordinator',{},409);await pool.query('UPDATE public.users SET is_active=true WHERE id=$1',[ids.first]);
 await decide(declined,'decline','coordinator',{reason:'Private decline reason'});assert.equal((await detail(declinedCase,'first')).handlerId,ids.first);assert.equal((await ref(declined,'first')).decisionReason,'Private decline reason');
 const withdrawal=(await requestReferral(declinedCase)).data.id;await decide(withdrawal,'withdraw','coordinator',{reason:'Not requester'},403);await decide(withdrawal,'withdraw','first',{reason:'I can continue handling this'});assert.equal((await ref(withdrawal)).status,'cancelled');
 // Only one concurrent approval can transfer an assignment.
 const race=(await requestReferral(declinedCase)).data.id,row=await ref(race);
 const responses=await Promise.all(['coordinator','coordinator2'].map(role=>fetch(`${base}/referrals/${race}`,{method:'PATCH',headers:{Origin:clientOrigin,Cookie:`${sessionCookie}=${tokens[role]}`,'Content-Type':'application/json'},body:JSON.stringify({updatedAt:row.updatedAt,concernUpdatedAt:row.concernUpdatedAt,action:'approve'})})));
 assert.deepEqual(responses.map(response=>response.status).sort(),[200,409]);assert.equal((await pool.query('SELECT count(*) FROM public.concern_assignments WHERE concern_id=$1 AND ended_at IS NULL',[declinedCase])).rows[0].count,'1');
 // Each handling change cancels pending referrals, but work/replies do not.
 for(const kind of ['resolve','reassign','category']){
  const c=await prepare(`Cancellation ${kind}`),r=(await requestReferral(c)).data.id;
  await patch(c,'in_progress','first');await request(`/concerns/${c}/messages`,{role:'first',method:'POST',data:{message:'Work continues'}},201);assert.equal((await ref(r)).status,'pending');
  const countBefore=await count('coordinator');await request(`/concerns/${c}/messages`,{role:'first',method:'POST',data:{message:'Private internal note',visibility:'internal'}},201);assert.equal(await count('coordinator'),countBefore);
  if(kind==='resolve')await patch(c,'resolved','first',{resolutionSummary:'Resolved during pending request'});
  if(kind==='reassign')await assign(c,'second',{reason:'Manual handoff'});
  if(kind==='category')await request(`/concerns/${c}/category`,{method:'PATCH',data:{updatedAt:await stamp(c),categoryId:categories[1],reason:'Correcting category'}});
  const cancelled=await ref(r);assert.equal(cancelled.status,'cancelled');assert.ok(cancelled.decisionReason);assert.ok(cancelled.reviewedAt);
 }
 // Both audit and notification failures must undo requests, transfers, replies, cancellation, and uploaded submissions.
 const rollback=await prepare('Rollback referral');
 async function failNotifications(){await pool.query("CREATE FUNCTION fail_referral_notifications() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test notification rollback'; END; $$; CREATE TRIGGER fail_referral_notifications BEFORE INSERT ON public.notifications FOR EACH ROW EXECUTE FUNCTION fail_referral_notifications();");}
 async function allowNotifications(){await pool.query('DROP TRIGGER fail_referral_notifications ON public.notifications;DROP FUNCTION fail_referral_notifications();');}
 await failNotifications();const originalRevision=await stamp(rollback);await requestReferral(rollback,'first','second',500);assert.equal((await detail(rollback)).pendingReferralId,null);assert.equal(await stamp(rollback),originalRevision);
 const filesBefore=(await readdir(storage)).length;await request(`/concerns/${rollback}/messages`,{role:'first',method:'POST',data:{message:'Must roll back'}},500);assert.equal((await request(`/concerns/${rollback}/messages`)).pagination.total,0);
 // Submission helper asserts 201, so directly exercise submission failure here.
 const body=new FormData();for(const[k,v]of Object.entries({clientSubmissionId:randomUUID(),title:'Failed notification upload',categoryId:categories[0],description:'Private failed text'}))body.set(k,v);body.append('attachments',new Blob([Buffer.from('%PDF-1.4 test')],{type:'application/pdf'}),'failure.pdf');await request('/concerns',{role:'student',method:'POST',form:body},500);assert.equal((await readdir(storage)).length,filesBefore);await allowNotifications();
 const rollbackRef=(await requestReferral(rollback)).data.id;await patch(rollback,'in_progress','first');
 await failNotifications();const beforeTransfer=await stamp(rollback);await decide(rollbackRef,'approve','coordinator',{},500);assert.equal((await detail(rollback)).handlerId,ids.first);assert.equal((await ref(rollbackRef)).status,'pending');assert.equal(await stamp(rollback),beforeTransfer);await patch(rollback,'resolved','first',{resolutionSummary:'Rollback resolution'},500);assert.equal((await detail(rollback)).status,'in_progress');assert.equal((await ref(rollbackRef)).status,'pending');await allowNotifications();
 await pool.query("CREATE FUNCTION fail_referral_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.entity_type='referral' THEN RAISE EXCEPTION 'test referral audit rollback'; END IF; RETURN NEW; END; $$;CREATE TRIGGER fail_referral_audit BEFORE INSERT ON public.audit_logs FOR EACH ROW EXECUTE FUNCTION fail_referral_audit();");
 await decide(rollbackRef,'approve','coordinator',{},500);assert.equal((await detail(rollback)).handlerId,ids.first);assert.equal((await ref(rollbackRef)).status,'pending');await pool.query('DROP TRIGGER fail_referral_audit ON public.audit_logs;DROP FUNCTION fail_referral_audit();');
 // Runtime role can do the module work, but cannot delete referrals/notifications or edit notification content.
 const runtime=await prepare('Runtime referral'),services=await import('../services/referrals.js'),notifications=await import('../services/notifications.js'),client=await pool.connect(),originalConnect=pool.connect,originalQuery=pool.query;
 try{
  await client.query('SET ROLE safespeak_app');pool.connect=async()=>({query:client.query.bind(client),release(){}});pool.query=client.query.bind(client);
  const r=await services.createReferral(ids.first,runtime,{updatedAt:(await (await import('../services/concern-workflow.js')).concernDetails(ids.first,runtime)).data.updatedAt,referredTo:ids.second,reason:'Runtime private referral'});
  const d=(await services.referralDetails(ids.coordinator,r.id)).data;await services.decideReferral(ids.coordinator,r.id,{action:'approve',updatedAt:d.updatedAt,concernUpdatedAt:d.concernUpdatedAt});await services.listReferrals(ids.first,{page:1,pageSize:20,search:''});
  const n=await notifications.listNotifications(ids.first,{page:1,pageSize:20});assert.ok(n.data.length);await notifications.notificationTarget(ids.first,n.data[0].id);await notifications.readNotification(ids.first,n.data[0].id);await notifications.unreadCount(ids.first);await notifications.readAllNotifications(ids.first);
  for(const sql of ['DELETE FROM public.concern_referrals','DELETE FROM public.notifications',"UPDATE public.notifications SET message='tampered'"])await assert.rejects(client.query(sql),error=>error.code==='42501');
 }finally{pool.connect=originalConnect;pool.query=originalQuery;await client.query('RESET ROLE');client.release();}
 // Replacing a personnel role strips old links even for notifications previously returned to that account.
 await pool.query("UPDATE public.users SET role='student' WHERE id=$1",[ids.first]);const sanitized=await notices('first');assert.ok(sanitized.every(n=>n.target===null));assert.ok(!JSON.stringify(sanitized).includes('Private referral'));await pool.query("UPDATE public.users SET role='personnel' WHERE id=$1",[ids.first]);
 for(const action of ['referral.requested','referral.completed','referral.declined','referral.cancelled']){const logs=await request(`/admin/audit-logs?action=${action}`,{role:'admin'});assert.ok(logs.pagination.total);assert.ok(!JSON.stringify(logs).includes('Private referral'));assert.ok(!JSON.stringify(logs).includes('Private decline'));}
 // Migration preflight is non-destructive when legacy pending duplicates exist.
 const migrationCase=await prepare('Legacy duplicate check'),legacyRef=(await requestReferral(migrationCase)).data.id;
 await pool.query('DROP INDEX public.referral_one_pending');const duplicate=(await pool.query('INSERT INTO public.concern_referrals(concern_id,referred_by,referred_to,reason) VALUES($1,$2,$3,$4) RETURNING id',[migrationCase,ids.first,ids.second,'Isolated legacy fixture'])).rows[0].id;
 await assert.rejects(pool.query(await readFile(new URL('../database/011_referrals_notifications.sql',import.meta.url),'utf8')),error=>error.code==='P0001');await pool.query('ROLLBACK');assert.equal((await ref(legacyRef)).status,'pending');await pool.query('DELETE FROM public.concern_referrals WHERE id=$1',[duplicate]);await pool.query(await readFile(new URL('../database/011_referrals_notifications.sql',import.meta.url),'utf8'));
 await prepare('Campus referral preview');
 console.log('PASS: referral and notification recipient, privacy, handoff, cancellation, concurrency, rollback, runtime, and migration-preflight assertions.');
}
