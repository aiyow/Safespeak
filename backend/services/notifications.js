import { pool } from '../config/db.js';

const messages={
 'concern.submitted':'A new concern is ready for intake.',
 'concern.reviewed':'A concern is under review.',
 'concern.assigned':'A concern has been assigned.',
 'concern.reassigned':'A concern assignment has changed.',
 'concern.started':'Work has started on a concern.',
 'concern.resolved':'A concern has been resolved.',
 'concern.closed':'A concern has been closed.',
 'concern.rejected':'A submission has been declined.',
 'concern.reply_created':'A concern has a new public reply.',
 'referral.requested':'A referral is awaiting coordinator review.',
 'referral.completed':'A referral handoff has been completed.',
 'referral.declined':'A referral request has been declined.',
 'referral.cancelled':'A referral request has been cancelled.'
};
export async function notifyEvent(client,{eventId,actorId,type,concernId,referralId=null,extraRecipients=[],includeStudent=false,includeHandler=false,referralTargetIds=[]}) {
 if(!messages[type])return;
 const users=(await client.query(`SELECT u.id FROM public.users u WHERE u.is_active AND u.id<>$1 AND (
  (u.role='personnel' AND u.is_intake_coordinator) OR
  (u.id=ANY($2::uuid[]) AND u.role='personnel') OR
  ($3::boolean AND u.role='student' AND EXISTS(SELECT 1 FROM public.concerns c WHERE c.id=$4 AND c.student_id=u.id)) OR
  ($5::boolean AND u.role='personnel' AND EXISTS(SELECT 1 FROM public.concern_assignments a WHERE a.concern_id=$4 AND a.assigned_to=u.id AND a.ended_at IS NULL)))`,[actorId,extraRecipients,includeStudent,concernId,includeHandler])).rows;
 for(const user of users) {
  const ref=referralId&&(referralTargetIds.includes(user.id)||!includeStudent&&!includeHandler)?referralId:null;
  await client.query(`INSERT INTO public.notifications(user_id,concern_id,referral_id,type,message,source_event_id,created_at) VALUES($1,$2,$3,$4,$5,$6,clock_timestamp()) ON CONFLICT(source_event_id,user_id) DO NOTHING`,[user.id,concernId,ref,type,messages[type],eventId]);
 }
}
// Return targets only if the owner still has current access. Never return stored free-form messages.
const fields=`n.id,n.type,n.is_read AS "isRead",n.created_at AS "createdAt",
 CASE WHEN n.referral_id IS NOT NULL AND u.role='personnel' AND (u.is_intake_coordinator OR r.referred_by=u.id) THEN n.referral_id ELSE NULL END AS "referralTarget",
 CASE WHEN n.referral_id IS NULL AND ((u.role='student' AND c.student_id=u.id) OR (u.role='personnel' AND (u.is_intake_coordinator OR EXISTS(SELECT 1 FROM public.concern_assignments a WHERE a.concern_id=c.id AND a.assigned_to=u.id AND a.ended_at IS NULL)))) THEN c.id ELSE NULL END AS "concernTarget"`;
const joins=`JOIN public.users u ON u.id=n.user_id AND u.is_active LEFT JOIN public.concerns c ON c.id=n.concern_id LEFT JOIN public.concern_referrals r ON r.id=n.referral_id`;
const safe=row=>({id:row.id,type:row.type,isRead:row.isRead,createdAt:row.createdAt,message:row.referralTarget||row.concernTarget?messages[row.type]||'A system update is available.':'An earlier update is no longer available to this account.',target:row.referralTarget?{kind:'referral',id:row.referralTarget}:row.concernTarget?{kind:'concern',id:row.concernTarget}:null});
export async function listNotifications(userId,q) {
 const client=await pool.connect();
 try{
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const filter=`n.user_id=$1${q.unread?' AND NOT n.is_read':''}`;
  const total=Number((await client.query(`SELECT count(*) FROM public.notifications n ${joins} WHERE ${filter}`,[userId])).rows[0].count);
  const rows=(await client.query(`SELECT ${fields} FROM public.notifications n ${joins} WHERE ${filter} ORDER BY n.created_at DESC,n.id DESC LIMIT $2 OFFSET $3`,[userId,q.pageSize,(q.page-1)*q.pageSize])).rows;
  await client.query('COMMIT');return {data:rows.map(safe),pagination:{page:q.page,pageSize:q.pageSize,total}};
 }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
export async function unreadCount(userId) {
 return {data:{count:Number((await pool.query('SELECT count(*) FROM public.notifications n JOIN public.users u ON u.id=n.user_id AND u.is_active WHERE n.user_id=$1 AND NOT n.is_read',[userId])).rows[0].count)}};
}
export async function readNotification(userId,id) {
 const result=await pool.query('UPDATE public.notifications SET is_read=true WHERE user_id=$1 AND id=$2 RETURNING id',[userId,id]);
 if(!result.rowCount)throw Object.assign(new Error('Notification not found.'),{status:404});
 return {data:{id,isRead:true}};
}
export async function readAllNotifications(userId) {
 await pool.query('UPDATE public.notifications SET is_read=true WHERE user_id=$1 AND NOT is_read',[userId]);return {data:{success:true}};
}
export async function notificationTarget(userId,id) {
 const row=(await pool.query(`SELECT ${fields} FROM public.notifications n ${joins} WHERE n.user_id=$1 AND n.id=$2`,[userId,id])).rows[0];
 if(!row)throw Object.assign(new Error('Notification not found.'),{status:404});return {data:safe(row)};
}
