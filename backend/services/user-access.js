import { pool } from '../config/db.js';
export const userActions = ['user.created','user.updated','user.role_changed','user.activated','user.deactivated','user.scope_changed','user.coordinator_changed'];
export const userFields = `u.id,u.full_name AS "fullName",u.email,u.role,u.is_intake_coordinator AS "isIntakeCoordinator",u.is_active AS "isActive",u.student_number AS "studentNumber",u.course,u.year_level AS "yearLevel",u.section,u.created_at AS "createdAt",u.updated_at::text AS "updatedAt"`;
export async function getUser(client,id) {
  const {rows:[user]}=await client.query(`SELECT ${userFields} FROM public.users u WHERE u.id=$1`,[id]);
  if(!user) return null;
  const {rows}=await client.query(`SELECT c.id,c.name,c.is_active AS "isActive" FROM public.personnel_category_access p JOIN public.concern_categories c ON c.id=p.category_id WHERE p.user_id=$1 ORDER BY c.sort_order,c.created_at,c.id`,[id]);
  return {...user, categoryIds:rows.map(row=>row.id),categories:rows};
}
export async function effectiveAccess(id) {
  const user=await getUser(pool,id);
  if(!user?.isActive) return null;
  return {role:user.role,isIntakeCoordinator:user.role==='personnel'&&user.isIntakeCoordinator,categories:user.role==='personnel'?user.categories.filter(category=>category.isActive):[]};
}
export async function canPersonnelAccessConcern(userId,concernId) {
  const {rows:[row]}=await pool.query(`SELECT EXISTS(SELECT 1 FROM public.users u JOIN public.concerns c ON c.id=$2 WHERE u.id=$1 AND u.is_active AND u.role='personnel' AND (
    u.is_intake_coordinator OR EXISTS(SELECT 1 FROM public.concern_assignments a WHERE a.concern_id=c.id AND a.assigned_to=u.id AND a.ended_at IS NULL))) AS allowed`,[userId,concernId]);
  return row.allowed;
}
export async function canAssignToCategory(userId,categoryId) {
 const {rows:[row]}=await pool.query(`SELECT EXISTS(SELECT 1 FROM public.users u JOIN public.personnel_category_access p ON p.user_id=u.id JOIN public.concern_categories c ON c.id=p.category_id WHERE u.id=$1 AND u.is_active AND u.role='personnel' AND c.id=$2 AND c.is_active) AS allowed`,[userId,categoryId]);
 return row.allowed;
}
