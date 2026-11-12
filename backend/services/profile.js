import bcrypt from 'bcryptjs';
import { pool } from '../config/db.js';
export const profileActions=['profile.updated'];
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
const fields=`id,full_name AS "fullName",email,role,is_intake_coordinator AS "isIntakeCoordinator",student_number AS "studentNumber",course,year_level AS "yearLevel",section,created_at AS "createdAt",updated_at::text AS "updatedAt"`;
export async function getProfile(userId,client=pool) {
 const row=(await client.query(`SELECT ${fields} FROM public.users WHERE id=$1 AND is_active`,[userId])).rows[0];
 if(!row)throw fail('Sign in to continue.',401);return {data:row};
}
export async function saveProfile(userId,input) {
 const client=await pool.connect();
 try{
  await client.query('BEGIN');await client.query('SELECT pg_advisory_xact_lock(7024,1)');
  const before=(await getProfile(userId,client)).data;
  if(before.updatedAt!==input.updatedAt)throw fail('Your account changed. Reload the latest revision before saving.',409);
  if(input.email!==before.email){
   if(!input.currentPassword)throw fail('Enter your current password to change your email.');
   const {rows:[account]}=await client.query('SELECT password_hash FROM public.users WHERE id=$1',[userId]);
   if(!await bcrypt.compare(input.currentPassword,account.password_hash))throw fail('Your current password is incorrect.',400);
  }
  if(input.fullName!==before.fullName||input.email!==before.email){
   await client.query('UPDATE public.users SET full_name=$2,email=$3 WHERE id=$1',[userId,input.fullName,input.email]);
   await client.query("INSERT INTO public.audit_logs(actor_user_id,action,entity_type,entity_id,details) VALUES($1,'profile.updated','user',$1,$2)",[userId,{actor:{fullName:before.fullName,role:before.role},before:{fullName:before.fullName,email:before.email},after:{fullName:input.fullName,email:input.email}}]);
  }
  const result=await getProfile(userId,client);await client.query('COMMIT');return result;
 }catch(error){await client.query('ROLLBACK');if(error.code==='23505')throw fail('That email address is already in use.',409);throw error;}finally{client.release();}
}
