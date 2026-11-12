import { notifyEvent } from './notifications.js';
export const referralActions=['referral.requested','referral.completed','referral.declined','referral.cancelled'];
export async function recordReferralEvent(client,user,referral,action,reason,options={}) {
 const details={referralId:referral.id,reason,requesterName:referral.requesterName,handlerName:referral.recipientName};
 await client.query('INSERT INTO public.concern_activity(concern_id,actor_user_id,action,details,created_at) VALUES($1,$2,$3,$4,clock_timestamp())',[referral.concernId,user.id,action.replace('.','_'),details]);
 const metadata={referenceNumber:referral.referenceNumber,concernId:referral.concernId,referralId:referral.id,recipientId:referral.referredTo};
 const audit=(await client.query('INSERT INTO public.audit_logs(actor_user_id,action,entity_type,entity_id,details) VALUES($1,$2,$3,$4,$5) RETURNING id',[user.id,action,'referral',referral.id,{actor:{fullName:user.full_name,role:user.role},before:action==='referral.requested'?null:{...metadata,status:'pending'},after:{...metadata,status:action.split('.')[1]}}])).rows[0];
 await notifyEvent(client,{eventId:audit.id,actorId:user.id,type:action,concernId:referral.concernId,referralId:referral.id,extraRecipients:action==='referral.requested'?[]:[referral.referredBy],referralTargetIds:[referral.referredBy],...options});
}
export async function cancelPendingReferrals(client,concernId,user,reason) {
 const pending=(await client.query(`SELECT r.id,r.concern_id AS "concernId",r.referred_by AS "referredBy",r.referred_to AS "referredTo",requester.full_name AS "requesterName",recipient.full_name AS "recipientName",c.reference_no AS "referenceNumber" FROM public.concern_referrals r JOIN public.concerns c ON c.id=r.concern_id JOIN public.users requester ON requester.id=r.referred_by JOIN public.users recipient ON recipient.id=r.referred_to WHERE r.concern_id=$1 AND r.status='pending' FOR UPDATE OF r`,[concernId])).rows;
 for(const row of pending){await client.query("UPDATE public.concern_referrals SET status='cancelled',decision_reason=$2,reviewed_by=$3,reviewed_at=clock_timestamp() WHERE id=$1",[row.id,reason,user.id]);await recordReferralEvent(client,user,row,'referral.cancelled',reason);}
}
