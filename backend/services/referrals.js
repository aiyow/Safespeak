import { pool } from '../config/db.js';
import { principal,read,accessible,eligible,coordinator,fail } from './concern-workflow.js';
import { recordReferralEvent } from './referral-events.js';

const joins=`JOIN public.concerns c ON c.id=r.concern_id JOIN public.users requester ON requester.id=r.referred_by JOIN public.users recipient ON recipient.id=r.referred_to LEFT JOIN public.users reviewer ON reviewer.id=r.reviewed_by`;
const fields=`r.id,r.concern_id AS "concernId",c.reference_no AS "referenceNumber",r.referred_by AS "referredBy",r.referred_to AS "referredTo",requester.full_name AS "requesterName",recipient.full_name AS "recipientName",r.status,r.reason,r.decision_reason AS "decisionReason",reviewer.full_name AS "reviewerName",r.reviewed_at AS "reviewedAt",r.created_at AS "createdAt",r.updated_at::text AS "updatedAt",r.requested_assignment_id AS "assignmentId",r.requested_category_id AS "categoryId"`;
function staff(user) {if(user.role!=='personnel')throw fail('Personnel access is required.',403);}
async function getReferral(client,user,id,lock=false) {
 const row=(await client.query(`SELECT ${fields} FROM public.concern_referrals r ${joins} WHERE r.id=$1 AND ($2::boolean OR r.referred_by=$3)${lock?' FOR UPDATE OF r':''}`,[id,coordinator(user),user.id])).rows[0];
 if(!row)throw fail('Referral not found.',404);return row;
}
export function listReferrals(userId,q) {
 return read(userId,async(client,user)=>{
  staff(user);const values=[coordinator(user),user.id,`%${q.search.replace(/[\\%_]/g,'\\$&')}%`],where=[`($1::boolean OR r.referred_by=$2)`,`(c.reference_no ILIKE $3 OR requester.full_name ILIKE $3 OR recipient.full_name ILIKE $3)`];
  if(q.status){values.push(q.status);where.push(`r.status=$${values.length}`);}
  const filter=where.join(' AND '),total=Number((await client.query(`SELECT count(*) FROM public.concern_referrals r ${joins} WHERE ${filter}`,values)).rows[0].count);
  const rows=(await client.query(`SELECT r.id,c.reference_no AS "referenceNumber",requester.full_name AS "requesterName",recipient.full_name AS "recipientName",r.status,r.created_at AS "createdAt" FROM public.concern_referrals r ${joins} WHERE ${filter} ORDER BY r.created_at DESC,r.id DESC LIMIT $${values.length+1} OFFSET $${values.length+2}`,[...values,q.pageSize,(q.page-1)*q.pageSize])).rows;
  return {data:rows,pagination:{page:q.page,pageSize:q.pageSize,total}};
 });
}
export function referralDetails(userId,id) {
 return read(userId,async(client,user)=>{
  staff(user);const row=await getReferral(client,user,id);
  let concern=null;
  try{concern=await accessible(client,user,row.concernId);}catch(error){if(error.status!==404)throw error;}
  return {data:{...row,concernId:concern?row.concernId:null,concernUpdatedAt:concern?.updatedAt||null,permissions:{review:coordinator(user)&&row.status==='pending',withdraw:row.referredBy===user.id&&row.status==='pending'}}};
 });
}
export async function createReferral(userId,concernId,input) {
 const client=await pool.connect();
 try{
  await client.query('BEGIN');await client.query('SELECT pg_advisory_xact_lock(7024,1)');await client.query('SELECT pg_advisory_xact_lock(7024,2)');
  const user=await principal(client,userId);staff(user);const concern=await accessible(client,user,concernId,true);
  if(concern.updatedAt!==input.updatedAt)throw fail('This concern changed. Reload its revision before requesting a referral.',409);
  if(concern.handlerId!==user.id||!['assigned','in_progress'].includes(concern.status))throw fail('Only the current handler of an assigned or in-progress case can request a referral.',403);
  if(input.referredTo===user.id)throw fail('Choose another eligible personnel member.');
  if(!await eligible(client,input.referredTo,concern.categoryId))throw fail('Choose active personnel eligible for the current active category.',409);
  const assignment=(await client.query('SELECT id FROM public.concern_assignments WHERE concern_id=$1 AND ended_at IS NULL',[concernId])).rows[0];
  const id=(await client.query('INSERT INTO public.concern_referrals(concern_id,referred_by,referred_to,reason,requested_assignment_id,requested_category_id,created_at) VALUES($1,$2,$3,$4,$5,$6,clock_timestamp()) RETURNING id',[concernId,user.id,input.referredTo,input.reason,assignment.id,concern.categoryId])).rows[0].id;
  const row=await getReferral(client,user,id);await recordReferralEvent(client,user,row,'referral.requested',input.reason);
  await client.query('UPDATE public.concerns SET updated_at=clock_timestamp() WHERE id=$1',[concernId]);await client.query('COMMIT');return {id};
 }catch(error){await client.query('ROLLBACK');if(error.code==='23505')throw fail('This concern already has a pending referral.',409);throw error;}finally{client.release();}
}
export async function decideReferral(userId,id,input) {
 const client=await pool.connect();
 try{
  await client.query('BEGIN');await client.query('SELECT pg_advisory_xact_lock(7024,1)');await client.query('SELECT pg_advisory_xact_lock(7024,2)');
  const user=await principal(client,userId);staff(user);
  // Locate an authorized record, then lock concern before referral consistently with workflow cancellation.
  let row=await getReferral(client,user,id);
  const concern=(await client.query('SELECT id,status,category_id,updated_at::text AS "updatedAt" FROM public.concerns WHERE id=$1 FOR UPDATE',[row.concernId])).rows[0];
  row=await getReferral(client,user,id,true);
  if(row.status!=='pending')throw fail('This referral has already been processed. Reload its latest details.',409);
  if(row.updatedAt!==input.updatedAt||concern.updatedAt!==input.concernUpdatedAt)throw fail('This referral or concern changed. Reload the latest revisions before saving.',409);
  if(input.action==='withdraw') {if(row.referredBy!==user.id)throw fail('Only the requester can withdraw this referral.',403);}
  else if(!coordinator(user))throw fail('Coordinator access is required.',403);
  if(input.action!=='approve'&&!input.reason)throw fail('Enter a reason for this decision.');
  const action=input.action==='approve'?'referral.completed':input.action==='decline'?'referral.declined':'referral.cancelled';
  if(input.action==='approve') {
   const assignment=(await client.query('SELECT id,assigned_to FROM public.concern_assignments WHERE concern_id=$1 AND ended_at IS NULL',[row.concernId])).rows[0];
   if(!['assigned','in_progress'].includes(concern.status)||!assignment||assignment.id!==row.assignmentId||assignment.assigned_to!==row.referredBy||concern.category_id!==row.categoryId)throw fail('This request no longer matches the active assignment and category. Decline or withdraw it and submit a new request.',409);
   const requester=(await client.query("SELECT is_active AND role='personnel' AS active FROM public.users WHERE id=$1",[row.referredBy])).rows[0];
   if(!requester?.active||!await eligible(client,row.referredTo,concern.category_id))throw fail('The requester or proposed handler is no longer active or eligible. Decline this request or ask the requester to withdraw it.',409);
   await client.query('UPDATE public.concern_assignments SET ended_at=clock_timestamp() WHERE id=$1',[assignment.id]);
   await client.query('INSERT INTO public.concern_assignments(concern_id,assigned_to,assigned_by,note,assigned_at) VALUES($1,$2,$3,$4,clock_timestamp())',[row.concernId,row.referredTo,user.id,`Approved referral ${row.id}`]);
   await client.query('INSERT INTO public.concern_activity(concern_id,actor_user_id,action,details,created_at) VALUES($1,$2,$3,$4,clock_timestamp())',[row.concernId,user.id,'reassigned',{previousHandlerName:row.requesterName,handlerName:row.recipientName,referralId:row.id}]);
  }
  const decision=input.action==='approve'?'Coordinator approved the handoff.':input.action==='withdraw'?`Withdrawn by requester: ${input.reason}`:input.reason;
  await client.query('UPDATE public.concern_referrals SET status=$2,reviewed_by=$3,reviewed_at=clock_timestamp(),decision_reason=$4 WHERE id=$1',[id,action.split('.')[1],user.id,decision]);
  await recordReferralEvent(client,user,row,action,decision,input.action==='approve'?{includeStudent:true,includeHandler:true}:{});
  await client.query('UPDATE public.concerns SET updated_at=clock_timestamp() WHERE id=$1',[row.concernId]);
  await client.query('COMMIT');return {id,status:action.split('.')[1]};
 }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
