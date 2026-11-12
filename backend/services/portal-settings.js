import { createHash } from 'node:crypto';
import { pool } from '../config/db.js';
export const settingsActions=['settings.updated'];
export const portalDefaults={acceptSubmissions:true,closedMessage:'',helpEmail:'',officeHours:'',supportMessage:''};
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
export async function portalSettings(client=pool) {
 const row=(await client.query("SELECT value,updated_at::text AS revision FROM public.system_settings WHERE key='portal'")).rows[0];
 const data={...portalDefaults};
 for(const key of Object.keys(data))if(typeof row?.value?.[key]===typeof data[key])data[key]=row.value[key];
 const revision=createHash('sha256').update(JSON.stringify([row?.revision||null,data])).digest('hex');
 return {data,revision};
}
export async function savePortalSettings(userId,input) {
 const client=await pool.connect();
 try{
  await client.query('BEGIN');await client.query('SELECT pg_advisory_xact_lock(7024,1)');await client.query('SELECT pg_advisory_xact_lock(7024,3)');
  const actor=(await client.query('SELECT id,full_name,role,is_active FROM public.users WHERE id=$1',[userId])).rows[0];
  if(!actor?.is_active||actor.role!=='admin')throw fail('Administrator access is required.',403);
  const before=await portalSettings(client);
  if(before.revision!==input.revision)throw fail('Settings changed. Reload the latest revision before saving.',409);
  const after=Object.fromEntries(Object.keys(portalDefaults).map(key=>[key,input[key]]));
  if(JSON.stringify(before.data)!==JSON.stringify(after)){
   await client.query("INSERT INTO public.system_settings(key,value,updated_by) VALUES('portal',$1,$2) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_by=EXCLUDED.updated_by,updated_at=clock_timestamp()",[after,actor.id]);
   await client.query("INSERT INTO public.audit_logs(actor_user_id,action,entity_type,details) VALUES($1,'settings.updated','settings',$2)",[actor.id,{actor:{fullName:actor.full_name,role:actor.role},settingKey:'portal',before:before.data,after}]);
  }
  const result=await portalSettings(client);await client.query('COMMIT');return result;
 }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
