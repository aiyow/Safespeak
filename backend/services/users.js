import bcrypt from 'bcryptjs';
import { pool } from '../config/db.js';
import { getUser } from './user-access.js';
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
const profile=['course','studentNumber','yearLevel','section'];
const safeSnapshot=user=>user?Object.fromEntries(['id','fullName','email','role','isActive','isIntakeCoordinator',...profile,'categoryIds','categories'].map(key=>[key,user[key]])):null;
export async function saveUser(actor,id,input) {
  const passwordHash=!id?await bcrypt.hash(input.password,12):null;
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(7024,1)');
    await client.query('SELECT pg_advisory_xact_lock(7024,2)');
    const verified=(await client.query('SELECT role,is_active FROM public.users WHERE id=$1',[actor.id])).rows[0];
    if(!verified?.is_active||verified.role!=='admin')throw fail('Administrator access is required.',403);
    const before=id?await getUser(client,id):null;
    if(id&&!before)throw fail('User not found.',404);
    if(id&&before.updatedAt!==input.updatedAt)throw fail('This account changed. Close the editor and reload the latest details.',409);
    const next=before?{...before,...input}:{...input,fullName:input.middleInitial?`${input.firstName} ${input.middleInitial}. ${input.lastName}`:`${input.firstName} ${input.lastName}`};
    for(const field of profile)next[field]??=null;
    if(input.isIntakeCoordinator && next.role!=='personnel')throw fail('Intake Coordinator permission is available only for personnel.');
    next.isIntakeCoordinator=next.role==='personnel'?(input.isIntakeCoordinator??before?.isIntakeCoordinator??false):false;
    const categories=[...(input.categoryIds??before?.categoryIds??[])].sort();
    if(next.role!=='personnel'&&input.categoryIds?.length)throw fail('Category scope is available only for personnel.');
    const scope=next.role==='personnel'?categories:[];
    if(id===actor.id&&(!next.isActive||next.role!=='admin'))throw fail('You cannot deactivate or demote your own account.',409);
    if(next.role==='student'&&(!id||before.role!=='student'||profile.some(field=>Object.hasOwn(input,field)))) {
      if(profile.some(field=>next[field]===null||next[field]===''))throw fail('Complete the student course, number, year level, and section.');
    }
    if(before?.role==='admin'&&before.isActive&&(!next.isActive||next.role!=='admin')) {
      const {rows:[count]}=await client.query("SELECT count(*) FROM public.users WHERE role='admin' AND is_active");
      if(Number(count.count)<=1)throw fail('At least one active administrator must remain.',409);
    }
    if(before?.role==='personnel'&&next.role!=='personnel') {
      const {rows:[assigned]}=await client.query("SELECT EXISTS(SELECT 1 FROM public.concern_assignments a JOIN public.concerns c ON c.id=a.concern_id WHERE a.assigned_to=$1 AND a.ended_at IS NULL AND c.status NOT IN ('resolved','closed','rejected')) AS active",[id]);
      if(assigned.active)throw fail('Reassign active concerns before changing this personnel account role.',409);
    }
    if(scope.length) {
      const {rows}=await client.query('SELECT id,is_active FROM public.concern_categories WHERE id=ANY($1::uuid[])',[scope]);
      if(rows.length!==scope.length||rows.some(row=>!row.is_active&&!before?.categoryIds.includes(row.id)))throw fail('Select valid active concern categories.');
    }
    const actions=[];
    if(!before) {
      id=(await client.query(`INSERT INTO public.users(full_name,email,password_hash,role,is_active,course,student_number,year_level,section,is_intake_coordinator) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,[next.fullName,next.email,passwordHash,next.role,next.isActive,next.course,next.studentNumber,next.yearLevel,next.section,next.isIntakeCoordinator])).rows[0].id;
      actions.push('user.created');
      if(scope.length)actions.push('user.scope_changed');
    } else {
      if(['fullName','email',...profile].some(field=>next[field]!==before[field]))actions.push('user.updated');
      if(next.isIntakeCoordinator!==before.isIntakeCoordinator)actions.push('user.coordinator_changed');
      if(next.role!==before.role)actions.push('user.role_changed');
      if(next.isActive!==before.isActive)actions.push(next.isActive?'user.activated':'user.deactivated');
      if(JSON.stringify(scope)!==JSON.stringify([...before.categoryIds].sort()))actions.push('user.scope_changed');
      if(actions.length)await client.query('UPDATE public.users SET full_name=$2,email=$3,role=$4,is_active=$5,course=$6,student_number=$7,year_level=$8,section=$9,is_intake_coordinator=$10 WHERE id=$1',[id,next.fullName,next.email,next.role,next.isActive,next.course,next.studentNumber,next.yearLevel,next.section,next.isIntakeCoordinator]);
    }
    if(actions.length) {
      await client.query('DELETE FROM public.personnel_category_access WHERE user_id=$1',[id]);
      for(const category of scope)await client.query('INSERT INTO public.personnel_category_access(user_id,category_id) VALUES($1,$2)',[id,category]);
      if(before&&actions.some(action=>['user.role_changed','user.activated','user.deactivated','user.scope_changed','user.coordinator_changed'].includes(action)))await client.query('DELETE FROM public.auth_sessions WHERE user_id=$1',[id]);
    }
    const after=await getUser(client,id);
    for(const action of actions)await client.query('INSERT INTO public.audit_logs(actor_user_id,action,entity_type,entity_id,details) VALUES($1,$2,$3,$4,$5)',[actor.id,action,'user',id,{actor:{fullName:actor.fullName,role:actor.role},before:safeSnapshot(before),after:safeSnapshot(after)}]);
    await client.query('COMMIT');return after;
  } catch(error) {
    await client.query('ROLLBACK');
    if(error.code==='23505')throw fail(error.constraint==='users_student_number_key'?'That student number is already in use.':'That email address is already in use.',409);
    throw error;
  } finally {client.release();}
}
