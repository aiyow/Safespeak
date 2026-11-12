import { pool } from '../config/db.js';
export const categoryActions=['category.created','category.updated','category.activated','category.deactivated','category.deleted'];
export const categoryFields=`c.id,c.name,c.description,c.is_active AS "isActive",c.sort_order AS "sortOrder",c.updated_at::text AS "updatedAt"`;
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
export async function saveCategory(actor,id,input) {
 const client=await pool.connect();
 try {
  await client.query('BEGIN');await client.query('SELECT pg_advisory_xact_lock(7024,2)');
  const verified=(await client.query('SELECT role,is_active FROM public.users WHERE id=$1 FOR SHARE',[actor.id])).rows[0];
  if(!verified?.is_active||verified.role!=='admin')throw fail('Administrator access is required.',403);
  const before=id?(await client.query(`SELECT ${categoryFields} FROM public.concern_categories c WHERE id=$1 FOR UPDATE`,[id])).rows[0]:null;
  if(id&&!before)throw fail('Category not found.',404);
  if(id&&before.updatedAt!==input.updatedAt)throw fail('This category changed. Reload it before editing.',409);
  const next={...before,...input};let after;const actions=[];
  if(!id) {
   after=(await client.query('INSERT INTO public.concern_categories(name,description,is_active,sort_order) VALUES($1,$2,$3,(SELECT COALESCE(max(sort_order),0)+1 FROM public.concern_categories)) RETURNING id',[next.name,next.description??'',next.isActive])).rows[0];id=after.id;actions.push('category.created');
  } else {
   if(next.name!==before.name||next.description!==before.description)actions.push('category.updated');
   if(next.isActive!==before.isActive)actions.push(next.isActive?'category.activated':'category.deactivated');
   if(actions.length)await client.query('UPDATE public.concern_categories SET name=$2,description=$3,is_active=$4 WHERE id=$1',[id,next.name,next.description,next.isActive]);
  }
  after=(await client.query(`SELECT ${categoryFields} FROM public.concern_categories c WHERE id=$1`,[id])).rows[0];
  for(const action of actions)await client.query('INSERT INTO public.audit_logs(actor_user_id,action,entity_type,entity_id,details) VALUES($1,$2,$3,$4,$5)',[actor.id,action,'category',id,{actor:{fullName:actor.fullName,role:actor.role},before,after}]);
  await client.query('COMMIT');return after;
 }catch(error){await client.query('ROLLBACK');if(error.code==='23505')throw fail('A category with that name already exists.',409);throw error;}finally{client.release();}
}

export async function deleteCategory(actor,id,updatedAt) {
 const client=await pool.connect();
 try {
  await client.query('BEGIN');
  await client.query('SELECT pg_advisory_xact_lock(7024,2)');
  const verified=(await client.query('SELECT role,is_active FROM public.users WHERE id=$1 FOR SHARE',[actor.id])).rows[0];
  if(!verified?.is_active||verified.role!=='admin')throw fail('Administrator access is required.',403);
  const before=(await client.query(`SELECT ${categoryFields} FROM public.concern_categories c WHERE id=$1 FOR UPDATE`,[id])).rows[0];
  if(!before)throw fail('Category not found.',404);
  if(before.updatedAt!==updatedAt)throw fail('This category changed. Reload the list before deleting it.',409);
  const {rows:[usage]}=await client.query('SELECT EXISTS(SELECT 1 FROM public.concerns WHERE category_id=$1) AS concerns,EXISTS(SELECT 1 FROM public.personnel_category_access WHERE category_id=$1) AS eligibility',[id]);
  if(usage.concerns||usage.eligibility)throw fail('This category is used by concerns or personnel eligibility. Deactivate it instead to preserve those records.',409);
  await client.query('DELETE FROM public.concern_categories WHERE id=$1',[id]);
  await client.query("INSERT INTO public.audit_logs(actor_user_id,action,entity_type,entity_id,details) VALUES($1,'category.deleted','category',$2,$3)",[actor.id,id,{actor:{fullName:actor.fullName,role:actor.role},before,after:null}]);
  await client.query('COMMIT');
 }catch(error){await client.query('ROLLBACK');if(error.code==='23503')throw fail('This category is in use. Deactivate it instead.',409);throw error;}
 finally{client.release();}
}
