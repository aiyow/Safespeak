import { pool } from '../config/db.js';
import { notifyEvent } from './notifications.js';
import { cancelPendingReferrals } from './referral-events.js';

export const concernActions=['concern.submitted','concern.reviewed','concern.assigned','concern.reassigned','concern.category_changed','concern.started','concern.resolved','concern.closed','concern.rejected','concern.reply_created','concern.note_created'];
export const statuses=['submitted','under_review','assigned','in_progress','resolved','closed','rejected'];
const terminal=['resolved','closed','rejected'];
export const fail=(message,status=400)=>Object.assign(new Error(message),{status});
export const coordinator=user=>user.role==='personnel'&&user.is_intake_coordinator;
const literal=value=>`%${value.replace(/[\\%_]/g,'\\$&')}%`;
const paging=q=>({page:q.page,pageSize:q.pageSize});
export async function principal(client,id,individual=false) {
 const user=(await client.query('SELECT id,full_name,role,is_active,is_intake_coordinator FROM public.users WHERE id=$1',[id])).rows[0];
 if(!user?.is_active)throw fail('Sign in to continue.',401);
 if(!['student','personnel'].includes(user.role))throw fail(individual?'Concern not found.':'Student or personnel access is required.',individual?404:403);
 return user;
}
export async function read(userId,work,individual=false) {
 const client=await pool.connect();
 try {await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');const user=await principal(client,userId,individual);const result=await work(client,user);await client.query('COMMIT');return result;}
 catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
function scope(user,view,values) {
 values.push(user.id);const index=values.length;
 if(user.role==='student'){if(view&&view!=='mine')throw fail('This list is not available to your role.',403);return `c.student_id=$${index}`;}
 if(view==='mine'||(view==='queue'&&!coordinator(user)))throw fail('Coordinator access is required.',403);
 if(coordinator(user)&&view!=='assigned')return `($${index}::uuid IS NOT NULL)`;
 return `EXISTS(SELECT 1 FROM public.concern_assignments scoped WHERE scoped.concern_id=c.id AND scoped.assigned_to=$${index} AND scoped.ended_at IS NULL)`;
}
const joins=`JOIN public.concern_categories cat ON cat.id=c.category_id
 JOIN public.users student ON student.id=c.student_id
 LEFT JOIN public.concern_assignments a ON a.concern_id=c.id AND a.ended_at IS NULL
 LEFT JOIN public.users handler ON handler.id=a.assigned_to`;
const commonFields=`c.id,c.reference_no AS "referenceNumber",c.title,c.status,c.category_id AS "categoryId",cat.name AS "categoryName",c.created_at AS "createdAt",c.updated_at::text AS "updatedAt",handler.full_name AS "handlerName"`;
export function listConcerns(userId,q) {
 return read(userId,async(client,user)=>{
  const values=[],base=scope(user,q.view,values),where=[base];
  const add=(sql,value)=>{values.push(value);where.push(sql.replace('?',`$${values.length}`));};
  if(q.search)add(`(c.reference_no ILIKE ? OR c.title ILIKE ?${user.role==='personnel'?' OR student.full_name ILIKE ?':''})`.replaceAll('?',`$${values.length+1}`),literal(q.search));
  if(q.status)add('c.status=?',q.status);
  if(q.categoryId)add('c.category_id=?',q.categoryId);
  if(q.assigneeId){if(!coordinator(user))throw fail('Coordinator access is required.',403);add('a.assigned_to=?',q.assigneeId);}
  if(q.from)add("c.created_at >= (?::date::timestamp AT TIME ZONE 'Asia/Manila')",q.from);
  if(q.to)add("c.created_at < ((?::date+1)::timestamp AT TIME ZONE 'Asia/Manila')",q.to);
  const filter=where.join(' AND ');
  const total=Number((await client.query(`SELECT count(*) FROM public.concerns c ${joins} WHERE ${filter}`,values)).rows[0].count);
  const {rows}=await client.query(`SELECT ${commonFields}${user.role==='personnel'?',student.full_name AS "studentName"':''} FROM public.concerns c ${joins} WHERE ${filter} ORDER BY c.created_at DESC,c.id DESC LIMIT $${values.length+1} OFFSET $${values.length+2}`,[...values,q.pageSize,(q.page-1)*q.pageSize]);
  const categories=(await client.query(`SELECT DISTINCT cat.id,cat.name FROM public.concerns c ${joins} WHERE ${base} ORDER BY cat.name`,[user.id])).rows;
  const assignees=coordinator(user)?(await client.query(`SELECT DISTINCT handler.id,handler.full_name AS name FROM public.concerns c ${joins} WHERE a.id IS NOT NULL ORDER BY name`)).rows:[];
  return {data:rows,pagination:{...paging(q),total},categories,assignees};
 });
}
export function concernSummary(userId) {
 return read(userId,async(client,user)=>{
  const values=[],where=scope(user,undefined,values);
  const {rows:[counts]}=await client.query(`SELECT count(*)::int AS total,
   count(*) FILTER(WHERE c.status IN ('submitted','under_review'))::int AS "awaitingReview",
   count(*) FILTER(WHERE c.status IN ('assigned','in_progress'))::int AS "inProgress",
   count(*) FILTER(WHERE c.status IN ('resolved','closed'))::int AS resolved,
   count(*) FILTER(WHERE c.status NOT IN ('resolved','closed','rejected') AND a.assigned_to=$1)::int AS "assignedToYou"
   FROM public.concerns c LEFT JOIN public.concern_assignments a ON a.concern_id=c.id AND a.ended_at IS NULL WHERE ${where}`,values);
  return {data:counts};
 });
}
export async function accessible(client,user,id,lock=false) {
 const values=[id];const where=scope(user,undefined,values);
 const row=(await client.query(`SELECT ${commonFields},c.student_id,c.description,c.resolution_summary AS "resolutionSummary",c.resolved_at AS "resolvedAt",c.closed_at AS "closedAt",a.assigned_to AS "handlerId",student.full_name AS "studentName" FROM public.concerns c ${joins} WHERE c.id=$1 AND ${where}${lock?' FOR UPDATE OF c':''}`,values)).rows[0];
 if(!row)throw fail('Concern not found.',404);return row;
}
export function concernDetails(userId,id) {
 return read(userId,async(client,user)=>{
  const row=await accessible(client,user,id);
  const attachments=(await client.query('SELECT id,original_name AS "originalName",mime_type AS "mimeType",file_size_bytes AS "fileSizeBytes",created_at AS "createdAt" FROM public.concern_attachments WHERE concern_id=$1 ORDER BY created_at,id',[id])).rows;
  const isHandler=user.role==='personnel'&&row.handlerId===user.id;
  const pending=user.role==='personnel'?(await client.query("SELECT id FROM public.concern_referrals WHERE concern_id=$1 AND status='pending'",[id])).rows[0]:null;
  delete row.student_id;
  if(user.role==='student'){delete row.studentName;delete row.handlerId;}
  return {data:{...row,attachments,...(user.role==='personnel'?{pendingReferralId:pending?.id||null}:{}),permissions:{coordinate:coordinator(user),isHandler,reply:!terminal.includes(row.status),staffNote:user.role==='personnel'&&!terminal.includes(row.status)}}};
 },true);
}
export function concernHistory(userId,id,q) {
 return read(userId,async(client,user)=>{
  await accessible(client,user,id);
  // Public status reasons are generated by the workflow, except documented rejection/resolution.
  const reason=user.role==='student'?"CASE WHEN h.new_status IN ('resolved','rejected') THEN h.reason ELSE NULL END":'h.reason';
  const union=`SELECT h.id,h.created_at AS "createdAt",'status' AS kind,h.new_status AS action,h.old_status AS "oldStatus",h.new_status AS "newStatus",${reason} AS reason,NULL::jsonb AS details FROM public.concern_status_history h WHERE h.concern_id=$1
   ${user.role==='personnel'?`UNION ALL SELECT x.id,x.created_at,'activity',x.action,NULL,NULL,NULL,x.details FROM public.concern_activity x WHERE x.concern_id=$1`:''}`;
  const total=Number((await client.query(`SELECT count(*) FROM (${union}) timeline`,[id])).rows[0].count);
  const rows=(await client.query(`SELECT * FROM (${union}) timeline ORDER BY "createdAt" DESC,id DESC LIMIT $2 OFFSET $3`,[id,q.pageSize,(q.page-1)*q.pageSize])).rows;
  return {data:rows,pagination:{...paging(q),total}};
 },true);
}
export function concernMessages(userId,id,q) {
 return read(userId,async(client,user)=>{
  await accessible(client,user,id);
  const filter=`m.concern_id=$1${user.role==='student'?" AND m.visibility='student_visible'":''}`;
  const total=Number((await client.query(`SELECT count(*) FROM public.concern_messages m WHERE ${filter}`,[id])).rows[0].count);
  const rows=(await client.query(`SELECT m.id,m.message,m.visibility,m.created_at AS "createdAt",u.full_name AS "senderName" FROM public.concern_messages m JOIN public.users u ON u.id=m.sender_id WHERE ${filter} ORDER BY m.created_at DESC,m.id DESC LIMIT $2 OFFSET $3`,[id,q.pageSize,(q.page-1)*q.pageSize])).rows;
  return {data:rows,pagination:{...paging(q),total}};
 },true);
}
export function eligiblePersonnel(userId,id,q) {
 return read(userId,async(client,user)=>{
  if(user.role!=='personnel')throw fail('Personnel access is required.',403);
  const concern=await accessible(client,user,id);
  if(!coordinator(user)&&!(concern.handlerId===user.id&&['assigned','in_progress'].includes(concern.status)))throw fail('Only coordinators and the current handler can select eligible personnel.',403);
  const params=[concern.categoryId,literal(q.search)];
  const from=`FROM public.users u JOIN public.personnel_category_access p ON p.user_id=u.id JOIN public.concern_categories c ON c.id=p.category_id WHERE c.id=$1 AND c.is_active AND u.is_active AND u.role='personnel' AND u.full_name ILIKE $2`;
  const total=Number((await client.query(`SELECT count(*) ${from}`,params)).rows[0].count);
  const rows=(await client.query(`SELECT u.id,u.full_name AS "fullName" ${from} ORDER BY u.full_name,u.id LIMIT $3 OFFSET $4`,[...params,q.pageSize,(q.page-1)*q.pageSize])).rows;
  return {data:rows,pagination:{...paging(q),total}};
 });
}
const snapshot=row=>({referenceNumber:row.referenceNumber,status:row.status,categoryId:row.categoryId,handlerId:row.handlerId});
export async function eligible(client,userId,categoryId) {
 return (await client.query("SELECT EXISTS(SELECT 1 FROM public.users u JOIN public.personnel_category_access p ON p.user_id=u.id JOIN public.concern_categories c ON c.id=p.category_id WHERE u.id=$1 AND u.is_active AND u.role='personnel' AND c.id=$2 AND c.is_active) AS allowed",[userId,categoryId])).rows[0].allowed;
}
export async function mutateConcern(userId,id,type,input) {
 const client=await pool.connect();
 try {
  await client.query('BEGIN');
  // Same lock order as account/category administration; check all access after locking.
  await client.query('SELECT pg_advisory_xact_lock(7024,1)');
  await client.query('SELECT pg_advisory_xact_lock(7024,2)');
  const user=await principal(client,userId);
  if(type!=='message'&&user.role!=='personnel')throw fail('Personnel access is required.',403);
  if(['assignment','category'].includes(type)&&!coordinator(user))throw fail('Coordinator access is required.',403);
  const before=await accessible(client,user,id,true),coord=coordinator(user),isHandler=before.handlerId===user.id&&user.role==='personnel';
  if(type!=='message'&&before.updatedAt!==input.updatedAt)throw fail('This concern changed. Refresh the details before saving.',409);
  let action,newStatus=before.status,reason=null,activity=null,extra={};
  if(type==='message') {
   if(terminal.includes(before.status))throw fail('Replies and notes are unavailable after resolution, rejection, or closure.',409);
   if(input.visibility==='internal'&&user.role!=='personnel')throw fail('Internal notes are available only to authorized personnel.',403);
   const message=(await client.query('INSERT INTO public.concern_messages(concern_id,sender_id,message,visibility,created_at) VALUES($1,$2,$3,$4,clock_timestamp()) RETURNING id',[id,user.id,input.message,input.visibility])).rows[0];
   action=input.visibility==='internal'?'concern.note_created':'concern.reply_created';extra={messageId:message.id,visibility:input.visibility};
  } else if(type==='assignment') {
   if(!['under_review','assigned','in_progress'].includes(before.status))throw fail('Review the concern before assignment. Completed cases cannot be reassigned.',409);
   if(before.handlerId===input.assignedTo)throw fail('This personnel member already holds the current assignment.',409);
   if(before.handlerId&&!input.reason)throw fail('Enter a reason for reassignment.');
   if(!await eligible(client,input.assignedTo,before.categoryId))throw fail('Choose active personnel eligible for this active category.',409);
   await client.query('UPDATE public.concern_assignments SET ended_at=clock_timestamp() WHERE concern_id=$1 AND ended_at IS NULL',[id]);
   await client.query('INSERT INTO public.concern_assignments(concern_id,assigned_to,assigned_by,note,assigned_at) VALUES($1,$2,$3,$4,clock_timestamp())',[id,input.assignedTo,user.id,input.reason||null]);
   const handler=(await client.query('SELECT full_name FROM public.users WHERE id=$1',[input.assignedTo])).rows[0];
   action=before.handlerId?'concern.reassigned':'concern.assigned';
   activity={action:before.handlerId?'reassigned':'assigned',details:{previousHandlerName:before.handlerName,handlerName:handler.full_name,reason:input.reason||null}};
   newStatus=before.status==='in_progress'?'in_progress':'assigned';reason='Concern assigned to authorized personnel.';
  } else if(type==='category') {
   if(terminal.includes(before.status))throw fail('Completed concerns cannot be recategorized.',409);
   if(input.categoryId===before.categoryId)throw fail('Select a different category.');
   const category=(await client.query('SELECT id,name,is_active FROM public.concern_categories WHERE id=$1',[input.categoryId])).rows[0];
   if(!category?.is_active)throw fail('Choose an active concern category.');
   if(before.handlerId&&!await eligible(client,before.handlerId,input.categoryId))throw fail('The current handler must be eligible for the new category. Update eligibility before correcting this assigned case.',409);
   await client.query('UPDATE public.concerns SET category_id=$2 WHERE id=$1',[id,input.categoryId]);
   action='concern.category_changed';activity={action:'category_changed',details:{previousCategoryName:before.categoryName,categoryName:category.name,reason:input.reason}};
  } else if(type==='status') {
   newStatus=input.status;
   const allowed=(coord&&before.status==='submitted'&&newStatus==='under_review')||
    (isHandler&&before.status==='assigned'&&newStatus==='in_progress')||
    (isHandler&&before.status==='in_progress'&&newStatus==='resolved')||
    (coord&&before.status==='resolved'&&newStatus==='closed')||
    (coord&&['submitted','under_review'].includes(before.status)&&newStatus==='rejected');
   if(!allowed)throw fail('This status transition is not permitted for your role or the current case state.',409);
   if(newStatus==='rejected') {
    const assigned=(await client.query('SELECT EXISTS(SELECT 1 FROM public.concern_assignments WHERE concern_id=$1) AS assigned',[id])).rows[0].assigned;
    if(assigned)throw fail('A previously assigned concern cannot be rejected.',409);
    if(!input.reason)throw fail('Enter a rejection reason visible to the student.');reason=input.reason;
   }
   if(newStatus==='resolved') {
    if(!input.resolutionSummary)throw fail('Enter a written resolution.');
    await client.query('UPDATE public.concerns SET resolution_summary=$2,resolved_at=clock_timestamp() WHERE id=$1',[id,input.resolutionSummary]);reason=input.resolutionSummary;
   }
   if(newStatus==='closed')await client.query('UPDATE public.concerns SET closed_at=clock_timestamp() WHERE id=$1',[id]);
   const actions={under_review:'reviewed',in_progress:'started',resolved:'resolved',closed:'closed',rejected:'rejected'};
   action=`concern.${actions[newStatus]}`;
   if(['under_review','in_progress','closed'].includes(newStatus)&&input.reason)reason=input.reason;
   reason??={under_review:'Coordinator started reviewing the concern.',in_progress:'Assigned personnel started work.',closed:'Coordinator closed the resolved concern.'}[newStatus];
  } else throw fail('Unknown concern action.');
  if(newStatus!==before.status) {
   await client.query('UPDATE public.concerns SET status=$2 WHERE id=$1',[id,newStatus]);
   await client.query('INSERT INTO public.concern_status_history(concern_id,old_status,new_status,changed_by,reason,created_at) VALUES($1,$2,$3,$4,$5,clock_timestamp())',[id,before.status,newStatus,user.id,reason]);
  }
  if(activity)await client.query('INSERT INTO public.concern_activity(concern_id,actor_user_id,action,details,created_at) VALUES($1,$2,$3,$4,clock_timestamp())',[id,user.id,activity.action,activity.details]);
  await client.query('UPDATE public.concerns SET updated_at=clock_timestamp() WHERE id=$1',[id]);
  // The mutating coordinator can still read after reassignment; a handler is never removed by a self-service action.
  const after=await accessible(client,user,id);
  if(type==='assignment'||type==='category'||newStatus==='resolved'&&before.status!==newStatus)await cancelPendingReferrals(client,id,user,type==='assignment'?'The concern was manually reassigned.':type==='category'?'The concern category was corrected.':'The concern was resolved.');
  const audit=(await client.query('INSERT INTO public.audit_logs(actor_user_id,action,entity_type,entity_id,details) VALUES($1,$2,$3,$4,$5) RETURNING id',[user.id,action,'concern',id,{actor:{fullName:user.full_name,role:user.role},before:snapshot(before),after:{...snapshot(after),...extra}}])).rows[0];
  await notifyEvent(client,{eventId:audit.id,actorId:user.id,type:action,concernId:id,includeStudent:action!=='concern.reply_created'||user.role==='personnel',includeHandler:['concern.assigned','concern.reassigned','concern.reply_created','concern.resolved','concern.closed'].includes(action)});
  await client.query('COMMIT');return {id,updatedAt:after.updatedAt,status:after.status};
 }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
